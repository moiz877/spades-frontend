export interface EnergyRegion {
  name: string;
  lat: number;
  lon: number;
}

export interface EnergyFlow {
  from: string;
  to: string;
  /** Relative flow magnitude, purely for visual arc thickness/opacity. */
  weight: number;
}

// Approximate centroids for major energy-outlook regions. Illustrative for
// the hero globe, not a precise geographic dataset.
export const ENERGY_REGIONS: EnergyRegion[] = [
  { name: 'United States', lat: 39.8, lon: -98.6 },
  { name: 'Canada', lat: 56.1, lon: -106.3 },
  { name: 'OECD Europe', lat: 50.1, lon: 10.5 },
  { name: 'Middle East', lat: 26.0, lon: 45.0 },
  { name: 'Russia', lat: 61.5, lon: 90.0 },
  { name: 'China', lat: 35.9, lon: 104.2 },
  { name: 'India', lat: 21.1, lon: 78.7 },
  { name: 'Southeast Asia', lat: 4.2, lon: 108.4 },
  { name: 'Africa', lat: 2.0, lon: 20.0 },
  { name: 'South America', lat: -14.2, lon: -60.0 },
  { name: 'Australia / OECD Oceania', lat: -25.3, lon: 133.8 },
  { name: 'Japan / South Korea', lat: 37.0, lon: 132.0 },
];

// Illustrative major cross-border energy trade flows for the hero visual.
export const ENERGY_FLOWS: EnergyFlow[] = [
  { from: 'Middle East', to: 'China', weight: 1.0 },
  { from: 'Middle East', to: 'India', weight: 0.8 },
  { from: 'Middle East', to: 'OECD Europe', weight: 0.6 },
  { from: 'Russia', to: 'China', weight: 0.8 },
  { from: 'United States', to: 'OECD Europe', weight: 0.7 },
  { from: 'United States', to: 'Japan / South Korea', weight: 0.5 },
  { from: 'Africa', to: 'OECD Europe', weight: 0.4 },
  { from: 'South America', to: 'United States', weight: 0.4 },
  { from: 'Southeast Asia', to: 'China', weight: 0.3 },
  { from: 'Australia / OECD Oceania', to: 'Japan / South Korea', weight: 0.5 },
];
