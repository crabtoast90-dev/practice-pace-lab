# Pace Lab

**Play: https://crabtoast90-dev.github.io/practice-pace-lab/** (`?debug` shows FPS, `?seed=N` picks a different run, `?mode=fast` skips the start screen, `?tune=cards.strike.dmg:8` tries a number by name, `?deck=strike,verdict` sets the starting deck)

A short Slay the Spire-style run (one knight, three crypt fights, fifteen cards) that tests one question: for a deckbuilder where every card is a combat animation, which turn structure feels best? Three pace modes share the cards and skeletons: A Fast, B Plan then Watch, C Spirit Combo (Baten Kaitos-style).

**Outcome (2026-10-21):** C (Spirit Combo) has the highest upside and excited Brian most; B (Plan then Watch) is the bet if the cinematics and visuals are strong; A plays like most roguelike deckbuilders. Details in `DECISIONS.md`.

How it was built and why: `PLAN.md` (what shipped), `DECISIONS.md` (every call), `BALANCE.md` (the sim's report), `LOG.md` (sessions, time and scores).

## For developers

- Run locally: `npm install`, then `npm run dev`.
- Self-check: `npm run check` (builds, plays every mode headless on laptop and phone through the real buttons, screenshots to `check-output/`). `npm run check -- --url=https://crabtoast90-dev.github.io/practice-pace-lab/` checks the live site.
- Balance report: `npm run sim` (rewrites `BALANCE.md`). Mode numbers are in `src/<mode>/data.js`; the shared cards and skeletons in `src/core/cards.js`; feel numbers in `src/view/families.js`.
- Code: `src/core/sim.js` is the pure, seeded rules engine and `src/core/bot.js` the "decent player"; `src/view/` only shows what the sim decided.
- Session time: `npm run log-time` (see `CLAUDE.md`, End of every session).
