export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type player_role = "batsman" | "bowler" | "all_rounder" | "wicket_keeper";
export type tournament_status = "draft" | "open" | "locked" | "auction" | "completed" | "cancelled" | "archived";
export type registration_status =
  | "pending_payment"
  | "payment_uploaded"
  | "approved"
  | "rejected"
  | "waitlisted"
  | "withdrawn";
export type payment_status = "pending" | "submitted" | "approved" | "rejected";
export type auction_purchase_status = "sold" | "returned" | "skipped";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          username: string | null;
          phone: string | null;
          avatar_url: string | null;
          location: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          username?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          location?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          username?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          location?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tournaments: {
        Row: {
          id: string;
          creator_id: string;
          name: string;
          slug: string;
          description: string | null;
          rules: string | null;
          location: string;
          start_date: string;
          end_date: string | null;
          registration_deadline: string;
          registration_fee: number;
          max_players: number;
          number_of_teams: number;
          team_budget: number;
          banner_path: string | null;
          banner_url: string | null;
          banner_storage_path: string | null;
          upi_qr_path: string | null;
          upi_id: string | null;
          payment_instructions: string | null;
          status: tournament_status;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          creator_id: string;
          name: string;
          slug: string;
          description?: string | null;
          rules?: string | null;
          location: string;
          start_date: string;
          end_date?: string | null;
          registration_deadline: string;
          registration_fee?: number;
          max_players: number;
          number_of_teams: number;
          team_budget: number;
          banner_path?: string | null;
          banner_url?: string | null;
          banner_storage_path?: string | null;
          upi_qr_path?: string | null;
          upi_id?: string | null;
          payment_instructions?: string | null;
          status?: tournament_status;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          creator_id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          rules?: string | null;
          location?: string;
          start_date?: string;
          end_date?: string | null;
          registration_deadline?: string;
          registration_fee?: number;
          max_players?: number;
          number_of_teams?: number;
          team_budget?: number;
          banner_path?: string | null;
          banner_url?: string | null;
          banner_storage_path?: string | null;
          upi_qr_path?: string | null;
          upi_id?: string | null;
          payment_instructions?: string | null;
          status?: tournament_status;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tournaments_creator_id_fkey";
            columns: ["creator_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      registrations: {
        Row: {
          id: string;
          tournament_id: string;
          user_id: string;
          role: player_role;
          profile_image_path: string | null;
          status: registration_status;
          rejection_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tournament_id: string;
          user_id: string;
          role: player_role;
          profile_image_path?: string | null;
          status?: registration_status;
          rejection_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tournament_id?: string;
          user_id?: string;
          role?: player_role;
          profile_image_path?: string | null;
          status?: registration_status;
          rejection_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "registrations_tournament_id_fkey";
            columns: ["tournament_id"];
            referencedRelation: "tournaments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "registrations_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          id: string;
          registration_id: string;
          tournament_id: string;
          user_id: string;
          amount: number;
          screenshot_path: string | null;
          status: payment_status;
          creator_notes: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          registration_id: string;
          tournament_id: string;
          user_id: string;
          amount: number;
          screenshot_path?: string | null;
          status?: payment_status;
          creator_notes?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          registration_id?: string;
          tournament_id?: string;
          user_id?: string;
          amount?: number;
          screenshot_path?: string | null;
          status?: payment_status;
          creator_notes?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      teams: {
        Row: {
          id: string;
          tournament_id: string;
          name: string;
          logo_path: string | null;
          budget: number;
          remaining_budget: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tournament_id: string;
          name: string;
          logo_path?: string | null;
          budget: number;
          remaining_budget: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tournament_id?: string;
          name?: string;
          logo_path?: string | null;
          budget?: number;
          remaining_budget?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      auction_purchases: {
        Row: {
          id: string;
          tournament_id: string;
          registration_id: string;
          team_id: string | null;
          purchase_amount: number;
          status: auction_purchase_status;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          tournament_id: string;
          registration_id: string;
          team_id?: string | null;
          purchase_amount?: number;
          status?: auction_purchase_status;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          tournament_id?: string;
          registration_id?: string;
          team_id?: string | null;
          purchase_amount?: number;
          status?: auction_purchase_status;
          created_by?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      approved_registration_count: {
        Args: { target_tournament_id: string };
        Returns: number;
      };
      is_tournament_creator: {
        Args: { target_tournament_id: string };
        Returns: boolean;
      };
      team_spend: {
        Args: { target_team_id: string };
        Returns: number;
      };
    };
    Enums: {
      player_role: player_role;
      tournament_status: tournament_status;
      registration_status: registration_status;
      payment_status: payment_status;
      auction_purchase_status: auction_purchase_status;
    };
    CompositeTypes: Record<string, never>;
  };
};
