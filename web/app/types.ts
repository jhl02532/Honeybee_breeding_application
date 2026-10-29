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
  // 측정하지 않은 형질은 null
  honey_production: number | null;
  propolis_production: number | null;
  royal_jelly_production: number | null;
  temperament: number | null;
  virus_resistance: number | null;
  mite_resistance: number | null;
  swarming_rate: number | null;
  overwintering_survival: number | null;
  climate_adaptation: number | null;
  temperature: number | null;
  humidity: number | null;
  vsh_rate?: number | null;
  hygienic_rate?: number | null;
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
