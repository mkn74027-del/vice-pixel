# Revision 2 verification

Verified game source commit: 225fc707ac1d0f9ca7719ca5e6c2616dcb2278f6.

## Browser checks

- Eight embedded model/palette packages decode; no runtime external asset requests required.
- D moves right in the view; W follows camera heading.
- Mouse movement changes camera yaw/pitch without successful pointer lock. This was important because the embedded browser rejected pointer lock.
- Walk to the sport car, enter with E, accelerate with W; observed 29 km/h after about 1.2 seconds. Brake with S; observed approximately 1 km/h after 0.65 seconds from a low-speed test.
- Save-Code import through the in-game form works.
- Walk from (-120, 60) through the physical Kicks & Vice doorway to (-120, 72.1) in 2.7 seconds. E opens the shop at the counter.
- The final storefront test reported about 61 FPS at the default 960x540 resolution and WebGL error 0. These are test-machine observations, not a performance guarantee.
- Earlier higher-resolution shader tests exposed severe close-up slowdown. The final revision removes expensive multi-tap shadow sampling, uses cheaper shader noise, defaults to balanced resolution and can adapt resolution if FPS drops.
- Pausing stops repeated 3D redraw and silences the engine gain.

## In-memory regression checks

All passed:
- Camera-relative D at headings 0, pi/2, pi.
- Oriented vehicle overlap/separation, including front-to-rear contact.
- Finite acceleration, roll and pitch state.
- Braking and reverse.
- Timed magazine reload consumes reserve ammunition.
- Shop doorway is open in collision geometry; side walls collide.

## Limits of verification

The full campaign and every shop/vehicle/weapon combination have not been played through. Driving, AI and graphics remain simplified. This revision improves the foundation; it does not complete the entire original production brief.
