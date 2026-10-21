# Plan

Each item can be pasted alone into a fresh session. Every session reads `CLAUDE.md` first, follows the merge rule, adds steps to `npm run check` for what it builds, and reruns `npm run sim` if it touches a sim or a data file.

**Lanes:** items in different lanes can run at the same time. Inside a lane, items run in order. "After X" means wait until X is merged.

**SHARED files** (named per item; the second item to merge rebases and reruns the check):
- **the card data**: `src/core/cards.js` (hero, 15 cards, skeletons, fights)
- **the sim core**: `src/core/sim.js`, `src/core/bot.js`, `src/core/rng.js`
- **the animation families**: `src/view/families.js`, `src/view/battle-player.js`, `src/view/vfx.js`, `src/view/units.js`, `src/view/camera.js`, `src/view/card-face.js`
- **the start screen**: `index.html`, `src/main.js`, `src/style.css`
- the scripts: `scripts/check.mjs`, `scripts/sim.mjs` (each lane edits only its own mode's section)

## Setup lane: mode A + the shared core
- [x] **0. Setup.** Starter copied from the game kit, sim core with the 15 cards and 3 fights, mode A fully playable as the feel slice, first `BALANCE.md`, start screen with B and C shown as "coming", this plan, Pages deploy, check passing on the live site.
  *Done when:* mode A plays on the phone link and `npm run check -- --url=<live>` passes.

## Lane B: Plan then Watch
- [x] **B1. Plan then Watch.** After 0. New mode `plan`: the whole turn is queued first (tap cards in order, tap to un-queue), each queued card shows its exact damage and block with everything before it applied (strength, combo bonus, per-card bonuses, Expose, the skeletons' block), and the skeletons' plates preview their HP after the turn. Draw cards resolve the moment they are queued (the drawn cards join the hand), so the preview stays exact; a queued draw card can no longer be un-queued. GO plays the turn as one directed sequence with camera cuts between cards (no input until it ends), then the skeletons act. The preview must come from the sim (play the queue on a copy of the fight), never from view maths. Files: new `src/plan/data.js` (energy 3, draw 5, the pace numbers for the sequence and cuts, targets), new `src/view/plan-view.js`; SHARED: the sim core (a "preview" helper, if needed), the animation families (camera cuts between beats), the start screen (enable the B button), the scripts (a `plan` section in each).
  *Done when:* the check queues a turn on laptop and phone, the preview numbers equal what the sim then does, GO plays to the end matching Node, the screenshots show the queue with previews and a mid-sequence camera cut; `BALANCE.md` has a mode B section (information only: balance is not a Done-when for this practice run).

## Lane C: Baten Kaitos (on screen: "Spirit Combo")
- [x] **C1. Spirit Combo.** After 0. New mode `kaitos`: no energy; a combo limit of 5 cards. The first card has no timer; after it, each next card must be picked while the current attack plays, within a timer (start 2.5 s, `?tune=rules.pickMs:3000`); the timer running out ends the combo. Every card shows its spirit number 1-9 (`cards.<id>.spirit`); pairs and straights inside the combo add a bonus (numbers in the data file). Finishers need 3+ cards before them and end the combo. An empty hand ends the turn. Timing enters the sim as data (each pick carries its time), so the sim stays pure. For `npm run sim`, the bot plays with a fixed decision delay (`bot.delayMs`), so the win-rate target holds at the default timer. Files: new `src/kaitos/data.js`, new `src/view/kaitos-view.js`; SHARED: the sim core (combo limit, timer, spirit bonus, finisher rule: as rules switched on by the mode's data, mode A unchanged), the card data (only if spirit numbers change), the animation families, the start screen (enable the C button), the scripts (a `kaitos` section).
  *Done when:* the check plays a run on laptop and phone with scripted pick times (on time, late = combo ends), matching Node; screenshots show the timer mid-combo and a pair/straight bonus; `BALANCE.md` has a mode C section with the bot's delay and how often the timer ends a combo (information only, not a Done-when).

## Lane T: tuning (only when Brian asks; balance is low priority for this practice run)
- [ ] **T1. Tune mode A after Brian's playtest.** Brian's notes become lines here first.
  - 2026-10-19 note (setup playtest, fun 2.3, look 1.9): "Combos only worked for attacks but not block." Today the +25% combo bonus only touches damage; block (and buffs) on card 3+ get nothing. **Done 2026-10-19:** Brian picked per-family combo rewards (option 2); shipped with tuning set 1 (Champion HP 104). Answer each tuning ask with three candidate sets that each hit every target in `BALANCE.md`; fix timing or structure before stats; check limits against fight length. Files: `src/fast/data.js`, `src/view/families.js` (feel), SHARED: the card data (if a card changes, rerun the sim for every built mode).
  *Done when:* Brian picks a set, it is merged, `npm run sim` passes for every built mode.
  - 2026-10-20 notes (B playtest): (1) "There is a card that removes enemy block, but enemies never blocked." The skeletons do block (a skeleton holds block on about 1 player turn in 3 in fight 1, 1 in 7 in fight 2, 1 in 5 in the elite), but it only shows as a small "6 block" tag and a "DEFEND" intent, and Sunder's text never says how much it would break: a readability problem. (2) "Combo requires playing 3 cards, which makes you feel bad about playing the 2 cost spell." Brian: don't act on this now.
- [ ] **T2. Tune B and C** (C notes 2026-10-21: still a little too fast; block out of place; Haste and Burn need smoothing) the same way, after B1 / C1 and their playtests.

## Ship
- [x] **E1. Compare the three modes.** Skipped: Brian had his takeaways (see DECISIONS.md, 2026-10-21: C excites him most; B is the visual / cinematic bet; A is a standard deckbuilder). After B1 and C1. One session where Brian plays all three back to back; scores per mode in `LOG.md`; the verdict on "which turn structure feels best" goes in `DECISIONS.md`.
- [ ] **E2. Release.** Last. Live-site check, README and CREDITS complete, unused models removed from `public/`, final `npm run sim`.
  *Done when:* the live-site check passes and its screenshots are described in one line each.
