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

## 2026-10-20 (C1: Spirit Combo)
- 2026-10-20: Brian: close out B, start C.
- 2026-10-20: C's turn: no energy; draw 6 so the 5-card limit always leaves a choice; the first card has no timer; each next card must be picked within 2.5 s of the one before, while the attacks play (they queue up behind each other); running out ends the combo with "Too slow!". "End combo" stops early. No 2x in C (it would change the timer's feel); Skip only works on the skeletons' turn. *(my call)*
- 2026-10-20: Spirit bonuses are live, per card: a card with the same number as the last card is a pair (+30% damage and block); a card that continues a run of consecutive numbers (up or down) to 3 or more is a straight (+25% at 3, +50% at 4, +75% at 5). The card's corner shows its spirit number instead of a cost, and the hand shows what each card would earn ("PAIR +30%"). Pairs and straights get the combo banner, hit-stop and punch-in. The shared 3rd-card combo reward from A and B still applies in C. *(my call)*
- 2026-10-20: Finishers in C need 3 cards before them (the card says so and stays dim until then) and end the combo. *(my call)*
- 2026-10-20: The timer enters the sim as data: each pick carries how many milliseconds it took, and a pick after the timer is a timeout. The bot picks every 900 ms, so it never times out at the default timer. *(my call)*
- 2026-10-20: Fix in the shared sim: a card that doesn't aim at one skeleton (block, buffs, area) no longer records the selected skeleton as its target (it made browser and Node runs differ in their logs, not in play). *(my call)*
- 2026-10-20: Brian's C verdict (first test, 2.5 s timer): fast and intense, "somewhat like an action game", with some strategy lost; confident the right pacing (~5 s per pick) could hit a sweet spot. Same spirit numbers on every Strike (3) and Guard (2) made the number play monotonous. Key genre difference from Baten Kaitos: with no costs a key power differentiator between cards is lost; fine in an RPG with vertical progression, but a roguelike needs cards with tradeoffs, so C needs enough mechanical depth on cards without overloading decisions at this pace: "a much more challenging design space than the other two", upside still high.
- 2026-10-20: Brian: retest C with 5 s per pick and a range of spirit numbers on the strikes and blocks. Done: rules.chain.pickMs 2500 → 5000; each starting copy gets its own number via spiritDeal.
- 2026-10-20: The spread: Strikes 2, 4, 5, 7, 8; Guards 1, 3, 6, 9 (Crushing Chop stays 6); reward cards keep their card's number. Only C deals per-copy numbers. *(my call)*
- 2026-10-20: Brian: C's card depth should come from keywords and synergies (Bazaar-style Burn / Haste builds where cards combo together), giving picks context beyond a tier list. Logged in IDEAS.md; not built.
- 2026-10-20: Brian: liked identities tied to spirit hands (straights vs pairs, maybe more poker hands) and Haste extending combos; cross-identity decks (Haste + Burn on a long straight) are the synergy he wants C built on. Logged in IDEAS.md; not built.
- 2026-10-20: Brian, after one fight of the C retest: block feels out of place in C (you can't block or attack for precise amounts, so block cards sometimes do nothing; spirit numbers still give them value). This direction may want to rethink block for the player. No action now.
- 2026-10-20: Brian: in C, playing a card draws its replacement at once (Baten Kaitos' reactivity: adjust, find unexpected combos); C's starting deck doubled so pairs happen again; add the Burn / Haste suite, 2 cards each, 2 copies of each in the deck. Done.
- 2026-10-20: The keyword cards: Ember Cut (light, spirit 6: deal 3, Burn 3, x2 in a straight), Wildfire (area, spirit 7: Burn 2 to all, +2 per card in the straight), Quickstep (light, spirit 3: deal 4, Haste +1 combo card), Tempo Rush (buff, spirit 4: Haste +2). Burn ticks at the start of the skeletons' turn, through block, then drops by 1. They're in C's starting deck and reward pool only. Read "2 of each, duplicated" as 2 Burn + 2 Haste cards, 2 copies each. *(my call)*
- 2026-10-20: With draw-on-play, when the draw pile runs out mid-combo the discard (cards just played) reshuffles in, as at the start of a turn. *(my call)*
