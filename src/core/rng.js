// Seeded random numbers. The state is a plain number kept on the run, so a run can be
// copied (the bot plans on copies) and replayed exactly in Node and the browser.
export function rand(holder) {
  holder.rng = (holder.rng + 0x6d2b79f5) >>> 0;
  let t = holder.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function shuffle(holder, list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand(holder) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// A short fingerprint of a run's events, so the check can compare browser and Node in one line.
export function digest(events) {
  let h = 2166136261;
  for (const ch of JSON.stringify(events)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return `${events.length} events #${(h >>> 0).toString(16)}`;
}
