// SEO helpers (Block C): JSON-LD structured data + document title/canonical management.
// NOTE: The preview app is a SPA; for production SEO every public page should be
// server-side rendered — see AGENTS.md ("SSR migration" note).

export function setMeta({ title, description, canonical }) {
  if (title) document.title = title;
  if (description) {
    let m = document.querySelector('meta[name="description"]');
    if (!m) { m = document.createElement('meta'); m.name = 'description'; document.head.appendChild(m); }
    m.content = description;
  }
  if (canonical) {
    let l = document.querySelector('link[rel="canonical"]');
    if (!l) { l = document.createElement('link'); l.rel = 'canonical'; document.head.appendChild(l); }
    l.href = canonical;
  }
}

export function jsonLd(id, data) {
  let el = document.getElementById(id);
  if (el) el.remove();
  el = document.createElement('script');
  el.type = 'application/ld+json';
  el.id = id;
  el.textContent = JSON.stringify(data);
  document.head.appendChild(el);
}

export function tripJsonLd({ departure, route, vessel, operator }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${route?.name} — ${vessel?.name}`,
    description: route?.summary,
    image: [route?.hero_image, ...(vessel?.photos || [])].filter(Boolean),
    brand: { '@type': 'Brand', name: 'AEGEAN BERTH' },
    offers: {
      '@type': 'Offer',
      price: departure.base_price_per_berth || departure.whole_boat_price,
      priceCurrency: departure.currency || 'EUR',
      availability: departure.berths_available > 0 ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut',
      url: window.location.href,
      seller: { '@type': 'Organization', name: operator?.company_name || 'Aegean Berth' }
    },
    ...(departure.rating_agg ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: departure.rating_agg, reviewCount: departure.review_count_agg } } : {})
  };
}
