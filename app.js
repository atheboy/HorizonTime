const STORAGE = {
  theme: "horizon-theme",
  language: "horizon-language",
  timezone: "horizon-timezone",
  alarms: "horizon-alarms",
  city: "horizon-city",
  prayer: "horizon-prayer"
};

const state = {
  theme: localStorage.getItem(STORAGE.theme) || "dark",
  language: localStorage.getItem(STORAGE.language) || "en",
  timezone: localStorage.getItem(STORAGE.timezone) || "local",
  activeTab: "clock",
  weather: null,
  prayer: null,
  alarms: readJson(STORAGE.alarms, []),
  stopwatchRunning: false,
  stopwatchElapsed: 0,
  stopwatchStart: 0,
  stopwatchTimer: null,
  laps: [],
  timerRunning: false,
  timerPaused: false,
  timerRemaining: 0,
  timerEnd: 0,
  timerId: null,
  showGregorian: true,
  gregMonth: new Date().getMonth(),
  gregYear: new Date().getFullYear()
};

const languageOptions = [
  { value: "en", label: "English" },
  { value: "no", label: "Norsk" },
  { value: "ar", label: "العربية" }
];

const timezoneOptions = [
  { value: "local", label: "Local Time" },
  { value: "UTC", label: "UTC" },
  { value: "Europe/Oslo", label: "Oslo" },
  { value: "America/New_York", label: "New York" },
  { value: "Asia/Tokyo", label: "Tokyo" },
  { value: "Asia/Riyadh", label: "Riyadh" },
  { value: "Australia/Sydney", label: "Sydney" }
];

const tabs = [
  ["clock", "Clock"],
  ["weather", "Weather"],
  ["prayer", "Prayer"],
  ["calendar", "Calendar"],
  ["stopwatch", "Stopwatch"],
  ["timer", "Timer"],
  ["alarms", "Alarms"]
];

const prayerMethods = { "2": "ISNA", "3": "Muslim World League", "4": "Umm Al-Qura", "5": "Egyptian General Authority", "7": "Tehran" };
const asrMethods = { "0": "Standard", "1": "Hanafi" };
const prayerDefs = [
  { key: "Fajr", name: "Fajr", arabic: "الفجر", note: "Dawn prayer" },
  { key: "Dhuhr", name: "Dhuhr", arabic: "الظهر", note: "Noon prayer" },
  { key: "Asr", name: "Asr", arabic: "العصر", note: "Afternoon prayer" },
  { key: "Maghrib", name: "Maghrib", arabic: "المغرب", note: "Sunset prayer" },
  { key: "Isha", name: "Isha", arabic: "العشاء", note: "Night prayer" }
];

const dayNames = {
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  no: ["Søn", "Man", "Tir", "Ons", "Tor", "Fre", "Lør"],
  ar: ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"]
};

let hijriCursor = formatHijriParts(new Date(), "UTC");

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  localStorage.setItem(key, value);
}

function locale() {
  if (state.language === "no") return "nb-NO";
  if (state.language === "ar") return "ar-SA";
  return "en-GB";
}

function tzOption(timezone) {
  return timezone === "local" ? undefined : timezone;
}

function notify(message, type = "info") {
  const host = document.getElementById("notifications");
  const node = document.createElement("div");
  node.className = `notice ${type}`;
  node.textContent = message;
  host.appendChild(node);
  setTimeout(() => node.remove(), Math.max(3000, Math.min(6500, message.length * 40)));
}

