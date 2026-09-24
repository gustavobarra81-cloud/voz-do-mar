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
      analises_editais: {
        Row: {
          checklist: Json
          created_at: string
          edital_id: string
          id: string
          organizacao_id: string
          resumo: string | null
          updated_at: string
        }
        Insert: {
          checklist?: Json
          created_at?: string
          edital_id: string
          id?: string
          organizacao_id: string
          resumo?: string | null
          updated_at?: string
        }
        Update: {
          checklist?: Json
          created_at?: string
          edital_id?: string
          id?: string
          organizacao_id?: string
          resumo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "analises_editais_edital_id_fkey"
            columns: ["edital_id"]
            isOneToOne: false
            referencedRelation: "editais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analises_editais_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      dirigentes: {
        Row: {
          cargo: string
          cpf: string | null
          created_at: string
          email: string | null
          id: string
          nome: string
          organizacao_id: string
          telefone: string | null
        }
        Insert: {
          cargo: string
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome: string
          organizacao_id: string
          telefone?: string | null
        }
        Update: {
          cargo?: string
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          organizacao_id?: string
          telefone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dirigentes_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_organizacao: {
        Row: {
          arquivo_path: string
          categoria: string
          created_at: string
          data_emissao: string | null
          data_validade: string | null
          id: string
          mime_type: string
          nome: string
          organizacao_id: string
          updated_at: string
        }
        Insert: {
          arquivo_path: string
          categoria: string
          created_at?: string
          data_emissao?: string | null
          data_validade?: string | null
          id?: string
          mime_type: string
          nome: string
          organizacao_id: string
          updated_at?: string
        }
        Update: {
          arquivo_path?: string
          categoria?: string
          created_at?: string
          data_emissao?: string | null
          data_validade?: string | null
          id?: string
          mime_type?: string
          nome?: string
          organizacao_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentos_organizacao_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      editais: {
        Row: {
          arquivo_path: string | null
          created_at: string
          criado_por: string | null
          criterios: Json
          exigencias: string | null
          id: string
          organizacao_id: string | null
          orgao: string | null
          prazo: string | null
          publico: boolean
          resumo: string | null
          texto_completo: string | null
          titulo: string
          valor_maximo: string | null
        }
        Insert: {
          arquivo_path?: string | null
          created_at?: string
          criado_por?: string | null
          criterios?: Json
          exigencias?: string | null
          id?: string
          organizacao_id?: string | null
          orgao?: string | null
          prazo?: string | null
          publico?: boolean
          resumo?: string | null
          texto_completo?: string | null
          titulo: string
          valor_maximo?: string | null
        }
        Update: {
          arquivo_path?: string | null
          created_at?: string
          criado_por?: string | null
          criterios?: Json
          exigencias?: string | null
          id?: string
          organizacao_id?: string | null
          orgao?: string | null
          prazo?: string | null
          publico?: boolean
          resumo?: string | null
          texto_completo?: string | null
          titulo?: string
          valor_maximo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "editais_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      organizacoes: {
        Row: {
          atividade_principal: string | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          comunidade: string | null
          created_at: string
          data_constituicao: string | null
          data_eleicao: string | null
          email: string | null
          endereco: string | null
          estado: string | null
          historico: string | null
          id: string
          mandato_fim: string | null
          mandato_inicio: string | null
          nome_fantasia: string | null
          owner_id: string
          razao_social: string | null
          representante_cpf: string | null
          representante_email: string | null
          representante_nome: string | null
          representante_telefone: string | null
          status: string
          telefone: string | null
          tipo: string | null
          updated_at: string
        }
        Insert: {
          atividade_principal?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          comunidade?: string | null
          created_at?: string
          data_constituicao?: string | null
          data_eleicao?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          historico?: string | null
          id?: string
          mandato_fim?: string | null
          mandato_inicio?: string | null
          nome_fantasia?: string | null
          owner_id: string
          razao_social?: string | null
          representante_cpf?: string | null
          representante_email?: string | null
          representante_nome?: string | null
          representante_telefone?: string | null
          status?: string
          telefone?: string | null
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          atividade_principal?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          comunidade?: string | null
          created_at?: string
          data_constituicao?: string | null
          data_eleicao?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          historico?: string | null
          id?: string
          mandato_fim?: string | null
          mandato_inicio?: string | null
          nome_fantasia?: string | null
          owner_id?: string
          razao_social?: string | null
          representante_cpf?: string | null
          representante_email?: string | null
          representante_nome?: string | null
          representante_telefone?: string | null
          status?: string
          telefone?: string | null
          tipo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizacoes_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          approval_status: string
          comunidade: string | null
          created_at: string
          email: string | null
          id: string
          nome: string | null
          reviewed_at: string | null
          reviewed_by: string | null
        }
        Insert: {
          approval_status?: string
          comunidade?: string | null
          created_at?: string
          email?: string | null
          id: string
          nome?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
        Update: {
          approval_status?: string
          comunidade?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
        Relationships: []
      }
      projetos: {
        Row: {
          analise_id: string | null
          conteudo: string | null
          created_at: string
          edital_id: string | null
          id: string
          organizacao_id: string | null
          respostas: Json
          status: string
          titulo: string
          transcricao: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          analise_id?: string | null
          conteudo?: string | null
          created_at?: string
          edital_id?: string | null
          id?: string
          organizacao_id?: string | null
          respostas?: Json
          status?: string
          titulo?: string
          transcricao?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          analise_id?: string | null
          conteudo?: string | null
          created_at?: string
          edital_id?: string | null
          id?: string
          organizacao_id?: string | null
          respostas?: Json
          status?: string
          titulo?: string
          transcricao?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projetos_analise_id_fkey"
            columns: ["analise_id"]
            isOneToOne: false
            referencedRelation: "analises_editais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projetos_edital_id_fkey"
            columns: ["edital_id"]
            isOneToOne: false
            referencedRelation: "editais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projetos_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_approved: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
