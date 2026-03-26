/* ── Constants & State ──────────────────────────────────────── */
const STORAGE_KEY = 'waterme_plants';
const MAX_IMG_WIDTH = 800;
const MAX_IMG_HEIGHT = 800;

let plants = [];
let editingId = null; // null = adding new plant

/* ── Persistence ────────────────────────────────────────────── */
function loadPlants() {
  try {
    plants = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    plants = [];
  }
}

function savePlants() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plants));
}

/* ── Date Helpers ───────────────────────────────────────────── */
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(dateStr1, dateStr2) {
  const d1 = new Date(dateStr1);
  const d2 = new Date(dateStr2);
  return Math.round((d2 - d1) / 86400000);
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/* ── Image Resizing ─────────────────────────────────────────── */
function resizeImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image'));
      img.onload = () => {
        let { width, height } = img;
        if (width > MAX_IMG_WIDTH || height > MAX_IMG_HEIGHT) {
          const scale = Math.min(MAX_IMG_WIDTH / width, MAX_IMG_HEIGHT / height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.getElementById('resize-canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/* ── Rendering ──────────────────────────────────────────────── */
function renderAll() {
  const list = document.getElementById('plant-list');
  const emptyState = document.getElementById('empty-state');

  list.innerHTML = '';

  if (plants.length === 0) {
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;

  plants.forEach(plant => {
    list.appendChild(buildCard(plant));
  });
}

function buildCard(plant) {
  const today = todayStr();
  const daysSince = plant.lastWatered ? daysBetween(plant.lastWatered, today) : null;
  const isOverdue = plant.intervalDays && daysSince !== null && daysSince >= plant.intervalDays;
  const daysOverdue = isOverdue ? daysSince - plant.intervalDays : 0;

  const card = document.createElement('div');
  card.className = 'plant-card' + (isOverdue ? ' overdue' : '');
  card.dataset.id = plant.id;

  // ── Photo
  const photoDiv = document.createElement('div');
  photoDiv.className = 'card-photo';
  if (plant.photo) {
    const img = document.createElement('img');
    img.src = plant.photo;
    img.alt = plant.name;
    photoDiv.appendChild(img);
  } else {
    photoDiv.textContent = '🪴';
  }

  // ── Body
  const body = document.createElement('div');
  body.className = 'card-body';

  const nameEl = document.createElement('div');
  nameEl.className = 'card-name';
  nameEl.textContent = plant.name;

  const meta = document.createElement('div');
  meta.className = 'card-meta';

  const lastWateredLine = document.createElement('span');
  if (daysSince === null) {
    lastWateredLine.textContent = 'Never watered';
  } else if (daysSince === 0) {
    lastWateredLine.textContent = 'Watered today';
  } else if (daysSince === 1) {
    lastWateredLine.textContent = 'Watered yesterday';
  } else {
    lastWateredLine.textContent = `Watered ${daysSince} days ago (${formatDate(plant.lastWatered)})`;
  }

  meta.appendChild(lastWateredLine);

  if (plant.intervalDays) {
    const scheduleLine = document.createElement('span');
    scheduleLine.textContent = `Schedule: every ${plant.intervalDays} day${plant.intervalDays !== 1 ? 's' : ''}`;
    meta.appendChild(scheduleLine);
  }

  body.appendChild(nameEl);
  body.appendChild(meta);

  if (isOverdue) {
    const badge = document.createElement('span');
    badge.className = 'badge-overdue';
    badge.textContent = daysOverdue === 0 ? 'Due today' : `${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue`;
    body.appendChild(badge);
  }

  // ── Actions
  const actions = document.createElement('div');
  actions.className = 'card-actions';

  const wateredBtn = document.createElement('button');
  wateredBtn.className = 'btn btn-primary btn-watered';
  wateredBtn.textContent = '💧 Watered today';
  wateredBtn.addEventListener('click', () => updateLastWatered(plant.id, today));

  const secondaryRow = document.createElement('div');
  secondaryRow.className = 'card-secondary-actions';

  const editBtn = document.createElement('button');
  editBtn.className = 'btn btn-secondary btn-edit';
  editBtn.textContent = '✏️ Edit';
  editBtn.addEventListener('click', () => openEditModal(plant.id));

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'btn btn-danger btn-delete';
  deleteBtn.textContent = '🗑️';
  deleteBtn.setAttribute('aria-label', `Delete ${plant.name}`);
  deleteBtn.addEventListener('click', () => deletePlant(plant.id, plant.name));

  secondaryRow.appendChild(editBtn);
  secondaryRow.appendChild(deleteBtn);

  actions.appendChild(wateredBtn);
  actions.appendChild(secondaryRow);

  card.appendChild(photoDiv);
  card.appendChild(body);
  card.appendChild(actions);

  return card;
}

/* ── Plant CRUD ─────────────────────────────────────────────── */
function updateLastWatered(id, dateStr) {
  const plant = plants.find(p => p.id === id);
  if (!plant) return;
  plant.lastWatered = dateStr;
  savePlants();
  renderAll();
}

function deletePlant(id, name) {
  if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
  plants = plants.filter(p => p.id !== id);
  savePlants();
  renderAll();
}

function savePlantFromForm(photoDataUrl) {
  const name = document.getElementById('input-name').value.trim();
  const lastWatered = document.getElementById('input-last-watered').value || todayStr();
  const intervalRaw = document.getElementById('input-interval').value;
  const intervalDays = intervalRaw && parseInt(intervalRaw, 10) > 0 ? parseInt(intervalRaw, 10) : null;

  if (editingId) {
    // Update existing
    const plant = plants.find(p => p.id === editingId);
    if (!plant) return;
    plant.name = name;
    plant.lastWatered = lastWatered;
    plant.intervalDays = intervalDays;
    if (photoDataUrl !== undefined) {
      plant.photo = photoDataUrl; // null means "removed", undefined means "unchanged"
    }
  } else {
    // Add new
    plants.push({
      id: crypto.randomUUID(),
      name,
      photo: photoDataUrl || null,
      lastWatered,
      intervalDays,
    });
  }

  savePlants();
  renderAll();
  closeModal();
}

/* ── Modal ──────────────────────────────────────────────────── */
const overlay = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const form = document.getElementById('plant-form');
const inputName = document.getElementById('input-name');
const inputPhoto = document.getElementById('input-photo');
const inputLastWatered = document.getElementById('input-last-watered');
const inputInterval = document.getElementById('input-interval');
const photoPreview = document.getElementById('photo-preview');
const photoPlaceholder = document.getElementById('photo-placeholder');
const btnRemovePhoto = document.getElementById('btn-remove-photo');
const photoUploadArea = document.getElementById('photo-upload-area');

// Tracks the resolved photo for the current form session:
// - undefined = not changed (edit mode: keep existing)
// - null      = explicitly removed
// - string    = new base64 data URL
let pendingPhoto = undefined;

function openAddModal() {
  editingId = null;
  pendingPhoto = undefined;
  modalTitle.textContent = 'Add Plant';
  form.reset();
  inputLastWatered.value = todayStr();
  setPhotoPreview(null);
  overlay.hidden = false;
  inputName.focus();
}

function openEditModal(id) {
  const plant = plants.find(p => p.id === id);
  if (!plant) return;

  editingId = id;
  pendingPhoto = undefined; // unchanged until altered
  modalTitle.textContent = 'Edit Plant';

  inputName.value = plant.name;
  inputLastWatered.value = plant.lastWatered || todayStr();
  inputInterval.value = plant.intervalDays || '';
  setPhotoPreview(plant.photo);

  overlay.hidden = false;
  inputName.focus();
}

function closeModal() {
  overlay.hidden = true;
  editingId = null;
  pendingPhoto = undefined;
}

function setPhotoPreview(src) {
  if (src) {
    photoPreview.src = src;
    photoPreview.hidden = false;
    photoPlaceholder.hidden = true;
    btnRemovePhoto.hidden = false;
  } else {
    photoPreview.src = '';
    photoPreview.hidden = true;
    photoPlaceholder.hidden = false;
    btnRemovePhoto.hidden = true;
  }
}

/* ── Event Wiring ───────────────────────────────────────────── */
document.getElementById('btn-add-plant').addEventListener('click', openAddModal);
document.getElementById('btn-cancel').addEventListener('click', closeModal);

overlay.addEventListener('click', (e) => {
  if (e.target === overlay) closeModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !overlay.hidden) closeModal();
});

inputPhoto.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const dataUrl = await resizeImageFile(file);
    pendingPhoto = dataUrl;
    setPhotoPreview(dataUrl);
  } catch (err) {
    console.error(err);
    alert('Could not load the image. Please try a different file.');
  }
  // Reset so the same file can be re-selected if needed
  inputPhoto.value = '';
});

btnRemovePhoto.addEventListener('click', () => {
  pendingPhoto = null;
  setPhotoPreview(null);
});

// Drag and drop onto upload area
photoUploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  photoUploadArea.classList.add('dragover');
});
photoUploadArea.addEventListener('dragleave', () => {
  photoUploadArea.classList.remove('dragover');
});
photoUploadArea.addEventListener('drop', async (e) => {
  e.preventDefault();
  photoUploadArea.classList.remove('dragover');
  const file = e.dataTransfer?.files[0];
  if (!file || !file.type.startsWith('image/')) return;
  try {
    const dataUrl = await resizeImageFile(file);
    pendingPhoto = dataUrl;
    setPhotoPreview(dataUrl);
  } catch (err) {
    console.error(err);
    alert('Could not load the image. Please try a different file.');
  }
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = inputName.value.trim();
  if (!name) {
    inputName.classList.add('error');
    inputName.focus();
    return;
  }
  inputName.classList.remove('error');

  const saveBtn = document.getElementById('btn-save');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving…';

  try {
    // Determine final photo value
    let finalPhoto;
    if (pendingPhoto !== undefined) {
      // User explicitly changed/removed the photo
      finalPhoto = pendingPhoto;
    } else if (editingId) {
      // No change in edit mode — keep existing
      const existing = plants.find(p => p.id === editingId);
      finalPhoto = undefined; // signal to savePlantFromForm to keep existing
    } else {
      finalPhoto = null;
    }

    savePlantFromForm(finalPhoto);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save';
  }
});

inputName.addEventListener('input', () => {
  inputName.classList.remove('error');
});

/* ── Init ───────────────────────────────────────────────────── */
loadPlants();
renderAll();
