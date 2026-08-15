// Catalog of selectable safety equipment (PPE) for risk & chemical
// assessments. Managers select which items are required; the selection
// is shown to employees with icons on the assessment.

export interface PpeItem {
  id: string;
  label: string;
  icon: string;
}

export const PPE_ITEMS: PpeItem[] = [
  { id: 'safety-gloves', label: 'Safety Gloves', icon: '🧤' },
  { id: 'eye-protection', label: 'Eye Protection', icon: '🥽' },
  { id: 'respirator', label: 'Respirator', icon: '😷' },
  { id: 'hearing-protection', label: 'Hearing Protection', icon: '🎧' },
  { id: 'welding-helmet', label: 'Welding Helmet', icon: '🛡️' },
];

export function getPpeItem(id: string): PpeItem | undefined {
  return PPE_ITEMS.find((p) => p.id === id);
}
