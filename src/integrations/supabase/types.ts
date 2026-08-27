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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      boosts: {
        Row: {
          by_profile_id: string
          created_at: string
          id: string
          item_id: string
        }
        Insert: {
          by_profile_id: string
          created_at?: string
          id?: string
          item_id: string
        }
        Update: {
          by_profile_id?: string
          created_at?: string
          id?: string
          item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "boosts_by_profile_id_fkey"
            columns: ["by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boosts_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          a_id: string
          b_id: string
          created_at: string
          id: string
          item_id: string | null
          last_message_at: string | null
          updated_at: string
        }
        Insert: {
          a_id: string
          b_id: string
          created_at?: string
          id?: string
          item_id?: string | null
          last_message_at?: string | null
          updated_at?: string
        }
        Update: {
          a_id?: string
          b_id?: string
          created_at?: string
          id?: string
          item_id?: string | null
          last_message_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_a_id_fkey"
            columns: ["a_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_b_id_fkey"
            columns: ["b_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          accepted_at: string | null
          accepted_profile_id: string | null
          created_at: string
          created_by: string | null
          id: string
          label: string
          token: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_profile_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string
          token: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_profile_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invites_accepted_profile_id_fkey"
            columns: ["accepted_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          boost_count: number
          created_at: string
          details: Json
          distance_km: number | null
          id: string
          local_id: string | null
          note: string | null
          offer: string | null
          owner_id: string
          photos: Json
          priority: number
          published: boolean
          side: string | null
          status: string
          text: string
          type: string
          updated_at: string
          want: string | null
        }
        Insert: {
          boost_count?: number
          created_at?: string
          details?: Json
          distance_km?: number | null
          id?: string
          local_id?: string | null
          note?: string | null
          offer?: string | null
          owner_id: string
          photos?: Json
          priority?: number
          published?: boolean
          side?: string | null
          status?: string
          text?: string
          type: string
          updated_at?: string
          want?: string | null
        }
        Update: {
          boost_count?: number
          created_at?: string
          details?: Json
          distance_km?: number | null
          id?: string
          local_id?: string | null
          note?: string | null
          offer?: string | null
          owner_id?: string
          photos?: Json
          priority?: number
          published?: boolean
          side?: string | null
          status?: string
          text?: string
          type?: string
          updated_at?: string
          want?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "items_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          conversation_id: string
          created_at: string
          from_profile_id: string
          id: string
          read_at: string | null
          sent_as_sample: boolean
          text: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          from_profile_id: string
          id?: string
          read_at?: string | null
          sent_as_sample?: boolean
          text: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          from_profile_id?: string
          id?: string
          read_at?: string | null
          sent_as_sample?: boolean
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_from_profile_id_fkey"
            columns: ["from_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_profile_id: string | null
          body: string
          conversation_id: string | null
          created_at: string
          id: string
          item_id: string | null
          kind: string
          profile_id: string
          read_at: string | null
        }
        Insert: {
          actor_profile_id?: string | null
          body?: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          item_id?: string | null
          kind: string
          profile_id: string
          read_at?: string | null
        }
        Update: {
          actor_profile_id?: string | null
          body?: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          item_id?: string | null
          kind?: string
          profile_id?: string
          read_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          about: string
          answers: Json
          birthday: string | null
          by_day: string
          by_night: string
          created_at: string
          gender: string
          handle: string | null
          id: string
          is_sample: boolean
          name: string
          photo_url: string | null
          pronouns: string | null
          sample_key: string | null
          updated_at: string
          user_id: string | null
          weekend: string
        }
        Insert: {
          about?: string
          answers?: Json
          birthday?: string | null
          by_day?: string
          by_night?: string
          created_at?: string
          gender?: string
          handle?: string | null
          id?: string
          is_sample?: boolean
          name?: string
          photo_url?: string | null
          pronouns?: string | null
          sample_key?: string | null
          updated_at?: string
          user_id?: string | null
          weekend?: string
        }
        Update: {
          about?: string
          answers?: Json
          birthday?: string | null
          by_day?: string
          by_night?: string
          created_at?: string
          gender?: string
          handle?: string | null
          id?: string
          is_sample?: boolean
          name?: string
          photo_url?: string | null
          pronouns?: string | null
          sample_key?: string | null
          updated_at?: string
          user_id?: string | null
          weekend?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_see_conversation: {
        Args: { _conversation: string }
        Returns: boolean
      }
      current_profile_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_sample_profile: { Args: { _profile: string }; Returns: boolean }
      owns_profile: { Args: { _profile: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "tester"
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
      app_role: ["admin", "tester"],
    },
  },
} as const
