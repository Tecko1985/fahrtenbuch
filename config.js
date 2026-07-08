const APP_VERSION = "1.0";

// Größenlimit pro hochgeladener Datei (Schadensfoto) — muss zum
// Worker-Cap (admin-worker.js MAX_FILE_BYTES) passen.
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

// Checklisten-Gruppen des Fahrer-Protokolls (1:1 aus der Papiervorlage). Jeder Eintrag
// { key, label } wird als Checkbox gerendert; key ist zugleich das Feld im Fahrt-Datensatz.
const ANFORDERUNGEN = [
  { key: "chkFuehrerschein", label: "Besitz eines gültigen Führerscheins (Kopie der Fahrerlaubnis alle 6 Monate in Trainerdaten hochladen)" },
  { key: "chkMindestalter", label: "Mindestalter des Fahrers: 23 Jahre" },
  { key: "chkKeinAlkohol", label: "Kein Alkohol- oder Drogenkonsum vor und während der Fahrzeugnutzung" }
];

const KONTROLLE_VOR = [
  { key: "chkSicherheitVor", label: "Überprüfung der Verkehrs- und Betriebssicherheit (z. B. Tanken, Motoröl, Wasser, etc.)" },
  { key: "chkSichtVor", label: "Sichtkontrolle zu Beschädigungen durchgeführt" }
];

const KONTROLLE_NACH = [
  { key: "chkVollgetankt", label: "Fahrzeug vollgetankt" },
  { key: "chkReinigung", label: "Fahrzeugreinigung durchgeführt (besenrein)" },
  { key: "chkSicherheitNach", label: "Erneute Überprüfung der Verkehrs- und Betriebssicherheit durchgeführt" },
  { key: "chkSichtNach", label: "Erneute Sichtkontrolle zu Beschädigungen durchgeführt" }
];

// Alle Checkbox-Keys in einer Liste — für Normalisierung/Default-Werte.
const ALLE_CHECK_KEYS = [].concat(
  ANFORDERUNGEN.map((c) => c.key),
  KONTROLLE_VOR.map((c) => c.key),
  KONTROLLE_NACH.map((c) => c.key)
);

// Abschließender Hinweis aus der Vorlage (unter dem Formular angezeigt).
const HINWEIS_ABSCHLUSS =
  "Fahrzeugcheckliste, Fahrzeugschlüssel, Beleg der Tankkarte (Name des Fahrers vermerken) und die " +
  "Tankkarte sind abschließend in den SCH-Briefkasten am Haupteingang des Gesundbrunnenstadions zu hinterlassen.";

const APP_CHANGELOG = [
  {
    version: "1.0",
    groups: [
      {
        title: "Fahrtenbuch / Fahrer-Checkliste",
        items: [
          "Löst die Papier-„Fahrer-Checkliste für SCH“ ab: jeder eingeloggte Fahrer erfasst seine Fahrt mit Fahrzeug- und Fahrtdaten (Kennzeichen, Insassen, Reiseziel, Kilometerstand, Datum/Uhrzeit, Übernahme/Übergabe).",
          "Sicherheits-Checklisten vor und nach der Fahrt (gültiger Führerschein, Mindestalter, kein Alkohol, Verkehrssicherheit, Sichtkontrolle, vollgetankt, Reinigung) direkt zum Abhaken. Die Führerschein-Kopie selbst wird in Trainerdaten hinterlegt.",
          "Mängel/Beschädigungen als Freitext plus Foto-Upload — die Fotos landen sicher im Vereins-Nextcloud, kein Verschicken per Mail mehr nötig.",
          "Fahrt wird handschriftlich (Finger/Maus) unterschrieben und abgeschlossen.",
          "Zwischenspeichern möglich: eine Fahrt kann als „offen“ begonnen und später abgeschlossen werden."
        ]
      },
      {
        title: "Rechte & Speicherung",
        items: [
          "Jeder eingeloggte Nutzer trägt und sieht seine eigenen Fahrten; Admin und die Gruppe „Fahrtenbuch Bearbeiter“ sehen und verwalten alle.",
          "Automatische Nextcloud-Synchronisierung über die zentrale Anmeldung (Tools-Übersicht) — kein separates Passwort nötig."
        ]
      }
    ]
  }
];
