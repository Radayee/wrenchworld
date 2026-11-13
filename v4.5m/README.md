# WRENCHWORLD — v4.5m

Mobile compatibility snapshot based on v4, including its non-blocking tutorial and first-launch training recommendation.

## Play the history

- v1: https://radayee.github.io/wrenchworld/
- v2: https://radayee.github.io/wrenchworld-v2/
- v3: https://radayee.github.io/wrenchworld/v3/
- v4: https://radayee.github.io/wrenchworld/v4/
- v4.5m: https://radayee.github.io/wrenchworld/v4.5m/

## Mobile changes

- App height follows the visual viewport and browser chrome; safe-area padding keeps the navigation clear of device cutouts.
- Portrait navigation uses four columns; landscape navigation scrolls horizontally.
- Compact header, stacked panels, bounded scrolling dialogs and repositioned tutorial bubbles.
- Touch drag/pinch and tapping for the workshop and city maps. Zoom/fit buttons and touch-accessible build rotation.
- Small canvases can fit the full world without jumping to the desktop minimum zoom.

Saves are isolated under `ww_release_v45m_`. Earlier snapshots and their saves are preserved.

## Validation and limits

JavaScript syntax checks and existing features, clients, roads, race, tutorial and first-launch tests passed. New regression checks cover visual-viewport height changes, map tap/drag/pinch, duplicate-click prevention, cancelled gestures, building, city selection and small-stage map fitting. Tutorial positioning is checked at widths 320, 360, 390 and 844.

No live browser-control surface was available for a rendered phone/browser test. CSS changes and runtime gesture behavior were inspected and tested as described above; device-specific rendering still needs real-phone verification.

Development source in D:/Gametest is not modified. SOURCE_README.md preserves the development notes from the original snapshot.