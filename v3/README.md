# WRENCHWORLD — v3

Third development snapshot, captured November 12, 2026.

## Published history

- Version 1: https://radayee.github.io/wrenchworld/
- Version 2: https://radayee.github.io/wrenchworld-v2/
- Version 3: https://radayee.github.io/wrenchworld/v3/

This snapshot includes the new race module, expanded client and road behavior, quest/overlay UI, and simulation speeds of 1x, 8x, 16x and 32x.

## Validation

All 16 JavaScript modules pass syntax checks. The existing features, clients, roads and race checks completed successfully. Race test output includes an intentionally rejected Junkyard 24 entry for exceeding the car-value limit; seven races started.

## Snapshot isolation

The page title and main-menu label identify v3. Saves use `ww_release_v3_` so this version cannot overwrite v1 or v2 saves. Development source files in D:/Gametest remain untouched.

## Run locally

Open index.html in a browser, or serve this directory with a static HTTP server.