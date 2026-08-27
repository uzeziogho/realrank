/**
 * Database types for Supabase.
 *
 * In production these are generated with:
 *   supabase gen types typescript --project-id <id> > lib/supabase/types.ts
 *
 * This hand-written version mirrors supabase/schema.sql so the app is fully
 * typed before the real project is connected.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          display_name: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          display_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          display_name?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      connected_accounts: {
        Row: {
          id: string;
          user_id: string;
          provider: string;
          google_email: string | null;
          /** AES-256-GCM encrypted refresh token. NEVER returned to the client. */
          encrypted_refresh_token: string;
          scope: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          provider?: string;
          google_email?: string | null;
          encrypted_refresh_token: string;
          scope?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          provider?: string;
          google_email?: string | null;
          encrypted_refresh_token?: string;
          scope?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      published_sites: {
        Row: {
          id: string;
          user_id: string;
          site_url: string;
          display_name: string;
          description: string | null;
          category: string | null;
          clicks_7d: number;
          clicks_28d: number;
          momentum_score: number;
          growth_rate: number;
          previous_momentum_score: number;
          previous_clicks_28d: number;
          is_active: boolean;
          last_refreshed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          site_url: string;
          display_name: string;
          description?: string | null;
          category?: string | null;
          clicks_7d?: number;
          clicks_28d?: number;
          momentum_score?: number;
          growth_rate?: number;
          previous_momentum_score?: number;
          previous_clicks_28d?: number;
          is_active?: boolean;
          last_refreshed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          site_url?: string;
          display_name?: string;
          description?: string | null;
          category?: string | null;
          clicks_7d?: number;
          clicks_28d?: number;
          momentum_score?: number;
          growth_rate?: number;
          previous_momentum_score?: number;
          previous_clicks_28d?: number;
          is_active?: boolean;
          last_refreshed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      site_click_history: {
        Row: {
          site_id: string;
          /** ISO date (YYYY-MM-DD) of the click bucket. */
          date: string;
          clicks: number;
        };
        Insert: {
          site_id: string;
          date: string;
          clicks?: number;
        };
        Update: {
          site_id?: string;
          date?: string;
          clicks?: number;
        };
        Relationships: [];
      };
      sponsored_slots: {
        Row: {
          id: string;
          /** Organic rank position the ad appears AFTER (e.g. 10 or 20). */
          position_after_rank: number;
          display_name: string;
          site_url: string;
          description: string | null;
          cta_label: string | null;
          is_active: boolean;
          starts_at: string | null;
          ends_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          position_after_rank: number;
          display_name: string;
          site_url: string;
          description?: string | null;
          cta_label?: string | null;
          is_active?: boolean;
          starts_at?: string | null;
          ends_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          position_after_rank?: number;
          display_name?: string;
          site_url?: string;
          description?: string | null;
          cta_label?: string | null;
          is_active?: boolean;
          starts_at?: string | null;
          ends_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// Convenience row aliases used throughout the app.
export type PublishedSite = Database["public"]["Tables"]["published_sites"]["Row"];
export type SiteClickHistory = Database["public"]["Tables"]["site_click_history"]["Row"];
export type SponsoredSlot = Database["public"]["Tables"]["sponsored_slots"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ConnectedAccount = Database["public"]["Tables"]["connected_accounts"]["Row"];
