import { useEffect, useRef } from 'react';
import L from 'leaflet';

/**
 * Leaflet map (TODO production: Mapbox GL / Google Maps with custom nautical styling, Block C).
 * modes:
 *  - results: groups departures by route, draws polylines + clustered-style pins
 *  - route:   single route polyline + numbered stop markers + optional live AIS position
 */
export default function MapView({ results = [], stopsByRoute = {}, routeStops = null, ais = null, fit = null }) {
  const el = useRef(null);
  const map = useRef(null);

  useEffect(() => {
    if (!el.current) return;
    if (!map.current) {
      map.current = L.map(el.current, { scrollWheelZoom: false, attributionControl: true }).setView([37.5, 24.5], 6);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 12,
        attribution: '&copy; OpenStreetMap'
      }).addTo(map.current);
    }
    const m = map.current;
    m.eachLayer((layer) => { if (layer instanceof L.Marker || layer instanceof L.Path) m.removeLayer(layer); });

    const bounds = [];

    if (routeStops) {
      const latlngs = routeStops.map((s) => [Number(s.lat), Number(s.lng)]);
      L.polyline(latlngs, { color: '#c96f4a', weight: 3, dashArray: '6 7', opacity: 0.85 }).addTo(m);
      routeStops.forEach((s, i) => {
        L.marker([Number(s.lat), Number(s.lng)], {
          icon: L.divIcon({ className: 'route-pin', html: `D${s.day_number}`, iconSize: [30, 20], iconAnchor: [15, 10] })
        }).addTo(m).bindPopup(`<b>Day ${s.day_number} — ${s.port_name}</b><br>${s.description || ''}`);
        bounds.push([Number(s.lat), Number(s.lng)]);
      });
    }

    if (results.length && stopsByRoute) {
      const byRoute = {};
      results.forEach((d) => { (byRoute[d.route_id] ||= []).push(d); });
      for (const [rid, deps] of Object.entries(byRoute)) {
        const stops = stopsByRoute[rid] || [];
        if (!stops.length) continue;
        const latlngs = stops.map((s) => [Number(s.lat), Number(s.lng)]);
        L.polyline(latlngs, { color: '#14283f', weight: 2.5, dashArray: '5 8', opacity: 0.7 }).addTo(m);
        const mid = stops[Math.floor(stops.length / 2)];
        const label = L.divIcon({ className: 'route-pin', html: `${deps.length} × ${deps[0].route_name.split(':')[0]}`, iconSize: null, iconAnchor: [0, 0] });
        L.marker([Number(mid.lat), Number(mid.lng)], { icon: label }).addTo(m).bindPopup(
          deps.map((d) => `<b>${d.route_name}</b><br>${d.departure_date} · ${d.berths_available} berths · €${d.base_price_per_berth || '—'}<br><a href="/departures/${d.id}">View departure</a>`).join('<hr>')
        );
        stops.forEach((s) => bounds.push([Number(s.lat), Number(s.lng)]));
      }
    }

    if (ais) {
      L.marker([ais.lat, ais.lng], {
        icon: L.divIcon({ className: 'ais-marker', html: '', iconSize: [14, 14] }),
        zIndexOffset: 1000
      }).addTo(m).bindPopup(`<b>${ais.speed_kn} kn · heading ${ais.heading}°</b><br>Live AIS position (mock feed)`);
      bounds.push([ais.lat, ais.lng]);
    }

    if (fit) bounds.push(...fit);
    if (bounds.length) m.fitBounds(bounds, { padding: [40, 40], maxZoom: 10 });
    setTimeout(() => m.invalidateSize(), 60);
  }, [results, stopsByRoute, routeStops, ais, fit]);

  return <div className="map-box" ref={el} role="img" aria-label="Map of routes and departures" />;
}
