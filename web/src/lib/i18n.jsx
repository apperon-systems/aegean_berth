import { createContext, useContext, useState, useEffect } from 'react';

const DICT = {
  en: {
    tagline: 'The Aegean, by the berth',
    hero_title: 'Don’t book a boat. Book a departure.',
    hero_sub: 'Search sailing holidays by route and date — one berth, a cabin, or the whole boat. All across the Greek islands.',
    where: 'Where', where_ph: 'Region, island or route',
    when: 'When', who: 'Who', how: 'How',
    anytime: 'Any time', people: 'people',
    whole_boat: 'Whole boat', cabin: 'Cabin', berth: 'Single berth',
    search: 'Search departures',
    explore_routes: 'Explore routes', start_sailing: 'Start a Sailing',
    trending: 'Departures leaving soon', view_all: 'View all',
    guaranteed: 'Guaranteed', instant: 'Instant confirmation',
    berths_left: 'berths left', per_person: 'per person',
    login: 'Log in', logout: 'Log out', account: 'My trips',
    dashboard: 'Dashboard', admin: 'Admin',
    featured_routes: 'Featured routes', crowd_title: 'Can’t find your dates? Create the departure.',
    crowd_sub: 'Propose a route and dates, rally other travellers, and let operators bid to run it.',
    nights: 'nights', from: 'from', book_now: 'Book now', join_waitlist: 'Join waitlist',
    reviews: 'reviews', cookie_text: 'We use essential cookies and (with your consent) analytics to improve your experience.',
    accept: 'Accept', decline: 'Decline',
    flexible_boarding: 'Flexible boarding', join_mid: 'Join or leave mid-route at stops marked with ferry or airport access, at a pro-rated price.',
    my_proposals: 'Proposals', operators: 'Operators',
    sailing_holidays: 'Sailing holidays'
  },
  el: {
    tagline: 'Το Αιγαίο, ανά κρεβάτι',
    hero_title: 'Δεν κλείνεις σκάφος. Κλείνεις απόπλους.',
    hero_sub: 'Ψάξε ιστιοπλοϊκές διακοπές με διαδρομή και ημερομηνία — ένα κρεβάτι, καμπίνα, ή ολόκληρο το σκάφος.',
    where: 'Πού', where_ph: 'Περιοχή, νησί ή διαδρομή',
    when: 'Πότε', who: 'Ποιοι', how: 'Πώς',
    anytime: 'Οποτεδήποτε', people: 'άτομα',
    whole_boat: 'Ολόκληρο σκάφος', cabin: 'Καμπίνα', berth: 'Κρεβάτι',
    search: 'Αναζήτηση απόπλων',
    explore_routes: 'Διαδρομές', start_sailing: 'Ξεκίνα Απόπλου',
    trending: 'Προσεχείς απόπλοι', view_all: 'Δες όλα',
    guaranteed: 'Εγγυημένος', instant: 'Άμεση επιβεβαίωση',
    berths_left: 'κρεβάτια διαθέσιμα', per_person: 'ανά άτομο',
    login: 'Σύνδεση', logout: 'Αποσύνδεση', account: ' Τα ταξίδιά μου',
    dashboard: 'Πίνακας', admin: 'Διαχείριση',
    featured_routes: 'Κορυφαίες διαδρομές', crowd_title: 'Δεν βρίσκεις ημερομηνίες; Δημιούργησε τον απόπλου.',
    crowd_sub: 'Πρότεινε διαδρομή και ημερομηνίες, μαζέψτε ταξιδιώτες, και αφήστε τους operators να κάνουν προσφορές.',
    nights: 'νύχτες', from: 'από', book_now: 'Κλείσε τώρα', join_waitlist: 'Λίστα αναμονής',
    reviews: 'κριτικές', cookie_text: 'Χρησιμοποιούμε απαραίτητα cookies και (με τη συγκατάθεσή σας) analytics.',
    accept: 'Αποδοχή', decline: 'Απόρριψη',
    flexible_boarding: 'Ευέλικτη επιβίβαση', join_mid: 'Επιβίβαση ή αποβίβαση εντός διαδρομής σε stops με πλοίο ή αεροδρόμιο, με αναλογική τιμή.',
    my_proposals: 'Προτάσεις', operators: 'Operators',
    sailing_holidays: 'Ιστιοπλοϊκές διακοπές'
  }
};

const I18nContext = createContext({ lang: 'en', t: (k) => k, setLang: () => {} });

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem('ab_lang') || 'en');
  const setLang = (l) => { localStorage.setItem('ab_lang', l); setLangState(l); document.documentElement.lang = l; };
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  const t = (key) => DICT[lang]?.[key] ?? DICT.en[key] ?? key;
  return <I18nContext.Provider value={{ lang, t, setLang, langs: ['en', 'el'] }}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
