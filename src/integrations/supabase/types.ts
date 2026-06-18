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
      anamnese: {
        Row: {
          created_at: string
          experiencia: string | null
          frequencia: string | null
          id: string
          limitacao: string | null
          limitacao_descricao: string | null
          local_treino: string | null
          objetivo: string | null
          quiz_answers: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          experiencia?: string | null
          frequencia?: string | null
          id?: string
          limitacao?: string | null
          limitacao_descricao?: string | null
          local_treino?: string | null
          objetivo?: string | null
          quiz_answers?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          experiencia?: string | null
          frequencia?: string | null
          id?: string
          limitacao?: string | null
          limitacao_descricao?: string | null
          local_treino?: string | null
          objetivo?: string | null
          quiz_answers?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          has_class_access: boolean
          id: string
          is_active: boolean
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          has_class_access?: boolean
          id: string
          is_active?: boolean
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          has_class_access?: boolean
          id?: string
          is_active?: boolean
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      purchases: {
        Row: {
          amount: number
          appmax_order_id: string | null
          created_at: string
          customer_email: string | null
          customer_name: string | null
          id: string
          status: string
          transaction_id: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          appmax_order_id?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          id?: string
          status?: string
          transaction_id?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          appmax_order_id?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          id?: string
          status?: string
          transaction_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      quiz_config: {
        Row: {
          content: Json
          id: string
          section: string
          updated_at: string
        }
        Insert: {
          content: Json
          id?: string
          section: string
          updated_at?: string
        }
        Update: {
          content?: Json
          id?: string
          section?: string
          updated_at?: string
        }
        Relationships: []
      }
      student_plan_exercises: {
        Row: {
          display_order: number
          exercise_name: string
          id: string
          notes: string | null
          plan_id: string
          reps: string | null
          rest_seconds: number | null
          sets: string | null
        }
        Insert: {
          display_order?: number
          exercise_name: string
          id?: string
          notes?: string | null
          plan_id: string
          reps?: string | null
          rest_seconds?: number | null
          sets?: string | null
        }
        Update: {
          display_order?: number
          exercise_name?: string
          id?: string
          notes?: string | null
          plan_id?: string
          reps?: string | null
          rest_seconds?: number | null
          sets?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_plan_exercises_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "student_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      student_plans: {
        Row: {
          created_at: string
          day_of_week: number
          id: string
          plan_name: string | null
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          id?: string
          plan_name?: string | null
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          id?: string
          plan_name?: string | null
          student_id?: string
          updated_at?: string
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
      workout_exercises: {
        Row: {
          display_order: number
          id: string
          name: string
          reps: string | null
          sets: string | null
          workout_id: string
        }
        Insert: {
          display_order?: number
          id?: string
          name: string
          reps?: string | null
          sets?: string | null
          workout_id: string
        }
        Update: {
          display_order?: number
          id?: string
          name?: string
          reps?: string | null
          sets?: string | null
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_exercises_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workouts: {
        Row: {
          category: string
          created_at: string
          description: string | null
          difficulty: string | null
          display_order: number
          duration_minutes: number | null
          id: string
          is_featured: boolean
          thumbnail_path: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_path: string | null
          video_url: string | null
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          difficulty?: string | null
          display_order?: number
          duration_minutes?: number | null
          id?: string
          is_featured?: boolean
          thumbnail_path?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_path?: string | null
          video_url?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          difficulty?: string | null
          display_order?: number
          duration_minutes?: number | null
          id?: string
          is_featured?: boolean
          thumbnail_path?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_path?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "online" | "presencial"
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
      app_role: ["admin", "online", "presencial"],
    },
  },
} as const
