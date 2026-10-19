# Pace Lab

When the user asks for ideas, options, or a plan, give them that and stop.

## The game
A short Slay the Spire-style run that answers one question: **for a deckbuilder where every card is a combat animation, which turn structure feels best?** One hero (KayKit Knight) against KayKit skeletons: 3 fights (the third is an elite), pick 1 of 3 cards after each fight, HP carries over, 0 HP loses. 15 cards in 6 animation families (light, heavy, area, buff, block, finisher); a card's look = its family + its own VFX color and timing. The start screen picks a pace mode, same cards and skeletons, different turn rules: **A Fast** (3 energy, draw 5, 0.4-0.8 s animations, 2 s finisher cinematic, 1x/2x, Skip), **B Plan then Watch** (queue the turn with exact previews, GO plays it as one directed sequence; draw cards resolve when queued), **C Baten Kaitos** (shown as "Spirit Combo": combo limit 5 instead of energy, pick the next card on a timer while the attack plays, spirit numbers 1-9, pairs/straights pay, finishers need 3+ cards first and end the combo). Feel target: the 3rd card of a turn lands as a combo moment. Polish goes to hit timing, impact (hit-stop, shake, flash) and camera, not the arena.
- Cut (in `IDEAS.md`): defense phase, map, relics, more heroes, unique per-card animations.
- On screen: original names; models only from the kit's `assets/` (CC0). VFX made in code. Never fetch art mid-session.

The user (Brian) is a game designer, not a programmer: report in plain language, no code. He makes design, feel and look calls; you make every technical call. Log his calls in `DECISIONS.md`; log yours there too, marked *(my call)*.

## How it's built
- **Sim first.** Rules live in the pure seeded sim: `src/core/sim.js` (shared engine), `src/core/bot.js` (the "decent player"), `src/core/cards.js` (SHARED card, skeleton and fight data). No three.js, DOM, `Math.random` or clock there. The view (`src/view/`) only plays the sim's events; player input enters as actions.
- **All numbers** in one data file per mode: `src/<mode>/data.js` (A = `src/fast/`), which imports the shared cards so `?tune=cards.strike.dmg:7` works. Feel numbers (clips, hit-stop, shake, camera) live in `src/view/families.js`.
- **`npm run sim`** rewrites `BALANCE.md` against the targets: bot wins the run 55-70%, fights last 4-7 turns. Quote the headline back. When asked for tuning, answer with three candidate sets that each hit every target; fix timing or structure before stats; check cooldown-like limits against fight length.
- Stack: three.js (pinned), Vite, plain JS. Hooks: `?test` (manual clock, `window.__game.advance(ms)`), `?seed=N`, `?mode=fast`, `?tune=path:value`, `?deck=id,id` (start deck), `?debug`; `__game.state() / stateText() / bot()`.

## Self-check
`npm run check` builds, plays each mode headless on laptop and phone through the real buttons, writes screenshots + `summary.txt` to `check-output/`, and fails on console errors, failed requests, frozen state, figures out of frame, or a browser run that differs from Node. `npm run check -- --url=https://crabtoast90-dev.github.io/practice-pace-lab/` checks the live site. Open the screenshots and say in one line what you see before calling anything done.

## Deploy and merge rule
Every push to `main` deploys: https://crabtoast90-dev.github.io/practice-pace-lab/
Work on your own branch. When the check passes and you've opened its screenshots: rebase on main, rerun the check if main moved, merge to main, push. One merge at a time.

## Files to keep up to date
`PLAN.md` (tick items when merged), `DECISIONS.md`, `IDEAS.md`, `CREDITS.md` (same day an asset lands). If this project improves the starter, update `game-kit/` in practice-rpg and merge it to main.

## End of every session
Ask for fresh fun and look scores 1-5 **per mode played** (never carry scores over) and "Anything annoy you this session?"; put the answer in his words in the row's notes. Write the `LOG.md` row yourself with the three time columns as `-`, commit, then as the very last step run `npm run log-time -- --row="<session name>" --session=<session id>`, commit and merge `timelog/` and `LOG.md`. Never ask for minutes.
