# Manhattan revision — validation

Source base: mrdoob/slop-newyork @ `7fdf054aa7a8b1c005983a855fb3b308f2d9a948`.
Runtime copied directly through GitHub APIs. No local checkout or project files on the user's PC.

## Checks completed

| Check | Result |
|---|---|
| Syntax of integration, contracts, GPS, controllers and map | Pass (in-memory parsing after stripping import/export declarations) |
| Every relative runtime JS import has a copied file | Pass |
| Published runtime / city data files | 57 files under manhattan/, including both compressed binary payloads |
| Existing game preserved | legacy.html references the exact original game blob `a6b1fc446ca406b1a92008f4f4ce36e0c74136d8` |
| Directed A* allows turns and routes forward along a one-way loop rather than reversing on the same edge | Pass, synthetic lane graph |
| Disconnected / far off-island destinations | No road route; displayed direction fallback is dashed |
| Contract code: four stops, payout once, wrong vehicle rejected, speed limit, cancel and timeout without payout | Pass, actual contract module exercised with in-memory UI/engine test doubles |
| Persistent browser storage | No localStorage, IndexedDB or service-worker references in copied runtime; memory adapter installed |
| Live startup at /manhattan/ | Rendered WebGPU city; captured error log was empty |
| W and S in live taxi | W moved z=410.60 → 423.86; speed display rose to 34 km/h; S reduced speed to zero |
| F taxi exit / entry | Active HUD mode changed car → person → car, with adjacent placement |
| Mouse-drag camera | Scene visibly rotated around the taxi |
| Full map / fit island | Streets, coastlines, park, bridges and landmarks rendered |
| Search Times Square | Atlas centered on named landmark |
| Map click | Set GPS waypoint without teleport; player remained x=3.60, z≈468.30 |
| Live first job checkpoint | Bryant Park held at rest; Midtown Express advanced from 1/4 to 2/4 (Times Square) |
| Session frame rate observed | Approximately 30–49 FPS in this browser session; hardware and view dependent |

## Follow-up after UI review

Map now blocks new keyboard movement and freezes world simulation and contract timer while it is open. Taxi exit zeros the parked taxi's motion. Map search and player labels were translated. These integration changes are syntax checked; the final deployed version is checked again in the browser.

## Practical limits

The three routes have not all been driven/flown from start to finish in live browser QA. Mission flow was checked programmatically, and a real checkpoint was checked in the browser. Original upstream rendering and world physics are retained rather than represented as independently validated systems.

The Manhattan runtime has no imported crime/combat/shop/50-mission systems. Those remain in legacy.html. The city uses real geographic data with procedural facades and landmark approximations, not a complete detail-for-detail replica. It requires WebGPU and online access to a pinned three.js build.
