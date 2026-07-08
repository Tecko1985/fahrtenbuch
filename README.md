# Fahrtenbuch / Fahrer-Checkliste

Digitale Ablösung der Papier-„Fahrer-Checkliste für SCH“ — Gateway-App der
[ToolsUebersicht](https://tecko1985.github.io/ToolsUebersicht/)-Familie. Jeder
eingeloggte Nutzer (Fahrer) erfasst pro Fahrt mit einem Vereinsfahrzeug ein
Fahrtenprotokoll mit Sicherheits-Checklisten und Unterschrift.

Live: https://tecko1985.github.io/fahrtenbuch/

## Funktionen

- **Fahrten:** Fahrzeug-/Fahrtdaten (Kennzeichen, Fahrer, Abteilung/Mannschaft,
  Insassen, Reiseziel, Kilometerstand, Datum/Uhrzeit Start+Ende, Übernahme/Übergabe),
  Sicherheits-Checklisten vor und nach der Fahrt, Mängel als Freitext **plus
  Foto-Upload**, handschriftliche **Unterschrift** (Canvas). Fahrten können als
  „offen“ zwischengespeichert und später abgeschlossen werden.
- **Checklisten:** gültiger Führerschein, Mindestalter, kein Alkohol, Verkehrs- und
  Betriebssicherheit, Sichtkontrolle, vollgetankt und Reinigung — direkt zum Abhaken.
  Die Führerschein-Kopie selbst wird in
  [Trainerdaten](https://tecko1985.github.io/Trainerdaten/) hinterlegt, nicht hier.
- **Rechte:** jeder eingeloggte Nutzer legt/sieht seine **eigenen** Fahrten;
  Admin und die Gruppe `fahrtenbuch-bearbeiter` sehen und verwalten **alle Fahrten**.

## Architektur

Vanilla JS, kein Build-Step. Persistenz über das zentrale ToolsUebersicht-Login-Gateway
(`db.js`, `GATEWAY_APP_ID = "fahrtenbuch"`), Daten in Nextcloud unter
`.../05_Nachwuchsbereich/02_Förderung/Tools/Fahrtenbuch/fahrtenbuch.json`.
Mängel-Fotos liegen als Binärdateien im Unterordner `dateien/`
(Gateway-Aktionen `dav-file-put`/`dav-file-get`/`dav-file-delete`, ≤ 10 MB je Datei; in der
JSON nur die Referenz `{id, name, contentType}`). Die Unterschrift wird als kleine
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
