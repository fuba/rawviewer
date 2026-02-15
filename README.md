# RAW Viewer

RAW Viewer is a web app for editing RAW photos in the browser and exporting them as JPEG/PNG/TIFF.
The frontend uses Svelte 5 + WebGL2, and RAW decoding is handled by a Go + libraw backend.

## Features

- RAW import (CR2/CR3/NEF/ARW/DNG and others)
- Exposure, white balance, contrast, highlights/shadows, saturation, and sharpness controls
- Tone curve editor (RGB / R / G / B)
- Rotation, crop, and auto-adjust
- Histogram display
- Export size controls with aspect ratio preservation
- JPEG / PNG / TIFF export
- Progress bar for Open / Export tasks
- Canvas2D fallback when WebGL is unavailable

## Architecture

- Frontend: Svelte 5 + TypeScript + Vite
- Rendering: WebGL2 (with Canvas2D fallback)
- Backend: Go + libraw
- Transport: `POST /api/decode` returns a binary envelope
- Runtime: Docker Compose with two services (`frontend` / `backend`)

## Requirements

- Docker
- Docker Compose v2 (`docker compose`)

## Run (Recommended: Docker)

```bash
./scripts/docker-up.sh
```

This script:

- Fixes the web port to `5173`
- Finds a free API port starting from `8080`
- Generates `.env.compose` and runs `docker compose up -d --build`

After startup:

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:<API_PORT>/api/healthz`

Stop:

```bash
./scripts/docker-down.sh
```

## Logs

Logs are written inside containers:

- frontend: `/tmp/rawviewer-frontend.log`
- backend: `/tmp/rawviewer-backend.log`

## Development Commands

```bash
npm test
npm run check
npm run build
```

## API

### `GET /api/healthz`

Health check endpoint. Returns `ok`.

### `POST /api/decode`

Accepts RAW bytes and returns decoded pixels + metadata in a binary format.

Request headers:

- `Content-Type: application/octet-stream`
- `X-Filename: <optional>`
- `X-Max-Dimension: <optional>`

## Known Notes

- RAW decoding is server-side, so large files can take time.
- Preview uses reduced-resolution decode for responsiveness; export uses full-resolution decode.
- TIFF export goes through a pixel buffer path and can be slower than JPEG/PNG.

## License

CC0 1.0 Universal
