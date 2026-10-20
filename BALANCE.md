# Balance report

Written by `npm run sim` on 2026-10-20 07:20 UTC. Do not edit by hand.

## Headline

- A Fast: all targets pass. Wins 62%, fights 4.3 / 4.8 / 6.6 turns.
- B Plan then Watch: all targets pass. Wins 66%, fights 4.3 / 4.8 / 6.6 turns.
- C Spirit Combo: misses a target. Wins 100%, fights 2.6 / 2.3 / 3.1 turns.

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
- Fight length 2.6 / 2.3 / 3.1 turns against target 4-7: **FAILS** (Crypt Gate, Ossuary, Champion of Bone out of range).
- Winning runs end with 66 of 72 HP on average.
- Same seed, same run: yes (seed 1 played twice gives identical events).

### Fights

fight | reached | won | turns (avg, shortest-longest) | HP lost (avg)
--- | --- | --- | --- | ---
Crypt Gate | 300 | 100% | 2.6 (2-3) | 0.4
Ossuary | 300 | 100% | 2.3 (2-4) | 0.9
Champion of Bone (elite) | 300 | 100% | 3.1 (2-5) | 4.9

### Combo moments

- Turns where the bot plays 3+ cards (the combo moment): 82% of 2708 turns.
- Cards per turn: 4.0 on average; 1: 3%, 2: 4%, 3: 5%, 4: 9%, 5+: 68%.

### Does every card get used?

card | family | cost | offered | picked | played (all runs)
--- | --- | --- | --- | --- | ---
Strike | light | 1 | starter | - | 5782
Quick Jab | light | 0 | 147 | - | 0
Twin Slash | light | 1 | 163 | 85 | 181
Heavy Blow | heavy | 2 | 147 | 147 | 295
Crushing Chop | heavy | 2 | starter | - | 1166
Sunder | heavy | 1 | 148 | - | 0
Sweep | area | 1 | 154 | 25 | 43
Whirlwind | area | 2 | 138 | 101 | 205
Battle Cry | buff | 1 | 156 | 70 | 147
Focus | buff | 0 | 147 | - | 0
Guard | block | 1 | starter | - | 2772
Shield Bash | block | 1 | 147 | 18 | 40
Iron Wall | block | 2 | 142 | 25 | 47
Final Verdict | finisher | 1 | 144 | 112 | 195
Skyfall | finisher | 2 | 167 | 17 | 29

- Never played: Quick Jab, Sunder, Focus.

### Combos and spirit numbers

Bot picks each card 900 ms after the last; the timer is 2500 ms.

- How combos end (1508): limit 84%, finisher 11%, stop 6%. The timer ended 0% of combos.
- Spirit bonuses: 34% of cards made a pair, 1% a straight.
