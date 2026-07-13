// ─── Shared Types for VibeSocial Server ─────────────────────────────────────

export type VenueType =
  | "club"
  | "lounge"
  | "bar"
  | "rooftop"
  | "house_party"
  | "pop_up"
  | "concert"
  | "other";

export type CrowdLevel =
  | "empty"
  | "filling_up"
  | "active"
  | "busy"
  | "packed"
  | "at_capacity";

export type WaitTime =
  | "no_wait"
  | "5_min"
  | "15_min"
  | "30_min"
  | "45_plus_min";

export type MusicVibe = "fire" | "decent" | "mid" | "dead";

export type OrderStatus =
  | "pending_payment"
  | "confirmed"
  | "cancelled"
  | "refunded";

export type TicketStatus = "valid" | "used" | "cancelled";

export type UserRole = "attendee" | "organizer" | "admin";

// ─── Database Row Types ───────────────────────────────────────────────────────

export interface UserRow {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  role: UserRole;
  notification_settings: Record<string, boolean>;
  created_at: string;
}

export interface EventRow {
  id: string;
  title: string;
  venue_name: string;
  venue_type: VenueType;
  address: string;
  state: string;
  lat?: number;
  lng?: number;
  description?: string;
  cover_image?: string;
  start_time?: string;
  end_time?: string;
  vibe_tags: string[];
  current_vibe_score: number;
  current_crowd_level?: CrowdLevel;
  current_wait_time?: WaitTime;
  status_count: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
}

export interface TicketTypeRow {
  id: string;
  event_id: string;
  name: string;
  description?: string;
  price: number;
  capacity?: number;
  tickets_sold: number;
  max_per_order: number;
  is_active: boolean;
  created_at: string;
}

export interface OrderRow {
  id: string;
  event_id: string;
  buyer_id: string;
  attendee_name: string;
  attendee_email: string;
  tickets: OrderTicketLine[];
  total_amount: number;
  status: OrderStatus;
  confirmation_code: string;
  stripe_payment_intent_id?: string;
  created_at: string;
}

export interface OrderTicketLine {
  ticket_type_id: string;
  ticket_type_name: string;
  quantity: number;
  unit_price: number;
}

export interface TicketRow {
  id: string;
  order_id: string;
  event_id: string;
  ticket_type_id: string;
  buyer_id: string;
  status: TicketStatus;
  qr_code_data: string;
  created_at: string;
}

export interface StatusUpdateRow {
  id: string;
  event_id: string;
  user_id: string;
  vibe_score: number;
  crowd_level?: CrowdLevel;
  wait_time?: WaitTime;
  music_vibe?: MusicVibe;
  comment?: string;
  created_at: string;
}

export interface ReviewRow {
  id: string;
  event_id: string;
  user_id: string;
  rating: number;
  comment?: string;
  created_at: string;
}

export interface SavedEventRow {
  id: string;
  user_id: string;
  event_id: string;
  created_at: string;
}

// ─── Express Request Extension ────────────────────────────────────────────────

declare global {
  namespace Express {
    interface Request {
      user?: UserRow;
    }
  }
}
