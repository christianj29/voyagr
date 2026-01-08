import { activityApi } from "./api.js";

const params = new URLSearchParams(window.location.search);
const code = params.get("code") || "US";
const paramName = params.get("name");
const countries = window.VOYAGR_COUNTRIES || [];
const country =
  countries.find((item) => item.code === code) ?? countries[0] ?? null;

const nameEl = document.getElementById("country-name");
const blurbEl = document.getElementById("country-blurb");
const listEl = document.getElementById("activity-list");
const formEl = document.getElementById("activity-form");
const idEl = document.getElementById("activity-id");
const titleEl = document.getElementById("title");
const descEl = document.getElementById("description");
const locationEl = document.getElementById("location");
const dateEl = document.getElementById("date");
const ratingEl = document.getElementById("rating");
const cancelButton = document.getElementById("cancel-button");
const photoDrop = document.getElementById("photo-drop");
const photoInput = document.getElementById("photo-input");
const photoPreview = document.getElementById("photo-preview");
const photoImg = document.getElementById("photo-img");
const photoClear = document.getElementById("photo-clear");
const photoPrompt = document.getElementById("photo-prompt");

let photoFile = null;
let photoUrl = "";
let photoName = "";

nameEl.textContent = paramName ?? country?.name ?? code;
blurbEl.textContent =
  country?.blurb ?? `Explore popular activities and add your own in ${code}.`;

let activities = [];
let editingId = null;

const normalizeId = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  return value;
};

const getActivityId = (activity) =>
  normalizeId(
    activity?.id ??
      activity?.Id ??
      activity?._id ??
      activity?.ID ??
      activity?.activityId ??
      activity?.ActivityId ??
      null
  );

const setEditing = (activity) => {
  editingId = getActivityId(activity);
  idEl.value = editingId ?? "";
  titleEl.value = activity?.title ?? "";
  descEl.value = activity?.description ?? "";
  locationEl.value = activity?.location ?? "";
  dateEl.value = activity?.date ?? "";
  ratingEl.value = activity?.rating ?? "5";
  photoUrl = activity?.photoUrl ?? activity?.photoDataUrl ?? "";
  photoName = activity?.photoName ?? "";
  photoFile = null;
  if (photoUrl) {
    photoImg.src = photoUrl;
    photoPreview.hidden = false;
    photoPrompt.textContent = photoName || "Photo selected";
  } else {
    photoImg.removeAttribute("src");
    photoPreview.hidden = true;
    photoPrompt.textContent = "Drag & drop or click to upload";
  }
  cancelButton.style.display = editingId ? "inline-flex" : "none";
};

const renderActivities = () => {
  listEl.innerHTML = "";
  if (!activities.length) {
    listEl.innerHTML = `<p>No activities yet. Add the first story!</p>`;
    return;
  }

  activities.forEach((activity, index) => {
    const activityId = getActivityId(activity);
    const card = document.createElement("article");
    card.className = "activity-card";
    card.innerHTML = `
      <header>
        <h3>${activity.title}</h3>
        <span class="activity-meta">${activity.date}</span>
      </header>
      <p>${activity.description}</p>
      <p class="activity-meta">Location: ${activity.location ?? "N/A"}</p>
      <p class="activity-meta">Rating: ${activity.rating}/5</p>
      ${
        activity.photoUrl
          ? `<img src="${activity.photoUrl}" alt="Photo from ${activity.title}" />`
          : activity.photoDataUrl
            ? `<img src="${activity.photoDataUrl}" alt="Photo from ${activity.title}" />`
            : ""
      }
      <div class="activity-actions">
        <button type="button" data-action="edit" data-id="${activityId ?? ""}" data-index="${index}">
          Edit
        </button>
        <button type="button" class="ghost" data-action="delete" data-id="${activityId ?? ""}" data-index="${index}">
          Delete
        </button>
      </div>
    `;
    listEl.appendChild(card);
  });
};

const refresh = async () => {
  const all = await activityApi.list(country.code);
  const codeMatch = (activity) =>
    activity?.countrycode === code || activity?.countryCode === code;
  activities = Array.isArray(all) ? all.filter(codeMatch) : [];
  renderActivities();
};

listEl.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button) {
    return;
  }
  const index = Number(button.dataset.index);
  const id = button.dataset.id || null;
  const action = button.dataset.action;
  const target = Number.isInteger(index) ? activities[index] : null;
  if (!target) {
    return;
  }

  if (action === "edit") {
    setEditing(target);
  }

  if (action === "delete") {
    const targetId = getActivityId(target) || id;
    if (!targetId) {
      alert("Missing activity id for deletion.");
      return;
    }
    await activityApi.remove(country.code, targetId);
    await refresh();
    setEditing(null);
  }
});

formEl.addEventListener("submit", async (event) => {
  event.preventDefault();
  let uploadedUrl = photoUrl;
  if (photoFile) {
    const result = await activityApi.uploadPhoto(photoFile);
    uploadedUrl = result.url;
  }
  const formId = normalizeId(idEl.value?.trim());
  const resolvedId = normalizeId(editingId ?? formId);
  const isEditing = resolvedId !== null;
  const payload = {
    id:
      resolvedId ??
      (typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`),
    title: titleEl.value.trim(),
    description: descEl.value.trim(),
    location: locationEl.value.trim(),
    date: dateEl.value,
    rating: Number(ratingEl.value),
    photoUrl: uploadedUrl || "",
    photoName: photoName || "",
  };

  if (isEditing) {
    await activityApi.update(country.code, resolvedId, payload);
  } else {
    await activityApi.create(country.code, payload);
  }

  await refresh();
  setEditing(null);
  formEl.reset();
  photoFile = null;
  photoUrl = "";
  photoName = "";
  photoImg.removeAttribute("src");
  photoPreview.hidden = true;
  photoInput.value = "";
  photoPrompt.textContent = "Drag & drop or click to upload";
});

cancelButton.addEventListener("click", () => {
  setEditing(null);
  formEl.reset();
});

const handlePhotoFile = (file) => {
  if (!file) {
    return;
  }
  if (!file.type.startsWith("image/")) {
    alert("Please choose an image file.");
    return;
  }
  if (file.size > 1024 * 1024) {
    alert("Please choose an image under 1 MB.");
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    photoUrl = String(reader.result || "");
    photoFile = file;
    photoName = file.name;
    photoImg.src = photoUrl;
    photoPreview.hidden = false;
    photoPrompt.textContent = file.name;
  };
  reader.readAsDataURL(file);
};

photoDrop.addEventListener("click", () => {
  photoInput.click();
});

photoDrop.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    photoInput.click();
  }
});

photoInput.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  handlePhotoFile(file);
});

photoDrop.addEventListener("dragover", (event) => {
  event.preventDefault();
  photoDrop.classList.add("dragover");
});

photoDrop.addEventListener("dragleave", () => {
  photoDrop.classList.remove("dragover");
});

photoDrop.addEventListener("drop", (event) => {
  event.preventDefault();
  photoDrop.classList.remove("dragover");
  const file = event.dataTransfer?.files?.[0];
  handlePhotoFile(file);
});

photoClear.addEventListener("click", () => {
  photoFile = null;
  photoUrl = "";
  photoName = "";
  photoImg.removeAttribute("src");
  photoPreview.hidden = true;
  photoInput.value = "";
  photoPrompt.textContent = "Drag & drop or click to upload";
});

setEditing(null);
refresh();
