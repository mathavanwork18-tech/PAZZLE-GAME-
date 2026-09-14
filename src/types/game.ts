export type MatchStatus = 
  | 'WAITING'
  | 'STARTING'
  | 'ROUND_1'
  | 'ROUND_2'
  | 'PAUSED'
  | 'STOPPED'
  | 'COMPLETED';

export type PlayerStatus = 
  | 'CONNECTED'
  | 'WAITING'
  | 'PLAYING'
  | 'ROUND_1_COMPLETE'
  | 'ROUND_2_PLAYING'
  | 'COMPLETED'
  | 'DISCONNECTED'
  | 'STOPPED'
  | 'GAME_OVER'
  | 'TIME_UP';

export interface Avatar {
  id: string;
  name: string;
  image_url: string;
  accent_color: string;
}

export type HatId = 
  | 'none'
  | 'classic_cap'
  | 'grad_cap'
  | 'eng_helmet'
  | 'detective_hat'
  | 'crown'
  | 'party_hat'
  | 'beanie'
  | 'top_hat';

export type GlassesId = 
  | 'none'
  | 'round_glasses'
  | 'square_glasses'
  | 'sunglasses'
  | 'safety_glasses'
  | 'nerd_glasses';

export type OutfitId = 
  | 'none'
  | 'eng_coat'
  | 'college_hoodie'
  | 'formal_shirt'
  | 'lab_coat'
  | 'casual_jacket'
  | 'safety_vest'
  | 'grad_outfit';

export interface CustomizationOption {
  id: string;
  name: string;
  description?: string;
}

export interface Player {
  id: string;
  name: string;
  animal_id: string;
  hat_id: HatId;
  glasses_id: GlassesId;
  outfit_id: OutfitId;
  status: PlayerStatus;
  connection_status: 'connected' | 'disconnected';
  session_token: string;
  joined_at: number;
  last_seen_at: number;
  round_1_score: number;
  round_2_score: number;
  total_score: number;
  coins: number;
  completed_round_1: boolean;
  completed_round_2: boolean;
  round_1_moves?: number;
  round_2_moves?: number;
  round_1_time_ms?: number;
  round_2_time_ms?: number;
  shuffled_puzzle_r1?: number[];
  shuffled_puzzle_r2?: number[];
}

export interface PuzzleInfo {
  id: string;
  title: string;
  description: string;
  image_url: string;
  difficulty: 'EASY' | 'HARD';
  grid_size: number;
  piece_count: number;
  solution_order: number[];
  shuffled_order: number[];
}

export interface MatchState {
  match_id: string;
  event_title: string;
  event_subtitle: string;
  match_code: string;
  status: MatchStatus;
  previous_status?: MatchStatus;
  current_round: number;
  max_players: number;
  round_1_duration_seconds: number;
  round_2_duration_seconds: number;
  match_duration_seconds: number;
  round_1_start_at: number | null;
  round_1_end_at: number | null;
  round_2_start_at: number | null;
  round_2_end_at: number | null;
  match_start_time: number | null;
  match_end_time: number | null;
  is_paused: boolean;
  paused_at: number | null;
  stop_reason?: string;
  version: number;
  server_now: number;
  current_puzzle: PuzzleInfo | null;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  animal_id: string;
  hat_id: HatId;
  glasses_id: GlassesId;
  outfit_id: OutfitId;
  round_1_score: number;
  round_2_score: number;
  total_score: number;
  coins: number;
  total_time_ms: number;
  completed_round_1: boolean;
  completed_round_2: boolean;
  status: PlayerStatus;
  rank: number;
}
