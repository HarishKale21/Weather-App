const API_KEY = "ca54e66135f98bb631a1f12b47b5cc99";

// State
const state = {
  units: "metric",
  lastCity: localStorage.getItem("lastCity") || "",
};

// DOM elements
const el = (id) => document.getElementById(id);
const $ = {
  city: el("city"),
  searchBtn: document.getElementById("searchBtn"),
  unitToggle: document.getElementById("unitToggle"),
  icon: document.getElementById("weather-icon"),
  temp: document.getElementById("temp"),
  desc: document.getElementById("desc"),
  place: document.getElementById("place"),
  time: document.getElementById("datetime"),
  feels: document.getElementById("feels"),
  humidity: document.getElementById("humidity"),
  wind: document.getElementById("wind"),
  pressure: document.getElementById("pressure"),
  sunrise: document.getElementById("sunrise"),
  sunset: document.getElementById("sunset"),
  hourly: document.getElementById("hourly"),
  daily: document.getElementById("daily"),
  toast: document.getElementById("toast"),
};

// Utils
const unitSymbol = () => (state.units === "metric" ? "°C" : "°F");
const mpsToKmph = (m) => Math.round(m * 3.6);
const fmtTime = (ts) =>
  new Date(ts * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const fmtDateTime = (d) =>
  d.toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit" });

// Toast
function showToast(msg) {
  $.toast.textContent = msg;
  $.toast.classList.remove("hidden");
  setTimeout(() => $.toast.classList.add("hidden"), 2200);
}

// Theme
function applyTheme(main) {
  const t = (main || "").toLowerCase();
  document.body.classList.remove("theme-clear", "theme-clouds", "theme-rain", "theme-snow");
  if (t.includes("clear")) document.body.classList.add("theme-clear");
  else if (t.includes("cloud")) document.body.classList.add("theme-clouds");
  else if (t.includes("rain") || t.includes("drizzle") || t.includes("thunder"))
    document.body.classList.add("theme-rain");
  else if (t.includes("snow")) document.body.classList.add("theme-snow");
}

// Fetch helper
async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Network error");
  return res.json();
}

// Main function
async function getWeather(city) {
  if (!city) {
    showToast("Enter a city");
    return;
  }

  try {
    const base = "https://api.openweathermap.org/data/2.5";
    const u = state.units;

    // Current Weather
    const currentURL = `${base}/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=${u}`;
    const current = await fetchJSON(currentURL);

    // Forecast (5-day/3-hour)
    const forecastURL = `${base}/forecast?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=${u}`;
    const forecast = await fetchJSON(forecastURL);

    if (String(current.cod) === "404") {
      showToast("City not found");
      return;
    }

    renderCurrent(current);
    renderHourly(forecast.list);
    renderDaily(forecast.list);

    state.lastCity = city;
    localStorage.setItem("lastCity", city);
  } catch (err) {
    console.error(err);
    showToast("Could not fetch weather");
  }
}

// Render current
function renderCurrent(d) {
  const icon = d.weather?.[0]?.icon || "01d";
  const desc = d.weather?.[0]?.description || "";

  $.icon.src = `https://openweathermap.org/img/wn/${icon}@4x.png`;
  $.icon.classList.remove("hidden");
  $.icon.alt = desc;

  const t = Math.round(d.main.temp);
  const feels = Math.round(d.main.feels_like);

  $.temp.textContent = `${t}${unitSymbol()}`;
  $.feels.textContent = `${feels}${unitSymbol()}`;
  $.desc.textContent = desc;
  $.place.textContent = `${d.name}, ${d.sys.country}`;
  $.time.textContent = fmtDateTime(new Date());

  $.humidity.textContent = `${d.main.humidity}%`;
  $.pressure.textContent = `${d.main.pressure} hPa`;
  $.wind.textContent =
    state.units === "metric"
      ? `${mpsToKmph(d.wind.speed)} km/h`
      : `${Math.round(d.wind.speed)} mph`;

  $.sunrise.textContent = fmtTime(d.sys.sunrise);
  $.sunset.textContent = fmtTime(d.sys.sunset);

  applyTheme(d.weather?.[0]?.main);
}

// Render hourly (next 8 slots ~ 24h)
function renderHourly(list) {
  $.hourly.innerHTML = "";
  const next8 = list.slice(0, 8);
  for (const item of next8) {
    const dt = new Date(item.dt * 1000);
    const hour = dt.toLocaleTimeString([], { hour: "2-digit" });
    const icon = item.weather?.[0]?.icon || "01d";
    const t = Math.round(item.main.temp);

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="s">${hour}</div>
      <img src="https://openweathermap.org/img/wn/${icon}.png" alt="${item.weather?.[0]?.description || ""}"/>
      <div class="t">${t}${unitSymbol()}</div>
    `;
    $.hourly.appendChild(card);
  }
}

// Render daily (group by day, show avg)
function renderDaily(list) {
  $.daily.innerHTML = "";
  const byDay = {};

  for (const item of list) {
    const d = new Date(item.dt * 1000).toLocaleDateString();
    (byDay[d] ||= []).push(item);
  }

  const days = Object.entries(byDay).slice(0, 5);
  for (const [date, items] of days) {
    const avg = Math.round(items.reduce((s, i) => s + i.main.temp, 0) / items.length);
    const icon = items[0].weather?.[0]?.icon || "01d";

    const node = document.createElement("div");
    node.className = "day";
    node.innerHTML = `
      <div class="d">${new Date(date).toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      })}</div>
      <img src="https://openweathermap.org/img/wn/${icon}.png" alt="${items[0].weather?.[0]?.description || ""}"/>
      <div class="t">${avg}${unitSymbol()}</div>
    `;
    $.daily.appendChild(node);
  }
}

// Fetch weather by coordinates
async function getWeatherByCoords(lat, lon) {
  try {
    const base = "https://api.openweathermap.org/data/2.5";
    const u = state.units;

    // Current Weather
    const currentURL = `${base}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${u}`;
    const current = await fetchJSON(currentURL);

    // Forecast (5-day/3-hour)
    const forecastURL = `${base}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${u}`;
    const forecast = await fetchJSON(forecastURL);

    renderCurrent(current);
    renderHourly(forecast.list);
    renderDaily(forecast.list);

    // Save city name if available
    state.lastCity = current.name;
    localStorage.setItem("lastCity", state.lastCity);
    $.city.value = current.name;
  } catch (err) {
    console.error(err);
    showToast("Could not fetch location weather");
  }
}


// Events
$.searchBtn.addEventListener("click", () => getWeather($.city.value.trim()));
$.city.addEventListener("keydown", (e) => {
  if (e.key === "Enter") getWeather($.city.value.trim());
});
$.unitToggle.addEventListener("click", () => {
  state.units = state.units === "metric" ? "imperial" : "metric";
  $.unitToggle.textContent = state.units === "metric" ? "°C" : "°F";
  if (state.lastCity) getWeather(state.lastCity);
});
// Current location button
document.getElementById("locBtn").addEventListener("click", () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        getWeatherByCoords(latitude, longitude);
      },
      (err) => {
        console.error(err);
        showToast("Location access denied");
      }
    );
  } else {
    showToast("Geolocation not supported");
  }
});


// Init
window.addEventListener("load", () => {
  if (state.lastCity) {
    $.city.value = state.lastCity;
    getWeather(state.lastCity);
  }
});
