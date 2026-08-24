// Status thresholds + styling for the manager dashboard's analytic dials
// (days-since safety counters, compliance meters). Status colors follow a
// fixed good/warning/critical scale and are always paired with an icon +
// label, never color alone.

export const STATUS_COLORS = {
  good: '#0ca30c',
  warning: '#fab219',
  critical: '#d03b3b',
};

export interface DialStatus {
  level: 'good' | 'warning' | 'critical';
  color: string;
  icon: string;
  label: string;
  badgeBg: string;
  badgeText: string;
}

export function getDaysSinceStatus(days: number | null): DialStatus {
  if (days === null) {
    return { level: 'good', color: STATUS_COLORS.good, icon: '✅', label: 'None on record', badgeBg: 'bg-green-100', badgeText: 'text-green-800' };
  }
  if (days < 7) {
    return { level: 'critical', color: STATUS_COLORS.critical, icon: '🚨', label: 'Recent event — stay vigilant', badgeBg: 'bg-red-100', badgeText: 'text-red-800' };
  }
  if (days < 30) {
    return { level: 'warning', color: STATUS_COLORS.warning, icon: '⚠️', label: 'Building back up', badgeBg: 'bg-yellow-100', badgeText: 'text-yellow-800' };
  }
  return { level: 'good', color: STATUS_COLORS.good, icon: '✅', label: 'Strong safety record', badgeBg: 'bg-green-100', badgeText: 'text-green-800' };
}

export function getComplianceStatus(pct: number): DialStatus {
  if (pct >= 90) {
    return { level: 'good', color: STATUS_COLORS.good, icon: '✅', label: 'On track', badgeBg: 'bg-green-100', badgeText: 'text-green-800' };
  }
  if (pct >= 70) {
    return { level: 'warning', color: STATUS_COLORS.warning, icon: '⚠️', label: 'Needs attention', badgeBg: 'bg-yellow-100', badgeText: 'text-yellow-800' };
  }
  return { level: 'critical', color: STATUS_COLORS.critical, icon: '🚨', label: 'Action required', badgeBg: 'bg-red-100', badgeText: 'text-red-800' };
}
