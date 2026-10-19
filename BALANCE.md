# Balance report

Written by `npm run sim` on 2026-10-19 08:58 UTC. Do not edit by hand.

## Headline

- A Fast: all targets pass. Wins 62%, fights 4.3 / 4.8 / 6.6 turns.
- B Plan then Watch: coming (not built yet).
- C Spirit Combo: coming (not built yet).

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
