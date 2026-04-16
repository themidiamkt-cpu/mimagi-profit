// Interface para canal de venda dinâmico
export interface CanalVenda {
  id: string;
  nome: string;
  perc: number;
  ticket: number;
  meta_semanal: number;
  realizado_semana_1: number;
  realizado_semana_2: number;
  realizado_semana_3: number;
  realizado_semana_4: number;
  invest: number;
  cpv: number;
  conv: number;
  hasInvest: boolean;
  roas_esperado: number;
}

export type CanaisVendaPorMes = Record<string, CanalVenda[]>;

// Interface para custo extra dinâmico
export interface CustoExtra {
  id: string;
  nome: string;
  valor: number;
}

export interface PlanejamentoFinanceiro {
  id?: string;
  created_at?: string;
  updated_at?: string;

  // Seção 1: Variáveis Principais
  investimento_ciclo: number;
  margem: number;
  faturamento_realizado: number;

  // Seção 2: Distribuição por Público
  perc_menina: number;
  perc_menino: number;
  perc_bebe: number;

  // Seção 3: Roupas x Sapatos
  perc_roupas: number;
  perc_sapatos: number;

  // Seção 4: Marcas Menina
  marca_menina_1_nome: string;
  marca_menina_1_perc: number;
  marca_menina_2_nome: string;
  marca_menina_2_perc: number;
  marca_menina_3_nome: string;
  marca_menina_3_perc: number;
  marca_menina_4_nome: string;
  marca_menina_4_perc: number;

  // Seção 4: Marcas Menino
  marca_menino_1_nome: string;
  marca_menino_1_perc: number;
  marca_menino_2_nome: string;
  marca_menino_2_perc: number;
  marca_menino_3_nome: string;
  marca_menino_3_perc: number;
  marca_menino_4_nome: string;
  marca_menino_4_perc: number;

  // Seção 4: Marcas Bebê
  marca_bebe_1_nome: string;
  marca_bebe_1_perc: number;
  marca_bebe_2_nome: string;
  marca_bebe_2_perc: number;
  marca_bebe_3_nome: string;
  marca_bebe_3_perc: number;
  marca_bebe_4_nome: string;
  marca_bebe_4_perc: number;

  // Seção 4: Marcas Sapatos
  marca_sapato_1_nome: string;
  marca_sapato_1_perc: number;
  marca_sapato_2_nome: string;
  marca_sapato_2_perc: number;

  // Seção 5: Tipos de Peça Menina
  tipo_menina_vestidos: number;
  tipo_menina_conjuntos: number;
  tipo_menina_casual: number;
  tipo_menina_basicos: number;

  // Seção 5: Tipos de Peça Menino
  tipo_menino_conjuntos: number;
  tipo_menino_casual: number;
  tipo_menino_basicos: number;

  // Seção 5: Tipos de Peça Bebê
  tipo_bebe_conjuntos: number;
  tipo_bebe_casual: number;
  tipo_bebe_basicos: number;

  // Seção 6: Ticket Médio
  tm_menina: number;
  tm_menino: number;
  tm_bebe: number;

  // Seção 7: Custos Fixos
  custo_aluguel: number;
  custo_salarios: number;
  custo_encargos: number;
  custo_agua_luz: number;
  custo_internet: number;
  custo_contador: number;
  custo_embalagens: number;
  custo_sistema: number;
  custo_marketing: number;
  custo_outros: number;

  // Custos extras dinâmicos
  custos_extras: CustoExtra[];

  // Seção 13: Canais de Venda Dinâmicos
  canais_venda: CanalVenda[];
  canais_venda_mes_ativo: string;
  canais_venda_por_mes: CanaisVendaPorMes;

  // Campos legados (mantidos para compatibilidade)
  canal_loja_fisica_perc: number;
  canal_instagram_ads_perc: number;
  canal_instagram_organico_perc: number;
  canal_whatsapp_perc: number;
  canal_shopee_perc: number;
  canal_indicacoes_perc: number;
  canal_eventos_perc: number;

  // Investimentos por canal (legado)
  invest_instagram_ads: number;
  invest_promocoes: number;
  invest_whatsapp: number;
  invest_shopee: number;
  invest_influenciadores: number;
  invest_outros: number;

