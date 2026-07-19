/**
 * Interactive widgets injected into section pages at render time.
 *
 * Their ids appear in a section's `toc` (and in search.json) but have no
 * matching heading in the stored HTML — the component renders its own
 * anchor. Keep this list in sync with the component registry in
 * `app/[section]/page.tsx` (which imports these ids) and with the section
 * `toc` entries that point at them.
 */
export const SECTION_WIDGET_IDS: Record<string, string[]> = {
  epilepsy: [
    'asm-withdrawal-calculator',
    'seizure-risk-calculators',
    'sudep-risk-calculator',
  ],
  'neurocritical-care': [
    'hie-calculator',
    'se-med-ladder',
  ],
};

export const ALL_WIDGET_IDS = new Set(Object.values(SECTION_WIDGET_IDS).flat());