function dateParts(date, timezone = state.timezone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tzOption(timezone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(date);
  const map = {};
  parts.forEach((part) => {
    if (part.type !== "literal") map[part.type] = part.value;
  });
  return { year: +map.year, month: +map.month, day: +map.day, hour: +map.hour, minute: +map.minute, second: +map.second };
}

function zonedDate(date, timezone = state.timezone) {
  if (timezone === "local") return new Date(date);
  const parts = dateParts(date, timezone);
  return new Date(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
}

function formatHijriParts(date, timezone) {
  const parts = new Intl.DateTimeFormat("en-TN-u-ca-islamic", {
    timeZone: tzOption(timezone),
    day: "numeric",
    month: "numeric",
    year: "numeric"
  }).formatToParts(date);
  const map = {};
  parts.forEach((part) => {
    if (part.type !== "literal") map[part.type] = part.value;
  });
  return { day: +map.day, month: +map.month, year: +map.year };
}

function formatHijriText(date, timezone = state.timezone) {
  return new Intl.DateTimeFormat(state.language === "ar" ? "ar-SA-u-ca-islamic" : "en-TN-u-ca-islamic", {
    timeZone: tzOption(timezone),
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);
}

function formatHijriMonthLabel(date, timezone = "UTC") {
  return new Intl.DateTimeFormat(state.language === "ar" ? "ar-SA-u-ca-islamic" : "en-TN-u-ca-islamic", {
    timeZone: tzOption(timezone),
    month: "long",
    year: "numeric"
  }).format(date);
}

function weatherLabel(code) {
  const map = {
    0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast", 45: "Fog", 48: "Rime fog",
    51: "Light drizzle", 53: "Drizzle", 55: "Dense drizzle", 61: "Slight rain", 63: "Rain", 65: "Heavy rain",
    71: "Slight snow", 73: "Snow", 75: "Heavy snow", 77: "Snow grains", 80: "Rain showers",
    81: "Heavy rain showers", 82: "Violent rain showers", 85: "Snow showers", 86: "Heavy snow showers",
    95: "Thunderstorm", 96: "Thunderstorm with hail", 99: "Severe thunderstorm with hail"
  };
  return map[code] || "Current conditions";
}

function weatherEmoji(code) {
  if ([0].includes(code)) return "☀️";
  if ([1, 2].includes(code)) return "🌤️";
  if ([3].includes(code)) return "☁️";
  if ([45, 48].includes(code)) return "🌫️";
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return "🌧️";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "❄️";
  if ([95, 96, 99].includes(code)) return "⛈️";
  return "🌈";
}

function formatStopwatch(ms) {
  const centiseconds = Math.floor((ms % 1000) / 10);
  const seconds = Math.floor(ms / 1000) % 60;
  const minutes = Math.floor(ms / 60000) % 60;
  const hours = Math.floor(ms / 3600000);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(centiseconds).padStart(2, "0")}`;
}

function formatCountdown(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function alarmStamp(date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function parsePrayerMinutes(raw) {
  const [hours, minutes] = raw.split(" ")[0].split(":").map(Number);
  return hours * 60 + minutes;
}

function buildTabs() {
  const host = document.getElementById("tabs");
  host.innerHTML = tabs.map(([id, label]) => `
    <button class="tab ${state.activeTab === id ? "active" : ""}" data-tab="${id}" type="button">${label}</button>
  `).join("");
  host.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeTab = button.dataset.tab;
      document.querySelectorAll(".tab").forEach((tab) => tab.classList.remove("active"));
      document.querySelectorAll(".page").forEach((page) => page.classList.remove("active"));
      button.classList.add("active");
      document.getElementById(`${state.activeTab}Page`).classList.add("active");
      if (state.activeTab === "calendar") renderCalendars();
    });
  });
}

function buildSelects() {
  document.getElementById("language").innerHTML = languageOptions.map((item) => `<option value="${item.value}">${item.label}</option>`).join("");
  document.getElementById("timezone").innerHTML = timezoneOptions.map((item) => `<option value="${item.value}">${item.label}</option>`).join("");
  document.getElementById("language").value = state.language;
  document.getElementById("timezone").value = state.timezone;
}

function renderLayouts() {
  document.getElementById("clockContent").innerHTML = `
    <div class="hero">
      <div class="panel">
        <div class="eyebrow">Current time</div>
        <div class="time" id="mainTime">00:00:00</div>
        <div class="muted" id="mainDate">Loading date...</div>
        <div class="hijri-line" id="mainHijri">Loading Hijri date...</div>
      </div>
      <div class="stack">
        <div class="panel"><h3>Selected timezone</h3><p id="selectedTimezone">Local Time</p></div>
        <div class="panel"><h3>Alarm summary</h3><p id="alarmSummary">No alarms yet.</p></div>
        <div class="panel"><h3>Snapshot</h3><p id="snapshotText">Preparing your dashboard...</p></div>
      </div>
    </div>
    <div class="cards-4" id="worldClocks"></div>
  `;

  document.getElementById("weatherContent").innerHTML = `
    <div class="two-col">
      <div class="panel">
        <div class="section-title">Weather</div>
        <div class="row center" style="margin-top: 12px;">
          <input id="cityInput" placeholder="Enter city name" value="${localStorage.getItem(STORAGE.city) || "Oslo"}">
          <button class="primary" id="weatherSearchBtn" type="button">Search</button>
          <button class="success" id="weatherLocationBtn" type="button">Use My Location</button>
        </div>
        <div class="weather-hero">
          <div class="weather-icon" id="weatherIcon">☁️</div>
          <div>
            <div class="weather-temp" id="weatherTemp">--°C</div>
            <div class="muted" id="weatherStatus">Search for a city to load current weather.</div>
            <div class="subtle" id="weatherLocation">No location selected</div>
          </div>
        </div>
        <div class="cards-4">
          <div class="panel"><div class="subtle">Humidity</div><div class="stat-strong" id="humidityValue">--%</div></div>
          <div class="panel"><div class="subtle">Wind</div><div class="stat-strong" id="windValue">--</div></div>
          <div class="panel"><div class="subtle">Visibility</div><div class="stat-strong" id="visibilityValue">--</div></div>
          <div class="panel"><div class="subtle">Feels Like</div><div class="stat-strong" id="feelsLikeValue">--°C</div></div>
        </div>
      </div>
      <div class="stack">
        <div class="panel"><h3>Data source</h3><p>Weather uses Open-Meteo geocoding and forecast APIs.</p></div>
        <div class="panel"><h3>Last updated</h3><p id="weatherUpdated">Waiting for weather data</p></div>
      </div>
    </div>
  `;

  const prefs = readJson(STORAGE.prayer, { method: "2", school: "0" });
  document.getElementById("prayerContent").innerHTML = `
    <div class="two-col">
      <div class="stack">
        <div class="panel">
          <div class="section-title">Prayer Times</div>
          <div class="row center" style="margin-top: 12px;">
            <button class="success" id="prayerLocationBtn" type="button">Get Prayer Times for My Location</button>
          </div>
        </div>
        <div class="panel">
          <h3>Manual city lookup</h3>
          <div class="row center" style="margin-top: 12px;">
            <input id="manualCity" placeholder="Enter city name">
            <button class="primary" id="manualPrayerBtn" type="button">Get Prayer Times</button>
          </div>
        </div>
        <div class="panel" id="prayerList">
          <p class="subtle">Prayer times will appear here after loading a location.</p>
        </div>
      </div>
      <div class="stack">
        <div class="panel">
          <h3>Calculation settings</h3>
          <div class="stack" style="margin-top: 12px;">
            <label>Method<select id="methodSelect">${Object.entries(prayerMethods).map(([value, label]) => `<option value="${value}" ${prefs.method === value ? "selected" : ""}>${label}</option>`).join("")}</select></label>
            <label>Asr calculation<select id="schoolSelect">${Object.entries(asrMethods).map(([value, label]) => `<option value="${value}" ${prefs.school === value ? "selected" : ""}>${label}</option>`).join("")}</select></label>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById("calendarContent").innerHTML = `
    <div class="section-title">Calendar</div>
    <div class="row center" style="margin-top: 12px;">
      <button class="secondary" id="calendarToggleBtn" type="button">Show Hijri Calendar</button>
    </div>
    <div class="panel" style="margin-top: 16px;" id="gregorianPanel">
      <div class="row center">
        <button class="secondary" id="gregPrevBtn" type="button">Previous</button>
        <div class="muted" id="gregLabel"></div>
        <button class="secondary" id="gregNextBtn" type="button">Next</button>
      </div>
      <div class="calendar-grid" id="gregCalendar"></div>
    </div>
    <div class="panel" style="margin-top: 16px; display: none;" id="hijriPanel">
      <div class="row center">
        <button class="secondary" id="hijriPrevBtn" type="button">Previous</button>
        <div class="muted" id="hijriLabel"></div>
        <button class="secondary" id="hijriNextBtn" type="button">Next</button>
      </div>
      <div class="calendar-grid" id="hijriCalendar"></div>
    </div>
  `;

  document.getElementById("stopwatchContent").innerHTML = `
    <div class="section-title">Stopwatch</div>
    <div class="big-number" id="stopwatchDisplay">00:00:00.00</div>
    <div class="controls center">
      <button class="primary" id="swStartBtn" type="button">Start</button>
      <button class="secondary" id="swPauseBtn" type="button">Pause</button>
      <button class="secondary" id="swResetBtn" type="button">Reset</button>
      <button class="secondary" id="swLapBtn" type="button">Lap</button>
    </div>
    <div class="stack" id="lapList" style="margin-top: 16px;"><div class="panel">No lap times yet.</div></div>
  `;

  document.getElementById("timerContent").innerHTML = `
    <div class="section-title">Timer</div>
    <div class="big-number" id="timerDisplay">00:00:00</div>
    <div class="row center" style="margin-top: 12px;">
      <label>Hours<br><input id="timerHours" type="number" min="0" max="23" value="0"></label>
      <label>Minutes<br><input id="timerMinutes" type="number" min="0" max="59" value="5"></label>
      <label>Seconds<br><input id="timerSeconds" type="number" min="0" max="59" value="0"></label>
    </div>
    <div class="controls center" style="margin-top: 16px;">
      <button class="primary" id="timerStartBtn" type="button">Start</button>
      <button class="secondary" id="timerPauseBtn" type="button">Pause</button>
      <button class="secondary" id="timerStopBtn" type="button">Stop</button>
    </div>
  `;

  document.getElementById("alarmsContent").innerHTML = `
    <div class="section-title">Alarms</div>
    <div class="row center" style="margin-top: 12px;">
      <input id="alarmHour" type="number" min="0" max="23" value="12" placeholder="Hour">
      <input id="alarmMinute" type="number" min="0" max="59" value="0" placeholder="Minute">
      <input id="alarmLabel" value="Wake up!" placeholder="Label">
      <button class="primary" id="addAlarmBtn" type="button">Add Alarm</button>
      <button class="secondary" id="clearAlarmsBtn" type="button">Clear All</button>
    </div>
    <div class="stack" id="alarmList" style="margin-top: 16px;"><div class="panel">No alarms yet.</div></div>
  `;
}

function applyTheme() {
  document.body.className = state.theme;
  document.getElementById("themeBtn").textContent = state.theme === "dark" ? "Light" : "Dark";
  save(STORAGE.theme, state.theme);
}

function renderWorldClocks(now) {
  const cards = [
    ["New York", "America/New_York"],
    ["Tokyo", "Asia/Tokyo"],
    ["Makkah", "Asia/Riyadh"],
    ["Sydney", "Australia/Sydney"]
  ];
  document.getElementById("worldClocks").innerHTML = cards.map(([label, zone]) => `
    <div class="panel">
      <h3>${label}</h3>
      <div class="mini-time">${new Intl.DateTimeFormat(locale(), { timeZone: zone, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(now)}</div>
    </div>
  `).join("");
}

function updateClock() {
  const now = new Date();
  const current = zonedDate(now);
  const timeText = new Intl.DateTimeFormat(locale(), {
    timeZone: tzOption(state.timezone),
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(now);
  const dateText = new Intl.DateTimeFormat(locale(), {
    timeZone: tzOption(state.timezone),
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(now);
  document.getElementById("mainTime").textContent = timeText;
  document.getElementById("mainDate").textContent = dateText;
  document.getElementById("mainHijri").textContent = formatHijriText(now);
  document.getElementById("selectedTimezone").textContent = state.timezone === "local" ? "Local Time" : state.timezone;
  document.getElementById("snapshotText").textContent = `Viewing ${dateText} in ${state.timezone === "local" ? "your local timezone" : state.timezone}.`;
  renderWorldClocks(now);
  checkAlarms(current);
}

async function fetchWeather() {
  const city = document.getElementById("cityInput").value.trim();
  if (!city) {
    notify("Please enter a city name.", "error");
    return;
  }
  try {
    document.getElementById("weatherStatus").textContent = "Loading weather...";
    const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
    const geo = await geoRes.json();
    if (!geo.results?.length) throw new Error("City not found.");
    const match = geo.results[0];
    const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${match.latitude}&longitude=${match.longitude}&current=temperature_2m,apparent_temperature,weather_code,relative_humidity_2m,wind_speed_10m,visibility&timezone=auto`);
    const data = await weatherRes.json();
    state.weather = { ...data.current, location: `${match.name}${match.country ? `, ${match.country}` : ""}` };
    save(STORAGE.city, city);
    renderWeather();
    notify(`Weather loaded for ${match.name}.`, "success");
  } catch (error) {
    state.weather = null;
    renderWeather(error.message);
    notify(error.message, "error");
  }
}

function renderWeather(errorText = null) {
  const weather = state.weather;
  document.getElementById("weatherIcon").textContent = weather ? weatherEmoji(weather.weather_code) : "☁️";
  document.getElementById("weatherTemp").textContent = weather ? `${Math.round(weather.temperature_2m)}°C` : "--°C";
  document.getElementById("weatherStatus").textContent = errorText || (weather ? weatherLabel(weather.weather_code) : "Search for a city to load current weather.");
  document.getElementById("weatherLocation").textContent = weather?.location || "No location selected";
  document.getElementById("humidityValue").textContent = weather ? `${weather.relative_humidity_2m}%` : "--%";
  document.getElementById("windValue").textContent = weather ? `${Math.round(weather.wind_speed_10m)} km/h` : "--";
  document.getElementById("visibilityValue").textContent = weather ? `${(weather.visibility / 1000).toFixed(1)} km` : "--";
  document.getElementById("feelsLikeValue").textContent = weather ? `${Math.round(weather.apparent_temperature)}°C` : "--°C";
  document.getElementById("weatherUpdated").textContent = weather ? `Updated ${new Date().toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" })}` : "Waiting for weather data";
}

function fetchWeatherByLocation() {
  if (!navigator.geolocation) {
    notify("Geolocation is not supported in this browser.", "error");
    return;
  }
  navigator.geolocation.getCurrentPosition(async (position) => {
    try {
      const { latitude, longitude } = position.coords;
      const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,weather_code,relative_humidity_2m,wind_speed_10m,visibility&timezone=auto`);
      const data = await weatherRes.json();
      state.weather = { ...data.current, location: "Your current location" };
      renderWeather();
      notify("Weather loaded for your location.", "success");
    } catch {
      notify("Unable to load weather for your location.", "error");
    }
  }, () => notify("Location access was denied or unavailable.", "error"), {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 60000
  });
}

async function fetchPrayerTimes(lat, lon, locationName = null) {
  try {
    const prefs = {
      method: document.getElementById("methodSelect").value,
      school: document.getElementById("schoolSelect").value
    };
    save(STORAGE.prayer, JSON.stringify(prefs));
    const today = new Date();
    const day = String(today.getDate()).padStart(2, "0");
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const year = today.getFullYear();
    const response = await fetch(`https://api.aladhan.com/v1/timings/${day}-${month}-${year}?latitude=${lat}&longitude=${lon}&method=${prefs.method}&school=${prefs.school}`);
    const data = await response.json();
    if (data.code !== 200 || !data.data?.timings) throw new Error("Unable to load prayer times.");
    state.prayer = {
      location: locationName || data.data.meta?.timezone || "Selected location",
      timezone: data.data.meta?.timezone || "UTC",
      lat, lon,
      method: prefs.method,
      school: prefs.school,
      timings: data.data.timings
    };
    renderPrayerTimes();
    notify("Prayer times loaded successfully.", "success");
  } catch (error) {
    notify(error.message, "error");
  }
}

async function prayerByCity() {
  const city = document.getElementById("manualCity").value.trim();
  if (!city) {
    notify("Please enter a city name.", "error");
    return;
  }
  try {
    const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
    const geo = await geoRes.json();
    if (!geo.results?.length) throw new Error("City not found.");
    const match = geo.results[0];
    await fetchPrayerTimes(match.latitude, match.longitude, `${match.name}${match.country ? `, ${match.country}` : ""}`);
  } catch (error) {
    notify(error.message, "error");
  }
}

function prayerByLocation() {
  if (!navigator.geolocation) {
    notify("Geolocation is not supported in this browser.", "error");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (position) => fetchPrayerTimes(position.coords.latitude, position.coords.longitude, "Your current location"),
    () => notify("Location access was denied or unavailable.", "error"),
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}

function renderPrayerTimes() {
  const host = document.getElementById("prayerList");
  if (!state.prayer) {
    host.innerHTML = '<p class="subtle">Prayer times will appear here after loading a location.</p>';
    return;
  }
  const current = zonedDate(new Date(), state.prayer.timezone);
  const currentMinutes = current.getHours() * 60 + current.getMinutes();
  let nextPrayer = null;
  for (const prayer of prayerDefs) {
    const prayerMinutes = parsePrayerMinutes(state.prayer.timings[prayer.key]);
    if (prayerMinutes > currentMinutes) {
      nextPrayer = { ...prayer, remaining: prayerMinutes - currentMinutes, tomorrow: false };
      break;
    }
  }
  if (!nextPrayer) {
    nextPrayer = { ...prayerDefs[0], remaining: 24 * 60 - currentMinutes + parsePrayerMinutes(state.prayer.timings.Fajr), tomorrow: true };
  }
  host.innerHTML = `
    <div style="margin-bottom: 12px;">
      <h3>${state.prayer.location}</h3>
      <p class="muted">Method: ${prayerMethods[state.prayer.method]} | Asr: ${asrMethods[state.prayer.school]}</p>
      <p class="muted">Next prayer: ${nextPrayer.name} in ${Math.floor(nextPrayer.remaining / 60)}h ${nextPrayer.remaining % 60}m${nextPrayer.tomorrow ? " (tomorrow)" : ""}</p>
    </div>
    ${prayerDefs.map((prayer) => `
      <div class="prayer-card ${!nextPrayer.tomorrow && nextPrayer.key === prayer.key ? "current" : ""}">
        <div>
          <strong>${prayer.name}</strong> <span class="subtle">${prayer.arabic}</span>
          <div class="subtle">${prayer.note}</div>
        </div>
        <div class="prayer-clock">${state.prayer.timings[prayer.key].split(" ")[0]}</div>
      </div>
    `).join("")}
  `;
}

function estimateHijriMonthDates(month, year) {
  const approxYear = Math.round((year - 1) * 0.970224 + 621.5774);
  let cursor = new Date(Date.UTC(approxYear - 1, 0, 1));
  const dates = [];
  for (let i = 0; i < 1400; i += 1) {
    const hijri = formatHijriParts(cursor, "UTC");
    if (hijri.year === year && hijri.month === month) {
      dates.push(new Date(cursor));
    } else if (dates.length && (hijri.year > year || (hijri.year === year && hijri.month > month))) {
      break;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

function renderGregorianCalendar() {
  const host = document.getElementById("gregCalendar");
  const first = new Date(state.gregYear, state.gregMonth, 1);
  const last = new Date(state.gregYear, state.gregMonth + 1, 0);
  document.getElementById("gregLabel").textContent = new Intl.DateTimeFormat(locale(), { month: "long", year: "numeric" }).format(first);
  host.innerHTML = "";
  dayNames[state.language].forEach((day) => host.insertAdjacentHTML("beforeend", `<div class="calendar-cell header">${day}</div>`));
  for (let i = 0; i < first.getDay(); i += 1) host.insertAdjacentHTML("beforeend", '<div class="calendar-cell empty"></div>');
  const today = dateParts(new Date(), state.timezone);
  for (let day = 1; day <= last.getDate(); day += 1) {
    const hijri = formatHijriParts(new Date(state.gregYear, state.gregMonth, day), state.timezone);
    host.insertAdjacentHTML("beforeend", `
      <div class="calendar-cell ${today.year === state.gregYear && today.month === state.gregMonth + 1 && today.day === day ? "today" : ""}">
        <span>${day}</span>
        <small>${hijri.day}</small>
      </div>
    `);
  }
}

function renderHijriCalendar() {
  const host = document.getElementById("hijriCalendar");
  const dates = estimateHijriMonthDates(hijriCursor.month, hijriCursor.year);
  host.innerHTML = "";
  dayNames[state.language].forEach((day) => host.insertAdjacentHTML("beforeend", `<div class="calendar-cell header">${day}</div>`));
  if (!dates.length) {
    document.getElementById("hijriLabel").textContent = `${state.language === "ar" ? "Hijri month unavailable" : "Hijri month unavailable"}`;
    host.insertAdjacentHTML("beforeend", '<div class="calendar-cell empty"></div>');
    notify("Hijri month data could not be resolved for that view.", "error");
    return;
  }
  document.getElementById("hijriLabel").textContent = formatHijriMonthLabel(dates[0], "UTC");
  for (let i = 0; i < dates[0].getUTCDay(); i += 1) host.insertAdjacentHTML("beforeend", '<div class="calendar-cell empty"></div>');
  const todayHijri = formatHijriParts(new Date(), "UTC");
  dates.forEach((date) => {
    const hijri = formatHijriParts(date, "UTC");
    const greg = new Intl.DateTimeFormat(locale(), { month: "short", day: "numeric" }).format(date);
    host.insertAdjacentHTML("beforeend", `
      <div class="calendar-cell ${todayHijri.year === hijri.year && todayHijri.month === hijri.month && todayHijri.day === hijri.day ? "hijri-today" : ""}">
        <span>${hijri.day}</span>
        <small>${greg}</small>
      </div>
    `);
  });
}

function renderCalendars() {
  document.getElementById("gregorianPanel").style.display = state.showGregorian ? "block" : "none";
  document.getElementById("hijriPanel").style.display = state.showGregorian ? "none" : "block";
  document.getElementById("calendarToggleBtn").textContent = state.showGregorian ? "Show Hijri Calendar" : "Show Gregorian Calendar";
  renderGregorianCalendar();
  renderHijriCalendar();
}

function renderLaps() {
  const host = document.getElementById("lapList");
  host.innerHTML = state.laps.length
    ? state.laps.map((lap) => `<div class="lap-card">${lap}</div>`).join("")
    : '<div class="panel">No lap times yet.</div>';
}

function renderAlarms() {
  document.getElementById("alarmSummary").textContent = state.alarms.length
    ? `${state.alarms.length} alarm${state.alarms.length === 1 ? "" : "s"} set`
    : "No alarms yet.";
  const host = document.getElementById("alarmList");
  host.innerHTML = state.alarms.length
    ? state.alarms.map((alarm, index) => `
      <div class="alarm-card">
        <div>
          <strong>${String(alarm.hour).padStart(2, "0")}:${String(alarm.min).padStart(2, "0")}</strong>
          <div class="subtle">${alarm.label}</div>
        </div>
        <button class="secondary" type="button" onclick="removeAlarm(${index})">Remove</button>
      </div>
    `).join("")
    : '<div class="panel">No alarms yet.</div>';
}

function startStopwatch() {
  if (state.stopwatchRunning) return;
  state.stopwatchRunning = true;
  state.stopwatchStart = Date.now() - state.stopwatchElapsed;
  state.stopwatchTimer = setInterval(() => {
    state.stopwatchElapsed = Date.now() - state.stopwatchStart;
    document.getElementById("stopwatchDisplay").textContent = formatStopwatch(state.stopwatchElapsed);
  }, 10);
}

function pauseStopwatch() {
  state.stopwatchRunning = false;
  clearInterval(state.stopwatchTimer);
}

function resetStopwatch() {
  pauseStopwatch();
  state.stopwatchElapsed = 0;
  state.laps = [];
  document.getElementById("stopwatchDisplay").textContent = "00:00:00.00";
  renderLaps();
}

function addLap() {
  if (!state.stopwatchRunning) return;
  state.laps.unshift(`Lap ${state.laps.length + 1}: ${formatStopwatch(state.stopwatchElapsed)}`);
  renderLaps();
}

function startTimer() {
  const total = ((+document.getElementById("timerHours").value || 0) * 3600 + (+document.getElementById("timerMinutes").value || 0) * 60 + (+document.getElementById("timerSeconds").value || 0)) * 1000;
  if (!state.timerPaused && total <= 0) {
    notify("Please set a timer duration first.", "error");
    return;
  }
  state.timerEnd = Date.now() + (state.timerPaused ? state.timerRemaining : total);
  state.timerPaused = false;
  state.timerRunning = true;
  clearInterval(state.timerId);
  state.timerId = setInterval(() => {
    const remaining = state.timerEnd - Date.now();
    if (remaining <= 0) {
      clearInterval(state.timerId);
      state.timerRunning = false;
      state.timerRemaining = 0;
      document.getElementById("timerDisplay").textContent = "00:00:00";
      notify("Timer finished.", "success");
      playSound();
      return;
    }
    state.timerRemaining = remaining;
    document.getElementById("timerDisplay").textContent = formatCountdown(remaining);
  }, 200);
}

function pauseTimer() {
  if (!state.timerRunning) return;
  clearInterval(state.timerId);
  state.timerRunning = false;
  state.timerPaused = true;
}

function stopTimer() {
  clearInterval(state.timerId);
  state.timerRunning = false;
  state.timerPaused = false;
  state.timerRemaining = 0;
  document.getElementById("timerDisplay").textContent = "00:00:00";
}

function addAlarm() {
  const hour = +document.getElementById("alarmHour").value;
  const min = +document.getElementById("alarmMinute").value;
  const label = document.getElementById("alarmLabel").value.trim() || "Alarm";
  if (!Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(min) || min < 0 || min > 59) {
    notify("Enter a valid alarm time.", "error");
    return;
  }
  state.alarms.push({ hour, min, label, triggeredOn: null });
  state.alarms.sort((a, b) => (a.hour * 60 + a.min) - (b.hour * 60 + b.min));
  save(STORAGE.alarms, JSON.stringify(state.alarms));
  renderAlarms();
  notify(`Alarm set for ${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}.`, "success");
}

function removeAlarm(index) {
  state.alarms.splice(index, 1);
  save(STORAGE.alarms, JSON.stringify(state.alarms));
  renderAlarms();
}

window.removeAlarm = removeAlarm;

function clearAlarms() {
  state.alarms = [];
  save(STORAGE.alarms, JSON.stringify(state.alarms));
  renderAlarms();
  notify("All alarms cleared.", "success");
}

function checkAlarms(now) {
  const stamp = alarmStamp(now);
  let changed = false;
  state.alarms.forEach((alarm) => {
    if (alarm.hour === now.getHours() && alarm.min === now.getMinutes() && alarm.triggeredOn !== stamp) {
      alarm.triggeredOn = stamp;
      changed = true;
      notify(`Alarm: ${alarm.label}`, "success");
      playSound();
    }
  });
  if (changed) save(STORAGE.alarms, JSON.stringify(state.alarms));
}

function exportData() {
  const payload = {
    exportedAt: new Date().toISOString(),
    timezone: state.timezone,
    language: state.language,
    weather: state.weather,
    prayer: state.prayer,
    alarms: state.alarms
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "horizon-time-export.json";
  link.click();
  URL.revokeObjectURL(url);
  notify("Data exported successfully.", "success");
}

function playSound() {
  const audio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGJ0fPTgjMGHm7A7+OZURE");
  audio.play().catch(() => {});
}

function bindEvents() {
  document.getElementById("themeBtn").addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    applyTheme();
  });
  document.getElementById("exportBtn").addEventListener("click", exportData);
  document.getElementById("language").addEventListener("change", (event) => {
    state.language = event.target.value;
    save(STORAGE.language, state.language);
    updateClock();
    renderCalendars();
  });
  document.getElementById("timezone").addEventListener("change", (event) => {
    state.timezone = event.target.value;
    save(STORAGE.timezone, state.timezone);
    updateClock();
    renderCalendars();
  });
  document.getElementById("weatherSearchBtn").addEventListener("click", fetchWeather);
  document.getElementById("weatherLocationBtn").addEventListener("click", fetchWeatherByLocation);
  document.getElementById("cityInput").addEventListener("keydown", (event) => { if (event.key === "Enter") fetchWeather(); });
  document.getElementById("prayerLocationBtn").addEventListener("click", prayerByLocation);
  document.getElementById("manualPrayerBtn").addEventListener("click", prayerByCity);
  document.getElementById("manualCity").addEventListener("keydown", (event) => { if (event.key === "Enter") prayerByCity(); });
  document.getElementById("methodSelect").addEventListener("change", () => { if (state.prayer) fetchPrayerTimes(state.prayer.lat, state.prayer.lon, state.prayer.location); });
  document.getElementById("schoolSelect").addEventListener("change", () => { if (state.prayer) fetchPrayerTimes(state.prayer.lat, state.prayer.lon, state.prayer.location); });
  document.getElementById("calendarToggleBtn").addEventListener("click", () => { state.showGregorian = !state.showGregorian; renderCalendars(); });
  document.getElementById("gregPrevBtn").addEventListener("click", () => {
    if (state.gregMonth === 0) { state.gregMonth = 11; state.gregYear -= 1; } else { state.gregMonth -= 1; }
    renderGregorianCalendar();
  });
  document.getElementById("gregNextBtn").addEventListener("click", () => {
    if (state.gregMonth === 11) { state.gregMonth = 0; state.gregYear += 1; } else { state.gregMonth += 1; }
    renderGregorianCalendar();
  });
  document.getElementById("hijriPrevBtn").addEventListener("click", () => {
    if (hijriCursor.month === 1) { hijriCursor.month = 12; hijriCursor.year -= 1; } else { hijriCursor.month -= 1; }
    renderHijriCalendar();
  });
  document.getElementById("hijriNextBtn").addEventListener("click", () => {
    if (hijriCursor.month === 12) { hijriCursor.month = 1; hijriCursor.year += 1; } else { hijriCursor.month += 1; }
    renderHijriCalendar();
  });
  document.getElementById("swStartBtn").addEventListener("click", startStopwatch);
  document.getElementById("swPauseBtn").addEventListener("click", pauseStopwatch);
  document.getElementById("swResetBtn").addEventListener("click", resetStopwatch);
  document.getElementById("swLapBtn").addEventListener("click", addLap);
  document.getElementById("timerStartBtn").addEventListener("click", startTimer);
  document.getElementById("timerPauseBtn").addEventListener("click", pauseTimer);
  document.getElementById("timerStopBtn").addEventListener("click", stopTimer);
  document.getElementById("addAlarmBtn").addEventListener("click", addAlarm);
  document.getElementById("clearAlarmsBtn").addEventListener("click", clearAlarms);
}

function init() {
  renderLayouts();
  buildSelects();
  buildTabs();
  applyTheme();
  renderWeather();
  renderPrayerTimes();
  renderAlarms();
  renderLaps();
  renderCalendars();
  bindEvents();
  updateClock();
  setInterval(updateClock, 1000);
  fetchWeather();
}

init();
