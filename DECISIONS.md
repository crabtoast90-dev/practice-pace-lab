# Decisions

One dated line per decision. Lines marked *(my call)* are technical or naming calls Claude made; the user can overturn any of them.

## 2026-10-19 (setup session)

**Brian's brief**
- 2026-10-19: The game: a short Slay the Spire-style run (KayKit Knight vs KayKit skeletons, 3 fights with an elite last, pick 1 of 3 cards after each fight, HP carries over, 0 HP loses) to answer one question: for a deckbuilder where every card is a combat animation, which turn structure feels best?
- 2026-10-19: 15 cards in 6 animation families (light hit, heavy hit, area, buff, block, finisher); a card's look = its family + its own VFX color and timing.
- 2026-10-19: Three pace modes on the start screen, same cards and skeletons: A Fast (3 energy, draw 5, 0.4-0.8 s animations, 2 s finisher cinematic, 1x/2x, Skip); B Plan then Watch (queue the turn with exact previews, GO, one directed sequence with camera cuts; draw cards resolve when queued); C Baten Kaitos (combo limit 5, first card untimed, then pick while the attack plays within a timer starting at 2.5 s, spirit numbers 1-9 with pair/straight bonuses, finishers need 3+ cards first and end the combo, empty hand ends the turn).
- 2026-10-19: Feel target: the third card of a turn lands as a combo moment. Polish goes to hit timing, impact (hit-stop, shake, flash) and camera, not the arena.
- 2026-10-19: Sim targets: a decent bot wins the run 55-70% of the time; fights last 4-7 turns. Mode C's bot plays with a fixed decision delay. Tuning asks are answered with three candidate sets that hit every target.
- 2026-10-19: Cut and parked in IDEAS.md: defense phase, map, relics, more heroes, unique per-card animations.
- 2026-10-19: Assets only from the kit's assets/ (KayKit); VFX in code; never fetch art mid-session.
- 2026-10-19: Stack and workflow from the game kit's starter (three.js pinned, Vite, Pages on push to main, `npm run check`, `npm run sim` → BALANCE.md, `npm run log-time`).

**My calls**
- 2026-10-19: The combo moment is real in the rules, not just on screen: the 3rd card of a turn and every card after it deal +25% damage (`rules.combo` in `src/fast/data.js`), and it gets a "COMBO!" banner, extra hit-stop, a flash and a camera punch-in. *(my call)*
- 2026-10-19: The 15 cards and their numbers: Strike, Quick Jab, Twin Slash (light); Heavy Blow, Crushing Chop (Expose: +50% damage taken for 2 turns), Sunder (breaks block) (heavy); Sweep, Whirlwind (area); Battle Cry (+2 strength), Focus (draw 2) (buff); Guard, Shield Bash, Iron Wall (block); Final Verdict, Skyfall (finishers: damage grows with each card played before them that turn). Starting deck: 5 Strike, 4 Guard, 1 Crushing Chop. *(my call)*
- 2026-10-19: Every card already carries a spirit number 1-9 for mode C (Final Verdict and Skyfall are 9s). *(my call)*
- 2026-10-19: The fights: Crypt Gate (Bone Warrior + Bone Minion), Ossuary (Bone Stalker + Bone Caster, who buffs everyone), Champion of Bone (elite: a big tinted Bone Champion with an axe + a Bone Minion). Skeletons show their next move above their heads (attack, defend, buff), cycling from a seeded start. *(my call)*
- 2026-10-19: First tuning: skeleton HP up ~20% and attacks down ~40% from my first guess, found by a grid search with the sim; result 62% wins, fights 4.3 / 4.6 / 5.8 turns. No healing between fights. *(my call)*
- 2026-10-19: The bot: each decision it tries every order of the cards it can afford this turn on copies of the fight, scores the result (damage, kills, block that stops incoming hits, strength, Expose, draws) and plays the first card of the best order, then plans again. It picks reward cards from a fixed preference list. *(my call)*
- 2026-10-19: Mode A input: tap a skeleton (or its plate) to target it, then each card tap plays at once; taps can run ahead of the animations and queue up. Laptop keys: 1-9 cards, Space end turn, Tab target, S skip, X speed. *(my call)*
- 2026-10-19: On screen mode C is called "Spirit Combo" (the docs keep "Baten Kaitos"), since the screen uses original names. *(my call)*
- 2026-10-19: Code layout: shared rules engine in `src/core/` (cards, sim, bot); each mode is a data file (`src/fast/data.js`) plus a view; one shared battle player turns sim events into animation beats for all three modes. *(my call)*
- 2026-10-19: Animation family clips: light = 1H diagonal slice, heavy = 2H chop, area = 2H spinning, buff = magic raise, block = shield block, finisher = jump chop. Clips are sped up or slowed so the blow lands exactly on the card's impact time. *(my call)*
- 2026-10-19: Phone camera sits behind the knight's left shoulder (found by a search over camera angles so all four fighters fit between the top bar and the hand). *(my call)*
- 2026-10-19: Test hook `?deck=` sets the starting deck, so the check reaches the combo and the finisher on turn 1. *(my call)*
- 2026-10-19: No RESEARCH.md: the game borrows structures, not numbers, from Slay the Spire and Baten Kaitos. *(my call)*

