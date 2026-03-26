# 🌿 WaterMe

A simple, frontend-only app for tracking when you last watered your plants.

**Live app:** [xiangronglin.github.io/WaterMe/](https://xiangronglin.github.io/WaterMe/)

---

## Features

- **Plant list** — see all your plants at a glance in a card grid
- **Last watered tracking** — shows how many days ago each plant was watered
- **Watering schedule** — set an "every N days" schedule per plant; overdue plants get a highlighted amber badge
- **Add plants** — name, optional photo, last-watered date, optional schedule
- **Bulk add** — select multiple photos at once from your gallery and fill in each plant's details in one go
- **Edit & delete** — update any plant's details or remove it entirely
- **Sort** — sort the list by name (A→Z or Z→A) or by last-watered date (oldest or newest first)
- **Persistent** — all data is stored in your browser's `localStorage`; nothing is sent to any server

---

## Using the app

### Adding a plant
Click **+ Add Plant** in the top-right corner. Fill in:
- **Plant name** (required)
- **Photo** — pick from your gallery (on Android, selecting specific image types opens the gallery rather than the Files app); you can also drag and drop an image
- **Last watered** — defaults to today
- **Water every N days** — optional; if set, an overdue badge appears when the plant is past due

### Adding multiple plants at once
In the Add Plant modal, tap the photo field and **select multiple images** from your gallery. The modal switches to a bulk-entry view where each photo gets its own form. Fill in the names and details, then tap **Save X plants**.

### Marking a plant as watered
Click the **💧 Watered today** button on a card. To record a different date, use the **✏️ Edit** button and update the "Last watered" field.

### Editing a plant
Click **✏️ Edit** on any card to re-open the form pre-filled with that plant's current data.

### Sorting
Once you have at least one plant, a **Sort by** dropdown appears above the list. Options:
- Name A → Z / Z → A
- Last watered (oldest first / newest first)

Sort preference is remembered across page reloads.

---

## Deployment (GitHub Pages)

1. Push `index.html`, `style.css`, and `app.js` to the root of your `main` branch
2. Go to your repository **Settings → Pages**
3. Under *Source*, choose **Deploy from a branch**, select `main`, folder `/ (root)`
4. Click **Save** — GitHub will give you a URL like `https://yourusername.github.io/waterme/`

No build step needed. The app runs entirely in the browser.

---

## Data & privacy

All data lives in **your browser's `localStorage`** under the key `waterme_plants`. Nothing is sent anywhere. This also means:
- Data is device- and browser-specific (not synced across devices)
- Clearing browser storage will erase your plants
- Photos are stored as base64-encoded JPEG (scaled down to max 800×800 px). A handful of plants with normal-sized photos will comfortably fit within the typical 5–10 MB localStorage limit

---

## File structure

```
index.html   — app shell, modal markup, bulk-add overlay
style.css    — all styling (card grid, modal, sort bar, bulk-add, overdue highlight)
app.js       — all logic (localStorage CRUD, rendering, image resize, sort, bulk add)
```

No dependencies, no build tooling, no `node_modules`.

---

## Notes for a future Claude session

This section captures the full context needed to continue work on this project.

### Tech decisions
- **Vanilla HTML/CSS/JS only** — no framework, no build step. Chosen for simplicity and direct GitHub Pages deployment from repo root.
- **localStorage** for all persistence (key: `waterme_plants`; sort preference: `waterme_sort`).
- **No backend** — this is a purely static app.

### Data model
Each plant is a plain object stored in a JSON array:
```js
{
  id:          string,  // crypto.randomUUID()
  name:        string,
  photo:       string | null,  // base64 JPEG data URL, max 800×800px; null if no photo
  lastWatered: string | null,  // ISO date "YYYY-MM-DD"; null if never watered
  intervalDays: number | null  // watering schedule in days; null if not set
}
```

### Key app.js patterns
- `plants` is the in-memory array; always call `savePlants()` after mutating it, then `renderAll()`.
- `editingId` holds the `id` of the plant being edited, or `null` when adding a new one. The add and edit flows share a single modal (`#modal-overlay`) and form (`#plant-form`).
- `pendingPhoto` tracks photo state within the modal:
  - `undefined` — no change (edit mode: keep existing photo)
  - `null` — user explicitly removed the photo
  - `string` — new base64 data URL chosen this session
- Bulk add uses a separate overlay (`#bulk-overlay`). Selecting ≥2 files in the single-plant modal triggers `openBulkModal(files)`, which closes the regular modal and opens the bulk one.
- Image resizing uses a hidden `<canvas id="resize-canvas">` — images are drawn onto it scaled to fit within `MAX_IMG_WIDTH` × `MAX_IMG_HEIGHT` (both 800), then exported as JPEG at 85% quality.
- `sortOrder` persists to `localStorage` as `waterme_sort`. Valid values: `name-asc`, `name-desc`, `watered-asc`, `watered-desc`.
- `renderAll()` reads the sort order and calls `sortedPlants()` to build the display order without mutating the underlying `plants` array.
- Overdue logic: a card gets the `overdue` class (amber border + badge) when `intervalDays` is set and `daysBetween(lastWatered, today) >= intervalDays`.

### CSS notes
- CSS custom properties (variables) are defined on `:root` in `style.css` — tweak colours there first.
- The modal overlay scrolls (not the modal itself) — `overflow-y: auto` is on `.modal-overlay`, and the `.modal` has no `max-height`.
- The sort bar (`#sort-bar`) is hidden via JS when the plant list is empty, and shown when there's ≥1 plant.
- Overdue styling: `.plant-card.overdue` gets an amber border and light amber background; `.badge-overdue` is the pill badge inside the card body.
