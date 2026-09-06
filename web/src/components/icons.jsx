const I = (path, extra) => (props) => (
  <svg width={props.size || 18} height={props.size || 18} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true" {...extra}>
    {path}
  </svg>
);

export const BoatIcon = I(<><path d="M3 18c1.5-1 3-1 4.5 0s3 1 4.5 0 3-1 4.5 0 3 1 4.5 0"/><path d="M12 2v13"/><path d="M12 4l7 8h-7"/><path d="M12 4L5 12h7"/></>);
export const AnchorIcon = I(<><circle cx="12" cy="5" r="3"/><path d="M12 8v13"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/></>);
export const PinIcon = I(<><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></>);
export const CalendarIcon = I(<><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></>);
export const UsersIcon = I(<><circle cx="9" cy="7" r="4"/><path d="M17 11a4 4 0 1 0-3-6.6"/><path d="M23 21v-2a4 4 0 0 0-4-4h-5"/><path d="M1 21v-2a4 4 0 0 1 4-4h4"/></>);
export const BedIcon = I(<><path d="M2 20v-8a2 2 0 0 1 2-2h12a4 4 0 0 1 4 4v6"/><path d="M2 14h20"/><circle cx="8" cy="7" r="2"/></>);
export const StarIcon = (p) => (
  <svg width={p.size || 14} height={p.size || 14} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8L12 2z" />
  </svg>
);
export const SearchIcon = I(<><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></>);
export const ArrowRight = I(<><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>);
export const CheckIcon = I(<path d="M20 6 9 17l-5-5"/>);
export const XIcon = I(<><path d="M18 6 6 18"/><path d="m6 6 12 12"/></>);
export const ZapIcon = I(<path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z"/>); // instant
export const ShieldIcon = I(<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>); // guaranteed
export const WindIcon = I(<><path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/></>);
export const WavesIcon = I(<><path d="M2 6c1.5-1.5 3-1.5 4.5 0S9.5 7.5 11 6s3-1.5 4.5 0S18.5 7.5 20 6"/><path d="M2 12c1.5-1.5 3-1.5 4.5 0S9.5 13.5 11 12s3-1.5 4.5 0S18.5 13.5 20 12"/><path d="M2 18c1.5-1.5 3-1.5 4.5 0S9.5 19.5 11 18s3-1.5 4.5 0S18.5 19.5 20 18"/></>);
export const ChatIcon = I(<><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></>);
export const DocIcon = I(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8M16 17H8"/></>);
export const CompassIcon = I(<><circle cx="12" cy="12" r="10"/><path d="m16.2 7.8-2.1 6.3-6.3 2.1 2.1-6.3z"/></>);
export const PlusIcon = I(<><path d="M12 5v14M5 12h14"/></>);
export const GlobeIcon = I(<><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z"/></>);
export const CrewIcon = I(<><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></>);
export const SunIcon = I(<><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"/></>);
export const ShareIcon = I(<><path d="M4 12v8h16v-8"/><path d="M12 16V4"/><path d="m8 8 4-4 4 4"/></>);
export const FerryIcon = I(<><path d="M4 17h16l2-7-6 2-4-5-4 5-6-2z"/><path d="M2 20c2-1.5 3-1.5 5 0"/></>);
