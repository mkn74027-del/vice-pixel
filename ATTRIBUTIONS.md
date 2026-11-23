# Quellen und Lizenzen

## Neue Manhattan-Stadt

Die Dateien in `manhattan/` basieren auf [mrdoob/slop-newyork](https://github.com/mrdoob/slop-newyork), Stand `7fdf054aa7a8b1c005983a855fb3b308f2d9a948`. Copyright (c) 2026 Mr.doob, MIT. Die unveränderte Lizenz ist in [manhattan/LICENSE](manhattan/LICENSE) enthalten.

Geodaten: NYC Open Data (Gebäude, Bäume, Straßen, Parks, Bezirksgrenzen), MTA-Eingänge und © OpenStreetMap contributors, ODbL. Vollständige Links und Hinweise: [manhattan/README.md](manhattan/README.md#credits). three.js wird über einen fest gepinnten jsDelivr-Commit geladen und behält seine MIT-Lizenz.

Eigene Änderungen: Stadtaufträge, Taxi-Ein-/Aussteigen, A*-Routen entlang erlaubter Straßenverbindungen, GPS-Klick statt Teleport, flüchtiger Speicher, deutsche UI-Teile und km/h.

Geprüft, aber kein Code übernommen: [pranshuparmar/neon-mayhem](https://github.com/pranshuparmar/neon-mayhem) (Apache-2.0).

## Bisheriger Prototyp (`legacy.html`)

Embedded models by **Kenney**, Creative Commons CC0 1.0:
- Car Kit: https://kenney.nl/assets/car-kit — sedan-sports, race-future, sedan, police, taxi, truck.
- City Kit Commercial: https://kenney.nl/assets/city-kit-commercial — building-a.
- Nature Kit: https://kenney.nl/assets/nature-kit — tree-palmdetailedtall.

GLB distribution: https://github.com/Hidencod/tge-assets. Geometry and color palettes were converted in memory into a compact format embedded in the HTML. There is no model/CDN dependency at runtime.

References studied (no code copied):
- https://github.com/L1vsun/NEONBAY (MIT) — driving behavior, wheel presentation, braking.
- https://gdevelop.io/game-example/free/starting-3d-grand-theft-auto — character/vehicle/camera loop.
- https://www.babylonjs.com/lite-demos/ — rendering, water and physics presentation.
- Rockstar PC control/camera documentation.

The custom controller remains simplified. It does not implement NEONBAY's full rigid-body suspension simulation.
