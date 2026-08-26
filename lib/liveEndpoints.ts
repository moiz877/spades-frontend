/**
 * Registry of live EIA API v2 endpoints exposed at /api/live/:slug.
 * Add a new live endpoint by adding one entry here — the route handler
 * at app/api/live/[endpoint]/route.ts is generic and needs no changes.
 */
export interface LiveEndpointConfig {
  /** Path relative to https://api.eia.gov/v2/, without a leading slash. */
  path: string;
  /** Extra query params beyond api_key (which is injected server-side). */
  params: Record<string, string>;
}

export const LIVE_ENDPOINTS: Record<string, LiveEndpointConfig> = {
  'crude-oil-imports': {
    path: 'crude-oil-imports/data/',
    params: {
      frequency: 'monthly',
      'data[0]': 'quantity',
      'sort[0][column]': 'period',
      'sort[0][direction]': 'desc',
      offset: '0',
      length: '5000',
    },
  },
  // Example of a future addition:
  // 'natural-gas-storage': {
  //   path: 'natural-gas/stor/wkly/data/',
  //   params: { frequency: 'weekly', 'data[0]': 'value' },
  // },
};
