export type TournamentWithCounts = {
  id: string;
  creator_id: string;
  name: string;
  slug: string;
  description: string | null;
  rules: string | null;
  location: string;
  start_date: string;
  registration_deadline: string;
  registration_fee: number;
  max_players: number;
  number_of_teams: number;
  team_budget: number;
  banner_url: string | null;
  banner_storage_path: string | null;
  banner_path: string | null;
  status: string;
  created_at: string;
  profiles?: {
    full_name: string;
  } | null;
  registrations?: Array<{
    id: string;
    status: string;
  }>;
};
