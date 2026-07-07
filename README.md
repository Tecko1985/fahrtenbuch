# Fahrtenbuch / Fahrer-Checkliste

Digitale Ablösung der Papier-„Fahrer-Checkliste für SCH“ — 13. Gateway-App der
[ToolsUebersicht](https://tecko1985.github.io/ToolsUebersicht/)-Familie. Jeder
eingeloggte Nutzer (Fahrer) erfasst pro Fahrt mit einem Vereinsfahrzeug ein
Fahrtenprotokoll und hinterlegt einmal pro Saison seine Führerschein-Kopie.

Live: https://tecko1985.github.io/fahrtenbuch/

## Funktionen

- **Fahrten:** Fahrzeug-/Fahrtdaten (Kennzeichen, Fahrer, Abteilung/Mannschaft,
  Insassen, Reiseziel, Kilometerstand, Datum/Uhrzeit Start+Ende, Übernahme/Übergabe),
  Sicherheits-Checklisten vor und nach der Fahrt, Mängel als Freitext **plus
  Foto-Upload**, handschriftliche **Unterschrift** (Canvas). Fahrten können als
  „offen“ zwischengespeichert und später abgeschlossen werden.
- **Führerschein:** jeder Fahrer lädt seine Führerschein-Kopie hoch (am Handy direkt per
  Kamera); nach der ersten Einreichung ist sie **alle 6 Monate** zu erneuern — die App
  zeigt „gültig bis …“ bzw. „abgelaufen“. Ein Register (Fahrer · eingereicht · gültig bis ·
  Status) sehen **nur** Admin und die Gruppe `fuehrerschein-einsicht`.
- **Rechte:** jeder eingeloggte Nutzer legt/sieht seine **eigenen** Fahrten;
  Admin und die Gruppe `fahrtenbuch-bearbeiter` sehen und verwalten **alle Fahrten**.
  Die Einsicht in fremde Führerschein-Kopien ist davon getrennt und liegt allein bei
  Admin + Gruppe `fuehrerschein-einsicht` (jeder sieht immer seine eigene Kopie).

> **Vertraulichkeit der Führerschein-Kopien:** Die eingereichten Kopien liegen in einem
> **serverseitig abgeschotteten** Bereich (`fuehrerscheine/`, abgelegt unter dem Nutzernamen).
> Das Gateway liefert eine Kopie nur an den **Eigentümer selbst, an Admins und an die Gruppe
> `fuehrerschein-einsicht`** aus — nicht an jeden, der Zugriff auf das Tool hat. Damit sind
> die sensiblen Dokumente auch dann geschützt, wenn das Tool für „alle eingeloggten Nutzer“
> freigegeben ist. Nur die reinen Metadaten (wer hat wann eingereicht, gültig bis) stehen
> weiterhin in der gemeinsamen App-Datei. (Die Mängel-Fotos einer Fahrt liegen dagegen im
> offenen `dateien/`-Bereich und sind für alle mit Tool-Zugriff abrufbar.)

## Architektur

Vanilla JS, kein Build-Step. Persistenz über das zentrale ToolsUebersicht-Login-Gateway
(`db.js`, `GATEWAY_APP_ID = "fahrtenbuch"`), Daten in Nextcloud unter
`.../05_Nachwuchsbereich/02_Förderung/Tools/Fahrtenbuch/fahrtenbuch.json`.
Mängel-Fotos liegen als Binärdateien im **offenen** Unterordner `dateien/`
(Gateway-Aktionen `dav-file-put`/`dav-file-get`/`dav-file-delete`, ≤ 10 MB je Datei; in der
JSON nur die Referenz `{id, name, contentType}`). Führerschein-Kopien liegen dagegen im
**abgeschotteten** Unterordner `fuehrerscheine/`, abgelegt unter dem Nutzernamen, über die
Aktionen `dav-restricted-put`/`dav-restricted-get`/`dav-restricted-delete`: der Worker gibt
sie nur an Eigentümer/Admin/Gruppe `fuehrerschein-einsicht` heraus (serverseitig erzwungen,
siehe `RESTRICTED_FILE_APPS` in `admin-worker.js`). Die Unterschrift wird als kleine
PNG-DataURL inline gespeichert.

Dateien: `index.html`, `app.js`, `config.js`, `db.js`, `signature-pad.js`, `style.css`,
`logo.png`. `db.js` ist aus `digitaler-stempel` übernommen (nur App-Id angepasst),
`signature-pad.js` aus `trainerkodex`/`TrainerCheckliste`.

## Deploy / Registrierung

- `E:\.claude\launch.json` — Eintrag `fahrtenbuch`, Port 8796 (lokaler Dev-Server).
- `E:\ToolsUebersicht\config.js` — `TOOLS`-Eintrag `id:"fahrtenbuch"` + `NEWS`-Eintrag.
- `E:\ToolsUebersicht\admin-worker.js` — `DAV_APPS["fahrtenbuch"]` + `ALLOWED_ORIGINS`
  um `http://localhost:8796`. **Worker-Redeploy nötig** (Cloudflare); der App-Ordner
  inkl. `dateien/` wird beim ersten Speichern per MKCOL-Autofix angelegt.
- Sichtbarkeit im Admin-Panel: **„Alle eingeloggten Nutzer“** (jeder Fahrer nutzt die
  App). Optional Gruppe `fahrtenbuch-bearbeiter` für die Voll-Sicht.

## Akzeptierte Limitierungen

- Konfliktschutz = Erkennen (409) + Neuladen, kein Merge (Standard aller Gateway-Apps).
- Eigentümer-Filterung ist UI-seitig — wer Tool-Zugriff hat, kann technisch die ganze
  Datei speichern (gilt für alle Gateway-Apps).
- Kein PDF-/Export in v1.0 (nur Online-Ansicht).
