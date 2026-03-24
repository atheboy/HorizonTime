# Horizon Time

Horizon Time is a single-page JavaScript dashboard for:
|live clock and world clocks
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
