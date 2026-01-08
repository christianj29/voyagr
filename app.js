const countries = window.VOYAGR_COUNTRIES || [];
const apiConfig = window.VOYAGR_API || {};
const searchUrl = apiConfig.searchUrl;
const apiHeaders = apiConfig.headers || {};

const searchForm = document.getElementById("country-search-form");
const searchInput = document.getElementById("country-search");
const resultsEl = document.getElementById("search-results");
const statusEl = document.getElementById("search-status");

const goToCountry = (country) => {
  if (!country) {
    return;
  }
  const params = new URLSearchParams({
    code: country.code,
    name: country.name,
  });
  window.location.href = `country.html?${params.toString()}`;
};

const normalizeCountry = (item) => {
  if (!item) {
    return null;
  }
  const code = item.code || item.Code || item.countryCode || item.countrycode;
  const name = item.name || item.Name || item.countryName || item.country;
  if (!code || !name) {
    return null;
  }
  return { code, name };
};

const localMatches = (query) => {
  const needle = query.toLowerCase();
  return countries
    .filter(
      (country) =>
        country.name.toLowerCase().includes(needle) ||
        country.code.toLowerCase().includes(needle)
    )
    .slice(0, 8);
};

const parseSearchResponse = (text) => {
  if (!text) {
    return [];
  }
  try {
    const data = JSON.parse(text);
    if (Array.isArray(data)) {
      return data;
    }
    if (Array.isArray(data.value)) {
      return data.value;
    }
    if (Array.isArray(data.Documents)) {
      return data.Documents;
    }
    return [];
  } catch {
    return [];
  }
};

const fetchSearchResults = async (query) => {
  if (!searchUrl) {
    return localMatches(query);
  }
  const url = new URL(searchUrl);
  url.searchParams.set("q", query);
  const res = await fetch(url, { headers: apiHeaders });
  const text = await res.text();
  const items = parseSearchResponse(text);
  const normalized = items.map(normalizeCountry).filter(Boolean);
  if (!normalized.length) {
    return localMatches(query);
  }
  return normalized.slice(0, 8);
};

const renderResults = (items) => {
  if (!resultsEl) {
    return;
  }
  resultsEl.innerHTML = "";
  if (!items.length) {
    resultsEl.hidden = true;
    return;
  }
  items.forEach((item, index) => {
    const entry = normalizeCountry(item) || item;
    if (!entry) {
      return;
    }
    const button = document.createElement("button");
    button.type = "button";
    button.className = "search-item";
    button.dataset.code = entry.code;
    button.dataset.name = entry.name;
    button.dataset.index = String(index);
    button.innerHTML = `<strong>${entry.name}</strong><span>${entry.code}</span>`;
    resultsEl.appendChild(button);
  });
  resultsEl.hidden = false;
};

let searchTimer = null;
let latestResults = [];
let searchSequence = 0;

const runSearch = async (query) => {
  const trimmed = query.trim();
  if (!trimmed) {
    latestResults = [];
    if (statusEl) {
      statusEl.textContent = "";
    }
    renderResults([]);
    return;
  }
  if (trimmed.length < 2) {
    latestResults = [];
    if (statusEl) {
      statusEl.textContent = "Type at least 2 letters";
    }
    renderResults([]);
    return;
  }
  const seq = (searchSequence += 1);
  if (statusEl) {
    statusEl.textContent = "Searching...";
  }
  const results = await fetchSearchResults(trimmed);
  if (seq !== searchSequence) {
    return;
  }
  latestResults = results;
  if (statusEl) {
    statusEl.textContent = results.length ? "" : "No matches found";
  }
  renderResults(results);
};

if (searchInput) {
  searchInput.addEventListener("input", (event) => {
    const value = event.target.value;
    if (searchTimer) {
      window.clearTimeout(searchTimer);
    }
    searchTimer = window.setTimeout(() => runSearch(value), 200);
  });
}

if (resultsEl) {
  resultsEl.addEventListener("click", (event) => {
    const target = event.target.closest(".search-item");
    if (!target) {
      return;
    }
    const code = target.dataset.code;
    const name = target.dataset.name;
    const match =
      countries.find((country) => country.code === code) || { code, name };
    goToCountry(match);
  });
}

if (searchForm) {
  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (latestResults.length) {
      const match = normalizeCountry(latestResults[0]) || latestResults[0];
      goToCountry(match);
      return;
    }
    if (searchInput?.value) {
      const matches = localMatches(searchInput.value);
      if (matches.length) {
        goToCountry(matches[0]);
      }
    }
  });
}

window.initMap = () => {
  const map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 20, lng: 0 },
    zoom: 2,
    minZoom: 2,
    maxZoom: 6,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
  });

  countries.forEach((country) => {
    const marker = new google.maps.Marker({
      position: { lat: country.lat, lng: country.lng },
      map,
      title: country.name,
    });

    marker.addListener("click", () => {
      goToCountry(country);
    });
  });
};