  // Ticket médio por canal (legado)
  ticket_loja_fisica: number;
  ticket_instagram_ads: number;
  ticket_whatsapp: number;
  ticket_shopee: number;

  // CPV por canal (legado)
  cpv_instagram_ads: number;
  cpv_whatsapp: number;
  cpv_shopee: number;

  // Taxa de conversão por canal (legado)
  conv_instagram_ads: number;
  conv_whatsapp: number;
  conv_shopee: number;

  // Conteúdos semanais
  conteudo_reels_ads: number;
  conteudo_criativos_trafego: number;
  conteudo_stories_dia: number;
  conteudo_posts_semana: number;
  conteudo_acoes_loja: number;
  conteudo_whatsapp: number;
  conteudo_shopee: number;
}

export interface CalculatedValues {
  // Variáveis calculadas
  investimento_mensal: number;
  faturamento_mensal: number;
  faturamento_ciclo: number;

  // Por público - investimento
  investimento_menina: number;
  investimento_menino: number;
  investimento_bebe: number;

  // Por público - faturamento
  faturamento_menina: number;
  faturamento_menino: number;
  faturamento_bebe: number;

  // Roupas/Sapatos
  investimento_roupas: number;
  investimento_sapatos: number;
  faturamento_roupas: number;
  faturamento_sapatos: number;

  // Quantidade de peças
  qtd_pecas_menina: number;
  qtd_pecas_menino: number;
  qtd_pecas_bebe: number;
  qtd_pecas_total: number;

  // Custos
  custo_fixo_mensal: number;
  custo_fixo_ciclo: number;
  custo_produtos: number;

  // Lucro
  lucro_bruto: number;
  lucro_liquido: number;
  margem_lucro: number;

  // Ponto de equilíbrio
  faturamento_minimo_mensal: number;
  pecas_minimas_mensal: number;
}

export interface SimulationValues {
  faturamento_mensal_desejado: number;
  faturamento_ciclo_desejado: number;
  investimento_mensal_necessario: number;
  investimento_ciclo_necessario: number;
  delta_investimento_mensal: number;
  delta_investimento_ciclo: number;
  qtd_minima_pecas: number;
}

export interface Alert {
  type: 'danger' | 'warning' | 'info';
  message: string;
  active?: boolean;
}

export const getCurrentMonthKey = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

export const createDefaultCanaisVenda = (): CanalVenda[] => [
  { id: '1', nome: 'Loja Física', perc: 100, ticket: 0, meta_semanal: 0, realizado_semana_1: 0, realizado_semana_2: 0, realizado_semana_3: 0, realizado_semana_4: 0, invest: 0, cpv: 0, conv: 0, hasInvest: false, roas_esperado: 0 },
  { id: '2', nome: 'Instagram Ads', perc: 0, ticket: 0, meta_semanal: 0, realizado_semana_1: 0, realizado_semana_2: 0, realizado_semana_3: 0, realizado_semana_4: 0, invest: 0, cpv: 0, conv: 0, hasInvest: true, roas_esperado: 0 },
  { id: '3', nome: 'Instagram Orgânico', perc: 0, ticket: 0, meta_semanal: 0, realizado_semana_1: 0, realizado_semana_2: 0, realizado_semana_3: 0, realizado_semana_4: 0, invest: 0, cpv: 0, conv: 0, hasInvest: false, roas_esperado: 0 },
  { id: '4', nome: 'WhatsApp', perc: 0, ticket: 0, meta_semanal: 0, realizado_semana_1: 0, realizado_semana_2: 0, realizado_semana_3: 0, realizado_semana_4: 0, invest: 0, cpv: 0, conv: 0, hasInvest: true, roas_esperado: 0 },
  { id: '5', nome: 'Shopee', perc: 0, ticket: 0, meta_semanal: 0, realizado_semana_1: 0, realizado_semana_2: 0, realizado_semana_3: 0, realizado_semana_4: 0, invest: 0, cpv: 0, conv: 0, hasInvest: true, roas_esperado: 0 },
  { id: '6', nome: 'Indicações/Recorrência', perc: 0, ticket: 0, meta_semanal: 0, realizado_semana_1: 0, realizado_semana_2: 0, realizado_semana_3: 0, realizado_semana_4: 0, invest: 0, cpv: 0, conv: 0, hasInvest: false, roas_esperado: 0 },
  { id: '7', nome: 'Eventos/Ações', perc: 0, ticket: 0, meta_semanal: 0, realizado_semana_1: 0, realizado_semana_2: 0, realizado_semana_3: 0, realizado_semana_4: 0, invest: 0, cpv: 0, conv: 0, hasInvest: false, roas_esperado: 0 },
];

