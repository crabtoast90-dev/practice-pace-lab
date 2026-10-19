// ?tune=enemies.warrior.hp:50,rules.energy:4 : try numbers by name without editing the
// data files. The check uses it too (a losing run needs a weaker hero); Node applies the
// same string.
export function applyTune(data, spec) {
  if (!spec) return data;
  const out = structuredClone(data);
  for (const pair of spec.split(',')) {
    const [path, value] = pair.split(':');
    const keys = path.split('.');
    let o = out;
    for (const k of keys.slice(0, -1)) o = o?.[k];
    const last = keys[keys.length - 1];
    if (!o || !(last in o) || Number.isNaN(Number(value))) throw new Error(`?tune: no number at ${path}`);
    o[last] = Number(value);
  }
  return out;
}

// ?deck=strike,verdict,... : start the run with this deck instead (test hook: the check
// uses it to reach the finisher and combo shots on any seed).
export function applyDeck(data, spec) {
  if (!spec) return data;
  const deck = spec.split(',');
  for (const id of deck) if (!data.cards[id]) throw new Error(`?deck: no card ${id}`);
  return { ...data, starterDeck: deck };
}