## 2026-10-19 (after the setup playtest)
- 2026-10-19: Brian: "Combos only worked for attacks but not block." He picked option 2: each family gets its own combo reward from the 3rd card on. Attacks and finishers +25% damage (as before), block cards +50% block, buffs +1 (Battle Cry +3 strength, Focus draws 3). Block and buff cards now also get the combo banner, flash and camera punch-in.
- 2026-10-19: The reward sizes (+50% block, +1 for buffs) and Shield Bash counting as a block card (its block grows, not its damage). *(my call)*
- 2026-10-19: The new rewards pushed the bot to 75% wins. Three candidate sets hit every target: (1) Bone Champion HP 92 → 104 (62%, fights 4.3 / 4.8 / 6.6), (2) Champion swings 7 → 8 and 10 → 12 (64%), (3) Knight HP 72 → 68 (65%). Shipped set 1; Brian can switch to 2 or 3. *(my call)*
- 2026-10-19: Brian: balance is low priority for this practice run; the goal is testing the game flows of A, B and C. No tuning or balance gating unless he asks; `npm run sim` stays as information only.

## 2026-10-19 (B1: Plan then Watch)
- 2026-10-19: Brian: start B1.
- 2026-10-19: How B's previews stay exact: queueing a card plays it in the sim at once and only its animation waits for GO; un-queueing rewinds the turn to its start and replays the rest of the queue. The previews are the sim's own result, never view maths. *(my call)*
- 2026-10-19: B's previews: queued cards show their exact damage / block / strength / draws and "KO"; skeleton plates show HP now → after the turn, with a red "KO" outline on any that will die; the knight's plate shows his HP after the skeletons answer the plan (so even an empty plan shows the incoming damage). *(my call)*
- 2026-10-19: Un-queue: tap any queued card to take it out. A draw card resolves when queued, so it and every card before it lock ("locked" tag). Backspace takes the last one out on laptop. *(my call)*
- 2026-10-19: GO plays the queued cards as one sequence with a hard camera cut per card family (light: over the shoulder; heavy: low side shot at the target; area: high wide; buff and block: in front of the knight), each card 25% longer than in A with a 180 ms beat between cards; the camera returns to the arena for the skeletons. B has Skip but no 2x. B's turn rules are the same as A's. *(my call)*
- 2026-10-20: Brian's B verdict after ~3 min: "That played better than I expected." Queueing the whole turn and previewing its outcome before committing is the value, and it would carry to mechanics beyond the combo (which he doesn't expect to keep). The camera swaps for bigger attacks and blocks added something. Leans slightly toward one-card-at-a-time pace (B precludes core mechanics like card draw), but calls it close and would make a game on B if the art/presentation payoff were big. Fun 3.4, look 2.8.
