import { Resvg } from "@resvg/resvg-js";
import fs from "fs/promises";
import FoxholeSVGGenerator from "./generate-svg.js";
import logger from "./logger.js";

class PNGGenerator {
  constructor(svgGenerator = null) {
    this.svgGenerator = svgGenerator || new FoxholeSVGGenerator();
    this.lastGenerationTime = null;
  }

  async generatePNG(skipFetch = false) {
    try {
      logger.debug("Generating PNG from SVG...");
      const startTime = Date.now();

      // Fetch all map data only if not already fetched
      if (!skipFetch) {
        await this.svgGenerator.fetchAllMapData();
      }
      const svg = this.svgGenerator.generateEpaperSVG();

      // Convert SVG to PNG using resvg at 4x resolution for supersampling
      // Higher resolution (3200x1920) allows downscaling to produce thinner, smoother lines
      const resvg = new Resvg(svg, {
        fitTo: { mode: 'zoom', value: 4 }, // 4x zoom for 4x resolution (3200x1920)
        dpi: 96, // Standard DPI
        shapeRendering: 2, // GeometricPrecision for crisp edges
        textRendering: 2, // GeometricPrecision for sharp text
        imageRendering: 1, // OptimizeQuality for best quality
        font: {
          loadSystemFonts: true, // Load system fonts (Liberation Sans, DejaVu Sans, etc.)
          defaultFontFamily: "Liberation Sans", // Fallback if Segoe UI not found
        },
      });

      const pngData = resvg.render();
      const pngBuffer = pngData.asPng();

      logger.debug(`PNG dimensions: ${pngData.width}x${pngData.height}`);

      // Ensure output directory exists
      await fs.mkdir("/app/output", { recursive: true });

      // Save PNG
      await fs.writeFile("/app/output/latest.png", pngBuffer);

      const duration = Date.now() - startTime;
      this.lastGenerationTime = Date.now();

      logger.info(`PNG generated successfully in ${duration}ms`);

      return "/app/output/latest.png";
    } catch (error) {
      logger.error("Error generating PNG:", error);
      throw error;
    }
  }

  getLastGenerationTime() {
    return this.lastGenerationTime;
  }
}

export default PNGGenerator;
