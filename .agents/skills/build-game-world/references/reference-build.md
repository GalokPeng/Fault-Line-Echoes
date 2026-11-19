# Reproduce and study the playable reference

Use this route when the designer requests the Fault Line Echoes example or asks for a working baseline of similar depth. Clarify whether they want the historical game itself or an original setting with comparable systems. For the latter, study the required systems in a separate directory and author new places, characters, causal events, choices and rewards in the user's game.

**Exact reference.** With Python 3, Git and Node.js 22.12+ available, the agent runs the following. Resolve the helper relative to this installed skill. Pick a fresh destination. From outside the original repository it retrieves the pinned public Git commit. A local clone containing that commit can be used without contacting GitHub by adding `--from-repo /path/to/Fault-Line-Echoes`.

```sh
python /path/to/build-game-world/scripts/reproduce.py echoes-reference
cd echoes-reference
npm ci
npm test
npm run build
npm run preview
```

Open the preview URL printed by Vite and use Create / Join from the lobby in two browser contexts. Double-click `dist/faultline-local.html` separately with networking disabled for the solo test. Package installation needs the network or an already populated package cache. The helper exports source, the dependency manifest and lockfile, runtime assets, licenses and tests from commit `482b5dc15428ded3a6a1ed5f5de9c8593c717de6`. New work gets its own hosting configuration and account association. For a derivative, point the offline lobby link in src/main.js at your own hosted room service before release. The helper stops after exporting source.

| Requested system | Source to read in the reference | Observable proof |
| --- | --- | --- |
| Light client and both delivery formats | vite.config.js, scripts/standalone.js, src/asset-url.js | Online link and detached HTML both start in the capital. |
| Vertical terrain and physically consistent rivers | src/biomes.js, water-profile.js, water-system.js, water-render.js, physics.js, terrain-stream.js (all under src) | A ford is walkable, a deep crossing carries a player or dropped cargo downstream. |
| Main city and four regions | src/capital-data.js, capital-workshops.js, settlement-sites.js, settlement-gateways.js, borders.js | Walk out through a gate and arrive at the reachable boundary of the neighbouring region. |
| Actors, authored models and force feedback | src/avatar.js, avatar-phase-dial.js, avatar-tailor.js, combat.js, skill-icons.js, skill-effects.js, perception-flight.js | Four empty-handed roles; ranged attacks travel, cover blocks them, sixteen corresponding icons and effects. |
| Life, scarcity and crafting | src/city-life.js, people.js, perception-species.js, expedition.js, expedition-harvest.js | Noise changes detection; creatures stop chasing; harvested parts become food or a specific recipe. |
| Original campaign and recoverable errands | src/story.js, journal.js, handbook.js, field-world.js, medicine.js, ferry-site.js | Fresh start without an active quest. Track a giver, accept in person, take alternate routes, recover cargo, reload and claim once. |
| Remote duel and joint patrol | src/room.js, room-transport.js, patrol.js, api/rooms.js, server/signaling.js, server/room-relay.js | Two people coordinate in one room, including over the relay when a direct path is unavailable. |

For a new world of comparable scale, implement one complete interaction across these layers and expand region by region. A river, a medicine delivery and a medieval city are features of this example, not prerequisites for another genre. Original source and programmatic art are MIT. Keep the Poly Haven CC0 provenance in public/terrain-materials/CREDITS.md and public/sky/CREDITS.md, and regenerate third-party notices on build.