const defaultCanaisVendaMesAtivo = getCurrentMonthKey();

export const defaultPlanejamento: PlanejamentoFinanceiro = {
  investimento_ciclo: 0,
  margem: 1,
  faturamento_realizado: 0,
  perc_menina: 34,
  perc_menino: 33,
  perc_bebe: 33,
  perc_roupas: 100,
  perc_sapatos: 0,
  marca_menina_1_nome: '',
  marca_menina_1_perc: 0,
  marca_menina_2_nome: '',
  marca_menina_2_perc: 0,
  marca_menina_3_nome: '',
  marca_menina_3_perc: 0,
  marca_menina_4_nome: '',
  marca_menina_4_perc: 0,
  marca_menino_1_nome: '',
  marca_menino_1_perc: 0,
  marca_menino_2_nome: '',
  marca_menino_2_perc: 0,
  marca_menino_3_nome: '',
  marca_menino_3_perc: 0,
  marca_menino_4_nome: '',
  marca_menino_4_perc: 0,
  marca_bebe_1_nome: '',
  marca_bebe_1_perc: 0,
  marca_bebe_2_nome: '',
  marca_bebe_2_perc: 0,
  marca_bebe_3_nome: '',
  marca_bebe_3_perc: 0,
  marca_bebe_4_nome: '',
  marca_bebe_4_perc: 0,
  marca_sapato_1_nome: '',
  marca_sapato_1_perc: 0,
  marca_sapato_2_nome: '',
  marca_sapato_2_perc: 0,
  tipo_menina_vestidos: 0,
  tipo_menina_conjuntos: 0,
  tipo_menina_casual: 0,
  tipo_menina_basicos: 0,
  tipo_menino_conjuntos: 0,
  tipo_menino_casual: 0,
  tipo_menino_basicos: 0,
  tipo_bebe_conjuntos: 0,
  tipo_bebe_casual: 0,
  tipo_bebe_basicos: 0,
  tm_menina: 0,
  tm_menino: 0,
  tm_bebe: 0,
  custo_aluguel: 0,
  custo_salarios: 0,
  custo_encargos: 0,
  custo_agua_luz: 0,
  custo_internet: 0,
  custo_contador: 0,
  custo_embalagens: 0,
  custo_sistema: 0,
  custo_marketing: 0,
  custo_outros: 0,

  custos_extras: [],

  canais_venda: createDefaultCanaisVenda(),
  canais_venda_mes_ativo: defaultCanaisVendaMesAtivo,
  canais_venda_por_mes: {
    [defaultCanaisVendaMesAtivo]: createDefaultCanaisVenda(),
  },

  canal_loja_fisica_perc: 0,
  canal_instagram_ads_perc: 0,
  canal_instagram_organico_perc: 0,
  canal_whatsapp_perc: 0,
  canal_shopee_perc: 0,
  canal_indicacoes_perc: 0,
  canal_eventos_perc: 0,
  invest_instagram_ads: 0,
  invest_promocoes: 0,
  invest_whatsapp: 0,
  invest_shopee: 0,
  invest_influenciadores: 0,
  invest_outros: 0,
  ticket_loja_fisica: 0,
  ticket_instagram_ads: 0,
  ticket_whatsapp: 0,
  ticket_shopee: 0,
  cpv_instagram_ads: 0,
  cpv_whatsapp: 0,
  cpv_shopee: 0,
  conv_instagram_ads: 0,
  conv_whatsapp: 0,
  conv_shopee: 0,
  conteudo_reels_ads: 0,
  conteudo_criativos_trafego: 0,
  conteudo_stories_dia: 0,
  conteudo_posts_semana: 0,
  conteudo_acoes_loja: 0,
  conteudo_whatsapp: 0,
  conteudo_shopee: 0,
};
