# Balance report

Written by `npm run sim` on 2026-10-20 08:37 UTC. Do not edit by hand.

## Headline

- A Fast: all targets pass. Wins 62%, fights 4.3 / 4.8 / 6.6 turns.
- B Plan then Watch: all targets pass. Wins 66%, fights 4.3 / 4.8 / 6.6 turns.
- C Spirit Combo: misses a target. Wins 100%, fights 1.9 / 1.9 / 2.4 turns.

Balance is information only for this practice run (see CLAUDE.md).

## Mode: A Fast

600 seeded runs (seeds 1-600), played by the bot (src/core/bot.js).

- Bot run win rate 62% against target 62% (accepting 55-70%): **PASSES**.
- Fight length 4.3 / 4.8 / 6.6 turns against target 4-7: **PASSES**.
- Winning runs end with 12 of 72 HP on average.
- Same seed, same run: yes (seed 1 played twice gives identical events).

### Fights

fight | reached | won | turns (avg, shortest-longest) | HP lost (avg)
--- | --- | --- | --- | ---
Crypt Gate | 600 | 100% | 4.3 (4-6) | 13.9
Ossuary | 600 | 100% | 4.8 (3-8) | 16.2
Champion of Bone (elite) | 600 | 62% | 6.6 (2-11) | 34.2

### Combo moments

- Turns where the bot plays 3+ cards (the combo moment): 52% of 9814 turns.
- Cards per turn: 2.4 on average; 1: 2%, 2: 42%, 3: 52%, 4: 0%, 5+: 0%.

### Does every card get used?

card | family | cost | offered | picked | played (all runs)
--- | --- | --- | --- | --- | ---
Strike | light | 1 | starter | - | 13689
Quick Jab | light | 0 | 311 | - | 0
Twin Slash | light | 1 | 305 | 147 | 518
Heavy Blow | heavy | 2 | 302 | 302 | 629
Crushing Chop | heavy | 2 | starter | - | 3053
Sunder | heavy | 1 | 292 | 2 | 10
Sweep | area | 1 | 298 | 51 | 98
Whirlwind | area | 2 | 289 | 219 | 228
Battle Cry | buff | 1 | 298 | 129 | 373
Focus | buff | 0 | 266 | 2 | 10
Guard | block | 1 | starter | - | 4198
Shield Bash | block | 1 | 311 | 42 | 153
Iron Wall | block | 2 | 315 | 43 | 36
Final Verdict | finisher | 1 | 294 | 216 | 743
Skyfall | finisher | 2 | 319 | 47 | 25
Ember Cut | light | 1 | 0 | - | 0
Wildfire | area | 2 | 0 | - | 0
Quickstep | light | 0 | 0 | - | 0
Tempo Rush | buff | 1 | 0 | - | 0

- Never played: Quick Jab, Ember Cut, Wildfire, Quickstep, Tempo Rush.

## Mode: B Plan then Watch

300 seeded runs (seeds 1-300), played by the bot (src/core/bot.js).

- Bot run win rate 66% against target 62% (accepting 55-70%): **PASSES**.
- Fight length 4.3 / 4.8 / 6.6 turns against target 4-7: **PASSES**.
- Winning runs end with 12 of 72 HP on average.
- Same seed, same run: yes (seed 1 played twice gives identical events).

### Fights

fight | reached | won | turns (avg, shortest-longest) | HP lost (avg)
--- | --- | --- | --- | ---
Crypt Gate | 300 | 100% | 4.3 (4-6) | 14.1
Ossuary | 300 | 100% | 4.8 (3-8) | 15.9
Champion of Bone (elite) | 300 | 66% | 6.6 (2-11) | 34.1

### Combo moments

- Turns where the bot plays 3+ cards (the combo moment): 52% of 4921 turns.
- Cards per turn: 2.4 on average; 1: 2%, 2: 42%, 3: 52%, 4: 0%, 5+: 0%.

### Does every card get used?

