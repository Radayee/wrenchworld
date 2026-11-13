# WRENCHWORLD — v4

Fourth published development snapshot, captured November 12, 2026.

## Play the development history

- v1: https://radayee.github.io/wrenchworld/
- v2: https://radayee.github.io/wrenchworld-v2/
- v3: https://radayee.github.io/wrenchworld/v3/
- v4: https://radayee.github.io/wrenchworld/v4/

This snapshot adds dedicated modules for expanded vehicle data, body repair, waste handling, city simulation and city UI, tutorial progression and additional UI.

## Validation

Syntax checks passed for all 23 JavaScript modules. Existing features, clients, roads and race tests passed, including 25 simulated days, multiple sites and save migration. The race test rejects the Junkyard 24 entry for exceeding the car-value limit, as expected by its scenario.

## Release isolation

The published copy changes only the page title, main-menu release label and save prefix (`ww_release_v4_`) for version identification and save isolation. D:/Gametest is untouched. Earlier published snapshots remain unchanged.