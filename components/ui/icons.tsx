/**
 * Lucide-style line icons used across the Goldvale screens, ported verbatim from
 * the design handoff. Stroke-based, currentColor by default; `s` sizes, `c` colours,
 * `w` overrides stroke width.
 */
import type { JSX } from "react";

export interface IconProps {
  /** square size in px (default 16) */
  s?: number;
  /** stroke colour (default currentColor) */
  c?: string;
  /** stroke width override */
  w?: number;
}

type Icon = (p?: IconProps) => JSX.Element;

function svg(s: number, c: string, w: number, children: JSX.Element): JSX.Element {
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke={c}
      strokeWidth={w}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export const Ico = {
  heart: (p = {}) =>
    svg(p.s ?? 16, p.c ?? "currentColor", p.w ?? 1.7, (
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    )),
  trend: (p = {}) =>
    svg(p.s ?? 16, p.c ?? "currentColor", p.w ?? 1.8, (
      <>
        <path d="M22 17 13.5 8.5l-5 5L2 7" />
        <path d="M16 17h6v-6" />
      </>
    )),
  activity: (p = {}) =>
    svg(p.s ?? 16, p.c ?? "currentColor", p.w ?? 1.7, <path d="M22 12h-4l-3 9L9 3l-3 9H2" />),
  sparkles: (p = {}) =>
    svg(p.s ?? 16, p.c ?? "currentColor", p.w ?? 1.6, (
      <path d="M12 3v4M12 17v4M5 12H3M21 12h-2M6.3 6.3 7.7 7.7M16.3 16.3l1.4 1.4M6.3 17.7 7.7 16.3M16.3 7.7l1.4-1.4" />
    )),
  chevR: (p = {}) =>
    svg(p.s ?? 16, p.c ?? "currentColor", p.w ?? 2, <path d="m9 18 6-6-6-6" />),
  cal: (p = {}) =>
    svg(p.s ?? 16, p.c ?? "currentColor", p.w ?? 1.7, (
      <>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </>
    )),
  file: (p = {}) =>
    svg(p.s ?? 16, p.c ?? "currentColor", p.w ?? 1.7, (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <path d="M14 2v6h6M9 13h6M9 17h4" />
      </>
    )),
  check: (p = {}) =>
    svg(p.s ?? 16, p.c ?? "currentColor", p.w ?? 2, <path d="M20 6 9 17l-5-5" />),
  pill: (p = {}) =>
    svg(p.s ?? 16, p.c ?? "currentColor", p.w ?? 1.6, (
      <>
        <path d="m10.5 20.5-7-7a4.95 4.95 0 1 1 7-7l7 7a4.95 4.95 0 1 1-7 7Z" />
        <path d="m8.5 8.5 7 7" />
      </>
    )),
  rotate: (p = {}) =>
    svg(p.s ?? 14, p.c ?? "currentColor", p.w ?? 1.7, (
      <>
        <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
        <path d="M21 3v5h-5" />
        <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
        <path d="M3 21v-5h5" />
      </>
    )),
  clip: (p = {}) =>
    svg(p.s ?? 16, p.c ?? "currentColor", p.w ?? 1.6, (
      <>
        <rect x="8" y="2" width="8" height="4" rx="1" />
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <path d="M9 12h6M9 16h4" />
      </>
    )),
  footprints: (p = {}) =>
    svg(p.s ?? 16, p.c ?? "currentColor", p.w ?? 1.6, (
      <>
        <path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z" />
        <path d="M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z" />
      </>
    )),
  repeat: (p = {}) =>
    svg(p.s ?? 16, p.c ?? "currentColor", p.w ?? 1.7, (
      <>
        <path d="m17 2 4 4-4 4" />
        <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
        <path d="m7 22-4-4 4-4" />
        <path d="M21 13v1a4 4 0 0 1-4 4H3" />
      </>
    )),
  help: (p = {}) =>
    svg(p.s ?? 16, p.c ?? "currentColor", p.w ?? 1.7, (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <path d="M12 17h.01" />
      </>
    )),
  share: (p = {}) =>
    svg(p.s ?? 16, p.c ?? "currentColor", p.w ?? 1.7, (
      <>
        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
        <path d="M16 6l-4-4-4 4" />
        <path d="M12 2v13" />
      </>
    )),
  plus: (p = {}) =>
    svg(p.s ?? 16, p.c ?? "currentColor", p.w ?? 2, <path d="M12 5v14M5 12h14" />),
  minus: (p = {}) =>
    svg(p.s ?? 16, p.c ?? "currentColor", p.w ?? 2.2, <path d="M5 12h14" />),
  home: (p = {}) =>
    svg(p.s ?? 16, p.c ?? "currentColor", p.w ?? 1.6, (
      <>
        <path d="M3 9.5 12 3l9 6.5" />
        <path d="M5 10v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V10" />
        <path d="M9 21v-6h6v6" />
      </>
    )),
  alert: (p = {}) =>
    svg(p.s ?? 16, p.c ?? "currentColor", p.w ?? 1.7, (
      <>
        <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
        <path d="M12 9v4M12 17h.01" />
      </>
    )),
  chevL: (p = {}) =>
    svg(p.s ?? 16, p.c ?? "currentColor", p.w ?? 2, <path d="m15 18-6-6 6-6" />),
  paw: (p = {}) =>
    svg(p.s ?? 16, p.c ?? "currentColor", p.w ?? 1.6, (
      <>
        <circle cx="11" cy="4" r="2" />
        <circle cx="18" cy="8" r="2" />
        <circle cx="4" cy="8" r="2" />
        <circle cx="7.5" cy="15" r="2" />
        <path d="M14.5 15c2.5 0 4 2 4 4a3 3 0 0 1-3 3c-1.2 0-2-.5-3.5-.5s-2.3.5-3.5.5a3 3 0 0 1-3-3c0-2 1.5-4 4-4 .8 0 1.5.3 2.5.3s1.7-.3 2.5-.3Z" />
      </>
    )),
  camera: (p = {}) =>
    svg(p.s ?? 16, p.c ?? "currentColor", p.w ?? 1.6, (
      <>
        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
        <circle cx="12" cy="13" r="3" />
      </>
    )),
  shield: (p = {}) =>
    svg(p.s ?? 16, p.c ?? "currentColor", p.w ?? 1.6, (
      <>
        <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    )),
  dog: (p = {}) =>
    svg(p.s ?? 16, p.c ?? "currentColor", p.w ?? 1.6, (
      <>
        <path d="M10 5.172C10 3.782 8.423 2.679 6.5 3c-2.823.47-4.113 6.006-4 7 .08.703 1.725 1.722 3.656 1 1.261-.472 1.96-1.45 2.344-2.5" />
        <path d="M14.267 5.172c0-1.39 1.577-2.493 3.5-2.172 2.823.47 4.113 6.006 4 7-.08.703-1.725 1.722-3.656 1-1.261-.472-1.855-1.45-2.239-2.5" />
        <path d="M8 14v.5M16 14v.5" />
        <path d="M11.25 16.25h1.5L12 17l-.75-.75Z" />
        <path d="M4.42 11.247A13.152 13.152 0 0 0 4 14.556C4 18.728 7.582 21 12 21s8-2.272 8-6.444c0-1.061-.162-2.2-.493-3.309m-9.243-6.082A8.801 8.801 0 0 1 12 5c.78 0 1.5.108 2.161.306" />
      </>
    )),
  cat: (p = {}) =>
    svg(p.s ?? 16, p.c ?? "currentColor", p.w ?? 1.6, (
      <>
        <path d="M12 5c.67 0 1.35.09 2 .26 1.78-2 5.03-2.84 6.42-2.26 1.4.58-.42 7-.42 7 .57 1.07 1 2.24 1 3.44C21 17.9 16.97 21 12 21s-9-3-9-7.56c0-1.25.5-2.4 1-3.44 0 0-1.89-6.42-.5-7 1.39-.58 4.72.23 6.5 2.23A9.04 9.04 0 0 1 12 5Z" />
        <path d="M8 14v.5M16 14v.5M11.25 16.25h1.5L12 17l-.75-.75Z" />
      </>
    )),
} satisfies Record<string, Icon>;
