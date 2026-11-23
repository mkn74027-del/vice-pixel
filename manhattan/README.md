# VICE PIXEL — Manhattan

[Spielen](https://mkn74027-del.github.io/vice-pixel/manhattan/?v=rides51)

Befahrbare Manhattan-Insel mit echter Straßengeometrie, Gebäudeflächen und -höhen, Küsten, Brücken, Stadtverkehr, Fußgängern und Wahrzeichen. Die Umgebung und der Renderer stammen aus [Slop New York](https://github.com/mrdoob/slop-newyork), MIT, Stand `7fdf054aa7a8b1c005983a855fb3b308f2d9a948`. Eigenständige Ergänzungen: drei Stadtaufträge, zeit- und fahrzeugabhängige Kontrollpunkte, Geldbelohnungen, F zum Ein-/Aussteigen ins eigene Taxi, gerichtetes A*-GPS auf dem Verkehrsnetz, deutsche Oberflächenanpassungen und km/h.

## Start

Online in einem aktuellen Chrome oder Edge mit WebGPU und aktivierter Grafikbeschleunigung öffnen. Beim ersten Start kann die Grafikvorbereitung 1–2 Minuten dauern. Keine Installation und kein Projekt-Download erforderlich. Die Engine-Abhängigkeit three.js wird aus einem fest gepinnten jsDelivr-Commit geladen. Diese neue Fassung ist deshalb **kein Offline-Ein-Datei-Spiel**.

Automatische Spielstand- und Sound-Einstellungen werden nur in einer flüchtigen Map im Arbeitsspeicher abgelegt; keine Nutzung von localStorage, IndexedDB oder Service Worker. Ein Neuladen setzt den Sitzungsfortschritt zurück. Übliche Browser-Caches sind davon unabhängig.

## Steuerung

| Taste / Eingabe | Aktion |
|---|---|
| W / S | Zu Fuß vorwärts / rückwärts in Blickrichtung, im Taxi Gas / Bremse |
| A / D | Zu Fuß seitwärts laufen, im Fahrzeug lenken |
| Rechte Maustaste ziehen | Zu Fuß umschauen |
| Shift | Zu Fuß sprinten |
| Linksklick / G | Gewählte Ausrüstung benutzen / Faustschlag |
| Q / R | Zu Fuß Ausrüstung wechseln / nachladen |
| Tab | Spielmenü mit Ausrüstung, Effekten und Anzeigen öffnen |
| Mausrad | Kameradistanz |
| F | Neben einem langsamen Stadtwagen den Fahrer herausziehen, in freie Wagen einsteigen, beim Halt aussteigen |
| 1 / 2 / 3 / 4 | Gehen / Taxi / Fahrrad / Helikopter |
| Leertaste | Zu Fuß springen, Fahrrad bremsen, Heli steigen |
| Q / C | Heli sinken |
| M | Inselkarte öffnen / schließen |
| V | Kameraperspektive wechseln |
| J | Aufträge einblenden |
| N / B | Sound ein-/ausschalten / hupen |
| H | HUD aus-/einblenden |

Während die Inselkarte geöffnet ist, pausieren Bewegung und Auftragstimer. Die Karte lässt sich ziehen, zoomen und nach Straßen oder Wahrzeichen durchsuchen. Klicken setzt ein GPS-Ziel und versetzt den Spieler nicht. Gelbe Linien folgen dem gerichteten Straßengraphen. Ist kein Straßenweg verfügbar, zeigt eine gestrichelte Linie nur die Richtung; im Heli wird die Luftlinie angezeigt. Explizite Schnellreise ist separat wählbar und beendet einen laufenden Auftrag.

Fahrer können fliehen, sich wehren oder ihren Wagen zurückholen. Treffer werden an den Gelenken der Figuren ausgewertet. Unter **Tab → Blut & Gore** lassen sich die sichtbaren Effekte anpassen.

## Stadtaufträge

- **Midtown Express:** Vier Ziele in Midtown, jeweils mit dem Taxi anhalten, 10 Minuten.
- **Von Uptown nach Downtown:** Central Park South → Flatiron → One World Trade Center, 17:30 Minuten.
- **Skyline-Pilot:** Vier Wahrzeichen im Heli, 60–240 m Höhe, 10 Minuten.

Kontrollpunkte benötigen 1,2 Sekunden bei geringer Geschwindigkeit. Belohnungen und Zeitbonus werden einmalig pro Abschluss vergeben. Aufträge lassen sich abbrechen und neu starten. Das ist eine erkundbare Stadtgrundlage mit kleinen Aufträgen; die Polizei-, Shop- und Storysysteme des alten Prototyps sind hier noch nicht integriert.

## Credits

- **Slop New York**, copyright (c) 2026 Mr.doob, MIT: [Quellprojekt](https://github.com/mrdoob/slop-newyork), [beibehaltene Lizenz](LICENSE).
- **three.js**, MIT, Version r188dev, fest gepinnter Commit `8b92052852735b67cfa8393f78e707b3f07a0eec`. Importmap in index.html.
- **NYC Open Data:** [Gebäudeumrisse und Höhen](https://data.cityofnewyork.us/City-Government/BUILDING/5zhs-2jue), [Baumstandorte](https://data.cityofnewyork.us/Environment/Forestry-Tree-Points/hn5i-inap), weitere Straßen-, Park- und Bezirksdaten im Quellprojekt.
- **MTA:** [Subway Entrances and Exits 2024](https://data.ny.gov/Transportation/MTA-Subway-Entrances-and-Exits-2024/i9wp-a4ja).
- **© OpenStreetMap contributors**, [ODbL / Copyright](https://www.openstreetmap.org/copyright). Die übernommenen geografischen Datendateien behalten ihre bestehenden Quellenhinweise.
- Ergänzende Referenz geprüft: [Neon Mayhem](https://github.com/pranshuparmar/neon-mayhem), Apache-2.0. Daraus wurde kein Code übernommen.

Der tatsächliche Stadtplan ist die Referenz. Einzelne Fassaden, Innenräume und Stadtobjekte sind prozedurale Vereinfachungen; es ist keine vollständige 1:1-Reproduktion aller New Yorker Details und kein GTA-V-Nachbau.
