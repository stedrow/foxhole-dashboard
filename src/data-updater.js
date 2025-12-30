import WarApi from "./warapi.js";
import TownTracker from "./database.js";
import logger from "./logger.js";

class DataUpdater {
  constructor() {
    this.warApi = new WarApi();
    this.tracker = new TownTracker();
    this.isRunning = false;
    // War API dynamic map data updates every ~3 seconds per the documentation.
    // We poll every 5 seconds to stay responsive while using ETags to avoid
    // unnecessary bandwidth when data hasn't changed.
    this.updateInterval = 5 * 1000; // 5 seconds
  }

  async start() {
    if (this.isRunning) {
      logger.warn("Data updater is already running");
      return;
    }

    this.isRunning = true;
    logger.info("Starting data updater service...");

    // Do initial update
    await this.updateData();

    // Set up periodic updates
    this.intervalId = setInterval(async () => {
      await this.updateData();
    }, this.updateInterval);
  }

  stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    logger.info("Data updater service stopped");
  }

  async updateData() {
    try {
      logger.info("Updating town control data...");

      // Get current war info
      const warInfo = await this.warApi.war();
      const currentWarNumber = warInfo.warNumber;

      // Fetch maps list dynamically from API
      const mapsList = await this.warApi.maps();
      logger.debug(`Processing ${mapsList.length} regions from API`);

      let totalUpdates = 0;
      let changedTowns = 0;

      // Process each region
      for (const regionName of mapsList) {
        try {
          logger.debug(`Processing region: ${regionName}`);

          // Get dynamic data for this region
          const dynamicData = await this.warApi.getDynamicMap(regionName);

          if (!dynamicData || !dynamicData.mapItems) {
            continue;
          }

          // Process conquerable towns in this region
          const conquerableTowns = dynamicData.mapItems.filter(
            (item) =>
              this.warApi.isIconType(item.iconType) &&
              this.warApi.iconTypes[item.iconType].conquer,
          );

          for (const town of conquerableTowns) {
            const team = this.warApi.getTeam(town.teamId);
            const notes = this.warApi.iconTypes[town.iconType].notes;

            // Update town control in database
            const result = this.tracker.updateTownControl(
              town.iconType,
              town.x,
              town.y,
              regionName,
              team,
              notes,
            );

            if (result.changes > 0) {
              changedTowns++;
              logger.debug(`Town captured: ${notes} (${regionName}) -> ${team}`);
            }
            totalUpdates++;
          }
        } catch (error) {
          logger.error(`Error processing region ${regionName}:`, error.message);
        }
      }

      if (changedTowns > 0) {
        logger.info(`Data update complete. ${changedTowns} towns changed (${totalUpdates} total tracked).`);
      } else {
        logger.info(`Data update complete. No changes (${totalUpdates} towns tracked).`);
      }
    } catch (error) {
      logger.error("Error updating data:", error);
    }
  }

  // Get current conquerStatus data
  getConquerStatus() {
    return this.tracker.getConquerStatus();
  }

  // Close connections
  close() {
    this.stop();
    this.tracker.close();
  }
}

export default DataUpdater;
