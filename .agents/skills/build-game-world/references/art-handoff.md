# Give production art to the agent

The collaborator can attach a folder/ZIP or point at a workspace path. Ask them which visible role, skin, action and viewpoint this delivery is for. Agree on the gameplay size and a test action in everyday language. A designer can say “Replace the courier's left wrist device; the needle should glow on a successful block.” The agent maps it to an attachment socket and an authoritative block event. Work from a copy and keep the artist's source intact.

**What to send**

| Asset | Minimum useful delivery | Helpful for revision |
| --- | --- | --- |
| Character or outfit | A runtime GLB, or glTF with all relative buffer and texture files. Identify the role and skin, units/facing, rest pose, skeleton/retarget map, named clips or an agreed procedural rig, first-person hands vs third-person body, and attachment sockets. | Editable .blend/FBX and texture sources, front/side image with scale, low-detail mesh and clip timing sheet. Agree whether root motion drives travel or stays visual. |
| Accessory | A model, target bone/socket, local position/rotation/scale, and an image showing the intended placement. | Left/right and skin coverage notes, expected approximate real-world size. |
| Skill effect | A transparent sprite sheet/sequence, mesh animation/GLB, or shader source with required textures. Identify role/action, event (cast, release, hit, block or miss), anchor, orientation, colour/alpha convention, duration, frame atlas layout/FPS or uniforms. | Short reference clip; onset, peak and decay frames; bounds, low-cost fallback, overdraw or draw-call target for the chosen renderer. |

Include the creator/credit line and redistribution rights for **all** meshes, textures, audio and samples. Add a short text note or fill in the bundled [handoff JSON](../assets/handoff.example.json); the agent can translate a plain-language note into that format. The example filenames and clip names illustrate the contract. Put artist data under one folder (for example `art-inbox/storm-courier/`) with relative file references. If the only source is a .blend or FBX, use a compatible exporter when available. If conversion is blocked, request the runtime export and use a labelled stand-in during integration.

Try the [complete example package](../assets/sample-delivery/handoff.json). It contains the actual wrist-dial GLB and a four-frame block effect study. Run the checker on this manifest without supplying any additional art.

**Inspect, connect and test**

1. Read the manifest, list the supplied files, and check permission and semantic target. Run `python <skill>/scripts/check_handoff.py <delivery>/handoff.json` for the portable package preflight. It reports mesh, skin, node and clip names for GLB/glTF, checks external file references, named clips/nodes and declared files. A passed preflight establishes file integrity and correspondence, not look, rig quality or a license grant.
2. Import into a small preview first. Set metres, axes and normals, colour space, texture wrapping, transparency/blending, skin weights and UVs in that scene. Map the artist's skeleton to the game's role rig. Bind clips for locomotion/aim/casts; for a shared skeleton copy bone transforms for the selected skin. Align accessories explicitly on each supported rig. Check unequipped/holstered states and camera near-plane clipping.
3. Map an effect to semantic action events. Attach muzzle effects to the palm, ground marks to the current support surface and hits to the confirmed contact point. Let the game decide damage and timing; artist-authored timing can be proposed to the designer if it changes the feel. Pool or cap particles, dispose resources on skin/area change, and select an affordable fallback. For online play send action/skin identifiers and authoritative outcomes; each client resolves its local assets. Pack the same assets into the offline edition.
4. Compare old/new under the same camera, light and action. Play idle, walk, block, successful hit and miss as relevant, switch skins, inspect the opponent's view and test performance with simultaneous effects. Return the integrated build, the mapping and a screenshot or short clip. Record which deliveries still need a missing file or a human art-direction decision.
