import fs from "fs/promises";
import { execFile } from "child_process";
import { promisify } from "util";
import FoxholeSVGGenerator from "./generate-svg.js";
import logger from "./logger.js";

const execFileAsync = promisify(execFile);

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

      // Ensure output directory exists
      await fs.mkdir("/app/output", { recursive: true });

      // Save SVG temporarily for ImageMagick processing
      const svgPath = "/app/output/temp.svg";
      await fs.writeFile(svgPath, svg);

      try {
        // Convert SVG directly to optimized PNG using ImageMagick
        await this.convertSvgToEinkPng(svgPath, "/app/output/latest.png");
      } finally {
        // Always clean up temp SVG file
        await fs.unlink(svgPath).catch(() => {});
      }

      const duration = Date.now() - startTime;
      this.lastGenerationTime = Date.now();

      logger.info(`PNG generated successfully in ${duration}ms`);

      return "/app/output/latest.png";
    } catch (error) {
      logger.error("Error generating PNG:", error);
      throw error;
    }
  }

  async convertSvgToEinkPng(svgPath, outputPath) {
    // Convert SVG to PNG with eink optimizations in a single ImageMagick pass
    // Applies Floyd-Steinberg dithering and grayscale conversion for sharp rendering
    const args = [
      "-density", "96",                // Set DPI for SVG rendering
      "-background", "white",          // Set background color
      svgPath,
      "-colorspace", "Gray",           // Convert to grayscale
      "-type", "Grayscale",            // Ensure grayscale type
      "-dither", "FloydSteinberg",     // Apply Floyd-Steinberg dithering for eink
      "-colors", "16",                 // Reduce to 16 gray levels (4-bit)
      "-define", "png:bit-depth=4",    // 4-bit depth for eink
      "-define", "png:color-type=0",   // Grayscale PNG
      "-strip",                        // Remove metadata
      outputPath
    ];

    await execFileAsync("convert", args);
    logger.debug("ImageMagick SVG→PNG conversion complete");
  }

  getLastGenerationTime() {
    return this.lastGenerationTime;
  }
}

export default PNGGenerator;
