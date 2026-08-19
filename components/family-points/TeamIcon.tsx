// Team marks, 24x24 viewBox, colored via the team's --fp variable (set by the
// .fp-c-{n} classes in globals.css on an ancestor element).
// Standalone pun marks — solid shapes with negative-space (evenodd) cutouts that
// stay transparent on any surface in both themes. Sagittal brains share one
// anatomical base (cerebrum path + separate cerebellum/stem/pons solids);
// several cutouts are script-generated — regenerate rather than hand-edit.

const GLYPHS: Record<string, React.ReactNode> = {
  // sagittal brain (frontal pole rolling into the orbital surface, tucked cerebellum, pons on upright stem) — bolt knocked through
  'stroke-of-genius': (
    <>
    <path fillRule="evenodd" fill="var(--fp)" stroke="none" d="M9.55 4.55C11.85 4.05 14.45 4.15 16.5 5.05 18.75 6.05 20.05 8.15 20.05 10.35 20.05 11.95 19.5 13.35 18.5 14.25 17.5 15.15 16.2 15.5 14.9 15.35 12.2 15.6 9.2 15.5 7.25 15.05 6.15 14.8 5.25 14.3 4.85 13.5 4.45 12.7 4.35 11.7 4.35 10.6 4.35 8.9 4.7 7.4 5.6 6.3 6.5 5.2 7.9 4.85 9.55 4.55Z
      M13.2 5.5h-2.6l-1.9 4.6h2.1l-1 4.7 4.9-5.7h-2.4l2.2-3.6Z"/>
    <g transform="rotate(-7 12.6 16.5)">
      <rect x="11.7" y="13.6" width="1.9" height="5.6" rx="0.95" fill="var(--fp)"/>
    </g>
    <ellipse cx="11.55" cy="15.35" rx="1.1" ry="1.45" transform="rotate(-10 11.55 15.35)" fill="var(--fp)"/>
    <ellipse cx="16.35" cy="15.55" rx="2.6" ry="1.8" transform="rotate(-14 16.35 15.55)" fill="var(--fp)"/>
  
    </>
  ),
  // sagittal brain (same anatomical base) — the connectome knocked through
  'connectome-crew': (
    <>
    <path fillRule="evenodd" fill="var(--fp)" stroke="none" d="M9.55 4.55C11.85 4.05 14.45 4.15 16.5 5.05 18.75 6.05 20.05 8.15 20.05 10.35 20.05 11.95 19.5 13.35 18.5 14.25 17.5 15.15 16.2 15.5 14.9 15.35 12.2 15.6 9.2 15.5 7.25 15.05 6.15 14.8 5.25 14.3 4.85 13.5 4.45 12.7 4.35 11.7 4.35 10.6 4.35 8.9 4.7 7.4 5.6 6.3 6.5 5.2 7.9 4.85 9.55 4.55Z
      M6.9 10.5a1.0 1.0 0 1 1 -.01 0Z
      M9.3 7.2a1.0 1.0 0 1 1 -.01 0Z
      M13.0 9.6a1.0 1.0 0 1 1 -.01 0Z
      M16.2 6.8a1.0 1.0 0 1 1 -.01 0Z
      M17.0 10.9a1.0 1.0 0 1 1 -.01 0Z
      M7.74 10.87 L8.96 9.19 L8.46 8.83 L7.24 10.51Z
      M9.97 9.0 L11.99 10.32 L12.33 9.8 L10.31 8.48Z
      M13.96 10.17 L15.65 8.69 L15.24 8.23 L13.55 9.71Z
      M16.09 8.84 L16.5 10.98 L17.11 10.86 L16.7 8.72Z"/>
    <g transform="rotate(-7 12.6 16.5)">
      <rect x="11.7" y="13.6" width="1.9" height="5.6" rx="0.95" fill="var(--fp)"/>
    </g>
    <ellipse cx="11.55" cy="15.35" rx="1.1" ry="1.45" transform="rotate(-10 11.55 15.35)" fill="var(--fp)"/>
    <ellipse cx="16.35" cy="15.55" rx="2.6" ry="1.8" transform="rotate(-14 16.35 15.55)" fill="var(--fp)"/>
  
    </>
  ),
  // chibi brain-ninja: scalloped brain head, mask + angry eyes, grin, knot tails, crossed katanas
  'nucleotide-ninjas': (
    <>
    <g transform="rotate(-45 4.9 5.2)">
      <path fillRule="evenodd" fill="var(--fp)" stroke="none" d="
        M4.050000000000001 1.1h1.7a0.5 0.5 0 0 1 .5.5v3.9h-2.7V1.6a0.5 0.5 0 0 1 .5-.5Z
        M4.9 1.75l.62.95-.62.95-.62-.95Z
        M4.9 3.45l.62.95-.62.95-.62-.95Z
        M3.3000000000000003 5.6h3.2a0.55 0.55 0 0 1 0 1.1h-3.2a0.55 0.55 0 0 1 0-1.1Z
        M4.28 6.8h1.24l-.12 2.5h-1Z"/>
    </g>
    <g transform="rotate(45 19.1 5.2)">
      <path fillRule="evenodd" fill="var(--fp)" stroke="none" d="
        M18.25 1.1h1.7a0.5 0.5 0 0 1 .5.5v3.9h-2.7V1.6a0.5 0.5 0 0 1 .5-.5Z
        M19.1 1.75l.62.95-.62.95-.62-.95Z
        M19.1 3.45l.62.95-.62.95-.62-.95Z
        M17.5 5.6h3.2a0.55 0.55 0 0 1 0 1.1h-3.2a0.55 0.55 0 0 1 0-1.1Z
        M18.48 6.8h1.24l-.12 2.5h-1Z"/>
    </g>
    <path fillRule="evenodd" fill="var(--fp)" stroke="none" d="
      M14.67 6.13 A3.1 3.1 0 0 1 18.75 9.3 A2.96 2.96 0 0 1 19.68 14.15 A3.02 3.02 0 0 1 17.01 18.42 A3.17 3.17 0 0 1 12.0 20.1 A3.17 3.17 0 0 1 6.99 18.42 A3.02 3.02 0 0 1 4.32 14.15 A2.96 2.96 0 0 1 5.25 9.3 A3.1 3.1 0 0 1 9.33 6.13 A3.2 3.2 0 0 1 14.67 6.13Z
      M11.55 4.4 L12.45 4.4 L12.2 8.4 L11.8 8.4 Z
      M4.9 11.05h14.2a1.85 1.85 0 0 1 0 3.7H4.9a1.85 1.85 0 0 1 0-3.7Z
      M8.9 16.5 Q12 19.1 15.1 16.5 Q12 21.6 8.9 16.5 Z
      "/>
    <path fillRule="evenodd" fill="var(--fp)" stroke="none" d="M7.9 11.7 L10.5 12.45 Q10.6 13.75 9.3 13.85 Q7.95 13.85 7.9 11.7 Z
      M16.1 11.7 L13.5 12.45 Q13.4 13.75 14.7 13.85 Q16.05 13.85 16.1 11.7 Z"/>
    <path d="M20.4 11.3l3.1-1.2-.7 2.1ZM20.4 13.5l3 1.4-2.2 1Z" fill="var(--fp)" stroke="none"/>
  
    </>
  ),
  // trembling sagittal brain, tilted psi knocked through — highly functional
  'highly-functional': (
    <>
    <path fillRule="evenodd" fill="var(--fp)" stroke="none" d="M9.55 4.55C11.85 4.05 14.45 4.15 16.5 5.05 18.75 6.05 20.05 8.15 20.05 10.35 20.05 11.95 19.5 13.35 18.5 14.25 17.5 15.15 16.2 15.5 14.9 15.35 12.2 15.6 9.2 15.5 7.25 15.05 6.15 14.8 5.25 14.3 4.85 13.5 4.45 12.7 4.35 11.7 4.35 10.6 4.35 8.9 4.7 7.4 5.6 6.3 6.5 5.2 7.9 4.85 9.55 4.55Z
      M6.85 7.62 L7.91 10.54 A3.7 3.7 0 0 0 14.87 8.01 L13.81 5.09 L12.58 5.54 L13.64 8.45 A2.4 2.4 0 0 1 9.13 10.09 L8.07 7.18 Z
      M9.48 5.92 L10.7 5.48 L12.8 11.26 L11.58 11.7 Z
      M12.1 13.11 L13.32 12.67 L13.88 14.22 L12.66 14.66 Z"/>
    <g transform="rotate(-7 12.6 16.5)">
      <rect x="11.7" y="13.6" width="1.9" height="5.6" rx="0.95" fill="var(--fp)"/>
    </g>
    <ellipse cx="11.55" cy="15.35" rx="1.1" ry="1.45" transform="rotate(-10 11.55 15.35)" fill="var(--fp)"/>
    <ellipse cx="16.35" cy="15.55" rx="2.6" ry="1.8" transform="rotate(-14 16.35 15.55)" fill="var(--fp)"/>
    <path d="M2.9 7.3 1.5 8.1M3.4 9.4 2 10.2M10.2 2.9l.75-1.5M12.5 2.9l.75-1.5M21.3 7.6l1.4-.8M21.6 10l1.5-.4"
      stroke="var(--fp)" strokeWidth="1.1" strokeLinecap="round"/>
  
    </>
  ),
  // sleeping brain: dome above the sleep mask (Z embroidered), straps cut corner-to-edge, mustache, Zzz
  'the-narcos': (
    <>
    <path fillRule="evenodd" fill="var(--fp)" stroke="none" d="
      M11.2 6.4 A3.09 3.09 0 0 1 16.09 8.04 A2.93 2.93 0 0 1 18.68 12.18 A2.88 2.88 0 0 1 17.78 16.9 A3.02 3.02 0 0 1 13.8 19.98 A3.12 3.12 0 0 1 8.6 19.98 A3.02 3.02 0 0 1 4.62 16.9 A2.88 2.88 0 0 1 3.72 12.18 A2.93 2.93 0 0 1 6.31 8.04 A3.09 3.09 0 0 1 11.2 6.4Z
      M10.75 6.6 L11.65 6.6 L11.4 10.4 L11.0 10.4 Z
      M5.1 11.0h12.2a2.15 2.15 0 0 1 0 4.3H5.1a2.15 2.15 0 0 1 0-4.3Z
      M5.15 11.75 3.35 10.3l.52-.6 1.8 1.45Z
      M17.25 11.75l1.8-1.45.52.6-1.8 1.45Z
      M11.2 17.4c-.7-.8-1.8-1.2-2.9-1-1.3.3-2.3 1.25-2.75 2.5.95.7 2.2.9 3.3.55.95-.3 1.7-.9 2.35-1.75.65.85 1.4 1.45 2.35 1.75 1.1.35 2.35.15 3.3-.55-.45-1.25-1.45-2.2-2.75-2.5-1.1-.2-2.2.2-2.9 1Z"/>
    <path d="M9.5 12h3.4v1.2l-1.9 1.5h1.9v1.2H9.5v-1.2l1.9-1.5H9.5Z" fill="var(--fp)" stroke="none"/>
    <path d="M16.9 3h2.7l-2.7 2.9h2.7" fill="none" stroke="var(--fp)" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M20.9 1.4h1.9l-1.9 2h1.9" fill="none" stroke="var(--fp)" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
  
    </>
  ),
};

export default function TeamIcon({
  teamId,
  size = 18,
  className = '',
}: {
  teamId: string;
  size?: number;
  className?: string;
}) {
  const glyph = GLYPHS[teamId];
  if (!glyph) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      {glyph}
    </svg>
  );
}
