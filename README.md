# Foxhole Dashboard

A Docker container that generates real-time SVG maps of Foxhole war status, optimized for e-paper displays.

## What This Project Does

This project creates beautiful, real-time maps of the Foxhole war by:

- **📊 Tracking War Data**: Monitors town control changes every 5 minutes using the official Foxhole API
- **🗺️ Generating Maps**: Creates high-quality SVG maps with accurate team control visualization
- **📱 E-Paper Ready**: Optimizes maps for small, grayscale displays with high contrast
- **🌐 Web Interface**: Provides a live dashboard to monitor war progress and recent captures
- **⏰ Real-Time Updates**: Shows recent town captures with exact timestamps and locations

## Screenshots

### Web Interface - War Overview
![Foxhole Web UI - Overview](imgs/foxhole_map_webui_1.png)

### Web Interface - Recent Captures
![Foxhole Web UI - Recent Captures](imgs/foxhole_map_webui_2.png)

## Quick Start

### 1. Start the Service

**Production (recommended for users):**
```bash
# Uses pre-built image from GHCR
docker-compose up -d

# Or with make
make up
```

**Development (for contributors):**
```bash
# Builds from local source code
docker-compose -f docker-compose.dev.yml up -d

# Or with make
make dev
```

The production setup pulls a ready-to-use image, while development builds from your local code for testing changes.

### 2. Access the Web Interface
Visit `http://localhost:3000` to:
- View real-time war status
- Monitor recent captures
- Generate and download SVG maps

## Features

- **Accurate Sub-region Coloring**: Recently captured regions are easily identifiable as they appear lighter and get darker over 48 hours
- **Town Control Tracking**: SQLite database tracks real `lastChange` timestamps
- **Live Data Updates**: Background service updates every 5 minutes
- **E-paper Optimized**: High contrast colors and clear typography for small displays
- **Single Container**: Everything runs in one Docker container
- **Web Interface**: Easy-to-use UI for map generation and monitoring
- **API Endpoints**: Programmatic access to all features
- **Recent Captures Display**: Live tracking of town captures with hex and region names

## API Endpoints

When running the web server:
- `GET /` - Web interface
- `GET /health` - Health check
- `POST /api/generate-epaper-svg` - Generate and save e-paper SVG map
- `GET /api/generate-epaper-svg` - Download e-paper SVG map
- `GET /api/conquerStatus` - Get current tracking data
- `GET /api/recent-captures` - Get enriched recent captures data

## Output

- **E-paper SVG**: `output/foxhole-map-epaper-YYYY-MM-DD.svg`
- **Latest e-paper**: `output/latest-epaper.svg`
- **Database**: Town control data in `data/towns.db`

## File Structure

```
foxhole-dashboard/
├── Dockerfile                    # Container definition
├── docker-compose.yml           # Single container setup
├── package.json                 # Dependencies & scripts
├── src/
│   ├── generate-svg.js          # Main SVG generation logic
│   ├── warapi.js               # Foxhole War API client
│   ├── server-with-tracking.js  # Combined web server + tracking
│   ├── data-updater.js         # Background data tracking service
│   └── database.js             # SQLite database management
├── public/
│   └── static.json             # Static map data
├── output/                      # Generated SVG files
├── data/                        # SQLite database files
└── imgs/                        # Screenshots
```

## Technical Details

- **Node.js 20+** runtime
- **Foxhole War API** for live game data
- **SVG generation** optimized for e-paper displays
- **Express.js** web server for API endpoints
- **SQLite** database for town control tracking
- **Docker** containerization for easy deployment

## Troubleshooting

### Service Won't Start
- Check if port 3000 is available
- Verify Foxhole API is accessible
- Check logs: `docker-compose logs`

### No Alpha Variation
- Ensure tracking service is running
- Check database has data in `data/towns.db`
- Verify town coordinates match between API and database
