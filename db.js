// Persistenz über das zentrale ToolsUebersicht-Login-Gateway.
// Gleiches Gateway-Muster (inkl. Datei-Anhänge) wie digitaler-stempel/vereinskalender —
// 1:1 aus E:\digitaler-stempel\db.js übernommen, nur GATEWAY_APP_ID angepasst.
const GATEWAY_URL = "https://landingpage.michel-brunner.workers.dev";
const TOKEN_STORAGE_KEY = "tu_session_token";
const GATEWAY_APP_ID = "fahrtenbuch";

class NotLoggedInError extends Error {
  constructor(message) {
    super(message || "Nicht angemeldet");
    this.name = "NotLoggedInError";
  }
}

class ConflictError extends Error {
  constructor(message) {
    super(message || "Daten wurden zwischenzeitlich von einem anderen Gerät geändert");
    this.name = "ConflictError";
  }
}

// ETag des zuletzt geladenen/geschriebenen Stands. Wird bei dav-save mitgeschickt,
// damit der Worker Konflikte (anderes Gerät hat inzwischen gespeichert) erkennt.
let gatewayRev = null;

function getSessionToken() {
  try { return localStorage.getItem(TOKEN_STORAGE_KEY); } catch (_) { return null; }
}

async function gatewayRequest(payload) {
  const token = getSessionToken();
  if (!token) throw new NotLoggedInError();
  const resp = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
    body: JSON.stringify(payload)
  });
  if (resp.status === 401) throw new NotLoggedInError("Sitzung abgelaufen");
  if (resp.status === 403) throw new Error("Kein Zugriff auf dieses Tool.");
  if (resp.status === 409) throw new ConflictError();
  if (!resp.ok) {
    let detail = "";
    try { const b = await resp.json(); if (b && b.error) detail = ": " + b.error; } catch (_) {}
    throw new Error(`Gateway-Fehler (HTTP ${resp.status})${detail}`);
  }
  return resp.json();
}

async function gatewayLoad() {
  const body = await gatewayRequest({ action: "dav-load", app: GATEWAY_APP_ID });
  gatewayRev = typeof body.rev === "string" ? body.rev : null;
  return body.data; // Objekt oder null (Datei noch nicht vorhanden)
}

async function gatewaySave(dataObj) {
  const payload = { action: "dav-save", app: GATEWAY_APP_ID, data: dataObj };
  if (gatewayRev) payload.rev = gatewayRev;
  const body = await gatewayRequest(payload);
  gatewayRev = typeof body.rev === "string" ? body.rev : null;
}

// Liefert {username, isAdmin, groupIds, vorname, nachname, canEdit} der eingeloggten Person.
async function fetchMe() {
  return gatewayRequest({ action: "me", app: GATEWAY_APP_ID });
}

// ---------- Datei-Anhänge (Binär-Upload über das Gateway) ----------

// Liest eine Datei/Blob als reines base64 (ohne data:-Präfix) für den Transport
// im JSON-Body an dav-file-put.
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const res = String(r.result || "");
      const comma = res.indexOf(",");
      resolve(comma >= 0 ? res.slice(comma + 1) : res);
    };
    r.onerror = () => reject(new Error("Datei konnte nicht gelesen werden."));
    r.readAsDataURL(blob);
  });
}

// Lädt eine Datei (als Blob) unter der übergebenen id ins Nextcloud-Verzeichnis
// der App hoch. contentType optional, Default "application/pdf" (gestempelte
// Archiv-Dokumente) — für Stempelbilder wird der echte Bild-Mimetyp übergeben.
async function gatewayUploadFile(id, blob, filename, contentType) {
  if (blob.size > MAX_FILE_BYTES) {
    throw new Error("Datei ist zu groß (max. " + Math.round(MAX_FILE_BYTES / 1024 / 1024) + " MB).");
  }
  const dataBase64 = await blobToBase64(blob);
  await gatewayRequest({
    action: "dav-file-put",
    app: GATEWAY_APP_ID,
    id,
    name: filename,
    contentType: contentType || "application/pdf",
    dataBase64
  });
}

// Löscht eine hochgeladene Datei (Archiv-Dokument oder Stempelbild).
async function gatewayDeleteFile(id) {
  await gatewayRequest({ action: "dav-file-delete", app: GATEWAY_APP_ID, id });
}

// Holt eine hochgeladene Datei als Blob (mit Bearer-Token; die Nextcloud-Datei
// ist nicht öffentlich). Rückgabe eignet sich für URL.createObjectURL.
async function gatewayFetchFileBlob(id) {
  const token = getSessionToken();
  if (!token) throw new NotLoggedInError();
  const resp = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
    body: JSON.stringify({ action: "dav-file-get", app: GATEWAY_APP_ID, id })
  });
  if (resp.status === 401) throw new NotLoggedInError("Sitzung abgelaufen");
  if (!resp.ok) throw new Error("Datei nicht abrufbar (HTTP " + resp.status + ")");
  return resp.blob();
}

// ---------- Abgeschottete Datei-Anhänge (nur Eigentümer/Gruppe/Admin) ----------
//
// Für sensible Dokumente (Führerschein-Kopien): der Worker legt die Datei IMMER unter
// dem eigenen, aus dem Login-Token abgeleiteten Nutzernamen ab (kein id-Parameter) und
// liefert/löscht sie serverseitig NUR für den Eigentümer selbst, Admins oder Mitglieder
// der eingetragenen Einsicht-Gruppe. Damit ist die Datei — anders als bei den offenen
// dav-file-*-Anhängen — nicht für jeden mit Tool-Zugriff abrufbar.

// Lädt die eigene abgeschottete Datei hoch (überschreibt die bisherige eigene).
async function gatewayUploadRestrictedFile(blob, contentType) {
  if (blob.size > MAX_FILE_BYTES) {
    throw new Error("Datei ist zu groß (max. " + Math.round(MAX_FILE_BYTES / 1024 / 1024) + " MB).");
  }
  const dataBase64 = await blobToBase64(blob);
  await gatewayRequest({
    action: "dav-restricted-put",
    app: GATEWAY_APP_ID,
    contentType: contentType || "application/octet-stream",
    dataBase64
  });
}

// Löscht die abgeschottete Datei eines Eigentümers (owner = Nutzername; Server prüft das Recht).
async function gatewayDeleteRestrictedFile(owner) {
  await gatewayRequest({ action: "dav-restricted-delete", app: GATEWAY_APP_ID, owner });
}

// Holt die abgeschottete Datei eines Eigentümers als Blob (Server prüft die Berechtigung).
async function gatewayFetchRestrictedBlob(owner) {
  const token = getSessionToken();
  if (!token) throw new NotLoggedInError();
  const resp = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
    body: JSON.stringify({ action: "dav-restricted-get", app: GATEWAY_APP_ID, owner })
  });
  if (resp.status === 401) throw new NotLoggedInError("Sitzung abgelaufen");
  if (resp.status === 403) throw new Error("Keine Berechtigung, diese Datei zu sehen.");
  if (!resp.ok) throw new Error("Datei nicht abrufbar (HTTP " + resp.status + ")");
  return resp.blob();
}
