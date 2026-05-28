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
      appointments: {
        Row: {
          business_id: string
          call_id: string | null
          created_at: string
          customer_name: string | null
          customer_phone: string | null
          id: string
          provider: Database["public"]["Enums"]["appointment_provider"]
          provider_ref: string | null
          scheduled_for: string
          service: string | null
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
        }
        Insert: {
          business_id: string
          call_id?: string | null
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          provider?: Database["public"]["Enums"]["appointment_provider"]
          provider_ref?: string | null
          scheduled_for: string
          service?: string | null
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Update: {
          business_id?: string
          call_id?: string | null
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          provider?: Database["public"]["Enums"]["appointment_provider"]
          provider_ref?: string | null
          scheduled_for?: string
          service?: string | null
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Relationships: []
      }
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
          agent_prompt_override: string | null
          agent_voice_id: string | null
          auto_send_ai_replies: boolean
          avg_job_value: number
          business_hours: Json
          business_name: string
          business_phone: string | null
          carrier: Database["public"]["Enums"]["carrier"] | null
          contractor_type: Database["public"]["Enums"]["contractor_type"] | null
          created_at: string
          hcp_api_key: string | null
          id: string
          jobber_refresh_token: string | null
          notify_dashboard: boolean
          notify_email: boolean
          notify_email_address: string | null
          notify_sms: boolean
          onboarding_complete: boolean
          owner_id: string
          owner_phone: string | null
          scheduling_provider:
            | Database["public"]["Enums"]["appointment_provider"]
            | null
          twilio_number: string | null
          updated_at: string
        }
        Insert: {
          agent_prompt_override?: string | null
          agent_voice_id?: string | null
          auto_send_ai_replies?: boolean
          avg_job_value?: number
          business_hours?: Json
          business_name?: string
          business_phone?: string | null
          carrier?: Database["public"]["Enums"]["carrier"] | null
          contractor_type?:
            | Database["public"]["Enums"]["contractor_type"]
            | null
          created_at?: string
          hcp_api_key?: string | null
          id?: string
          jobber_refresh_token?: string | null
          notify_dashboard?: boolean
          notify_email?: boolean
          notify_email_address?: string | null
          notify_sms?: boolean
          onboarding_complete?: boolean
          owner_id: string
          owner_phone?: string | null
          scheduling_provider?:
            | Database["public"]["Enums"]["appointment_provider"]
            | null
          twilio_number?: string | null
          updated_at?: string
        }
        Update: {
          agent_prompt_override?: string | null
          agent_voice_id?: string | null
          auto_send_ai_replies?: boolean
          avg_job_value?: number
          business_hours?: Json
          business_name?: string
          business_phone?: string | null
          carrier?: Database["public"]["Enums"]["carrier"] | null
          contractor_type?:
            | Database["public"]["Enums"]["contractor_type"]
            | null
          created_at?: string
          hcp_api_key?: string | null
          id?: string
          jobber_refresh_token?: string | null
          notify_dashboard?: boolean
          notify_email?: boolean
          notify_email_address?: string | null
          notify_sms?: boolean
          onboarding_complete?: boolean
          owner_id?: string
          owner_phone?: string | null
          scheduling_provider?:
            | Database["public"]["Enums"]["appointment_provider"]
            | null
          twilio_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      callbacks: {
        Row: {
          business_id: string
          call_id: string | null
          caller_number: string
          created_at: string
          id: string
          requested_at: string
          scheduled_for: string | null
          status: Database["public"]["Enums"]["callback_status"]
          type: Database["public"]["Enums"]["callback_type"]
          updated_at: string
        }
        Insert: {
          business_id: string
          call_id?: string | null
          caller_number: string
          created_at?: string
          id?: string
          requested_at?: string
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["callback_status"]
          type?: Database["public"]["Enums"]["callback_type"]
          updated_at?: string
        }
        Update: {
          business_id?: string
          call_id?: string | null
          caller_number?: string
          created_at?: string
          id?: string
          requested_at?: string
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["callback_status"]
          type?: Database["public"]["Enums"]["callback_type"]
          updated_at?: string
        }
        Relationships: []
      }
      calls: {
        Row: {
          ai_summary: string | null
          ai_summary_short: string | null
          business_id: string
          callback_requested: boolean
          caller_name: string | null
          caller_number: string
          created_at: string
          id: string
          is_mobile: boolean | null
          lead_status: Database["public"]["Enums"]["lead_status"]
          priority: Database["public"]["Enums"]["lead_priority"]
          qualification: Json
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
          ai_summary_short?: string | null
          business_id: string
          callback_requested?: boolean
          caller_name?: string | null
          caller_number: string
          created_at?: string
          id?: string
          is_mobile?: boolean | null
          lead_status?: Database["public"]["Enums"]["lead_status"]
          priority?: Database["public"]["Enums"]["lead_priority"]
          qualification?: Json
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
          ai_summary_short?: string | null
          business_id?: string
          callback_requested?: boolean
          caller_name?: string | null
          caller_number?: string
          created_at?: string
          id?: string
          is_mobile?: boolean | null
          lead_status?: Database["public"]["Enums"]["lead_status"]
          priority?: Database["public"]["Enums"]["lead_priority"]
          qualification?: Json
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
      lead_assignments: {
        Row: {
          accepted_at: string | null
          assigned_at: string
          business_id: string
          call_id: string
          created_at: string
          id: string
          status: Database["public"]["Enums"]["assignment_status"]
          team_member_id: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          assigned_at?: string
          business_id: string
          call_id: string
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["assignment_status"]
          team_member_id: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          assigned_at?: string
          business_id?: string
          call_id?: string
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["assignment_status"]
          team_member_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_assignments_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          business_id: string
          call_id: string | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["notification_kind"]
          read: boolean
          title: string
        }
        Insert: {
          body?: string | null
          business_id: string
          call_id?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["notification_kind"]
          read?: boolean
          title: string
        }
        Update: {
          body?: string | null
          business_id?: string
          call_id?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["notification_kind"]
          read?: boolean
          title?: string
        }
        Relationships: []
      }
      sms_consents: {
        Row: {
          business_id: string
          caller_number: string
          created_at: string
          id: string
          keyword: string | null
          status: Database["public"]["Enums"]["sms_consent_status"]
        }
        Insert: {
          business_id: string
          caller_number: string
          created_at?: string
          id?: string
          keyword?: string | null
          status: Database["public"]["Enums"]["sms_consent_status"]
        }
        Update: {
          business_id?: string
          caller_number?: string
          created_at?: string
          id?: string
          keyword?: string | null
          status?: Database["public"]["Enums"]["sms_consent_status"]
        }
        Relationships: []
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
          suggestions: Json
        }
        Insert: {
          business_id: string
          caller_number: string
          created_at?: string
          id?: string
          last_message_at?: string
          suggestions?: Json
        }
        Update: {
          business_id?: string
          caller_number?: string
          created_at?: string
          id?: string
          last_message_at?: string
          suggestions?: Json
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
      team_members: {
        Row: {
          active: boolean
          business_id: string
          created_at: string
          email: string | null
          id: string
          last_assigned_at: string | null
          name: string
          phone: string | null
          role: Database["public"]["Enums"]["dispatch_role"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          business_id: string
          created_at?: string
          email?: string | null
          id?: string
          last_assigned_at?: string | null
          name: string
          phone?: string | null
          role?: Database["public"]["Enums"]["dispatch_role"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          business_id?: string
          created_at?: string
          email?: string | null
          id?: string
          last_assigned_at?: string | null
          name?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["dispatch_role"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
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
      appointment_provider: "hcp" | "jobber" | "internal"
      appointment_status: "booked" | "completed" | "cancelled"
      assignment_status: "pending" | "accepted" | "completed" | "reassigned"
      call_status: "new" | "contacted" | "resolved"
      call_urgency: "low" | "medium" | "high" | "emergency"
      callback_status: "pending" | "done" | "missed"
      callback_type: "immediate" | "scheduled"
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
      dispatch_role: "emergency" | "office" | "sales"
      lead_priority: "normal" | "high"
      lead_status: "open" | "contacted" | "scheduled" | "closed"
      notification_kind: "sms" | "email" | "dashboard" | "emergency"
      sms_consent_status: "opted_in" | "opted_out"
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
      appointment_provider: ["hcp", "jobber", "internal"],
      appointment_status: ["booked", "completed", "cancelled"],
      assignment_status: ["pending", "accepted", "completed", "reassigned"],
      call_status: ["new", "contacted", "resolved"],
      call_urgency: ["low", "medium", "high", "emergency"],
      callback_status: ["pending", "done", "missed"],
      callback_type: ["immediate", "scheduled"],
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
      dispatch_role: ["emergency", "office", "sales"],
      lead_priority: ["normal", "high"],
      lead_status: ["open", "contacted", "scheduled", "closed"],
      notification_kind: ["sms", "email", "dashboard", "emergency"],
      sms_consent_status: ["opted_in", "opted_out"],
    },
  },
} as const
