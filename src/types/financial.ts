// Interface para canal de venda dinâmico
export interface CanalVenda {
  id: string;
  nome: string;
  perc: number;
  ticket: number;
  invest: number;
  cpv: number;
  conv: number;
  hasInvest: boolean;
  roas_esperado: number;
}

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

export const defaultPlanejamento: PlanejamentoFinanceiro = {
  investimento_ciclo: 60000,
  margem: 2,
  faturamento_realizado: 0,
  perc_menina: 40,
  perc_menino: 35,
  perc_bebe: 25,
  perc_roupas: 70,
  perc_sapatos: 30,
  marca_menina_1_nome: 'Marca A',
  marca_menina_1_perc: 30,
  marca_menina_2_nome: 'Marca B',
  marca_menina_2_perc: 30,
  marca_menina_3_nome: 'Marca C',
  marca_menina_3_perc: 25,
  marca_menina_4_nome: 'Marca D',
  marca_menina_4_perc: 15,
  marca_menino_1_nome: 'Marca A',
  marca_menino_1_perc: 30,
  marca_menino_2_nome: 'Marca B',
  marca_menino_2_perc: 30,
  marca_menino_3_nome: 'Marca C',
  marca_menino_3_perc: 25,
  marca_menino_4_nome: 'Marca D',
  marca_menino_4_perc: 15,
  marca_bebe_1_nome: 'Marca A',
  marca_bebe_1_perc: 30,
  marca_bebe_2_nome: 'Marca B',
  marca_bebe_2_perc: 30,
  marca_bebe_3_nome: 'Marca C',
  marca_bebe_3_perc: 25,
  marca_bebe_4_nome: 'Marca D',
  marca_bebe_4_perc: 15,
  marca_sapato_1_nome: 'Marca Sapato A',
  marca_sapato_1_perc: 60,
  marca_sapato_2_nome: 'Marca Sapato B',
  marca_sapato_2_perc: 40,
  tipo_menina_vestidos: 30,
  tipo_menina_conjuntos: 30,
  tipo_menina_casual: 25,
  tipo_menina_basicos: 15,
  tipo_menino_conjuntos: 40,
  tipo_menino_casual: 35,
  tipo_menino_basicos: 25,
  tipo_bebe_conjuntos: 40,
  tipo_bebe_casual: 35,
  tipo_bebe_basicos: 25,
  tm_menina: 150,
  tm_menino: 140,
  tm_bebe: 120,
  custo_aluguel: 3000,
  custo_salarios: 5000,
  custo_encargos: 1500,
  custo_agua_luz: 500,
  custo_internet: 150,
  custo_contador: 800,
  custo_embalagens: 300,
  custo_sistema: 200,
  custo_marketing: 1000,
  custo_outros: 500,
  
  // Custos extras dinâmicos
  custos_extras: [],
  
  // Seção 13: Canais de Venda Dinâmicos
  canais_venda: [
    { id: '1', nome: 'Loja Física', perc: 30, ticket: 180, invest: 0, cpv: 0, conv: 0, hasInvest: false, roas_esperado: 0 },
    { id: '2', nome: 'Instagram Ads', perc: 25, ticket: 150, invest: 2000, cpv: 25, conv: 2.5, hasInvest: true, roas_esperado: 5 },
    { id: '3', nome: 'Instagram Orgânico', perc: 15, ticket: 150, invest: 0, cpv: 0, conv: 0, hasInvest: false, roas_esperado: 0 },
    { id: '4', nome: 'WhatsApp', perc: 10, ticket: 140, invest: 300, cpv: 10, conv: 15, hasInvest: true, roas_esperado: 8 },
    { id: '5', nome: 'Shopee', perc: 10, ticket: 120, invest: 500, cpv: 15, conv: 3, hasInvest: true, roas_esperado: 4 },
    { id: '6', nome: 'Indicações/Recorrência', perc: 5, ticket: 180, invest: 0, cpv: 0, conv: 0, hasInvest: false, roas_esperado: 0 },
    { id: '7', nome: 'Eventos/Ações', perc: 5, ticket: 180, invest: 0, cpv: 0, conv: 0, hasInvest: false, roas_esperado: 0 },
  ],
  
  // Campos legados para compatibilidade
  canal_loja_fisica_perc: 30,
  canal_instagram_ads_perc: 25,
  canal_instagram_organico_perc: 15,
  canal_whatsapp_perc: 10,
  canal_shopee_perc: 10,
  canal_indicacoes_perc: 5,
  canal_eventos_perc: 5,
  invest_instagram_ads: 2000,
  invest_promocoes: 500,
  invest_whatsapp: 300,
  invest_shopee: 500,
  invest_influenciadores: 1000,
  invest_outros: 200,
  ticket_loja_fisica: 180,
  ticket_instagram_ads: 150,
  ticket_whatsapp: 140,
  ticket_shopee: 120,
  cpv_instagram_ads: 25,
  cpv_whatsapp: 10,
  cpv_shopee: 15,
  conv_instagram_ads: 2.5,
  conv_whatsapp: 15,
  conv_shopee: 3,
  conteudo_reels_ads: 10,
  conteudo_criativos_trafego: 5,
  conteudo_stories_dia: 15,
  conteudo_posts_semana: 5,
  conteudo_acoes_loja: 3,
  conteudo_whatsapp: 2,
  conteudo_shopee: 5,
};
