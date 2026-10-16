export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      account_roles: {
        Row: {
          role: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          role: string;
          user_id: string;
        };
        Update: {
          role?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "account_roles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      amenities: {
        Row: {
          code: string;
          id: string;
          label: string;
        };
        ComputedFields: never;
        Insert: {
          code: string;
          id?: string;
          label: string;
        };
        Update: {
          code?: string;
          id?: string;
          label?: string;
        };
        Relationships: [];
      };
      audit_events: {
        Row: {
          action: string;
          actor_id: string | null;
          entity_id: string;
          entity_type: string;
          id: string;
          metadata: NonNullable<Json>;
          occurred_at: string;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          actor_id?: string | null;
          entity_id: string;
          entity_type: string;
          id?: string;
          metadata?: NonNullable<Json>;
          occurred_at?: string;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          entity_id?: string;
          entity_type?: string;
          id?: string;
          metadata?: NonNullable<Json>;
          occurred_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_events_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      booking_requests: {
        Row: {
          contact_consent_at: string;
          created_at: string;
          decided_at: string | null;
          decided_by: string | null;
          decision_reason: string | null;
          end_date: string | null;
          expires_at: string;
          id: string;
          idempotency_key: string;
          message: string;
          offer_version: number;
          offered_deposit_amount: number;
          offered_monthly_rent: number;
          offered_terms: string;
          renter_id: string;
          start_date: string;
          status: string;
          unit_id: string;
        };
        ComputedFields: never;
        Insert: {
          contact_consent_at: string;
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          decision_reason?: string | null;
          end_date?: string | null;
          expires_at: string;
          id?: string;
          idempotency_key: string;
          message?: string;
          offer_version: number;
          offered_deposit_amount: number;
          offered_monthly_rent: number;
          offered_terms: string;
          renter_id: string;
          start_date: string;
          status?: string;
          unit_id: string;
        };
        Update: {
          contact_consent_at?: string;
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          decision_reason?: string | null;
          end_date?: string | null;
          expires_at?: string;
          id?: string;
          idempotency_key?: string;
          message?: string;
          offer_version?: number;
          offered_deposit_amount?: number;
          offered_monthly_rent?: number;
          offered_terms?: string;
          renter_id?: string;
          start_date?: string;
          status?: string;
          unit_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "booking_requests_decided_by_fkey";
            columns: ["decided_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "booking_requests_renter_id_fkey";
            columns: ["renter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "booking_requests_unit_id_fkey";
            columns: ["unit_id"];
            isOneToOne: false;
            referencedRelation: "units";
            referencedColumns: ["id"];
          },
        ];
      };
      favorites: {
        Row: {
          created_at: string;
          property_id: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          property_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          property_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "favorites_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "favorites_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profile_contacts: {
        Row: {
          phone: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          phone?: string | null;
          user_id: string;
        };
        Update: {
          phone?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profile_contacts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          account_status: string;
          created_at: string;
          display_name: string;
          id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          account_status?: string;
          created_at?: string;
          display_name: string;
          id: string;
          updated_at?: string;
        };
        Update: {
          account_status?: string;
          created_at?: string;
          display_name?: string;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      properties: {
        Row: {
          barangay: string;
          city: string;
          created_at: string;
          description: string;
          id: string;
          owner_id: string;
          property_type: string;
          province: string;
          public_latitude: number | null;
          public_longitude: number | null;
          slug: string;
          status: string;
          title: string;
          updated_at: string;
          verified_at: string | null;
          verified_by: string | null;
          version: number;
        };
        ComputedFields: never;
        Insert: {
          barangay: string;
          city?: string;
          created_at?: string;
          description?: string;
          id?: string;
          owner_id: string;
          property_type: string;
          province?: string;
          public_latitude?: number | null;
          public_longitude?: number | null;
          slug: string;
          status?: string;
          title: string;
          updated_at?: string;
          verified_at?: string | null;
          verified_by?: string | null;
          version?: number;
        };
        Update: {
          barangay?: string;
          city?: string;
          created_at?: string;
          description?: string;
          id?: string;
          owner_id?: string;
          property_type?: string;
          province?: string;
          public_latitude?: number | null;
          public_longitude?: number | null;
          slug?: string;
          status?: string;
          title?: string;
          updated_at?: string;
          verified_at?: string | null;
          verified_by?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "properties_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "properties_verified_by_fkey";
            columns: ["verified_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      property_amenities: {
        Row: {
          amenity_id: string;
          property_id: string;
        };
        ComputedFields: never;
        Insert: {
          amenity_id: string;
          property_id: string;
        };
        Update: {
          amenity_id?: string;
          property_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "property_amenities_amenity_id_fkey";
            columns: ["amenity_id"];
            isOneToOne: false;
            referencedRelation: "amenities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "property_amenities_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
        ];
      };
      property_photos: {
        Row: {
          alt_text: string;
          created_at: string;
          id: string;
          is_cover: boolean;
          property_id: string;
          sort_order: number;
          status: string;
          storage_path: string;
          unit_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          alt_text: string;
          created_at?: string;
          id?: string;
          is_cover?: boolean;
          property_id: string;
          sort_order?: number;
          status?: string;
          storage_path: string;
          unit_id?: string | null;
        };
        Update: {
          alt_text?: string;
          created_at?: string;
          id?: string;
          is_cover?: boolean;
          property_id?: string;
          sort_order?: number;
          status?: string;
          storage_path?: string;
          unit_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "property_photos_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "property_photos_unit_id_property_id_fkey";
            columns: ["unit_id", "property_id"];
            isOneToOne: false;
            referencedRelation: "units";
            referencedColumns: ["id", "property_id"];
          },
        ];
      };
      property_private_details: {
        Row: {
          access_instructions: string;
          contact_name: string;
          contact_phone: string;
          precise_latitude: number | null;
          precise_longitude: number | null;
          property_id: string;
          street_address: string;
        };
        ComputedFields: never;
        Insert: {
          access_instructions?: string;
          contact_name: string;
          contact_phone: string;
          precise_latitude?: number | null;
          precise_longitude?: number | null;
          property_id: string;
          street_address: string;
        };
        Update: {
          access_instructions?: string;
          contact_name?: string;
          contact_phone?: string;
          precise_latitude?: number | null;
          precise_longitude?: number | null;
          property_id?: string;
          street_address?: string;
        };
        Relationships: [
          {
            foreignKeyName: "property_private_details_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: true;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
        ];
      };
      reports: {
        Row: {
          created_at: string;
          detail: string;
          id: string;
          property_id: string;
          reason: string;
          reporter_id: string;
          resolved_at: string | null;
          resolved_by: string | null;
          status: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          detail?: string;
          id?: string;
          property_id: string;
          reason: string;
          reporter_id: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
          status?: string;
        };
        Update: {
          created_at?: string;
          detail?: string;
          id?: string;
          property_id?: string;
          reason?: string;
          reporter_id?: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reports_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_reporter_id_fkey";
            columns: ["reporter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_resolved_by_fkey";
            columns: ["resolved_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      unit_allocations: {
        Row: {
          booking_request_id: string | null;
          created_at: string;
          created_by: string;
          end_date: string | null;
          id: string;
          kind: string;
          note: string;
          period: unknown;
          released_at: string | null;
          start_date: string;
          unit_id: string;
        };
        ComputedFields: never;
        Insert: {
          booking_request_id?: string | null;
          created_at?: string;
          created_by: string;
          end_date?: string | null;
          id?: string;
          kind: string;
          note?: string;
          period?: never;
          released_at?: string | null;
          start_date: string;
          unit_id: string;
        };
        Update: {
          booking_request_id?: string | null;
          created_at?: string;
          created_by?: string;
          end_date?: string | null;
          id?: string;
          kind?: string;
          note?: string;
          period?: never;
          released_at?: string | null;
          start_date?: string;
          unit_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "unit_allocations_booking_request_id_unit_id_fkey";
            columns: ["booking_request_id", "unit_id"];
            isOneToOne: false;
            referencedRelation: "booking_requests";
            referencedColumns: ["id", "unit_id"];
          },
          {
            foreignKeyName: "unit_allocations_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "unit_allocations_unit_id_fkey";
            columns: ["unit_id"];
            isOneToOne: false;
            referencedRelation: "units";
            referencedColumns: ["id"];
          },
        ];
      };
      units: {
        Row: {
          active: boolean;
          created_at: string;
          deposit_amount: number;
          id: string;
          label: string;
          monthly_rent: number;
          offer_version: number;
          property_id: string;
          room_label: string | null;
          terms: string;
          unit_type: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          created_at?: string;
          deposit_amount?: number;
          id?: string;
          label: string;
          monthly_rent: number;
          offer_version?: number;
          property_id: string;
          room_label?: string | null;
          terms?: string;
          unit_type: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          deposit_amount?: number;
          id?: string;
          label?: string;
          monthly_rent?: number;
          offer_version?: number;
          property_id?: string;
          room_label?: string | null;
          terms?: string;
          unit_type?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "units_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
        ];
      };
      viewing_requests: {
        Row: {
          contact_consent_at: string;
          created_at: string;
          decided_at: string | null;
          decided_by: string | null;
          decision_reason: string | null;
          expires_at: string;
          id: string;
          message: string;
          property_id: string;
          renter_id: string;
          requested_at: string;
          status: string;
        };
        ComputedFields: never;
        Insert: {
          contact_consent_at: string;
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          decision_reason?: string | null;
          expires_at: string;
          id?: string;
          message?: string;
          property_id: string;
          renter_id: string;
          requested_at: string;
          status?: string;
        };
        Update: {
          contact_consent_at?: string;
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          decision_reason?: string | null;
          expires_at?: string;
          id?: string;
          message?: string;
          property_id?: string;
          renter_id?: string;
          requested_at?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "viewing_requests_decided_by_fkey";
            columns: ["decided_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "viewing_requests_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "viewing_requests_renter_id_fkey";
            columns: ["renter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      activate_owner: { Args: Record<PropertyKey, never>; Returns: undefined };
      approve_booking: { Args: { p_request_id: string }; Returns: string };
      browse_properties: {
        Args: { p_limit?: number; p_offset?: number };
        Returns: {
          barangay: string;
          city: string;
          description: string;
          id: string;
          monthly_rent: number;
          property_type: string;
          public_latitude: number;
          public_longitude: number;
          slug: string;
          title: string;
        }[];
      };
      create_manual_allocation: {
        Args: {
          p_end_date: string;
          p_kind: string;
          p_note?: string;
          p_start_date: string;
          p_unit_id: string;
        };
        Returns: string;
      };
      decide_booking: {
        Args: { p_decision: string; p_reason?: string; p_request_id: string };
        Returns: undefined;
      };
      decide_viewing: {
        Args: { p_decision: string; p_reason?: string; p_request_id: string };
        Returns: undefined;
      };
      end_allocation: { Args: { p_allocation_id: string; p_end_date: string }; Returns: undefined };
      get_property_contact: {
        Args: { p_property_id: string };
        Returns: {
          access_instructions: string;
          contact_name: string;
          contact_phone: string;
          street_address: string;
        }[];
      };
      get_public_units: {
        Args: { p_slug: string };
        Returns: {
          deposit_amount: number;
          id: string;
          label: string;
          monthly_rent: number;
          offer_version: number;
          terms: string;
          unit_type: string;
        }[];
      };
      get_requester_contact: {
        Args: { p_kind: string; p_request_id: string };
        Returns: {
          display_name: string;
          phone: string;
        }[];
      };
      moderate_property: {
        Args: { p_decision: string; p_property_id: string; p_reason: string };
        Returns: undefined;
      };
      release_future_block: { Args: { p_allocation_id: string }; Returns: undefined };
      resolve_report: { Args: { p_report_id: string; p_status: string }; Returns: undefined };
      save_property_draft: {
        Args: {
          p_barangay: string;
          p_contact_name: string;
          p_contact_phone: string;
          p_description: string;
          p_property_id: string;
          p_property_type: string;
          p_public_latitude?: number;
          p_public_longitude?: number;
          p_slug: string;
          p_street_address: string;
          p_title: string;
        };
        Returns: string;
      };
      save_unit: {
        Args: {
          p_active?: boolean;
          p_deposit_amount: number;
          p_label: string;
          p_monthly_rent: number;
          p_property_id: string;
          p_terms: string;
          p_unit_id: string;
          p_unit_type: string;
        };
        Returns: string;
      };
      submit_booking: {
        Args: {
          p_consent: boolean;
          p_end_date: string;
          p_idempotency_key: string;
          p_message: string;
          p_offer_version: number;
          p_start_date: string;
          p_unit_id: string;
        };
        Returns: string;
      };
      submit_property: { Args: { p_property_id: string }; Returns: undefined };
      submit_report: {
        Args: { p_detail?: string; p_property_id: string; p_reason: string };
        Returns: string;
      };
      submit_viewing: {
        Args: {
          p_consent: boolean;
          p_message: string;
          p_property_id: string;
          p_requested_at: string;
        };
        Returns: string;
      };
      suspend_account: {
        Args: { p_reason: string; p_suspended: boolean; p_user_id: string };
        Returns: undefined;
      };
      unit_is_available: {
        Args: { p_end_date?: string; p_start_date: string; p_unit_id: string };
        Returns: boolean;
      };
      update_my_profile: { Args: { p_display_name: string; p_phone?: string }; Returns: undefined };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
