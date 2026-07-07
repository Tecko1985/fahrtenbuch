const APP_VERSION = "1.6";

// Gültigkeitsdauer einer Führerschein-Kopie: nach der ersten Einreichung ist sie alle
// 6 Monate erneut einzureichen.
const FUEHRERSCHEIN_GUELTIGKEIT_MONATE = 6;

// Gruppe, deren Mitglieder (plus Admin) die eingereichten Führerschein-Kopien ALLER
// Fahrer im Register einsehen dürfen. Der Slug muss zum im Admin-Panel angelegten
// Gruppennamen passen — „Führerschein Einsicht“ ergibt fuehrerschein-einsicht.
const FS_VIEW_GROUP_ID = "fuehrerschein-einsicht";

// Größenlimit pro hochgeladener Datei (Schadensfoto / Führerschein-Kopie) — muss zum
// Worker-Cap (admin-worker.js MAX_FILE_BYTES) passen.
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

// Checklisten-Gruppen des Fahrer-Protokolls (1:1 aus der Papiervorlage). Jeder Eintrag
// { key, label } wird als Checkbox gerendert; key ist zugleich das Feld im Fahrt-Datensatz.
const ANFORDERUNGEN = [
  { key: "chkFuehrerschein", label: "Besitz eines gültigen Führerscheins (Kopie der Fahrerlaubnis alle 6 Monate in die SCH-Cloud hochladen — Tab „Führerschein“)" },
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
    version: "1.6",
    groups: [
      {
        title: "Fehlerbehebung",
        items: [
          "Führerschein-Sammel-PDF: Der Download konnte auf manchen (v. a. mobilen) Browsern abbrechen, weil der Download-Link zu früh wieder freigegeben wurde."
        ]
      }
    ]
  },
  {
    version: "1.5",
    groups: [
      {
        title: "Führerschein",
        items: [
          "Neuer Knopf „Alle als PDF exportieren“ im Führerschein-Register: bündelt alle eingereichten Führerschein-Kopien (Fotos und PDFs) zu einem einzigen PDF-Dokument mit Deckblatt je Fahrer (Name, eingereicht am, gültig bis) zum Download."
        ]
      }
    ]
  },
  {
    version: "1.4",
    groups: [
      {
        title: "Sonstiges",
        items: [
          "Doppelte Versionsanzeige im Einstellungen-Button entfernt (Version steht weiterhin im Titel und in der Versionshistorie)."
        ]
      }
    ]
  },
  {
    version: "1.3",
    groups: [
      {
        title: "Führerschein – echter Zugriffsschutz",
        items: [
          "Die eingereichten Führerschein-Kopien liegen jetzt in einem serverseitig abgeschotteten Bereich: das Gateway gibt eine Kopie nur noch an den Eigentümer selbst, an Admins und an die Gruppe „Führerschein Einsicht“ heraus — vorher wirkte die Beschränkung nur in der Oberfläche.",
          "Die Datei wird unter dem Nutzernamen abgelegt (ein Dokument je Fahrer); ein erneuter Upload ersetzt die bisherige Kopie."
        ]
      }
    ]
  },
  {
    version: "1.2",
    groups: [
      {
        title: "Führerschein",
        items: [
          "Die Führerschein-Kopie muss nach der ersten Einreichung alle 6 Monate erneuert werden — die App zeigt „gültig bis …“ bzw. „abgelaufen, bitte neu einreichen“.",
          "Die eingereichten Kopien sind nur noch für Admin und die Gruppe „Führerschein Einsicht“ einsehbar; jeder Fahrer sieht weiterhin seine eigene."
        ]
      }
    ]
  },
  {
    version: "1.1",
    groups: [
      {
        title: "Führerschein",
        items: [
          "Die Führerschein-Kopie lässt sich am Handy jetzt direkt mit der Kamera aufnehmen („📷 Foto aufnehmen“) — alternativ weiterhin eine vorhandene Datei bzw. PDF aus Galerie/Dateien wählen."
        ]
      }
    ]
  },
  {
    version: "1.0",
    groups: [
      {
        title: "Fahrtenbuch / Fahrer-Checkliste",
        items: [
          "Löst die Papier-„Fahrer-Checkliste für SCH“ ab: jeder eingeloggte Fahrer erfasst seine Fahrt mit Fahrzeug- und Fahrtdaten (Kennzeichen, Insassen, Reiseziel, Kilometerstand, Datum/Uhrzeit, Übernahme/Übergabe).",
          "Sicherheits-Checklisten vor und nach der Fahrt (Führerschein, Mindestalter, kein Alkohol, Verkehrssicherheit, Sichtkontrolle, vollgetankt, Reinigung) direkt zum Abhaken.",
          "Mängel/Beschädigungen als Freitext plus Foto-Upload — die Fotos landen sicher im Vereins-Nextcloud, kein Verschicken per Mail mehr nötig.",
          "Fahrt wird handschriftlich (Finger/Maus) unterschrieben und abgeschlossen.",
          "Zwischenspeichern möglich: eine Fahrt kann als „offen“ begonnen und später abgeschlossen werden."
        ]
      },
      {
        title: "Führerschein",
        items: [
          "Jeder Fahrer hinterlegt seine Führerschein-Kopie einmal pro Saison direkt in der App.",
          "Admin und berechtigte Gruppe sehen ein Register, wer für die aktuelle Saison eine Kopie hinterlegt hat."
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
