import { cardDamage, cardBlock, cardStr, cardDraw } from '../core/sim.js';

// SHARED: what a card says on its face. Numbers are live (strength, the combo bonus,
// per-card bonuses), worked out by the sim's own cardDamage, so the hand never lies.
export function cardText(data, f, card) {
  const parts = [];
  if (card.breakBlock) parts.push('Break block.');
  if (card.dmg) {
    const d = f ? cardDamage(data, f, card) : card.dmg;
    parts.push(`Deal <b>${d}</b>${card.hits > 1 ? ` ×${card.hits}` : ''}${card.all ? ' to ALL' : ''}.`);
    if (card.perCard) parts.push(`+${card.perCard} per card before it.`);
  }
  if (card.block) parts.push(`Block <b>${f ? cardBlock(data, f, card) : card.block}</b>.`);
  if (card.str) parts.push(`+<b>${f ? cardStr(data, f, card) : card.str}</b> strength.`);
  if (card.expose) parts.push(`Expose ${card.expose} turns.`);
  if (card.draw) parts.push(`Draw <b>${f ? cardDraw(data, f, card) : card.draw}</b>.`);
  return parts.join(' ');
}

const FAMILY_NAMES = { light: 'Light', heavy: 'Heavy', area: 'Area', buff: 'Buff', block: 'Block', finisher: 'Finisher' };

export function cardHtml(data, f, card) {
  return `<span class="cost">${card.cost}</span><span class="cname">${card.name}</span><span class="fam">${FAMILY_NAMES[card.family]}</span><span class="ctext">${cardText(data, f, card)}</span>`;
}
