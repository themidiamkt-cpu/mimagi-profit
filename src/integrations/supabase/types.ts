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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ad_insights_cache: {
        Row: {
          account_id: string
          clicks: number | null
          cpc: number | null
          created_at: string | null
          ctr: number | null
          date: string
          entity_id: string | null
          entity_name: string | null
          id: string
          impressions: number | null
          level: string
          platform: string
          raw: Json | null
          spend: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id: string
          clicks?: number | null
          cpc?: number | null
          created_at?: string | null
          ctr?: number | null
          date: string
          entity_id?: string | null
          entity_name?: string | null
          id?: string
          impressions?: number | null
          level?: string
          platform: string
          raw?: Json | null
          spend?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string
          clicks?: number | null
          cpc?: number | null
          created_at?: string | null
          ctr?: number | null
          date?: string
          entity_id?: string | null
          entity_name?: string | null
          id?: string
          impressions?: number | null
          level?: string
          platform?: string
          raw?: Json | null
          spend?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ad_integrations: {
        Row: {
          access_token: string
          account_id: string | null
          account_name: string | null
          app_id: string | null
          app_secret: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          metadata: Json | null
          platform: string
          refresh_token: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          account_id?: string | null
          account_name?: string | null
          app_id?: string | null
          app_secret?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          platform: string
          refresh_token?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          account_id?: string | null
          account_name?: string | null
          app_id?: string | null
          app_secret?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          platform?: string
          refresh_token?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      bling_config: {
        Row: {
          last_sync_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          last_sync_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          last_sync_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      bling_pedido_itens: {
        Row: {
          created_at: string | null
          descricao: string | null
          id: number
          pedido_id: number | null
          produto_id: number | null
          quantidade: number | null
          sku: string | null
          valor_unidade: number | null
        }
        Insert: {
          created_at?: string | null
          descricao?: string | null
          id: number
          pedido_id?: number | null
          produto_id?: number | null
          quantidade?: number | null
          sku?: string | null
          valor_unidade?: number | null
        }
        Update: {
          created_at?: string | null
          descricao?: string | null
          id?: number
          pedido_id?: number | null
          produto_id?: number | null
          quantidade?: number | null
          sku?: string | null
          valor_unidade?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bling_pedido_itens_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "bling_pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      bling_pedidos: {
        Row: {
          contato_id: number | null
          contato_nome: string | null
          created_at: string | null
          data: string
          id: number
          itens: Json | null
          loja_descricao: string | null
          loja_id: number | null
          numero: string | null
          raw: Json | null
          situacao_id: number | null
          situacao_nome: string | null
          synced_at: string | null
          total: number | null
          user_id: string | null
        }
        Insert: {
          contato_id?: number | null
          contato_nome?: string | null
          created_at?: string | null
          data: string
          id: number
          itens?: Json | null
          loja_descricao?: string | null
          loja_id?: number | null
          numero?: string | null
          raw?: Json | null
          situacao_id?: number | null
          situacao_nome?: string | null
          synced_at?: string | null
          total?: number | null
          user_id?: string | null
        }
        Update: {
          contato_id?: number | null
          contato_nome?: string | null
          created_at?: string | null
          data?: string
          id?: number
          itens?: Json | null
          loja_descricao?: string | null
          loja_id?: number | null
          numero?: string | null
          raw?: Json | null
          situacao_id?: number | null
          situacao_nome?: string | null
          synced_at?: string | null
          total?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      bling_produtos: {
        Row: {
          categoria: string | null
          codigo: string | null
          created_at: string | null
          id: number
          marca: string | null
          nome: string | null
          preco: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          categoria?: string | null
          codigo?: string | null
          created_at?: string | null
          id: number
          marca?: string | null
          nome?: string | null
          preco?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          categoria?: string | null
          codigo?: string | null
          created_at?: string | null
          id?: number
          marca?: string | null
          nome?: string | null
          preco?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      bling_sync_meta: {
        Row: {
          id: number
          last_sync: string | null
          status: string | null
          total_rows: number | null
          user_id: string | null
        }
        Insert: {
          id?: number
          last_sync?: string | null
          status?: string | null
          total_rows?: number | null
          user_id?: string | null
        }
        Update: {
          id?: number
          last_sync?: string | null
          status?: string | null
          total_rows?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      bling_tokens: {
        Row: {
          access_token: string
          created_at: string | null
          expires_at: string
          id: string
          refresh_token: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string | null
          expires_at: string
          id?: string
          refresh_token: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          refresh_token?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      children: {
        Row: {
          birth_date: string | null
          created_at: string | null
          current_size: string | null
          customer_id: string
          gender: string | null
          id: string
          last_size_update: string | null
          name: string
          next_size: string | null
          user_id: string | null
        }
        Insert: {
          birth_date?: string | null
          created_at?: string | null
          current_size?: string | null
          customer_id: string
          gender?: string | null
          id?: string
          last_size_update?: string | null
          name: string
          next_size?: string | null
          user_id?: string | null
        }
        Update: {
          birth_date?: string | null
          created_at?: string | null
          current_size?: string | null
          customer_id?: string
          gender?: string | null
          id?: string
          last_size_update?: string | null
          name?: string
          next_size?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "children_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "growth_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      compras: {
        Row: {
          categoria: string | null
          chave_nfe: string | null
          created_at: string
          data_entrega_1: string | null
          data_entrega_2: string | null
          data_entrega_3: string | null
          data_entrega_4: string | null
          estacao: string
          id: string
          is_sapatos: boolean | null
          marca: string
          num_entregas: number
          planejamento_id: string | null
          prazo_pagamento: number
          qtd_pecas: number | null
          updated_at: string
          user_id: string | null
          valor_total: number
        }
        Insert: {
          categoria?: string | null
          chave_nfe?: string | null
          created_at?: string
          data_entrega_1?: string | null
          data_entrega_2?: string | null
          data_entrega_3?: string | null
          data_entrega_4?: string | null
          estacao: string
          id?: string
          is_sapatos?: boolean | null
          marca: string
          num_entregas?: number
          planejamento_id?: string | null
          prazo_pagamento?: number
          qtd_pecas?: number | null
          updated_at?: string
          user_id?: string | null
          valor_total?: number
        }
        Update: {
          categoria?: string | null
          chave_nfe?: string | null
          created_at?: string
          data_entrega_1?: string | null
          data_entrega_2?: string | null
          data_entrega_3?: string | null
          data_entrega_4?: string | null
          estacao?: string
          id?: string
          is_sapatos?: boolean | null
          marca?: string
          num_entregas?: number
          planejamento_id?: string | null
          prazo_pagamento?: number
          qtd_pecas?: number | null
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
      customers: {
        Row: {
          active: boolean | null
          created_at: string | null
          document: string | null
          id: string
          name: string
          user_id: string | null
          whatsapp: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          document?: string | null
          id?: string
          name: string
          user_id?: string | null
          whatsapp?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          document?: string | null
          id?: string
          name?: string
          user_id?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      growth_customers: {
        Row: {
          bling_id: number | null
          city: string | null
          coupon_code: string | null
          cpf: string | null
          created_at: string | null
          email: string | null
          first_purchase_date: string | null
          frequencia_anual: number | null
          id: string
          last_purchase_date: string | null
          ltv: number | null
          name: string
          observacoes: string | null
          phone: string | null
          rfm_frequency: number | null
          rfm_monetary: number | null
          rfm_recency: number | null
          rfm_segment: Database["public"]["Enums"]["rfm_segment"] | null
          tempo_retencao: number | null
          ticket_medio: number | null
          total_orders: number | null
          total_spent: number | null
          updated_at: string | null
          user_id: string | null
          venda_origem: string | null
        }
        Insert: {
          bling_id?: number | null
          city?: string | null
          coupon_code?: string | null
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          first_purchase_date?: string | null
          frequencia_anual?: number | null
          id?: string
          last_purchase_date?: string | null
          ltv?: number | null
          name: string
          observacoes?: string | null
          phone?: string | null
          rfm_frequency?: number | null
          rfm_monetary?: number | null
          rfm_recency?: number | null
          rfm_segment?: Database["public"]["Enums"]["rfm_segment"] | null
          tempo_retencao?: number | null
          ticket_medio?: number | null
          total_orders?: number | null
          total_spent?: number | null
          updated_at?: string | null
          user_id?: string | null
          venda_origem?: string | null
        }
        Update: {
          bling_id?: number | null
          city?: string | null
          coupon_code?: string | null
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          first_purchase_date?: string | null
          frequencia_anual?: number | null
          id?: string
          last_purchase_date?: string | null
          ltv?: number | null
          name?: string
          observacoes?: string | null
          phone?: string | null
          rfm_frequency?: number | null
          rfm_monetary?: number | null
          rfm_recency?: number | null
          rfm_segment?: Database["public"]["Enums"]["rfm_segment"] | null
          tempo_retencao?: number | null
          ticket_medio?: number | null
          total_orders?: number | null
          total_spent?: number | null
          updated_at?: string | null
          user_id?: string | null
          venda_origem?: string | null
        }
        Relationships: []
      }
      installments: {
        Row: {
          amount: number
          created_at: string | null
          due_date: string
          id: string
          installment_number: number
          paid_at: string | null
          sent_to_webhook: boolean | null
          status: string | null
          tab_id: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          due_date: string
          id?: string
          installment_number: number
          paid_at?: string | null
          sent_to_webhook?: boolean | null
          status?: string | null
          tab_id: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          due_date?: string
          id?: string
          installment_number?: number
          paid_at?: string | null
          sent_to_webhook?: boolean | null
          status?: string | null
          tab_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "installments_tab_id_fkey"
            columns: ["tab_id"]
            isOneToOne: false
            referencedRelation: "tabs"
            referencedColumns: ["id"]
          },
        ]
      }
      keep_alive: {
        Row: {
          created_at: string | null
          id: number
          note: string | null
        }
        Insert: {
          created_at?: string | null
          id?: never
          note?: string | null
        }
        Update: {
          created_at?: string | null
          id?: never
          note?: string | null
        }
        Relationships: []
      }
      ml_ads: {
        Row: {
          acos: number | null
          ad_sales: number | null
          clicks: number | null
          cost: number | null
          created_at: string | null
          ctr: number | null
          id: string
          impressions: number | null
          ml_item_id: string
          price: number
          sku: string | null
          status: string
          stock_quantity: number
          title: string
          updated_at: string | null
          user_id: string
          visits: number | null
        }
        Insert: {
          acos?: number | null
          ad_sales?: number | null
          clicks?: number | null
          cost?: number | null
          created_at?: string | null
          ctr?: number | null
          id?: string
          impressions?: number | null
          ml_item_id: string
          price: number
          sku?: string | null
          status: string
          stock_quantity?: number
          title: string
          updated_at?: string | null
          user_id: string
          visits?: number | null
        }
        Update: {
          acos?: number | null
          ad_sales?: number | null
          clicks?: number | null
          cost?: number | null
          created_at?: string | null
          ctr?: number | null
          id?: string
          impressions?: number | null
          ml_item_id?: string
          price?: number
          sku?: string | null
          status?: string
          stock_quantity?: number
          title?: string
          updated_at?: string | null
          user_id?: string
          visits?: number | null
        }
        Relationships: []
      }
      ml_config: {
        Row: {
          account_name: string | null
          app_id: number
          code_verifier: string | null
          created_at: string | null
          id: string
          redirect_uri: string
          secret_key: string
          seller_id: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_name?: string | null
          app_id: number
          code_verifier?: string | null
          created_at?: string | null
          id?: string
          redirect_uri: string
          secret_key: string
          seller_id?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_name?: string | null
          app_id?: number
          code_verifier?: string | null
          created_at?: string | null
          id?: string
          redirect_uri?: string
          secret_key?: string
          seller_id?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ml_orders: {
        Row: {
          buyer_nickname: string | null
          created_at: string | null
          currency: string | null
          id: string
          ml_order_id: string
          order_date: string
          status: string
          total_amount: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          buyer_nickname?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          ml_order_id: string
          order_date: string
          status: string
          total_amount: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          buyer_nickname?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          ml_order_id?: string
          order_date?: string
          status?: string
          total_amount?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ml_sync_meta: {
        Row: {
          created_at: string | null
          last_sync: string | null
          status: string
          total_ads: number | null
          total_orders: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          last_sync?: string | null
          status?: string
          total_ads?: number | null
          total_orders?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          last_sync?: string | null
          status?: string
          total_ads?: number | null
          total_orders?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ml_tokens: {
        Row: {
          access_token: string
          created_at: string | null
          expires_at: string
          id: string
          refresh_token: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string | null
          expires_at: string
          id?: string
          refresh_token: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          refresh_token?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
          email: string | null
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
          email?: string | null
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
          email?: string | null
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
      shopee_config: {
        Row: {
          created_at: string | null
          environment: string
          id: string
          partner_id: number
          partner_key: string
          redirect_uri: string
          shop_id: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          environment?: string
          id?: string
          partner_id: number
          partner_key: string
          redirect_uri: string
          shop_id: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          environment?: string
          id?: string
          partner_id?: number
          partner_key?: string
          redirect_uri?: string
          shop_id?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      shopee_orders: {
        Row: {
          created_at: string | null
          currency: string | null
          id: string
          order_date: string
          shopee_order_id: string
          status: string
          total_amount: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          id?: string
          order_date: string
          shopee_order_id: string
          status: string
          total_amount: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          id?: string
          order_date?: string
          shopee_order_id?: string
          status?: string
          total_amount?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      shopee_products: {
        Row: {
          created_at: string | null
          id: string
          name: string
          price: number
          shopee_item_id: number
          sku: string | null
          status: string
          stock_quantity: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          price: number
          shopee_item_id: number
          sku?: string | null
          status: string
          stock_quantity?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          price?: number
          shopee_item_id?: number
          sku?: string | null
          status?: string
          stock_quantity?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      shopee_tokens: {
        Row: {
          access_token: string
          created_at: string | null
          expires_at: string
          id: string
          refresh_token: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string | null
          expires_at: string
          id?: string
          refresh_token: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          refresh_token?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      system_heartbeat: {
        Row: {
          created_at: string | null
          id: number
        }
        Insert: {
          created_at?: string | null
          id?: number
        }
        Update: {
          created_at?: string | null
          id?: number
        }
        Relationships: []
      }
      tabs: {
        Row: {
          created_at: string | null
          customer_id: string
          description: string | null
          id: string
          status: string | null
          total_value: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          description?: string | null
          id?: string
          status?: string | null
          total_value?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          description?: string | null
          id?: string
          status?: string | null
          total_value?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tabs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
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
      weekly_logs: {
        Row: {
          created_at: string
          id: number
          note: string | null
          reference_week: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: never
          note?: string | null
          reference_week: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: never
          note?: string | null
          reference_week?: string
          status?: string
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
      insert_keep_alive: { Args: never; Returns: undefined }
      insert_weekly_log: { Args: never; Returns: undefined }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_approved: { Args: { _user_id: string }; Returns: boolean }
      register_new_customer: {
        Args: {
          p_children?: Json
          p_city: string
          p_coupon_code: string
          p_cpf: string
          p_email: string
          p_name: string
          p_phone: string
          p_user_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "user" | "pending"
      rfm_segment: "vip" | "recorrente" | "novo" | "em_risco" | "perdido"
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
      rfm_segment: ["vip", "recorrente", "novo", "em_risco", "perdido"],
    },
  },
} as const
