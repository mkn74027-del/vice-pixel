# VICE PIXEL: Blood & Neon

Browser-playable PC open-world game. **This remains a work in progress, not a finished GTA-equivalent game.**

Play: https://mkn74027-del.github.io/vice-pixel/

The complete runtime, including compact embedded models and palettes, is in `gta_vice_cartel_3d.html`. No engine CDN, installation, build tool, automatic local save, or external asset request is needed. Source changes were made directly through GitHub, without a project checkout on the user's PC.

## Revision 2: playable fundamentals

- Corrected camera-relative WASD, including the previously inverted A/D strafe. Arrow keys also move/drive.
- Mouse-look works over the game canvas without requiring browser pointer lock. Right-drag also works; clicking may enable pointer lock where supported. Pause menus release camera/input.
- Orbiting near/far/hood cameras, building obstruction checks, smoothed follow and delayed driving auto-center.
- Embedded Kenney CC0 vehicle models (sport, supercar, sedan, police, taxi and truck), one commercial building model and detailed palms. Sources: [ATTRIBUTIONS.md](ATTRIBUTIONS.md).
- Smooth primitive character model with articulated gait, rather than a stack of boxes.
- Shader materials for concrete, road, sidewalk, foliage, cloth, glass, painted metal and water; shadow mapping; 720p default and selectable lower resolutions.
- Revised simplified driving: acceleration, braking before reverse, speed-sensitive steering, lateral grip, handbrake slip, body roll/pitch, rotating/steering wheels and automatic gear/RPM display.
- Vehicle collisions use oriented rectangles. The player collides with parked vehicles instead of walking through them.
- Physical storefront openings with sliding doors, shelves and counters. Walk in and press E near the counter.
- Magazine ammunition and timed reloads drawing from a reserve; differentiated weapon damage, range and fire intervals; building occlusion checks.
- Traffic-light visuals and basic stop behavior, horn, footsteps, engine and effect tones.

## Controls

| Input | Action |
|---|---|
| WASD / arrows | Walk / accelerate / brake / steer |
| Mouse over game / right-drag | Camera |
| Left click / J | Attack |
| Shift | Sprint |
| Space | Jump / handbrake |
| E | Enter/exit vehicle; interact at a counter or ATM |
| Q / Ctrl | Aircraft ascend/descend |
| Tab | Cycle weapon |
| R | Reload / change radio while in a vehicle |
| H | Horn |
| B / C | Mask / camera mode |
| P / M / Escape | Phone / map / pause |
| F | Fullscreen |
| Enter | Advance dialogue |

## Other existing systems

City districts, roads, hills, canal crossings, docks, airport, pier, animated Ferris wheel; boats and simplified flying vehicles; animated non-volumetric water with bobbing/spray; health and armor; pedestrians and basic police pursuit/wanted levels; minimap and A* GPS; 50 named selectable objective scenarios; short story dialogues; shops and visible equipment; cash/dirty money/bank; simple heists, asset/lab/sector purchases and passive income; phone/fleet/cheats; manual Save-Code import/export.

## Validation

In-memory regression checks cover camera-relative D at three camera headings, oriented vehicle overlap/separation, unobstructed acceleration, braking and timed reload consumption. Door openings and wall collision were also checked. Browser QA is run on preview.html before replacing the main game.

## Limits

Graphics remain stylized, not photorealistic. Driving is a simplified controller, not a complete suspension/rigid-body simulator. Characters are procedurally animated, not motion-captured. NPC traffic and police are basic. Water is a displaced surface, not a fluid-volume simulation. Shop interiors are compact and share a furnishing system. The 50 scenarios reuse objective systems, their complete playthrough is unverified, and the original full screenplay/cinematic sequences are not implemented. Advanced stealth, destructible bridges, full air combat, all original equipment modifiers, real radio speech and bespoke interiors still require work.
