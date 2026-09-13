export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      assets: {
        Row: {
          body: string
          created_at: string
          cta: string
          headline: string
          id: string
          name: string
          past_lift: number | null
          surface: string
          tags: string[]
        }
        Insert: {
          body: string
          created_at?: string
          cta: string
          headline: string
          id?: string
          name: string
          past_lift?: number | null
          surface: string
          tags?: string[]
        }
        Update: {
          body?: string
          created_at?: string
          cta?: string
          headline?: string
          id?: string
          name?: string
          past_lift?: number | null
          surface?: string
          tags?: string[]
        }
        Relationships: []
      }
      brand_rules: {
        Row: {
          category: string
          created_at: string
          id: string
          rule: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          rule: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          rule?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          created_at: string
          email: string
          id: string
          last_surface: string
          loyalty_tier: string
          name: string
          order_count: number
          sessions_30d: number
          tenure_days: number
          top_category: string
          total_spend: number
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          last_surface: string
          loyalty_tier: string
          name: string
          order_count?: number
          sessions_30d?: number
          tenure_days?: number
          top_category: string
          total_spend?: number
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          last_surface?: string
          loyalty_tier?: string
          name?: string
          order_count?: number
          sessions_30d?: number
          tenure_days?: number
          top_category?: string
          total_spend?: number
        }
        Relationships: []
      }
      decisions: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          in_audience: boolean
          in_holdout: boolean
          latency_ms: number
          precomputed: boolean
          reasons: Json
          run_id: string
          variant_key: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          in_audience?: boolean
          in_holdout?: boolean
          latency_ms?: number
          precomputed?: boolean
          reasons?: Json
          run_id: string
          variant_key: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          in_audience?: boolean
          in_holdout?: boolean
          latency_ms?: number
          precomputed?: boolean
          reasons?: Json
          run_id?: string
          variant_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "decisions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decisions_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "runs"
            referencedColumns: ["id"]
          },
        ]
      }
      past_experiments: {
        Row: {
          audience_summary: string
          created_at: string
          id: string
          lift: number
          metric: string
          name: string
          notes: string
          ran_at: string
          surface: string
          winner: string
        }
        Insert: {
          audience_summary: string
          created_at?: string
          id?: string
          lift: number
          metric: string
          name: string
          notes: string
          ran_at: string
          surface: string
          winner: string
        }
        Update: {
          audience_summary?: string
          created_at?: string
          id?: string
          lift?: number
          metric?: string
          name?: string
          notes?: string
          ran_at?: string
          surface?: string
          winner?: string
        }
        Relationships: []
      }
      runs: {
        Row: {
          approval_note: string | null
          approved_at: string | null
          audience: Json | null
          created_at: string
          experiment: Json | null
          goal: string
          id: string
          reasoning: string | null
          results: Json | null
          status: string
          surface: string
          updated_at: string
          variants: Json | null
        }
        Insert: {
          approval_note?: string | null
          approved_at?: string | null
          audience?: Json | null
          created_at?: string
          experiment?: Json | null
          goal: string
          id?: string
          reasoning?: string | null
          results?: Json | null
          status?: string
          surface?: string
          updated_at?: string
          variants?: Json | null
        }
        Update: {
          approval_note?: string | null
          approved_at?: string | null
          audience?: Json | null
          created_at?: string
          experiment?: Json | null
          goal?: string
          id?: string
          reasoning?: string | null
          results?: Json | null
          status?: string
          surface?: string
          updated_at?: string
          variants?: Json | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
