// ---- Pricing engine (Block A + B#5) ----
// Applies operator pricing rules to a quote, supports partial-segment pro-rating (flexible boarding).

const nights = (a, b) => Math.max(1, Math.round((new Date(b) - new Date(a)) / 86400000));

/**
 * Quote a booking.
 * @param departure  departure row
 * @param rules       pricing rule rows for the operator
 * @param opts        { bookingType, berthCount, shareCabin, cabinModifierPct, joinDay, leaveDay, totalNights, month }
 */
export function computeQuote(departure, rules, opts = {}) {
  const {
    bookingType = 'berth',
    berthCount = 1,
    shareCabin = false,
    cabinModifierPct = 0,
    joinDay = null,
    leaveDay = null
  } = opts;
  const totalNights = nights(departure.departure_date, departure.return_date);
  const daysUntil = Math.ceil((new Date(departure.departure_date) - Date.now()) / 86400000);
  const month = new Date(departure.departure_date).getUTCMonth() + 1;

  let unitPrice, units;
  if (bookingType === 'whole_boat') {
    unitPrice = Number(departure.whole_boat_price) || 0;
    units = 1;
  } else {
    unitPrice = Number(departure.base_price_per_berth);
    units = berthCount;
    if (cabinModifierPct) unitPrice *= 1 + cabinModifierPct / 100;
  }

  // Flexible boarding: pro-rate the segment, floor at 40% of full fare.
  let segmentFactor = 1;
  if (joinDay != null || leaveDay != null) {
    const segNights = Math.max(1, (leaveDay ?? totalNights) - (joinDay ?? 0));
    segmentFactor = Math.max(0.4, segNights / totalNights);
  }

  let subtotal = unitPrice * units * segmentFactor;
  const adjustments = [];

  for (const rule of rules) {
    const cond = rule.conditions || {};
    let applies = false;
    switch (rule.rule_type) {
      case 'early_bird':
        applies = daysUntil >= (cond.days_before ?? 60) && bookingType !== 'whole_boat'; break;
      case 'last_minute':
        applies = daysUntil <= (cond.days_before ?? 14) && daysUntil >= 0 && bookingType !== 'whole_boat'; break;
      case 'group_discount':
        applies = bookingType !== 'whole_boat' && berthCount >= (cond.min_berths ?? 4); break;
      case 'seasonal_uplift':
        applies = (cond.months || []).includes(month); break;
      case 'single_supplement':
        applies = bookingType === 'berth' && !shareCabin && units === 1; break;
      case 'long_stay':
        applies = totalNights >= (cond.min_nights ?? 10); break;
    }
    if (!applies) continue;
    const delta = rule.adjustment_type === 'percent'
      ? subtotal * (rule.adjustment_value / 100)
      : Number(rule.adjustment_value) * (bookingType === 'whole_boat' ? 1 : units);
    subtotal += delta;
    adjustments.push({ rule: rule.rule_type, label: rule.rule_type.replace(/_/g, ' '), amount: round(delta) });
  }

  const total = round(Math.max(0, subtotal));
  return {
    total,
    breakdown: {
      unit_price: round(unitPrice),
      units,
      nights: totalNights,
      segment_factor: round(segmentFactor),
      adjustments
    },
    deposit: round(total * 0.3),
    balance_due: round(total * 0.7)
  };
}

export const round = (n) => Math.round(n * 100) / 100;

/** RevPAB — Revenue per Available Berth-night (Block B #5). */
export function revpab(revenue, berthsTotal, nights) {
  const berthNights = berthsTotal * nights;
  return berthNights ? round(revenue / berthNights) : 0;
}

/** Yield suggestion: drop price as departure approaches with unsold berths (configurable). */
export function suggestPriceAdjustment(departure) {
  const daysUntil = Math.ceil((new Date(departure.departure_date) - Date.now()) / 86400000);
  const unsoldPct = departure.berths_available / departure.berths_total;
  if (daysUntil > 45 || unsoldPct < 0.3) return null;
  let pct = 0;
  if (daysUntil <= 14 && unsoldPct >= 0.3) pct = 15;
  else if (daysUntil <= 30 && unsoldPct >= 0.5) pct = 10;
  return pct ? { rule: 'last_minute', pct, days_until: daysUntil, unsold_pct: round(unsoldPct * 100) } : null;
}
