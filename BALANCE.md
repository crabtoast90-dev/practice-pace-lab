# Balance report

Written by `npm run sim` on 2026-10-19 08:12 UTC. Do not edit by hand.

## Headline

- A Fast: all targets pass. Wins 62%, fights 4.3 / 4.6 / 5.8 turns.
- B Plan then Watch: coming (not built yet).
- C Spirit Combo: coming (not built yet).

## Mode: A Fast

600 seeded runs (seeds 1-600), played by the bot (src/core/bot.js).

- Bot run win rate 62% against target 62% (accepting 55-70%): **PASSES**.
- Fight length 4.3 / 4.6 / 5.8 turns against target 4-7: **PASSES**.
- Winning runs end with 12 of 72 HP on average.
- Same seed, same run: yes (seed 1 played twice gives identical events).

### Fights

fight | reached | won | turns (avg, shortest-longest) | HP lost (avg)
--- | --- | --- | --- | ---
Crypt Gate | 600 | 100% | 4.3 (4-6) | 14.4
Ossuary | 600 | 100% | 4.6 (3-7) | 18.0
Champion of Bone (elite) | 600 | 62% | 5.8 (1-10) | 32.0

### Combo moments

- Turns where the bot plays 3+ cards (the combo moment): 50% of 9236 turns.
- Cards per turn: 2.4 on average; 1: 2%, 2: 44%, 3: 50%, 4: 0%, 5+: 0%.

### Does every card get used?

card | family | cost | offered | picked | played (all runs)
--- | --- | --- | --- | --- | ---
Strike | light | 1 | starter | - | 13058
Quick Jab | light | 0 | 304 | - | 0
Twin Slash | light | 1 | 300 | 147 | 469
Heavy Blow | heavy | 2 | 299 | 299 | 638
Crushing Chop | heavy | 2 | starter | - | 2930
Sunder | heavy | 1 | 303 | 2 | 9
Sweep | area | 1 | 306 | 52 | 100
Whirlwind | area | 2 | 280 | 212 | 226
Battle Cry | buff | 1 | 301 | 131 | 335
Focus | buff | 0 | 267 | 2 | 9
Guard | block | 1 | starter | - | 3462
Shield Bash | block | 1 | 314 | 50 | 159
Iron Wall | block | 2 | 320 | 42 | 33
Final Verdict | finisher | 1 | 289 | 213 | 680
Skyfall | finisher | 2 | 317 | 50 | 29

- Never played: Quick Jab.
