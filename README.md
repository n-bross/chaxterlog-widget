# ChaxterLog Widget (Scripting)

Interaktives Home-Bildschirm-Widget für ChaxterLog: Undo (eigenen letzten Klick zurücknehmen), U15 +1 und Ü15 +1 in den Farben der Website, mit dem Tagesstand auf den Knöpfen. Die Knöpfe zählen direkt im Widget, ohne eine App zu öffnen. Läuft in der iOS-App [Scripting](https://scriptingapp.github.io/).

## Einrichten

1. In Scripting **Import Remote Scripts** mit `https://github.com/n-bross/chaxterlog-widget`.
2. `index.tsx` starten und den Token einfügen. Den Token in ChaxterLog unter Konto → Handy-Widget & Kurzbefehle erstellen. Danach erscheint eine Vorschau.
3. Auf dem Home-Bildschirm ein **Scripting**-Widget hinzufügen (mittel oder klein), gedrückt halten → Widget bearbeiten → Script: „ChaxterLog Widget“.

Mittel: Undo, U15, Ü15 und ↻. Klein: U15 und Ü15, Undo und ↻ oben. Sperrbildschirm: nur die Zahlen.

## Aktualisierung

- Nach jedem Tipp zeichnet sich das Widget sofort neu, mit dem aktuellen Stand des ganzen Teams.
- ↻ holt den Stand, ohne zu zählen.
- Von selbst lädt das Widget neu, wenn iOS es erlaubt; das ist meist nach einigen Minuten.

## Aufbau

| Datei | Aufgabe |
|---|---|
| `config.ts` | Adresse, Token, gemeinsamer Zustand |
| `api.ts` | Anfragen an die ChaxterLog-API |
| `app_intents.tsx` | Knopf-Aktionen: Anfrage senden, Stand speichern, Widget neu zeichnen |
| `widget.tsx` | Ansicht für klein, mittel und Sperrbildschirm |
| `index.tsx` | Token einrichten, prüfen, Vorschau |

Der Token steht nie im Code. Er liegt im Schlüsselbund des Skripts und, weil Widget-Erweiterungen den Schlüsselbund nicht immer lesen können, zusätzlich im privaten Speicher des Skripts auf dem Gerät.
