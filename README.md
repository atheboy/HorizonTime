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

## Run Locally

1. Make sure Node.js is installed.
2. From the project folder, run:

```powershell
node .\server.cjs
```

3. Open:

```text
http://127.0.0.1:4173
```

## Notes

- The app stores theme, timezone, language, alarms, and some preferences in `localStorage`.
- Weather uses Open-Meteo.
- Prayer times use AlAdhan.

## Push Checklist

- Keep `index.html`, `app.js`, `server.cjs`, `README.md`, and `.gitignore`
- Do not commit generated folders like `node_modules`
