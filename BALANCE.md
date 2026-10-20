# Balance report

Written by `npm run sim` on 2026-10-20 08:09 UTC. Do not edit by hand.

## Headline

- A Fast: all targets pass. Wins 62%, fights 4.3 / 4.8 / 6.6 turns.
- B Plan then Watch: all targets pass. Wins 66%, fights 4.3 / 4.8 / 6.6 turns.
- C Spirit Combo: misses a target. Wins 100%, fights 2.6 / 2.4 / 3.1 turns.

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

- Never played: Quick Jab.

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

- Never played: Quick Jab.

## Mode: C Spirit Combo

300 seeded runs (seeds 1-300), played by the bot (src/core/bot.js).

- Bot run win rate 100% against target 62% (accepting 55-70%): **FAILS** (too easy).
- Fight length 2.6 / 2.4 / 3.1 turns against target 4-7: **FAILS** (Crypt Gate, Ossuary, Champion of Bone out of range).
- Winning runs end with 67 of 72 HP on average.
- Same seed, same run: yes (seed 1 played twice gives identical events).

### Fights

fight | reached | won | turns (avg, shortest-longest) | HP lost (avg)
--- | --- | --- | --- | ---
Crypt Gate | 300 | 100% | 2.6 (2-4) | 0.4
Ossuary | 300 | 100% | 2.4 (1-4) | 0.5
Champion of Bone (elite) | 300 | 100% | 3.1 (2-5) | 4.2

### Combo moments

- Turns where the bot plays 3+ cards (the combo moment): 81% of 2715 turns.
- Cards per turn: 4.0 on average; 1: 4%, 2: 4%, 3: 4%, 4: 8%, 5+: 69%.

### Does every card get used?

card | family | cost | offered | picked | played (all runs)
--- | --- | --- | --- | --- | ---
Strike | light | 1 | starter | - | 5676
Quick Jab | light | 0 | 135 | - | 0
Twin Slash | light | 1 | 177 | 86 | 190
Heavy Blow | heavy | 2 | 145 | 145 | 285
Crushing Chop | heavy | 2 | starter | - | 1190
Sunder | heavy | 1 | 131 | - | 0
Sweep | area | 1 | 161 | 25 | 51
Whirlwind | area | 2 | 153 | 117 | 230
Battle Cry | buff | 1 | 146 | 59 | 125
Focus | buff | 0 | 146 | - | 0
Guard | block | 1 | starter | - | 2836
Shield Bash | block | 1 | 138 | 14 | 33
Iron Wall | block | 2 | 156 | 30 | 65
Final Verdict | finisher | 1 | 143 | 107 | 182
Skyfall | finisher | 2 | 169 | 17 | 28

- Never played: Quick Jab, Sunder, Focus.

### Combos and spirit numbers

Bot picks each card 900 ms after the last; the timer is 5000 ms.

- How combos end (1515): limit 87%, finisher 9%, stop 4%. The timer ended 0% of combos.
- Spirit bonuses: 7% of cards made a pair, 13% a straight.
