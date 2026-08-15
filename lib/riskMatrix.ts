// Shared risk-matrix definitions for risk assessments: probability/severity
// scales and the combined risk rating, colour-coded per the standard
// 5x5 likelihood/impact matrix (Very Low -> Catastrophic).

export type ProbabilityLevel = 'Rare' | 'Unlikely' | 'Occasional' | 'Likely' | 'Almost Certain';
export type SeverityLevel = 'Insignificant' | 'Minor' | 'Moderate' | 'Major' | 'Catastrophic';

export interface LevelInfo<T extends string> {
  value: T;
  score: number;
  color: string;
  textColor: string;
  hint: string;
}

export const PROBABILITY_LEVELS: LevelInfo<ProbabilityLevel>[] = [
  { value: 'Rare', score: 1, color: '#1b5e20', textColor: '#ffffff', hint: '< 1 in 10,000' },
  { value: 'Unlikely', score: 2, color: '#7cb342', textColor: '#ffffff', hint: '1 in 2,000' },
  { value: 'Occasional', score: 3, color: '#fdd835', textColor: '#1a1a1a', hint: '1 in 200' },
  { value: 'Likely', score: 4, color: '#fb8c00', textColor: '#ffffff', hint: '1 in 20' },
  { value: 'Almost Certain', score: 5, color: '#c62828', textColor: '#ffffff', hint: '> 1 in 10' },
];

export const SEVERITY_LEVELS: LevelInfo<SeverityLevel>[] = [
  { value: 'Insignificant', score: 1, color: '#1b5e20', textColor: '#ffffff', hint: 'No injury, negligible impact' },
  { value: 'Minor', score: 2, color: '#7cb342', textColor: '#ffffff', hint: 'First aid only' },
  { value: 'Moderate', score: 3, color: '#fdd835', textColor: '#1a1a1a', hint: 'Medical treatment required' },
  { value: 'Major', score: 4, color: '#fb8c00', textColor: '#ffffff', hint: 'Serious injury / major disruption' },
  { value: 'Catastrophic', score: 5, color: '#c62828', textColor: '#ffffff', hint: 'Death or permanent disability' },
];

export function getProbabilityInfo(level: string): LevelInfo<ProbabilityLevel> {
  return PROBABILITY_LEVELS.find((p) => p.value === level) || PROBABILITY_LEVELS[0];
}

export function getSeverityInfo(level: string): LevelInfo<SeverityLevel> {
  return SEVERITY_LEVELS.find((s) => s.value === level) || SEVERITY_LEVELS[0];
}

export interface RiskRating {
  label: string;
  score: number;
  color: string;
  textColor: string;
}

// Combined likelihood x impact score -> rating band, matching the
// standard 5x5 probability/severity matrix.
export function getRiskRating(probabilityScore: number, severityScore: number): RiskRating {
  const score = probabilityScore * severityScore;
  if (score <= 2) return { label: 'Very Low', score, color: '#1b5e20', textColor: '#ffffff' };
  if (score <= 4) return { label: 'Low', score, color: '#7cb342', textColor: '#ffffff' };
  if (score <= 8) return { label: 'Medium', score, color: '#fdd835', textColor: '#1a1a1a' };
  if (score <= 12) return { label: 'High', score, color: '#fb8c00', textColor: '#ffffff' };
  if (score <= 16) return { label: 'Extreme', score, color: '#d84315', textColor: '#ffffff' };
  return { label: 'Catastrophic', score, color: '#b71c1c', textColor: '#ffffff' };
}

export interface RiskRow {
  id: string;
  hazard: string;
  risk: string;
  probability: ProbabilityLevel;
  severity: SeverityLevel;
  actions: string;
}

export function isRiskRow(item: unknown): item is RiskRow {
  return !!item && typeof item === 'object' && 'hazard' in (item as Record<string, unknown>);
}
