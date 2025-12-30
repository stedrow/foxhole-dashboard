import WarApi from "./warapi.js";
import TownTracker from "./database.js";
import PNGGenerator from "./png-generator.js";
import FoxholeSVGGenerator from "./generate-svg.js";
import logger from "./logger.js";

class DataUpdater {
  constructor() {
    this.warApi = new WarApi();
    this.tracker = new TownTracker();
    this.svgGenerator = new FoxholeSVGGenerator();
    this.pngGenerator = new PNGGenerator(this.svgGenerator);
    this.isRunning = false;
    // War API dynamic map data updates every ~3 seconds per the documentation.
    // We poll every 5 seconds to stay responsive while using ETags to avoid
    // unnecessary bandwidth when data hasn't changed.
    this.updateInterval = 5 * 1000; // 5 seconds
    // PNG generation fallback: update every 5 minutes even if no changes
    // (to refresh timestamps, war duration, etc.)
    this.pngFallbackInterval = 5 * 60 * 1000; // 5 minutes
  }

  async start() {
    if (this.isRunning) {
      logger.warn("Data updater is already running");
      return;
    }

    this.isRunning = true;
    logger.info("Starting data updater service...");

    // Do initial update and PNG generation
    await this.updateData();
    await this.generatePNG("Initial generation");

    // Set up periodic data updates (every 5 seconds)
    this.intervalId = setInterval(async () => {
      await this.updateData();
    }, this.updateInterval);

    // Set up fallback PNG generation (every 5 minutes)
    // This ensures timestamps and war duration stay fresh even if no towns change
    this.pngIntervalId = setInterval(async () => {
      await this.generatePNG("Scheduled fallback");
    }, this.pngFallbackInterval);
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

    if (this.pngIntervalId) {
      clearInterval(this.pngIntervalId);
      this.pngIntervalId = null;
    }

    logger.info("Data updater service stopped");
  }

  async updateData() {
    try {
      logger.debug("Updating town control data...");

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
        logger.info(`Town control update: ${changedTowns} towns changed (${totalUpdates} total tracked)`);
        // Generate PNG when towns actually change (Option A)
        // Pass current conquerStatus and fetch map data
        await this.generatePNGWithFreshData(`${changedTowns} town changes`);
      } else {
        // Only log "no changes" at debug level to reduce spam
        logger.debug(`Data update complete. No changes (${totalUpdates} towns tracked)`);
      }
    } catch (error) {
      logger.error("Error updating data:", error);
    }
  }

  // Generate PNG with fresh map data fetch (called on changes or fallback timer)
  async generatePNGWithFreshData(reason) {
    try {
      logger.info(`Generating PNG: ${reason}`);
      // Update SVG generator with current conquerStatus
      this.svgGenerator.conquerStatus = this.tracker.getConquerStatus();
      // Generate PNG (will fetch map data)
      await this.pngGenerator.generatePNG(false);
    } catch (error) {
      logger.error("Failed to generate PNG:", error);
    }
  }

  // Generate PNG for scheduled fallback (already has map data cached)
  async generatePNG(reason) {
    try {
      logger.info(`Generating PNG: ${reason}`);
      // Update SVG generator with current conquerStatus
      this.svgGenerator.conquerStatus = this.tracker.getConquerStatus();
      // Fetch fresh map data for scheduled updates
      await this.pngGenerator.generatePNG(false);
    } catch (error) {
      logger.error("Failed to generate PNG:", error);
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