card | family | cost | offered | picked | played (all runs)
--- | --- | --- | --- | --- | ---
Strike | light | 1 | starter | - | 6832
Quick Jab | light | 0 | 145 | - | 0
Twin Slash | light | 1 | 157 | 71 | 258
Heavy Blow | heavy | 2 | 149 | 149 | 318
Crushing Chop | heavy | 2 | starter | - | 1527
Sunder | heavy | 1 | 127 | 1 | 4
Sweep | area | 1 | 151 | 24 | 44
Whirlwind | area | 2 | 149 | 111 | 119
Battle Cry | buff | 1 | 153 | 65 | 185
Focus | buff | 0 | 133 | 1 | 6
Guard | block | 1 | starter | - | 2120
Shield Bash | block | 1 | 158 | 20 | 73
Iron Wall | block | 2 | 160 | 23 | 16
Final Verdict | finisher | 1 | 153 | 115 | 389
Skyfall | finisher | 2 | 165 | 20 | 8
Ember Cut | light | 1 | 0 | - | 0
Wildfire | area | 2 | 0 | - | 0
Quickstep | light | 0 | 0 | - | 0
Tempo Rush | buff | 1 | 0 | - | 0

- Never played: Quick Jab, Ember Cut, Wildfire, Quickstep, Tempo Rush.

## Mode: C Spirit Combo

300 seeded runs (seeds 1-300), played by the bot (src/core/bot.js).

- Bot run win rate 100% against target 62% (accepting 55-70%): **FAILS** (too easy).
- Fight length 1.9 / 1.9 / 2.4 turns against target 4-7: **FAILS** (Crypt Gate, Ossuary, Champion of Bone out of range).
- Winning runs end with 67 of 72 HP on average.
- Same seed, same run: yes (seed 1 played twice gives identical events).

### Fights

fight | reached | won | turns (avg, shortest-longest) | HP lost (avg)
--- | --- | --- | --- | ---
Crypt Gate | 300 | 100% | 1.9 (1-3) | 1.0
Ossuary | 300 | 100% | 1.9 (1-3) | 1.0
Champion of Bone (elite) | 300 | 100% | 2.4 (1-3) | 3.5

### Combo moments

- Turns where the bot plays 3+ cards (the combo moment): 82% of 2198 turns.
- Cards per turn: 5.6 on average; 1: 2%, 2: 2%, 3: 4%, 4: 4%, 5+: 74%.

### Does every card get used?

card | family | cost | offered | picked | played (all runs)
--- | --- | --- | --- | --- | ---
Strike | light | 1 | starter | - | 4377
Quick Jab | light | 0 | 106 | - | 0
Twin Slash | light | 1 | 105 | 54 | 50
Heavy Blow | heavy | 2 | 102 | 102 | 124
Crushing Chop | heavy | 2 | starter | - | 1294
Sunder | heavy | 1 | 118 | 3 | 3
Sweep | area | 1 | 128 | 23 | 18
Whirlwind | area | 2 | 118 | 96 | 118
Battle Cry | buff | 1 | 100 | 45 | 50
Focus | buff | 0 | 112 | 4 | 3
Guard | block | 1 | starter | - | 1954
Shield Bash | block | 1 | 110 | 26 | 33
Iron Wall | block | 2 | 128 | 24 | 15
Final Verdict | finisher | 1 | 116 | 98 | 110
Skyfall | finisher | 2 | 94 | 18 | 26
Ember Cut | light | 1 | 125 | 25 | 889
Wildfire | area | 2 | 116 | 63 | 776
Quickstep | light | 0 | 106 | 1 | 1254
Tempo Rush | buff | 1 | 116 | 18 | 1276

- Never played: Quick Jab.

### Combos and spirit numbers

Bot picks each card 900 ms after the last; the timer is 5000 ms.

- How combos end (1056): limit 94%, finisher 6%, stop 0%. The timer ended 0% of combos.
- Spirit bonuses: 15% of cards made a pair, 13% a straight.
