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
      business_members: {
        Row: {
          business_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_members_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          avg_job_value: number
          business_hours: Json
          business_name: string
          business_phone: string | null
          carrier: Database["public"]["Enums"]["carrier"] | null
          contractor_type: Database["public"]["Enums"]["contractor_type"] | null
          created_at: string
          id: string
          onboarding_complete: boolean
          owner_id: string
          owner_phone: string | null
          twilio_number: string | null
          updated_at: string
        }
        Insert: {
          avg_job_value?: number
          business_hours?: Json
          business_name?: string
          business_phone?: string | null
          carrier?: Database["public"]["Enums"]["carrier"] | null
          contractor_type?:
            | Database["public"]["Enums"]["contractor_type"]
            | null
          created_at?: string
          id?: string
          onboarding_complete?: boolean
          owner_id: string
          owner_phone?: string | null
          twilio_number?: string | null
          updated_at?: string
        }
        Update: {
          avg_job_value?: number
          business_hours?: Json
          business_name?: string
          business_phone?: string | null
          carrier?: Database["public"]["Enums"]["carrier"] | null
          contractor_type?:
            | Database["public"]["Enums"]["contractor_type"]
            | null
          created_at?: string
          id?: string
          onboarding_complete?: boolean
          owner_id?: string
          owner_phone?: string | null
          twilio_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      calls: {
        Row: {
          ai_summary: string | null
          business_id: string
          callback_requested: boolean
          caller_name: string | null
          caller_number: string
          created_at: string
          id: string
          is_mobile: boolean | null
          recording_url: string | null
          service_needed: string | null
          status: Database["public"]["Enums"]["call_status"]
          transcript: string | null
          twilio_call_sid: string | null
          updated_at: string
          urgency: Database["public"]["Enums"]["call_urgency"]
        }
        Insert: {
          ai_summary?: string | null
          business_id: string
          callback_requested?: boolean
          caller_name?: string | null
          caller_number: string
          created_at?: string
          id?: string
          is_mobile?: boolean | null
          recording_url?: string | null
          service_needed?: string | null
          status?: Database["public"]["Enums"]["call_status"]
          transcript?: string | null
          twilio_call_sid?: string | null
          updated_at?: string
          urgency?: Database["public"]["Enums"]["call_urgency"]
        }
        Update: {
          ai_summary?: string | null
          business_id?: string
          callback_requested?: boolean
          caller_name?: string | null
          caller_number?: string
          created_at?: string
          id?: string
          is_mobile?: boolean | null
          recording_url?: string | null
          service_needed?: string | null
          status?: Database["public"]["Enums"]["call_status"]
          transcript?: string | null
          twilio_call_sid?: string | null
          updated_at?: string
          urgency?: Database["public"]["Enums"]["call_urgency"]
        }
        Relationships: [
          {
            foreignKeyName: "calls_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      forwarding_tests: {
        Row: {
          business_id: string
          completed: boolean
          created_at: string
          detected_at: string | null
          id: string
        }
        Insert: {
          business_id: string
          completed?: boolean
          created_at?: string
          detected_at?: string | null
          id?: string
        }
        Update: {
          business_id?: string
          completed?: boolean
          created_at?: string
          detected_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forwarding_tests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_messages: {
        Row: {
          body: string
          created_at: string
          direction: string
          id: string
          thread_id: string
        }
        Insert: {
          body: string
          created_at?: string
          direction: string
          id?: string
          thread_id: string
        }
        Update: {
          body?: string
          created_at?: string
          direction?: string
          id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "sms_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_threads: {
        Row: {
          business_id: string
          caller_number: string
          created_at: string
          id: string
          last_message_at: string
        }
        Insert: {
          business_id: string
          caller_number: string
          created_at?: string
          id?: string
          last_message_at?: string
        }
        Update: {
          business_id?: string
          caller_number?: string
          created_at?: string
          id?: string
          last_message_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_threads_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          business_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _business_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_business_member: {
        Args: { _business_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "staff"
      call_status: "new" | "contacted" | "resolved"
      call_urgency: "low" | "medium" | "high" | "emergency"
      carrier:
        | "verizon"
        | "att"
        | "tmobile"
        | "comcast"
        | "ringcentral"
        | "google_voice"
        | "other"
      contractor_type:
        | "roofing"
        | "plumbing"
        | "hvac"
        | "electrical"
        | "landscaping"
        | "pest_control"
        | "restoration"
        | "general_contractor"
        | "painting"
        | "concrete"
        | "pool_services"
        | "pressure_washing"
        | "tree_services"
        | "flooring"
        | "handyman"
        | "solar"
        | "fencing"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "staff"],
      call_status: ["new", "contacted", "resolved"],
      call_urgency: ["low", "medium", "high", "emergency"],
      carrier: [
        "verizon",
        "att",
        "tmobile",
        "comcast",
        "ringcentral",
        "google_voice",
        "other",
      ],
      contractor_type: [
        "roofing",
        "plumbing",
        "hvac",
        "electrical",
        "landscaping",
        "pest_control",
        "restoration",
        "general_contractor",
        "painting",
        "concrete",
        "pool_services",
        "pressure_washing",
        "tree_services",
        "flooring",
        "handyman",
        "solar",
        "fencing",
      ],
    },
  },
} as const
