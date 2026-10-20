const PATHS: Record<string, string> = {
  check: '<polyline points="20 6 9 17 4 12"/>',
  "check-circle": '<circle cx="12" cy="12" r="9"/><polyline points="16 10 11 15 8.5 12.5"/>',
  x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  minus: '<line x1="5" y1="12" x2="19" y2="12"/>',
  "arrow-right": '<line x1="4" y1="12" x2="20" y2="12"/><polyline points="14 6 20 12 14 18"/>',
  "arrow-left": '<line x1="20" y1="12" x2="4" y2="12"/><polyline points="10 6 4 12 10 18"/>',
  "arrow-up": '<line x1="12" y1="20" x2="12" y2="4"/><polyline points="6 10 12 4 18 10"/>',
  "arrow-down": '<line x1="12" y1="4" x2="12" y2="20"/><polyline points="6 14 12 20 18 14"/>',
  "chevron-right": '<polyline points="9 5 16 12 9 19"/>',
  "chevron-left": '<polyline points="15 5 8 12 15 19"/>',
  "chevron-down": '<polyline points="5 9 12 16 19 9"/>',
  "chevron-up": '<polyline points="5 15 12 8 19 15"/>',
  menu: '<line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/>',
  home: '<path d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M9.5 21v-6h5v6"/>',
  play: '<path d="M7 4.5 19 12 7 19.5z"/>',
  pause: '<rect x="7" y="5" width="3.5" height="14" rx="1"/><rect x="13.5" y="5" width="3.5" height="14" rx="1"/>',
  "skip-forward": '<path d="M6 5l9 7-9 7z"/><line x1="18" y1="5" x2="18" y2="19"/>',
  "rotate-ccw": '<polyline points="3 5 3 11 9 11"/><path d="M4.5 15a8 8 0 1 0 1.6-8.4L3 11"/>',
  camera: '<path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2L8 5h8l1.5 2h2A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z"/><circle cx="12" cy="13" r="3.4"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.6"/><path d="M3.5 17.5 9 12l4 4 2.5-2.5L20.5 18"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="3" x2="8" y2="6"/><line x1="16" y1="3" x2="16" y2="6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/>',
  activity: '<polyline points="3 12 7 12 10 5 14 19 17 12 21 12"/>',
  "trending-up": '<polyline points="3 17 9 11 13 15 21 7"/><polyline points="15 7 21 7 21 13"/>',
  "trending-down": '<polyline points="3 7 9 13 13 9 21 17"/><polyline points="15 17 21 17 21 11"/>',
  "bar-chart": '<line x1="6" y1="20" x2="6" y2="13"/><line x1="12" y1="20" x2="12" y2="5"/><line x1="18" y1="20" x2="18" y2="9"/>',
  user: '<circle cx="12" cy="8" r="3.6"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>',
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 5.4a3.2 3.2 0 0 1 0 5.2"/><path d="M18 14.6a6.5 6.5 0 0 1 3.5 5.4"/>',
  heart: '<path d="M12 20s-7.5-4.7-7.5-9.7A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 7.5 2.9C19.5 15.3 12 20 12 20z"/>',
  shield: '<path d="M12 3l7.5 3v5.5c0 4.6-3.1 8-7.5 9.5-4.4-1.5-7.5-4.9-7.5-9.5V6z"/><polyline points="9 12 11.3 14.3 15.5 10"/>',
  lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8.2 10.5V8a3.8 3.8 0 0 1 7.6 0v2.5"/>',
  globe: '<circle cx="12" cy="12" r="9"/><line x1="3" y1="12" x2="21" y2="12"/><path d="M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><polyline points="3.6 6.5 12 13 20.4 6.5"/>',
  phone: '<path d="M5 4h3.5l1.7 4-2.2 1.6a10.5 10.5 0 0 0 5.4 5.4L15 12.8l4 1.7V18a1.6 1.6 0 0 1-1.8 1.6C10.7 18.9 5.1 13.3 4.4 6.8A1.6 1.6 0 0 1 5 4z"/>',
  video: '<rect x="3" y="6" width="12.5" height="12" rx="2"/><path d="M15.5 11l5.5-3v8l-5.5-3z"/>',
  "message-circle": '<path d="M21 11.5a8 8 0 1 1-4.2-7L21 3.5l-1 4.2A8 8 0 0 1 21 11.5z"/><path d="M20.6 12.4A8.5 8.5 0 0 1 8 19.6L3.5 20.5l1-4.2"/>',
  "help-circle": '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.5a2.5 2.5 0 1 1 3.6 2.2c-.8.5-1.2 1-1.2 1.9"/><circle cx="12" cy="17" r=".6" fill="currentColor"/>',
  info: '<circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16.5"/><circle cx="12" cy="8" r=".7" fill="currentColor"/>',
  alert: '<path d="M12 4.5 21 19.5H3z"/><line x1="12" y1="10" x2="12" y2="14"/><circle cx="12" cy="16.8" r=".7" fill="currentColor"/>',
  "book-open": '<path d="M12 6.5C10 4.9 7.5 4.4 4 4.6v13c3.5-.2 6 .3 8 1.9 2-1.6 4.5-2.1 8-1.9v-13c-3.5-.2-6 .3-8 1.9z"/><line x1="12" y1="6.5" x2="12" y2="19.5"/>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><polyline points="14 3 14 8 19 8"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.2M12 18.8V21M4.2 7.5l1.9 1.1M17.9 15.4l1.9 1.1M4.2 16.5l1.9-1.1M17.9 8.6l1.9-1.1"/>',
  "log-out": '<path d="M14 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8"/><polyline points="16 8 20 12 16 16"/><line x1="10" y1="12" x2="20" y2="12"/>',
  download: '<path d="M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15"/><polyline points="8 11 12 15 16 11"/><line x1="12" y1="4" x2="12" y2="15"/>',
  share: '<circle cx="17.5" cy="6" r="2.5"/><circle cx="6.5" cy="12" r="2.5"/><circle cx="17.5" cy="18" r="2.5"/><line x1="8.8" y1="10.8" x2="15.3" y2="7.2"/><line x1="8.8" y1="13.2" x2="15.3" y2="16.8"/>',
  printer: '<path d="M7 9V4h10v5"/><rect x="4" y="9" width="16" height="7" rx="1.5"/><path d="M7 16h10v4H7z"/>',
  tape: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3"/><path d="M12 3.5v5M12 15.5v5"/>',
  sparkle: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
  smile: '<circle cx="12" cy="12" r="9"/><path d="M8.5 14a4.6 4.6 0 0 0 7 0"/><circle cx="9.2" cy="9.8" r=".8" fill="currentColor"/><circle cx="14.8" cy="9.8" r=".8" fill="currentColor"/>',
  droplet: '<path d="M12 3.5s5.5 5.6 5.5 9.6a5.5 5.5 0 0 1-11 0C6.5 9.1 12 3.5 12 3.5z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>',
  star: '<path d="M12 4l2.5 5.3 5.5.7-4 3.9 1 5.6L12 16.8 7 19.5l1-5.6-4-3.9 5.5-.7z"/>',
  flag: '<path d="M5 4v16"/><path d="M5 5h11l-1.5 3.5L16 12H5z"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><line x1="16" y1="16" x2="21" y2="21"/>',
  filter: '<path d="M4 5h16l-6 7v6l-4 2v-8z"/>',
  credit: '<rect x="3" y="5.5" width="18" height="13" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/>',
  euro: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5a4.5 4.5 0 1 0 0 7"/><line x1="7.5" y1="10.8" x2="13" y2="10.8"/><line x1="7.5" y1="13.2" x2="13" y2="13.2"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  layers: '<path d="M12 3.5 21 8l-9 4.5L3 8z"/><path d="M3 12.5 12 17l9-4.5"/><path d="M3 16.5 12 21l9-4.5"/>',
  zap: '<path d="M13.5 3 6 13.5h5l-1.5 7.5L18 10.5h-5z"/>',
  "eye-off": '<path d="M10.6 5.6A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.6 3.4"/><path d="M6.4 6.9C3.9 8.6 2.5 12 2.5 12S6 18.5 12 18.5a9.3 9.3 0 0 0 4.8-1.3"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/><line x1="3" y1="3" x2="21" y2="21"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  bell: '<path d="M7 10a5 5 0 0 1 10 0c0 4 1.5 5.5 1.5 5.5h-13S7 14 7 10z"/><path d="M10.3 18.5a2 2 0 0 0 3.4 0"/>',
  mic: '<rect x="9.5" y="3.5" width="5" height="9" rx="2.5"/><path d="M6 11.5a6 6 0 0 0 12 0"/><line x1="12" y1="17.5" x2="12" y2="20.5"/>',
  "mic-off": '<path d="M9.5 6.5V6a2.5 2.5 0 0 1 5 0v5"/><path d="M6 11.5a6 6 0 0 0 9.5 4.9"/><line x1="4" y1="20" x2="20" y2="4"/><line x1="12" y1="17.5" x2="12" y2="20.5"/>',
  stretch: '<path d="M4 12h16"/><polyline points="8 8 4 12 8 16"/><polyline points="16 8 20 12 16 16"/>',
  stethoscope: '<path d="M6 4v5a4 4 0 0 0 8 0V4"/><path d="M10 13v2a4.5 4.5 0 0 0 9 0v-1.5"/><circle cx="19" cy="11" r="2"/>',
  award: '<circle cx="12" cy="9.5" r="5.5"/><polyline points="9 14.5 8 21 12 19 16 21 15 14.5"/>',
  lightbulb: '<path d="M9 17h6"/><path d="M10 20h4"/><path d="M12 3.5a5.5 5.5 0 0 0-3 10.1V17h6v-3.4A5.5 5.5 0 0 0 12 3.5z"/>',
};

/**
 * Ported 1:1 from assets/js/util.js P.icon — unknown names intentionally
 * fall back to "info" to match the legacy prototype's behaviour.
 */
export function Icon({
  name,
  size = 20,
  className,
}: {
  name: keyof typeof PATHS | (string & {});
  size?: number;
  className?: string;
}) {
  const d = PATHS[name] ?? PATHS.info;
  return (
    <svg
      className={className ? `ico ${className}` : "ico"}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: d }}
    />
  );
}
