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
      email_unsubscribes: {
        Row: {
          email: string;
          source: string | null;
          created_at: string;
        };
        Insert: {
          email: string;
          source?: string | null;
          created_at?: string;
        };
        Update: {
          email?: string;
          source?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      waitlist: {
        Row: {
          id: string;
          email: string;
          source: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          source?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          source?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      channels: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          slug: string;
          destination_url: string;
          archived: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          slug: string;
          destination_url: string;
          archived?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          slug?: string;
          destination_url?: string;
          archived?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      channel_clicks: {
        Row: {
          id: string;
          channel_id: string;
          referrer: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          channel_id: string;
          referrer?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          channel_id?: string;
          referrer?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      channel_conversions: {
        Row: {
          id: string;
          channel_id: string;
          click_id: string | null;
          user_id: string;
          stripe_event_id: string | null;
          type: string;
          amount_cents: number;
          currency: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          channel_id: string;
          click_id?: string | null;
          user_id: string;
          stripe_event_id?: string | null;
          type?: string;
          amount_cents?: number;
          currency?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          channel_id?: string;
          click_id?: string | null;
          user_id?: string;
          stripe_event_id?: string | null;
          type?: string;
          amount_cents?: number;
          currency?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      stripe_connections: {
        Row: {
          user_id: string;
          webhook_token: string;
          encrypted_webhook_secret: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          webhook_token: string;
          encrypted_webhook_secret: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          webhook_token?: string;
          encrypted_webhook_secret?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      webhook_events: {
        Row: { id: number; received_at: string; delivery_id: string | null; event_type: string | null; http_status: number; outcome: string | null; error: string | null; summary: Json | null };
        Insert: { id?: number; received_at?: string; delivery_id?: string | null; event_type?: string | null; http_status: number; outcome?: string | null; error?: string | null; summary?: Json | null };
        Update: { id?: number; received_at?: string; delivery_id?: string | null; event_type?: string | null; http_status?: number; outcome?: string | null; error?: string | null; summary?: Json | null };
        Relationships: [];
      };
      admin_notifications: {
        Row: { id: number; created_at: string; kind: string; title: string; body: string | null; link: string | null; read_at: string | null };
        Insert: { id?: number; created_at?: string; kind?: string; title: string; body?: string | null; link?: string | null; read_at?: string | null };
        Update: { id?: number; created_at?: string; kind?: string; title?: string; body?: string | null; link?: string | null; read_at?: string | null };
        Relationships: [];
      };
      sponsor_subscriptions: {
        Row: {
          subscription_id: string;
          slot_id: string | null;
          customer_email: string | null;
          status: string;
          paid_through: string | null;
          cancelled_at: string | null;
          last_event: string | null;
          last_event_at: string | null;
          created_at: string;
        };
        Insert: {
          subscription_id: string;
          slot_id?: string | null;
          customer_email?: string | null;
          status?: string;
          paid_through?: string | null;
          cancelled_at?: string | null;
          last_event?: string | null;
          last_event_at?: string | null;
          created_at?: string;
        };
        Update: {
          subscription_id?: string;
          slot_id?: string | null;
          customer_email?: string | null;
          status?: string;
          paid_through?: string | null;
          cancelled_at?: string | null;
          last_event?: string | null;
          last_event_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      spotlight_payments: {
        Row: {
          payment_id: string;
          host: string;
          days: number;
          customer_email: string | null;
          starts_at: string;
          ends_at: string;
          refunded_at: string | null;
          created_at: string;
        };
        Insert: {
          payment_id: string;
          host: string;
          days: number;
          customer_email?: string | null;
          starts_at: string;
          ends_at: string;
          refunded_at?: string | null;
          created_at?: string;
        };
        Update: {
          payment_id?: string;
          host?: string;
          days?: number;
          customer_email?: string | null;
          starts_at?: string;
          ends_at?: string;
          refunded_at?: string | null;
          created_at?: string;
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
          subscription_id: string | null;
          /** active | needs_details | waitlist | paused | cancelled | on_hold | ended */
          status: string;
          updated_at: string;
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
          subscription_id?: string | null;
          status?: string;
          updated_at?: string;
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
          subscription_id?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      site_traffic_daily: {
        Row: {
          day: string;
          visitors: number;
          sessions: number;
          pageviews: number;
          bot_visitors: number;
          bot_sessions: number;
          bot_pageviews: number;
          updated_at: string;
        };
        Insert: {
          day?: string;
          visitors?: number;
          sessions?: number;
          pageviews?: number;
          bot_visitors?: number;
          bot_sessions?: number;
          bot_pageviews?: number;
          updated_at?: string;
        };
        Update: {
          day?: string;
          visitors?: number;
          sessions?: number;
          pageviews?: number;
          bot_visitors?: number;
          bot_sessions?: number;
          bot_pageviews?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      site_events: {
        Row: {
          day: string;
          event: string;
          label: string;
          hits: number;
          updated_at: string;
        };
        Insert: {
          day?: string;
          event: string;
          label?: string;
          hits?: number;
          updated_at?: string;
        };
        Update: {
          day?: string;
          event?: string;
          label?: string;
          hits?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      site_traffic_breakdown: {
        Row: {
          day: string;
          dimension: string;
          label: string;
          hits: number;
          updated_at: string;
        };
        Insert: {
          day?: string;
          dimension: string;
          label: string;
          hits?: number;
          updated_at?: string;
        };
        Update: {
          day?: string;
          dimension?: string;
          label?: string;
          hits?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      site_outbound_clicks: {
        Row: {
          host: string;
          day: string;
          hits: number;
          updated_at: string;
        };
        Insert: {
          host: string;
          day?: string;
          hits?: number;
          updated_at?: string;
        };
        Update: {
          host?: string;
          day?: string;
          hits?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      listed_sites: {
        Row: {
          id: string;
          host: string;
          site_url: string;
          display_name: string;
          tagline: string | null;
          description: string | null;
          category: string | null;
          alternative_to: string | null;
          pricing: string | null;
          platforms: string[];
          details: string | null;
          claimed_by: string | null;
          claim_code: string | null;
          claim_requested_by: string | null;
          claim_requested_at: string | null;
          submitter_email: string | null;
          /** 'listed' (unverified) | 'owner_verified' (badge/link proven). */
          status: string;
          owner_verified: boolean;
          verified_at: string | null;
          is_active: boolean;
          submitted_ip: string | null;
          spotlight_started_at: string | null;
          spotlight_until: string | null;
          spotlight_payment_id: string | null;
          badge_checked_at: string | null;
          spotlight_reminded_for: string | null;
          spotlight_reported_for: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          host: string;
          site_url: string;
          display_name: string;
          tagline?: string | null;
          description?: string | null;
          category?: string | null;
          alternative_to?: string | null;
          pricing?: string | null;
          platforms?: string[];
          details?: string | null;
          claimed_by?: string | null;
          claim_code?: string | null;
          claim_requested_by?: string | null;
          claim_requested_at?: string | null;
          submitter_email?: string | null;
          status?: string;
          owner_verified?: boolean;
          verified_at?: string | null;
          is_active?: boolean;
          submitted_ip?: string | null;
          spotlight_started_at?: string | null;
          spotlight_until?: string | null;
          spotlight_payment_id?: string | null;
          badge_checked_at?: string | null;
          spotlight_reminded_for?: string | null;
          spotlight_reported_for?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          host?: string;
          site_url?: string;
          display_name?: string;
          tagline?: string | null;
          description?: string | null;
          category?: string | null;
          alternative_to?: string | null;
          pricing?: string | null;
          platforms?: string[];
          details?: string | null;
          claimed_by?: string | null;
          claim_code?: string | null;
          claim_requested_by?: string | null;
          claim_requested_at?: string | null;
          submitter_email?: string | null;
          status?: string;
          owner_verified?: boolean;
          verified_at?: string | null;
          is_active?: boolean;
          submitted_ip?: string | null;
          spotlight_started_at?: string | null;
          spotlight_until?: string | null;
          spotlight_payment_id?: string | null;
          badge_checked_at?: string | null;
          spotlight_reminded_for?: string | null;
          spotlight_reported_for?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      /** Monthly click totals per site (20261118_site_click_monthly.sql). */
      site_click_monthly: {
        Row: {
          site_id: string;
          /** First day of the month, YYYY-MM-DD. */
          month: string;
          clicks: number;
          /** Days in the month with a history row. */
          days: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      bump_site_traffic: {
        Args: { new_visitor: boolean; new_session: boolean };
        Returns: undefined;
      };
      bump_bot_traffic: {
        Args: { new_visitor: boolean; new_session: boolean; p_reason: string };
        Returns: undefined;
      };
      bump_traffic_breakdown: {
        Args: { p_source: string; p_path: string; p_country: string; p_device: string };
        Returns: undefined;
      };
      bump_event: {
        Args: { p_event: string; p_label: string };
        Returns: undefined;
      };
      bump_outbound_click: {
        Args: { p_host: string };
        Returns: undefined;
      };
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
export type Channel = Database["public"]["Tables"]["channels"]["Row"];
export type ChannelClick = Database["public"]["Tables"]["channel_clicks"]["Row"];
export type ChannelConversion = Database["public"]["Tables"]["channel_conversions"]["Row"];
export type SponsoredSlot = Database["public"]["Tables"]["sponsored_slots"]["Row"];
export type SponsorSubscription = Database["public"]["Tables"]["sponsor_subscriptions"]["Row"];
export type SpotlightPayment = Database["public"]["Tables"]["spotlight_payments"]["Row"];
export type WebhookEvent = Database["public"]["Tables"]["webhook_events"]["Row"];
export type AdminNotification = Database["public"]["Tables"]["admin_notifications"]["Row"];
export type ListedSite = Database["public"]["Tables"]["listed_sites"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ConnectedAccount = Database["public"]["Tables"]["connected_accounts"]["Row"];
