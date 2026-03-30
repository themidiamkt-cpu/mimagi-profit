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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      compras: {
        Row: {
          categoria: string | null
          created_at: string
          data_entrega_1: string | null
          data_entrega_2: string | null
          data_entrega_3: string | null
          data_entrega_4: string | null
          estacao: string
          id: string
          marca: string
          num_entregas: number
          planejamento_id: string | null
          prazo_pagamento: number
          updated_at: string
          user_id: string | null
          valor_total: number
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          data_entrega_1?: string | null
          data_entrega_2?: string | null
          data_entrega_3?: string | null
          data_entrega_4?: string | null
          estacao: string
          id?: string
          marca: string
          num_entregas?: number
          planejamento_id?: string | null
          prazo_pagamento?: number
          updated_at?: string
          user_id?: string | null
          valor_total?: number
        }
        Update: {
          categoria?: string | null
          created_at?: string
          data_entrega_1?: string | null
          data_entrega_2?: string | null
          data_entrega_3?: string | null
          data_entrega_4?: string | null
          estacao?: string
          id?: string
          marca?: string
          num_entregas?: number
          planejamento_id?: string | null
          prazo_pagamento?: number
          updated_at?: string
          user_id?: string | null
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "compras_planejamento_id_fkey"
            columns: ["planejamento_id"]
            isOneToOne: false
            referencedRelation: "planejamentos_financeiros"
            referencedColumns: ["id"]
          },
        ]
      }
      planejamentos_financeiros: {
        Row: {
          canais_venda: Json | null
          canal_eventos_perc: number | null
          canal_indicacoes_perc: number | null
          canal_instagram_ads_perc: number | null
          canal_instagram_organico_perc: number | null
          canal_loja_fisica_perc: number | null
          canal_shopee_perc: number | null
          canal_whatsapp_perc: number | null
          conteudo_acoes_loja: number | null
          conteudo_criativos_trafego: number | null
          conteudo_posts_semana: number | null
          conteudo_reels_ads: number | null
          conteudo_shopee: number | null
          conteudo_stories_dia: number | null
          conteudo_whatsapp: number | null
          conv_instagram_ads: number | null
          conv_shopee: number | null
          conv_whatsapp: number | null
          cpv_instagram_ads: number | null
          cpv_shopee: number | null
          cpv_whatsapp: number | null
          created_at: string
          custo_agua_luz: number | null
          custo_aluguel: number | null
          custo_contador: number | null
          custo_embalagens: number | null
          custo_encargos: number | null
          custo_internet: number | null
          custo_marketing: number | null
          custo_outros: number | null
          custo_salarios: number | null
          custo_sistema: number | null
          custos_extras: Json | null
          faturamento_realizado: number | null
          id: string
          invest_influenciadores: number | null
          invest_instagram_ads: number | null
          invest_outros: number | null
          invest_promocoes: number | null
          invest_shopee: number | null
          invest_whatsapp: number | null
          investimento_ciclo: number | null
          marca_bebe_1_nome: string | null
          marca_bebe_1_perc: number | null
          marca_bebe_2_nome: string | null
          marca_bebe_2_perc: number | null
          marca_bebe_3_nome: string | null
          marca_bebe_3_perc: number | null
          marca_bebe_4_nome: string | null
          marca_bebe_4_perc: number | null
          marca_menina_1_nome: string | null
          marca_menina_1_perc: number | null
          marca_menina_2_nome: string | null
          marca_menina_2_perc: number | null
          marca_menina_3_nome: string | null
          marca_menina_3_perc: number | null
          marca_menina_4_nome: string | null
          marca_menina_4_perc: number | null
          marca_menino_1_nome: string | null
          marca_menino_1_perc: number | null
          marca_menino_2_nome: string | null
          marca_menino_2_perc: number | null
          marca_menino_3_nome: string | null
          marca_menino_3_perc: number | null
          marca_menino_4_nome: string | null
          marca_menino_4_perc: number | null
          marca_sapato_1_nome: string | null
          marca_sapato_1_perc: number | null
          marca_sapato_2_nome: string | null
          marca_sapato_2_perc: number | null
          margem: number | null
          perc_bebe: number | null
          perc_menina: number | null
          perc_menino: number | null
          perc_roupas: number | null
          perc_sapatos: number | null
          ticket_instagram_ads: number | null
          ticket_loja_fisica: number | null
          ticket_shopee: number | null
          ticket_whatsapp: number | null
          tipo_bebe_basicos: number | null
          tipo_bebe_casual: number | null
          tipo_bebe_conjuntos: number | null
          tipo_menina_basicos: number | null
          tipo_menina_casual: number | null
          tipo_menina_conjuntos: number | null
          tipo_menina_vestidos: number | null
          tipo_menino_basicos: number | null
          tipo_menino_casual: number | null
          tipo_menino_conjuntos: number | null
          tm_bebe: number | null
          tm_menina: number | null
          tm_menino: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          canais_venda?: Json | null
          canal_eventos_perc?: number | null
          canal_indicacoes_perc?: number | null
          canal_instagram_ads_perc?: number | null
          canal_instagram_organico_perc?: number | null
          canal_loja_fisica_perc?: number | null
          canal_shopee_perc?: number | null
          canal_whatsapp_perc?: number | null
          conteudo_acoes_loja?: number | null
          conteudo_criativos_trafego?: number | null
          conteudo_posts_semana?: number | null
          conteudo_reels_ads?: number | null
          conteudo_shopee?: number | null
          conteudo_stories_dia?: number | null
          conteudo_whatsapp?: number | null
          conv_instagram_ads?: number | null
          conv_shopee?: number | null
          conv_whatsapp?: number | null
          cpv_instagram_ads?: number | null
          cpv_shopee?: number | null
          cpv_whatsapp?: number | null
          created_at?: string
          custo_agua_luz?: number | null
          custo_aluguel?: number | null
          custo_contador?: number | null
          custo_embalagens?: number | null
          custo_encargos?: number | null
          custo_internet?: number | null
          custo_marketing?: number | null
          custo_outros?: number | null
          custo_salarios?: number | null
          custo_sistema?: number | null
          custos_extras?: Json | null
          faturamento_realizado?: number | null
          id?: string
          invest_influenciadores?: number | null
          invest_instagram_ads?: number | null
          invest_outros?: number | null
          invest_promocoes?: number | null
          invest_shopee?: number | null
          invest_whatsapp?: number | null
          investimento_ciclo?: number | null
          marca_bebe_1_nome?: string | null
          marca_bebe_1_perc?: number | null
          marca_bebe_2_nome?: string | null
          marca_bebe_2_perc?: number | null
          marca_bebe_3_nome?: string | null
          marca_bebe_3_perc?: number | null
          marca_bebe_4_nome?: string | null
          marca_bebe_4_perc?: number | null
          marca_menina_1_nome?: string | null
          marca_menina_1_perc?: number | null
          marca_menina_2_nome?: string | null
          marca_menina_2_perc?: number | null
          marca_menina_3_nome?: string | null
          marca_menina_3_perc?: number | null
          marca_menina_4_nome?: string | null
          marca_menina_4_perc?: number | null
          marca_menino_1_nome?: string | null
          marca_menino_1_perc?: number | null
          marca_menino_2_nome?: string | null
          marca_menino_2_perc?: number | null
          marca_menino_3_nome?: string | null
          marca_menino_3_perc?: number | null
          marca_menino_4_nome?: string | null
          marca_menino_4_perc?: number | null
          marca_sapato_1_nome?: string | null
          marca_sapato_1_perc?: number | null
          marca_sapato_2_nome?: string | null
          marca_sapato_2_perc?: number | null
          margem?: number | null
          perc_bebe?: number | null
          perc_menina?: number | null
          perc_menino?: number | null
          perc_roupas?: number | null
          perc_sapatos?: number | null
          ticket_instagram_ads?: number | null
          ticket_loja_fisica?: number | null
          ticket_shopee?: number | null
          ticket_whatsapp?: number | null
          tipo_bebe_basicos?: number | null
          tipo_bebe_casual?: number | null
          tipo_bebe_conjuntos?: number | null
          tipo_menina_basicos?: number | null
          tipo_menina_casual?: number | null
          tipo_menina_conjuntos?: number | null
          tipo_menina_vestidos?: number | null
          tipo_menino_basicos?: number | null
          tipo_menino_casual?: number | null
          tipo_menino_conjuntos?: number | null
          tm_bebe?: number | null
          tm_menina?: number | null
          tm_menino?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          canais_venda?: Json | null
          canal_eventos_perc?: number | null
          canal_indicacoes_perc?: number | null
          canal_instagram_ads_perc?: number | null
          canal_instagram_organico_perc?: number | null
          canal_loja_fisica_perc?: number | null
          canal_shopee_perc?: number | null
          canal_whatsapp_perc?: number | null
          conteudo_acoes_loja?: number | null
          conteudo_criativos_trafego?: number | null
          conteudo_posts_semana?: number | null
          conteudo_reels_ads?: number | null
          conteudo_shopee?: number | null
          conteudo_stories_dia?: number | null
          conteudo_whatsapp?: number | null
          conv_instagram_ads?: number | null
          conv_shopee?: number | null
          conv_whatsapp?: number | null
          cpv_instagram_ads?: number | null
          cpv_shopee?: number | null
          cpv_whatsapp?: number | null
          created_at?: string
          custo_agua_luz?: number | null
          custo_aluguel?: number | null
          custo_contador?: number | null
          custo_embalagens?: number | null
          custo_encargos?: number | null
          custo_internet?: number | null
          custo_marketing?: number | null
          custo_outros?: number | null
          custo_salarios?: number | null
          custo_sistema?: number | null
          custos_extras?: Json | null
          faturamento_realizado?: number | null
          id?: string
          invest_influenciadores?: number | null
          invest_instagram_ads?: number | null
          invest_outros?: number | null
          invest_promocoes?: number | null
          invest_shopee?: number | null
          invest_whatsapp?: number | null
          investimento_ciclo?: number | null
          marca_bebe_1_nome?: string | null
          marca_bebe_1_perc?: number | null
          marca_bebe_2_nome?: string | null
          marca_bebe_2_perc?: number | null
          marca_bebe_3_nome?: string | null
          marca_bebe_3_perc?: number | null
          marca_bebe_4_nome?: string | null
          marca_bebe_4_perc?: number | null
          marca_menina_1_nome?: string | null
          marca_menina_1_perc?: number | null
          marca_menina_2_nome?: string | null
          marca_menina_2_perc?: number | null
          marca_menina_3_nome?: string | null
          marca_menina_3_perc?: number | null
          marca_menina_4_nome?: string | null
          marca_menina_4_perc?: number | null
          marca_menino_1_nome?: string | null
          marca_menino_1_perc?: number | null
          marca_menino_2_nome?: string | null
          marca_menino_2_perc?: number | null
          marca_menino_3_nome?: string | null
          marca_menino_3_perc?: number | null
          marca_menino_4_nome?: string | null
          marca_menino_4_perc?: number | null
          marca_sapato_1_nome?: string | null
          marca_sapato_1_perc?: number | null
          marca_sapato_2_nome?: string | null
          marca_sapato_2_perc?: number | null
          margem?: number | null
          perc_bebe?: number | null
          perc_menina?: number | null
          perc_menino?: number | null
          perc_roupas?: number | null
          perc_sapatos?: number | null
          ticket_instagram_ads?: number | null
          ticket_loja_fisica?: number | null
          ticket_shopee?: number | null
          ticket_whatsapp?: number | null
          tipo_bebe_basicos?: number | null
          tipo_bebe_casual?: number | null
          tipo_bebe_conjuntos?: number | null
          tipo_menina_basicos?: number | null
          tipo_menina_casual?: number | null
          tipo_menina_conjuntos?: number | null
          tipo_menina_vestidos?: number | null
          tipo_menino_basicos?: number | null
          tipo_menino_casual?: number | null
          tipo_menino_conjuntos?: number | null
          tm_bebe?: number | null
          tm_menina?: number | null
          tm_menino?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          faturamento_atual: number | null
          id: string
          instagram_loja: string | null
          nome: string
          nome_loja: string | null
          updated_at: string | null
          whatsapp: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          faturamento_atual?: number | null
          id: string
          instagram_loja?: string | null
          nome: string
          nome_loja?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          faturamento_atual?: number | null
          id?: string
          instagram_loja?: string | null
          nome?: string
          nome_loja?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
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
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_approved: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user" | "pending"
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
      app_role: ["admin", "user", "pending"],
    },
  },
} as const
