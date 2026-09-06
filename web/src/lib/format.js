export const eur = (n) => '€' + Math.round(Number(n || 0)).toLocaleString('en');

export const fmtDate = (d, opts = {}) =>
  new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...opts });

export const fmtRange = (a, b) => `${fmtDate(a)} → ${fmtDate(b, { year: 'numeric' })}`;

export const nightsBetween = (a, b) => Math.max(1, Math.round((new Date(b) - new Date(a)) / 86400000));

export const relativeDays = (d) => {
  const n = Math.ceil((new Date(d) - Date.now()) / 86400000);
  if (n > 1) return `in ${n} days`;
  if (n === 1) return 'tomorrow';
  if (n === 0) return 'today';
  return `${-n} days ago`;
};

export const vibeLabel = (v) => v.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
