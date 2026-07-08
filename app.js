// ---------- Helpers ----------
function uuid() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return "fxxxxxxxx".replace(/x/g, () => ((Math.random() * 16) | 0).toString(16));
}
function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function val(id) { const el = document.getElementById(id); return el ? el.value : ""; }
function setVal(id, v) { const el = document.getElementById(id); if (el) el.value = v == null ? "" : v; }
function setChk(id, v) { const el = document.getElementById(id); if (el) el.checked = !!v; }

const WOCHENTAGE_KURZ = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
function fmtDatum(iso) {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return iso;
  const wd = WOCHENTAGE_KURZ[d.getDay()];
  return `${wd}, ${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}
function fmtTimestamp(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" });
}
function fmtDate(d) {
  if (!(d instanceof Date) || isNaN(d.getTime())) return "—";
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

const STATUS_LABEL = { offen: "offen", abgeschlossen: "abgeschlossen" };
const STATUS_FARBE = { offen: "#c9941f", abgeschlossen: "#2d8c4e" };

// ---------- State ----------
let appData = { meta: {}, fahrten: [] };
let currentUser = null;
let currentTab = "fahrten";
let persistTimer = null;

let editingFahrtId = null;           // null = neue Fahrt
let editingFotos = [];               // [{id,name,contentType}] – Arbeitskopie
let originalFotoIds = [];            // Foto-Ids beim Öffnen (bereits gespeicherte Fahrt)
let addedFotoIds = [];              // in dieser Sitzung neu hochgeladene Ids
let signaturePad = null;

// ---------- Normalisierung ----------
function normalizeFoto(f) {
  const d = f && typeof f === "object" ? f : {};
  if (!d.id) return null;
  return { id: String(d.id), name: typeof d.name === "string" ? d.name : "Foto", contentType: typeof d.contentType === "string" ? d.contentType : "" };
}
function normalizeFahrt(f) {
  const d = f && typeof f === "object" ? f : {};
  const out = {
    id: d.id || uuid(),
    erstelltVon: typeof d.erstelltVon === "string" ? d.erstelltVon : "",
    erstelltAm: typeof d.erstelltAm === "string" ? d.erstelltAm : "",
    fahrerName: typeof d.fahrerName === "string" ? d.fahrerName : "",
    kennzeichen: typeof d.kennzeichen === "string" ? d.kennzeichen : "",
    abteilung: typeof d.abteilung === "string" ? d.abteilung : "",
    anzahlInsassen: typeof d.anzahlInsassen === "string" ? d.anzahlInsassen : (d.anzahlInsassen != null ? String(d.anzahlInsassen) : ""),
    reiseziel: typeof d.reiseziel === "string" ? d.reiseziel : "",
    kmStart: d.kmStart != null ? String(d.kmStart) : "",
    kmEnde: d.kmEnde != null ? String(d.kmEnde) : "",
    datumStart: typeof d.datumStart === "string" ? d.datumStart : "",
    datumEnde: typeof d.datumEnde === "string" ? d.datumEnde : "",
    uhrzeitStart: typeof d.uhrzeitStart === "string" ? d.uhrzeitStart : "",
    uhrzeitEnde: typeof d.uhrzeitEnde === "string" ? d.uhrzeitEnde : "",
    uebernahmeVon: typeof d.uebernahmeVon === "string" ? d.uebernahmeVon : "",
    abholort: typeof d.abholort === "string" ? d.abholort : "",
    uebergabeAn: typeof d.uebergabeAn === "string" ? d.uebergabeAn : "",
    abstellort: typeof d.abstellort === "string" ? d.abstellort : "",
    maengelText: typeof d.maengelText === "string" ? d.maengelText : "",
    maengelFotos: Array.isArray(d.maengelFotos) ? d.maengelFotos.map(normalizeFoto).filter(Boolean) : [],
    unterschriftDataUrl: (typeof d.unterschriftDataUrl === "string" && /^data:image\//.test(d.unterschriftDataUrl)) ? d.unterschriftDataUrl : "",
    status: d.status === "abgeschlossen" ? "abgeschlossen" : "offen"
  };
  ALLE_CHECK_KEYS.forEach((k) => { out[k] = !!d[k]; });
  return out;
}
function normalizeData(data) {
  const d = data && typeof data === "object" ? data : {};
  const meta = d.meta && typeof d.meta === "object" ? Object.assign({}, d.meta) : {};
  return {
    meta,
    fahrten: Array.isArray(d.fahrten) ? d.fahrten.map(normalizeFahrt) : []
  };
}

// ---------- Zugriff ----------
function canEdit() { return !!currentUser && (currentUser.isAdmin || !!currentUser.canEdit); }
function myUsername() { return currentUser ? currentUser.username : ""; }
function myName() {
  if (!currentUser) return "";
  const n = `${currentUser.vorname || ""} ${currentUser.nachname || ""}`.trim();
  return n || currentUser.username || "";
}
function canManageFahrt(fahrt) { return canEdit() || (fahrt.erstelltVon && fahrt.erstelltVon === myUsername()); }

// ---------- Fahrten-Liste ----------
function visibleFahrten() {
  return canEdit() ? appData.fahrten.slice() : appData.fahrten.filter((f) => f.erstelltVon === myUsername());
}
function fillFahrerFilter() {
  const el = document.getElementById("fahrten-fahrer");
  if (!el) return;
  const cur = el.value;
  const namen = Array.from(new Set(appData.fahrten.map((f) => f.fahrerName).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  el.innerHTML = `<option value="">Alle Fahrer</option>` + namen.map((n) => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join("");
  if (namen.includes(cur)) el.value = cur;
}
function renderFahrten() {
  const q = val("fahrten-search").trim().toLowerCase();
  const ff = canEdit() ? val("fahrten-fahrer") : "";
  const all = visibleFahrten();
  const rows = all.filter((f) => {
    if (ff && f.fahrerName !== ff) return false;
    if (q && !`${f.reiseziel} ${f.abteilung} ${f.kennzeichen} ${f.fahrerName}`.toLowerCase().includes(q)) return false;
    return true;
  }).sort((a, b) => (b.datumStart || "").localeCompare(a.datumStart || "") || (b.erstelltAm || "").localeCompare(a.erstelltAm || ""));

  document.getElementById("fahrten-list").innerHTML = rows.map((f) => {
    const farbe = STATUS_FARBE[f.status] || STATUS_FARBE.offen;
    const sub = [f.abteilung, canEdit() ? ("Fahrer: " + (f.fahrerName || "—")) : null].filter(Boolean).map(escapeHtml).join(" · ");
    const fotos = f.maengelFotos.length ? ` · 📷 ${f.maengelFotos.length}` : "";
    return `<div class="fahrt-row" data-id="${escapeHtml(f.id)}">
      <div class="fr-main">
        <div class="fr-title">${escapeHtml(fmtDatum(f.datumStart))} — ${escapeHtml(f.reiseziel || "ohne Ziel")}</div>
        <div class="fr-sub muted">${sub}${fotos}</div>
      </div>
      <span class="status-badge" style="background:${farbe}">${escapeHtml(STATUS_LABEL[f.status] || f.status)}</span>
    </div>`;
  }).join("");
  document.getElementById("fahrten-count").textContent = `${rows.length} von ${all.length}`;
  document.getElementById("fahrten-empty").classList.toggle("hidden", rows.length > 0);
}

// ---------- Fahrt-Formular ----------
function renderChecks(containerId, defs, fahrt) {
  document.getElementById(containerId).innerHTML = defs.map((c) =>
    `<label class="checkbox-row"><input type="checkbox" data-check="${escapeHtml(c.key)}" ${fahrt && fahrt[c.key] ? "checked" : ""} /> <span>${escapeHtml(c.label)}</span></label>`
  ).join("");
}
function renderFotoList() {
  const el = document.getElementById("ff-foto-list");
  if (!editingFotos.length) { el.innerHTML = `<p class="muted" style="margin:0;">Noch keine Fotos.</p>`; return; }
  el.innerHTML = editingFotos.map((f) => `
    <div class="foto-chip" data-foto="${escapeHtml(f.id)}">
      <span class="foto-name">📷 ${escapeHtml(f.name)}</span>
      <button type="button" class="foto-view" data-view-foto="${escapeHtml(f.id)}">ansehen</button>
      <button type="button" class="foto-remove" data-remove-foto="${escapeHtml(f.id)}" title="Entfernen">×</button>
    </div>`).join("");
}
function openFahrt(id) {
  const fahrt = id ? appData.fahrten.find((f) => f.id === id) : null;
  if (id && !fahrt) return;
  if (fahrt && !canManageFahrt(fahrt)) { alert("Diese Fahrt gehört einem anderen Fahrer."); return; }
  editingFahrtId = fahrt ? fahrt.id : null;
  editingFotos = fahrt ? fahrt.maengelFotos.map((f) => Object.assign({}, f)) : [];
  originalFotoIds = editingFotos.map((f) => f.id);
  addedFotoIds = [];

  document.getElementById("fahrt-modal-title").textContent = fahrt ? "Fahrt bearbeiten" : "Neue Fahrt";
  setVal("ff-kennzeichen", fahrt ? fahrt.kennzeichen : "");
  setVal("ff-fahrer", fahrt ? fahrt.fahrerName : myName());
  setVal("ff-abteilung", fahrt ? fahrt.abteilung : "");
  setVal("ff-insassen", fahrt ? fahrt.anzahlInsassen : "");
  setVal("ff-reiseziel", fahrt ? fahrt.reiseziel : "");
  setVal("ff-kmstart", fahrt ? fahrt.kmStart : "");
  setVal("ff-kmende", fahrt ? fahrt.kmEnde : "");
  setVal("ff-datumstart", fahrt ? fahrt.datumStart : "");
  setVal("ff-uhrzeitstart", fahrt ? fahrt.uhrzeitStart : "");
  setVal("ff-datumende", fahrt ? fahrt.datumEnde : "");
  setVal("ff-uhrzeitende", fahrt ? fahrt.uhrzeitEnde : "");
  setVal("ff-uebernahme", fahrt ? fahrt.uebernahmeVon : "");
  setVal("ff-abholort", fahrt ? fahrt.abholort : "");
  setVal("ff-uebergabe", fahrt ? fahrt.uebergabeAn : "");
  setVal("ff-abstellort", fahrt ? fahrt.abstellort : "");
  setVal("ff-maengel", fahrt ? fahrt.maengelText : "");
  renderChecks("ff-anforderungen", ANFORDERUNGEN, fahrt);
  renderChecks("ff-kontrolle-vor", KONTROLLE_VOR, fahrt);
  renderChecks("ff-kontrolle-nach", KONTROLLE_NACH, fahrt);
  renderFotoList();
  document.getElementById("ff-hinweis").textContent = HINWEIS_ABSCHLUSS;
  document.getElementById("btn-delete-fahrt").classList.toggle("hidden", !(fahrt && canManageFahrt(fahrt)));

  document.getElementById("fahrt-modal").classList.remove("hidden");
  // Signatur-Canvas ist jetzt sichtbar -> Größe/Backing neu setzen, dann Inhalt laden.
  signaturePad.resize();
  signaturePad.resetSilent();
  if (fahrt && fahrt.unterschriftDataUrl) signaturePad.loadDataURL(fahrt.unterschriftDataUrl);
  signaturePad.resize();
  document.getElementById("ff-kennzeichen").focus();
}
async function closeFahrt(discardUploads) {
  document.getElementById("fahrt-modal").classList.add("hidden");
  if (discardUploads && addedFotoIds.length) {
    // In dieser Sitzung hochgeladene, aber nie gespeicherte Fotos wieder entfernen.
    const ids = addedFotoIds.slice();
    ids.forEach((id) => { gatewayDeleteFile(id).catch(() => {}); });
  }
  editingFahrtId = null; editingFotos = []; originalFotoIds = []; addedFotoIds = [];
}
function collectChecks(target) {
  document.querySelectorAll("#fahrt-form input[data-check]").forEach((el) => { target[el.dataset.check] = el.checked; });
}
async function saveFahrt(status) {
  const fahrerName = val("ff-fahrer").trim();
  const reiseziel = val("ff-reiseziel").trim();
  if (!fahrerName) { alert("Bitte den Namen des Fahrers angeben."); return; }
  if (status === "abgeschlossen") {
    if (!reiseziel) { alert("Bitte ein Reiseziel angeben."); return; }
    if (signaturePad.isEmpty()) { alert("Bitte unterschreiben, um die Fahrt abzuschließen."); return; }
  }
  let fahrt = editingFahrtId ? appData.fahrten.find((f) => f.id === editingFahrtId) : null;
  if (!fahrt) {
    fahrt = normalizeFahrt({ id: uuid(), erstelltVon: myUsername(), erstelltAm: new Date().toISOString() });
    appData.fahrten.push(fahrt);
  }
  fahrt.fahrerName = fahrerName;
  fahrt.kennzeichen = val("ff-kennzeichen").trim();
  fahrt.abteilung = val("ff-abteilung").trim();
  fahrt.anzahlInsassen = val("ff-insassen").trim();
  fahrt.reiseziel = reiseziel;
  fahrt.kmStart = val("ff-kmstart").trim();
  fahrt.kmEnde = val("ff-kmende").trim();
  fahrt.datumStart = val("ff-datumstart");
  fahrt.uhrzeitStart = val("ff-uhrzeitstart");
  fahrt.datumEnde = val("ff-datumende");
  fahrt.uhrzeitEnde = val("ff-uhrzeitende");
  fahrt.uebernahmeVon = val("ff-uebernahme").trim();
  fahrt.abholort = val("ff-abholort").trim();
  fahrt.uebergabeAn = val("ff-uebergabe").trim();
  fahrt.abstellort = val("ff-abstellort").trim();
  fahrt.maengelText = val("ff-maengel").trim();
  collectChecks(fahrt);
  fahrt.unterschriftDataUrl = signaturePad.toDataURL();
  fahrt.status = status;

  // Fotos abgleichen: entfernte (Original oder in dieser Sitzung hochgeladen) löschen.
  const keepIds = editingFotos.map((f) => f.id);
  const toDelete = originalFotoIds.concat(addedFotoIds).filter((id, i, a) => a.indexOf(id) === i && !keepIds.includes(id));
  toDelete.forEach((id) => { gatewayDeleteFile(id).catch(() => {}); });
  fahrt.maengelFotos = editingFotos.map((f) => ({ id: f.id, name: f.name, contentType: f.contentType }));

  addedFotoIds = []; // gespeichert -> nicht mehr als "unbestätigt" behandeln
  await closeFahrt(false);
  renderAll();
  await saveNow();
}
async function deleteFahrt() {
  if (!editingFahrtId) return;
  const fahrt = appData.fahrten.find((f) => f.id === editingFahrtId);
  if (!fahrt || !canManageFahrt(fahrt)) return;
  if (!confirm("Diese Fahrt wirklich löschen?")) return;
  fahrt.maengelFotos.forEach((f) => { gatewayDeleteFile(f.id).catch(() => {}); });
  appData.fahrten = appData.fahrten.filter((f) => f.id !== editingFahrtId);
  addedFotoIds = []; // beim Löschen nichts extra aufräumen (Original-Fotos sind oben dran)
  await closeFahrt(false);
  renderAll();
  await saveNow();
}

// ---------- Foto-Upload (im Fahrt-Formular) ----------
async function addFotos(fileList) {
  const btn = document.getElementById("btn-foto-upload");
  const files = Array.from(fileList || []);
  for (const file of files) {
    if (file.size > MAX_FILE_BYTES) { alert(`„${file.name}“ ist zu groß (max. ${Math.round(MAX_FILE_BYTES / 1024 / 1024)} MB).`); continue; }
    const id = uuid();
    btn.disabled = true; btn.textContent = "Lädt hoch…";
    try {
      await gatewayUploadFile(id, file, file.name, file.type || "image/jpeg");
      editingFotos.push({ id, name: file.name, contentType: file.type || "image/jpeg" });
      addedFotoIds.push(id);
      renderFotoList();
    } catch (e) {
      alert("Upload fehlgeschlagen: " + e.message);
    } finally {
      btn.disabled = false; btn.textContent = "Foto hinzufügen…";
    }
  }
}
function removeFotoFromEditing(id) {
  if (!confirm("Dieses Foto entfernen?")) return;
  editingFotos = editingFotos.filter((f) => f.id !== id);
  renderFotoList();
}

// ---------- Datei-Viewer ----------
async function showInViewer(name, contentType, getBlob) {
  const modal = document.getElementById("viewer-modal");
  const body = document.getElementById("viewer-body");
  document.getElementById("viewer-title").textContent = name || "Datei";
  body.innerHTML = `<p class="muted" id="viewer-loading">Wird geladen…</p>`;
  modal.classList.remove("hidden");
  try {
    const blob = await getBlob();
    const url = URL.createObjectURL(blob);
    modal.dataset.objurl = url;
    const ct = contentType || blob.type || "";
    if (/^image\//.test(ct)) {
      body.innerHTML = `<img src="${url}" alt="${escapeHtml(name || "")}" class="viewer-img" />`;
    } else if (ct === "application/pdf") {
      body.innerHTML = `<iframe src="${url}" class="viewer-frame" title="${escapeHtml(name || "")}"></iframe>`;
    } else {
      body.innerHTML = `<a class="btn" href="${url}" download="${escapeHtml(name || "datei")}">Herunterladen</a>`;
    }
  } catch (e) {
    body.innerHTML = `<p class="muted">Datei nicht abrufbar: ${escapeHtml(e.message)}</p>`;
  }
}
// Mängel-Foto (offener dateien/-Ordner, nur Tool-Zugriff nötig).
function viewFile(id, name, contentType) { return showInViewer(name, contentType, () => gatewayFetchFileBlob(id)); }
function closeViewer() {
  const modal = document.getElementById("viewer-modal");
  modal.classList.add("hidden");
  if (modal.dataset.objurl) { URL.revokeObjectURL(modal.dataset.objurl); delete modal.dataset.objurl; }
  document.getElementById("viewer-body").innerHTML = "";
}

// ---------- Einstellungen / Meta / Nutzer ----------
function renderMeta() {
  const m = appData.meta || {};
  const rows = [
    ["Fahrten erfasst", String(appData.fahrten.length)],
    ["Letzter Stand", m.stand ? new Date(m.stand).toLocaleString("de-DE") : "—"]
  ];
  document.getElementById("meta-view").innerHTML = rows.map(([k, v]) =>
    `<div class="form-field"><label>${escapeHtml(k)}</label><span>${escapeHtml(v)}</span></div>`).join("");
}
function renderVersionInfo() {
  document.querySelectorAll("#version-badge, #version-badge-2").forEach((el) => { if (el) el.textContent = "v" + APP_VERSION; });
  const list = document.getElementById("changelog-list");
  if (!list) return;
  list.innerHTML = APP_CHANGELOG.map((entry) => `
    <div class="changelog-entry">
      <div class="cv">Version ${escapeHtml(entry.version)}</div>
      ${entry.groups.map((g) => `
        <div class="changelog-group">
          <div class="cg-title">${escapeHtml(g.title)}</div>
          <ul class="cg-items">${g.items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>
        </div>`).join("")}
    </div>`).join("");
}
function renderHeaderUser() {
  const el = document.getElementById("header-user");
  const el2 = document.getElementById("einstellungen-user");
  if (!currentUser) { if (el) el.textContent = ""; if (el2) el2.textContent = ""; return; }
  const rolle = currentUser.isAdmin ? " (Admin)" : (canEdit() ? " (Bearbeiter)" : "");
  if (el) el.textContent = "👤 " + myName() + rolle;
  if (el2) el2.textContent = "Angemeldet als " + myName() + rolle +
    (canEdit() ? " — sieht und verwaltet alle Fahrten." : " — legt und sieht eigene Fahrten an.");
}
function applyEditVisibility() {
  const editable = canEdit();
  document.body.classList.toggle("can-edit", editable);
  document.querySelectorAll(".editor-only").forEach((el) => el.classList.toggle("hidden", !editable));
}

function renderAll() {
  fillFahrerFilter();
  renderFahrten();
  renderMeta();
  renderVersionInfo();
  applyEditVisibility();
}

// ---------- Tabs ----------
function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll("nav button").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
  document.querySelectorAll(".tab-section").forEach((s) => s.classList.toggle("active", s.id === "tab-" + tab));
  if (tab === "fahrten") { fillFahrerFilter(); renderFahrten(); }
  if (tab === "einstellungen") { renderMeta(); renderVersionInfo(); }
}

// ---------- Gateway: Laden / Speichern / Konflikte ----------
function setSaveStatus(text, kind) {
  const el = document.getElementById("save-status");
  if (!el) return;
  el.textContent = text;
  el.className = "header-status" + (kind ? " is-" + kind : "");
}
function persist() {
  clearTimeout(persistTimer);
  setSaveStatus("Änderung noch nicht gespeichert…", "pending");
  persistTimer = setTimeout(doPersist, 300);
}
async function saveNow() { clearTimeout(persistTimer); return doPersist(); }
async function doPersist() {
  setSaveStatus("Speichern…", "pending");
  try {
    appData.meta = Object.assign({}, appData.meta, { stand: new Date().toISOString() });
    await gatewaySave(appData);
    const t = new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
    setSaveStatus("Gespeichert " + t, "ok");
    return true;
  } catch (e) {
    if (e instanceof ConflictError) { await reloadAfterConflict(); setSaveStatus("Von anderem Gerät aktualisiert", ""); return false; }
    if (e instanceof NotLoggedInError) { showConnectScreen("Sitzung abgelaufen — bitte neu anmelden."); return false; }
    console.error("Speichern fehlgeschlagen", e);
    setSaveStatus("Nicht gespeichert", "error");
    alert("Speichern fehlgeschlagen: " + e.message);
    return false;
  }
}
async function reloadAfterConflict() {
  try {
    const data = await gatewayLoad();
    appData = normalizeData(data);
    renderAll();
    alert("Die Daten wurden zwischenzeitlich auf einem anderen Gerät geändert — die aktuelle Version wurde neu geladen. Bitte die letzte Änderung bei Bedarf erneut vornehmen.");
  } catch (e) { console.error("Neuladen nach Konflikt fehlgeschlagen", e); }
}

// ---------- Start ----------
function showConnectScreen(errorMsg) {
  document.getElementById("connect-screen").style.display = "";
  document.getElementById("app-shell").style.display = "none";
  document.getElementById("cloud-error").textContent = errorMsg ? "Fehler: " + errorMsg : "";
}
async function startApp() {
  document.getElementById("connect-screen").style.display = "none";
  document.getElementById("app-shell").style.display = "";
  renderAll();
  try { currentUser = await fetchMe(); } catch (_) { /* best effort */ }
  renderHeaderUser();
  renderAll();
}
async function init() {
  setupListeners();
  signaturePad = createSignaturePad(document.getElementById("ff-signature"));
  if (!getSessionToken()) { showConnectScreen(); return; }
  try {
    const data = await gatewayLoad();
    appData = normalizeData(data);
    await startApp();
  } catch (e) {
    if (e instanceof NotLoggedInError) { showConnectScreen(); return; }
    console.error("Nextcloud-Zugriff über Login fehlgeschlagen", e);
    showConnectScreen(e.message);
  }
}

function setupListeners() {
  document.querySelectorAll("nav button").forEach((b) => b.addEventListener("click", () => switchTab(b.dataset.tab)));

  const versionBadgeHeader = document.getElementById("version-badge");
  versionBadgeHeader.addEventListener("click", () => switchTab("einstellungen"));
  versionBadgeHeader.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); switchTab("einstellungen"); }
  });

  // Fahrten-Liste
  ["fahrten-search", "fahrten-fahrer"].forEach((id) => {
    const el = document.getElementById(id);
    el.addEventListener("input", renderFahrten);
    el.addEventListener("change", renderFahrten);
  });
  document.getElementById("fahrten-list").addEventListener("click", (e) => {
    const row = e.target.closest(".fahrt-row");
    if (row) openFahrt(row.dataset.id);
  });
  document.getElementById("btn-new-fahrt").addEventListener("click", () => openFahrt(null));

  // Fahrt-Modal
  document.getElementById("fahrt-modal-close").addEventListener("click", () => closeFahrt(true));
  document.getElementById("btn-cancel-fahrt").addEventListener("click", () => closeFahrt(true));
  document.getElementById("btn-save-fahrt-offen").addEventListener("click", () => saveFahrt("offen"));
  document.getElementById("btn-save-fahrt-abschluss").addEventListener("click", () => saveFahrt("abgeschlossen"));
  document.getElementById("btn-delete-fahrt").addEventListener("click", deleteFahrt);
  document.getElementById("fahrt-modal").addEventListener("click", (e) => { if (e.target.id === "fahrt-modal") closeFahrt(true); });
  document.getElementById("fahrt-form").addEventListener("submit", (e) => { e.preventDefault(); saveFahrt("offen"); });

  // Signatur
  document.getElementById("btn-signature-clear").addEventListener("click", () => signaturePad.clear());

  // Foto-Upload im Formular
  document.getElementById("btn-foto-upload").addEventListener("click", () => document.getElementById("ff-foto-input").click());
  document.getElementById("ff-foto-input").addEventListener("change", (e) => { addFotos(e.target.files); e.target.value = ""; });
  document.getElementById("ff-foto-list").addEventListener("click", (e) => {
    const rm = e.target.closest("[data-remove-foto]");
    if (rm) { removeFotoFromEditing(rm.dataset.removeFoto); return; }
    const vw = e.target.closest("[data-view-foto]");
    if (vw) { const f = editingFotos.find((x) => x.id === vw.dataset.viewFoto); if (f) viewFile(f.id, f.name, f.contentType); }
  });

  // Viewer
  document.getElementById("viewer-close").addEventListener("click", closeViewer);
  document.getElementById("viewer-modal").addEventListener("click", (e) => { if (e.target.id === "viewer-modal") closeViewer(); });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!document.getElementById("viewer-modal").classList.contains("hidden")) closeViewer();
    else if (!document.getElementById("fahrt-modal").classList.contains("hidden")) closeFahrt(true);
  });
}

document.addEventListener("DOMContentLoaded", init);
