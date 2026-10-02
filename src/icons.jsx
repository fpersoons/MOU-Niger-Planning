// ─── Icônes SVG maison (style Lucide, trait 2.5) — DESIGN_SYSTEM §6 ─────────
export const Svg = ({ children, className = '', w = 14 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={w} height={w} viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    className={className} style={{ display: 'inline-block', flexShrink: 0 }} aria-hidden="true">
    {children}
  </svg>
);
export const Plane         = ({className,w}) => <Svg className={className} w={w}><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21 4 19 2c-2-2-4-2-5.5-.5L10 5 1.8 6.2a1 1 0 0 0-.5 1.7l2.3 2.3L1.8 12l2.7 2.7 1.8-1.8 2.3 2.3a1 1 0 0 0 1.7-.5z"/></Svg>;
export const Waves         = ({className,w}) => <Svg className={className} w={w}><path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/></Svg>;
export const Plus          = ({className,w}) => <Svg className={className} w={w}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></Svg>;
export const Trash2        = ({className,w}) => <Svg className={className} w={w}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></Svg>;
export const ChevronDown   = ({className,w}) => <Svg className={className} w={w}><polyline points="6 9 12 15 18 9"/></Svg>;
export const ChevronRight  = ({className,w}) => <Svg className={className} w={w}><polyline points="9 18 15 12 9 6"/></Svg>;
export const Calculator    = ({className,w}) => <Svg className={className} w={w}><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="16" y2="14"/><line x1="8" y1="18" x2="12" y2="18"/></Svg>;
export const CheckCircle2  = ({className,w}) => <Svg className={className} w={w}><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></Svg>;
export const Circle        = ({className,w}) => <Svg className={className} w={w}><circle cx="12" cy="12" r="10"/></Svg>;
export const Info          = ({className,w}) => <Svg className={className} w={w}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></Svg>;
export const Copy          = ({className,w}) => <Svg className={className} w={w}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></Svg>;
export const Landmark      = ({className,w}) => <Svg className={className} w={w}><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/></Svg>;
export const CloudCheck    = ({className,w}) => <Svg className={className} w={w}><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/><path d="m9 17 2 2 4-4"/></Svg>;
export const Cloud         = ({className,w}) => <Svg className={className} w={w}><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></Svg>;
export const AlertTriangle = ({className,w}) => <Svg className={className} w={w}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></Svg>;
export const ShieldCheck   = ({className,w}) => <Svg className={className} w={w}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></Svg>;
export const FileSpreadsheet = ({className,w}) => <Svg className={className} w={w}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M8 13h2M14 13h2M8 17h2M14 17h2"/></Svg>;
export const Upload        = ({className,w}) => <Svg className={className} w={w}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></Svg>;
export const Download      = ({className,w}) => <Svg className={className} w={w}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></Svg>;
export const RotateCcw     = ({className,w}) => <Svg className={className} w={w}><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></Svg>;
export const Package       = ({className,w}) => <Svg className={className} w={w}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></Svg>;
export const Database      = ({className,w}) => <Svg className={className} w={w}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></Svg>;
export const Layers        = ({className,w}) => <Svg className={className} w={w}><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></Svg>;
export const TrendingUp    = ({className,w}) => <Svg className={className} w={w}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></Svg>;
export const Repeat        = ({className,w}) => <Svg className={className} w={w}><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></Svg>;
export const BookOpen      = ({className,w}) => <Svg className={className} w={w}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></Svg>;
export const Truck         = ({className,w}) => <Svg className={className} w={w}><path d="M10 17h4V5H2v12h3"/><path d="M14 9h4l4 4v4h-2"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></Svg>;
export const Calendar      = ({className,w}) => <Svg className={className} w={w}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></Svg>;
export const Clipboard     = ({className,w}) => <Svg className={className} w={w}><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></Svg>;
export const Wallet        = ({className,w}) => <Svg className={className} w={w}><path d="M20 12V8H6a2 2 0 0 1 0-4h12v4"/><path d="M4 6v12a2 2 0 0 0 2 2h14v-4"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/></Svg>;
export const ListChecks    = ({className,w}) => <Svg className={className} w={w}><path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/></Svg>;
export const Sliders       = ({className,w}) => <Svg className={className} w={w}><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></Svg>;
export const Compass       = ({className,w}) => <Svg className={className} w={w}><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></Svg>;
