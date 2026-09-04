export interface SeriesDataPoint {
  year: number;
  value: number | null;
}

/** Full series document as stored in aeo_series / ieo_series. */
export interface SeriesDocument {
  series_id: string;
  name: string;
  units: string;
  frequency: string;
  description: string;
  start: string;
  end: string;
  last_historical_period: string;
  last_updated: string;
  category_path: string[];
  data: SeriesDataPoint[];
}

/** Lightweight metadata used in list/search views — no data array. */
export type SeriesMeta = Omit<SeriesDocument, 'data'>;

export type SeriesSource = 'aeo' | 'ieo';

export type TeamRole = 'admin' | 'member';

// _id / company_id / invited_by are MongoDB ObjectIds at rest. Import
// ObjectId from 'mongodb' where these types are used for real queries;
// this file stays dependency-light by typing them as the string form
// only where documents cross into JSON (API responses, JWT claims).
export interface CompanyDocument {
  _id: import('mongodb').ObjectId;
  name: string;
  created_at: Date;
}

export interface UserDocument {
  _id: import('mongodb').ObjectId;
  email: string;
  password_hash: string;
  name: string;
  company_id: import('mongodb').ObjectId;
  role: TeamRole;
  created_at: Date;
}

export interface InviteDocument {
  _id: import('mongodb').ObjectId;
  email: string;
  company_id: import('mongodb').ObjectId;
  role: TeamRole;
  token: string;
  invited_by: import('mongodb').ObjectId;
  created_at: Date;
  expires_at: Date;
  accepted: boolean;
}

export interface TeaScenarioDocument {
  _id: import('mongodb').ObjectId;
  company_id: import('mongodb').ObjectId;
  created_by: import('mongodb').ObjectId;
  created_by_name: string;
  name: string;
  inputs: import('./teaTypes').ProcessInputs;
  result: import('./teaTypes').TEAResult;
  sensitivity: import('./teaTypes').SensitivityRow[];
  narrative?: import('./teaTypes').NarrativeSections;
  created_at: Date;
}
