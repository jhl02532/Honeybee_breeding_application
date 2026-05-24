export interface User {
  id: number;
  username: string;
  farm_name: string | null;
  role: string;
}

export interface Token {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Colony {
  id: number;
  code: string;
  apiary_id: number;
  status: string;
  queen_tag: string;
  mother_colony_id?: number | null;
  records: TraitRecord[];
}

export interface Apiary {
  id: number;
  name: string;
  owner: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  owner_id: number | null;
  colonies: Colony[];
}

export interface TraitRecord {
  id: number;
  colony_id: number;
  date: string;
  honey_production: number;
  propolis_production: number;
  royal_jelly_production: number;
  temperament: number;
  virus_resistance: number;
  mite_resistance: number;
  swarming_rate: number;
  overwintering_survival: number;
  climate_adaptation: number;
  temperature: number | null;
  humidity: number | null;
  vsh_rate?: number;
  hygienic_rate?: number;
  notes: string | null;
}

export interface DashStats {
  total_apiaries: number;
  total_colonies: number;
  total_records: number;
  avg_honey: number;
  avg_propolis: number;
  avg_royal_jelly: number;
  active_colonies: number;
  weak_colonies: number;
  dead_colonies: number;
  avg_survival_rate: number;
  queen_types: number;
}
