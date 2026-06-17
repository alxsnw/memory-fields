export type VisualModel =
  | "signal-field"
  | "spatial-rhythm"
  | "particle-memory"
  | "topographic-wave"
  | "orbital-spectrum"
  | "spectral-grid"
  | "ascii-field";

export type SignalResponse = "raw" | "balanced" | "fluid";
export type PaletteMode = "mineral" | "spectral";
export type AsciiColorMode = "mono" | "mineral" | "amber" | "spectral" | "gradient" | "custom";
export type AsciiMotionMode = "static" | "scatter" | "vortex" | "float" | "collapse";
export type TrackStatus = "uploading" | "processing" | "ready" | "failed";
export type UserRole = "host" | "listener";
export type SyncStatus = "synced" | "buffering" | "error";

export interface Room {
  id: string;
  slug: string;
  title: string;
  host_client_id: string;
  created_at: string;
  updated_at: string;
}

export interface Track {
  id: string;
  room_id: string;
  original_filename: string;
  display_name: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  duration: number | null;
  uploaded_at: string;
  uploaded_by_display_name: string;
  status: TrackStatus;
  upload_progress: number;
  last_played_at: string | null;
}

export interface RoomState {
  room_id: string;
  current_track_id: string | null;
  is_playing: boolean;
  seek_position: number;
  started_at: string | null;
  paused_at: string | null;
  updated_at: string;
  visual_model: VisualModel;
  visual_sub_mode: string | null;
  visual_seed: number;
  visual_params: Record<string, number>;
  ascii_settings: Record<string, unknown> | null;
  palette_mode: PaletteMode;
}

export interface ConnectedClient {
  client_id: string;
  room_id: string;
  display_name: string;
  role: UserRole;
  joined_at: string;
  last_seen_at: string;
}

export interface DisplayNameData {
  name: string;
  clientId: string;
}

export interface VisualParams {
  intensity: number;
  coreTraceAmount: number;
  density: number;
  speed: number;
  memory: number;
  detail: number;
  glow: number;
  randomness: number;
  smoothing: boolean;
  smoothingAmount: number;
  coreSize: number;
  expansion: number;
  edgeReactivity: number;
  centerBias: number;
  bloom: number;
  grain: number;
  grainIntensity: number;
  grainSize: number;
  chromatic: number;
  scanlines: number;
  vignette: number;
  crtCurve: number;
  phosphor: number;
}
