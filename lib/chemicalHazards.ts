// Hazard classifications for the Chemical Register, colour-coded for
// quick visual scanning in the register table/list.

export interface HazardClass {
  value: string;
  color: string;
  textColor: string;
}

export const HAZARD_CLASSIFICATIONS: HazardClass[] = [
  { value: 'Flammable', color: '#c62828', textColor: '#ffffff' },
  { value: 'Corrosive', color: '#6a1b9a', textColor: '#ffffff' },
  { value: 'Toxic', color: '#212121', textColor: '#ffffff' },
  { value: 'Oxidising', color: '#fdd835', textColor: '#1a1a1a' },
  { value: 'Irritant', color: '#fb8c00', textColor: '#ffffff' },
  { value: 'Compressed Gas', color: '#1565c0', textColor: '#ffffff' },
  { value: 'Explosive', color: '#e65100', textColor: '#ffffff' },
  { value: 'Environmental Hazard', color: '#2e7d32', textColor: '#ffffff' },
  { value: 'Other', color: '#616161', textColor: '#ffffff' },
];

export function getHazardClass(value: string): HazardClass {
  return HAZARD_CLASSIFICATIONS.find((h) => h.value === value) || HAZARD_CLASSIFICATIONS[HAZARD_CLASSIFICATIONS.length - 1];
}
