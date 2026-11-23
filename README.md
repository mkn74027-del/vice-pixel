# VICE PIXEL: Blood & Neon

An independently written, procedural WebGL open-world **PC prototype**. All playable game code is in [gta_vice_cartel_3d.html](gta_vice_cartel_3d.html). No npm, build, downloads, external models, fonts or libraries are required.

**Play:** https://mkn74027-del.github.io/vice-pixel/

## What this version implements

- Polygonal 3D city, district labels, procedural facades/windows, palms, hills, roads, canal crossings, airport, docks, moving Ferris wheel, animated sky.
- Third-person and first-person camera, building collision, walking, sprinting, jumping, swimming, health and armor.
- 12 vehicle classes (31 initial vehicles): sport/super cars, limousine, truck, taxi, police, SWAT, bike, tank, boat, helicopter and plane. Simplified acceleration, reversing, collision, ramps, vertical flight and animated rotors.
- GPU-displaced water waves, specular highlights, boat bobbing and spray particles; **not a volumetric fluid simulator**.
- 50 selectable named mission scenarios over 10 acts with objectives built from reach, vehicle, package, combat, timed hold, vault and escape stages; selected story scenes use shortened dialogue.
- Rotating minimap and zoomable clickable map, A* routes on the road intersection graph.
- NPC pedestrians, simple traffic and direct pursuit police, wanted levels, combat, particles.
- Six visible shoe choices with selected gameplay effects, four outfits and masks. Shops are accessed from outside or by the phone; buildings do not yet have modeled interiors.
- Cash/dirty money/bank, deposit/withdrawal, basic bank heist, property purchase, laundering, laboratory and sector purchases and passive income.
- Phone, fleet delivery, cheats, pause UI, resolution settings, Web Audio engine/siren/effect tones and simple sequenced radio music.
- Copy/paste Save-Codes, no automatic localStorage/IndexedDB saving.

## Controls

| Input | Action |
|---|---|
| WASD | Move / drive / thrust |
| Click the game, then mouse | Camera and aiming |
| Left click or J | Attack |
| Shift | Sprint |
| Space | Jump / handbrake |
| E | Interact / enter / exit vehicle |
| Q / Ctrl | Ascend / descend aircraft |
| Tab | Weapon cycle |
| R | Reload / radio in vehicle |
| B / C | Mask / camera |
| P / M / Escape | Phone / map / pause |
| F | Fullscreen |
| Enter | Advance dialogue |

## Honest scope and limitations

This is a playable first implementation, **not the full production game described in the initial brief**. Graphics are stylized low-poly; they are not GTA-quality photorealism. The 50 scenarios reuse a shared set of objective systems and have not all been played through. The complete supplied screenplay, bespoke cinematic sequences, articulated flight aerodynamics, advanced traffic pathfinding, destructible bridges, stealth/heist branching, detailed interiors, real voice speech and every equipment modifier remain future work. The tank weapon uses the shared combat system. No commercial GTA assets or template source were copied.

GitHub template research found niklasvh/WebGL-GTA, but its README describes a 1997-map parsing experiment with only rudimentary pedestrian movement, so it was not reused.

## Storage

Source is kept in this GitHub repository. No project checkout or package installation was created on the user's PC. Opening any web page can use the browser's ordinary cache; the game does not deliberately save persistent game state. The optional offline HTML can be downloaded manually.

## Validation

JavaScript syntax and in-memory simulation checks passed for all 50 mission definitions, A* routing, mission completion/reward, death/respawn, boat acquisition and package-to-delivery stage transition. Live browser QA on the deployed version passed: free-play start, keyboard walking, entering and accelerating a sports car, following camera, phone navigation, purchasing/equipping Turbo-Runner shoes, Save-Code import through the in-game form, entering/driving a speedboat, animated water/spray, clicking a map GPS target, mission 11 dialogue and transition to package collection, entering a helicopter and ascending to approximately 9 m. WebGL reported error code 0 and the game's error panel remained empty during the corrected-version checks. An embedded-browser prompt() incompatibility was found and fixed by replacing native prompts with the in-game form. The full 50-mission campaign has not been end-to-end tested.
