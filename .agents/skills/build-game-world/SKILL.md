---
name: build-game-world
description: Co-design and implement original browser games from a player's gameplay idea, from a one-file puzzle to a networked 3D world. Use for a new playable game, a requested game system or a reproducible Fault Line Echoes reference build.
---

# Build a Game World

Work in the designer's language, including English or Chinese. The user owns the fantasy, rules and feel. The agent writes and runs the game, builds assets, tests the real controls and delivers the playable result. If the user asks for discussion only, stay in design mode.

## The opening move

For a new game, settle delivery first. When unspecified, ask in the first reply and wait for the designer's choice before committing to a delivery architecture. Explain the consequence in player terms:

> How would you like people to play? **One HTML file** opens by double-click and can play offline with everything embedded. **An online link** opens on a phone or computer and updates for everyone. Shared rooms need a reachable room service. **Both** uses the same game rules with an offline solo build and a hosted build. Which fits your players?

In Chinese: “你希望玩家双击一个 HTML 就能离线玩，还是点网址就能玩并收到更新？也可以两种都做。异地联机需要双方都能访问的房间服务。你想选哪种？”
If already specified, acknowledge it and proceed. A URL can serve a wholly static solo game. A standalone client can optionally contact a service while connected. Establish whether remote play is a requirement before promising it. For an existing game, preserve its delivery choice unless the request changes it.

## Co-design through play

Ask for a decision that changes the experience: “When two ships want the last berth, should players bargain, race the tide, or invent a third rule?” Prefer one concrete question and alternatives with observable consequences. Carry forward answers, offer a reversible default, and implement independent work while an answer is pending. When the designer delegates a choice, choose and say why. Choose engines, asset formats, hosting layout and build tools yourself within the selected target; the designer can describe everything in ordinary language.

Extract the player's **verb, pressure, choice, feedback and consequence**. From those write a short playtest in the user's words: “I can risk the short crossing, lose the cargo and still recover it downstream.” Build a small slice with an entrance, a meaningful action, a changed world state and a way to recover or replay. Invite feedback on *that decision* using the playable build. Continue through the requested scope, keeping progress playable. A slice is a milestone when the user asked for the full game.

Generate fiction from the player's premise: choose a local constraint, who benefits, who pays for failure and which action lets the player decide. Create original names, geography, characters, conflicts and quest outcomes. Borrow technical patterns with their licenses. Use the published game's fiction only when the user asks to reproduce that example.

## Pick systems to fit the idea

- **Delivery and engine.** Read [delivery](references/delivery.md) when choosing a renderer, bundling offline, deploying or verifying performance. A board game may need only DOM and explicit turn state; a side-scroller may use Canvas; a first-person expedition may need collision, terrain streaming and 3D sound.
- **Space and life.** Read [physical worlds](references/physical-worlds.md) when elevation, water, settlement life, stealth or travel affects play.
- **Roles and narrative.** Read [roles and quests](references/roles-and-quests.md) when roles, combat, NPC jobs, choices or progression are in scope. Use the same reasoning for a mechanic, musician or navigator.
- **Custom art delivery.** When a collaborator supplies a character, outfit, attachment, sprite sheet or effect, read [artist handoff](references/art-handoff.md). Inspect the delivery, map it to game events and rigs, and return an integrated playable preview.
- **Human multiplayer.** Read [multiplayer](references/multiplayer.md) for requested co-op, shared rooms or PvP. Resolve shared vs private state, connection fallback and authority before building the lobby.
- **Similar scope or exact reproduction.** Read [the reference build](references/reference-build.md) for a source-to-system map and a pinned, executable route back to the five-region game. An unrelated original world can be built entirely without the reference checkout.

## Ship a result the designer can judge

Exercise the promised loop through normal controls, including its failure or alternate path. Check the artifact under the delivery conditions chosen at the start. Keep performance and evidence claims tied to the hardware, browser or network used. Preserve saves across updates when the change affects progression. Hand back a playable link or file, controls, one first decision to try and a short account of what was verified. Ask the next design question only when it unlocks a meaningful new direction.
