# Horizon Time

![Plain JavaScript](https://img.shields.io/badge/stack-plain%20JavaScript-f7df1e?logo=javascript&logoColor=111827)
![Local Server](https://img.shields.io/badge/server-Node.js-339933?logo=node.js&logoColor=white)
![Status](https://img.shields.io/badge/status-ready%20to%20run-10b981)

Horizon Time is a single-page JavaScript dashboard for:
- live clock and world clocks
- weather lookup
- prayer times by location or city
- Gregorian and Hijri calendars
- stopwatch
- timer
- alarms

## Files

- `index.html`: app shell and styles
- `app.js`: app logic
- `server.cjs`: tiny local static server for running the app over HTTP

## Highlights

- Clean dark and light themes with local persistence
- Gregorian calendar with Hijri day overlays
- Dedicated Hijri calendar view with month navigation
- Weather via Open-Meteo
- Prayer times via AlAdhan
- Stopwatch, timer, alarms, and export support

## Quick Start

### Requirements

- Node.js installed on your machine
- A modern browser such as Edge, Chrome, or Firefox

### Run the app locally

1. Open a terminal in the project folder.
2. Start the local server:

```powershell
node .\server.cjs
```

3. Open this URL in your browser:

```text
http://127.0.0.1:4173
```

4. Keep the terminal open while using the app.

### Stop the app

- Press `Ctrl + C` in the terminal where the server is running.

### Troubleshooting

- If the page does not refresh after changes, reload the browser manually.
- If port `4173` is already in use, stop the existing process using that port and start the server again.
- Some features such as weather, prayer times, and geolocation depend on your browser allowing network and location access.

## Notes

- The app stores theme, timezone, language, alarms, and some preferences in `localStorage`.
- Weather uses Open-Meteo.
- Prayer times use AlAdhan.

## Push Checklist

- Keep `index.html`, `app.js`, `server.cjs`, `README.md`, and `.gitignore`
- Do not commit generated folders like `node_modules`
