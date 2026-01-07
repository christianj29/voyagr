import { starterActivities } from "./data.js";

const STORAGE_PREFIX = "voyagr.activities.";

const apiConfig = window.VOYAGR_API || {};
const activityUrls = apiConfig.activities || {};
const uploadUrl = apiConfig.uploadUrl;
const uploadsBaseUrl = apiConfig.uploadsBaseUrl;
const apiHeaders = apiConfig.headers || {};

const withQueryParam = (url, key, value) => {
  if (!url) {
    return "";
  }
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}${encodeURIComponent(key)}=${encodeURIComponent(
    value
  )}`;
};

const withId = (url, id) => {
  if (!url) {
    return "";
  }
  if (url.includes("{id}")) {
    return url.replace("{id}", encodeURIComponent(id));
  }
  return withQueryParam(url, "id", id);
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getStorageKey = (countryCode) => `${STORAGE_PREFIX}${countryCode}`;

const ensureSeeded = (countryCode) => {
  const key = getStorageKey(countryCode);
  if (localStorage.getItem(key)) {
    return;
  }
  const seed = starterActivities[countryCode] ?? [];
  localStorage.setItem(key, JSON.stringify(seed));
};

const localList = (countryCode) => {
  ensureSeeded(countryCode);
  const raw = localStorage.getItem(getStorageKey(countryCode)) ?? "[]";
  return JSON.parse(raw);
};

const localSave = (countryCode, items) => {
  localStorage.setItem(getStorageKey(countryCode), JSON.stringify(items));
};

export const activityApi = {
  async list(countryCode) {
    if (activityUrls.listUrl) {
      const res = await fetch(
        withQueryParam(activityUrls.listUrl, "country", countryCode),
        { headers: apiHeaders }
      );
      const text = await res.text();
      if (!text) {
        return [];
      }
      try {
        const data = JSON.parse(text);
        if (Array.isArray(data)) {
          return data;
        }
        if (data && Array.isArray(data.Documents)) {
          return data.Documents;
        }
        if (data && Array.isArray(data.value)) {
          return data.value;
        }
        return [];
      } catch {
        return [];
      }
    }
    await sleep(120);
    return localList(countryCode);
  },
  async create(countryCode, payload) {
    if (activityUrls.createUrl) {
      const res = await fetch(activityUrls.createUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...apiHeaders },
        body: JSON.stringify({ ...payload, countrycode: countryCode }),
      });
      return res.json();
    }
    const items = localList(countryCode);
    const next = { ...payload, id: crypto.randomUUID() };
    items.unshift(next);
    localSave(countryCode, items);
    return next;
  },
  async update(countryCode, id, payload) {
    if (activityUrls.updateUrl) {
      const res = await fetch(withId(activityUrls.updateUrl, id), {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...apiHeaders },
        body: JSON.stringify({ ...payload, countrycode: countryCode }),
      });
      return res.json();
    }
    const items = localList(countryCode);
    const updated = items.map((item) =>
      item.id === id ? { ...item, ...payload } : item
    );
    localSave(countryCode, updated);
    return updated.find((item) => item.id === id);
  },
  async remove(countryCode, id) {
    if (activityUrls.deleteUrl) {
      await fetch(withId(activityUrls.deleteUrl, id), {
        method: "DELETE",
        headers: { "x-country-code": countryCode, ...apiHeaders },
      });
      return { id };
    }
    const items = localList(countryCode);
    const next = items.filter((item) => item.id !== id);
    localSave(countryCode, next);
    return { id };
  },
  async uploadPhoto(file) {
    if (!uploadUrl) {
      const reader = new FileReader();
      return new Promise((resolve, reject) => {
        reader.onerror = () => reject(new Error("Failed to read file."));
        reader.onload = () =>
          resolve({ url: String(reader.result || ""), name: file.name });
        reader.readAsDataURL(file);
      });
    }

    const payload = {
      fileName: file.name,
      contentType: file.type,
      base64: "",
    };

    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 1) {
      binary += String.fromCharCode(bytes[i]);
    }
    payload.base64 = btoa(binary);

    const res = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...apiHeaders },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    if (!text) {
      return {
        url: uploadsBaseUrl ? `${uploadsBaseUrl}/${file.name}` : "",
        name: file.name,
      };
    }
    try {
      const data = JSON.parse(text);
      return {
        url: data.url || (uploadsBaseUrl ? `${uploadsBaseUrl}/${file.name}` : ""),
        name: file.name,
      };
    } catch {
      return {
        url: uploadsBaseUrl ? `${uploadsBaseUrl}/${file.name}` : "",
        name: file.name,
      };
    }
  },
};
