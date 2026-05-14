// Tipo de categoria/público-alvo
export type CategoriaCompra = 'menina' | 'menino' | 'bebe' | 'sapatos';

// Interface para compra/pedido
export interface Compra {
  id: string;
  planejamento_id?: string;
  estacao: string;
  marca: string;
  categoria: CategoriaCompra; // menina, menino, bebe, sapatos
  valor_total: number;
  prazo_pagamento: number; // dias (default 180)
  num_entregas: number; // 1 a 4
  data_entrega_1: string | null;
  data_entrega_2: string | null;
  data_entrega_3: string | null;
  data_entrega_4: string | null;
  is_sapatos: boolean;
  qtd_pecas: number;
  chave_nfe?: string | null;
  created_at?: string;
  updated_at?: string;
}

// Interface para parcela calculada
export interface ParcelaCalculada {
  compra_id: string;
  marca: string;
  estacao: string;
  entrega_num: number;
  parcela_num: number;
  data_referencia: '01' | '15'; // dia do mês da parcela
  competencia_mes: string; // formato "YYYY-MM"
  valor: number;
  inicio_entrega: Date;
  fim_entrega: Date;
}

// Interface para calendário de pagamentos (agrupado por compra)
export interface CalendarioCompra {
  compra_id: string;
  marca: string;
  estacao: string;
  valor_total: number;
  num_entregas: number;
  meses_prazo: number;
  valor_por_entrega: number;
  valor_por_parcela: number;
  entregas: {
    entrega_num: number;
    data_entrega: Date;
    inicio_pagamento: Date;
    fim_pagamento: Date;
    parcelas: ParcelaCalculada[];
  }[];
}

// Interface para fluxo de caixa mensal
export interface FluxoCaixaMensal {
  mes: string; // formato "YYYY-MM"
  mes_display: string; // formato "Jan/2026"
  custo_compras: number;
  custos_fixos: number;
  total_saidas: number;
  faturamento_necessario: number;
  status: 'verde' | 'amarelo' | 'vermelho';
}

// Interface para resumo executivo
export interface ResumoExecutivo {
  mes_maior_comprometimento: string;
  valor_maximo_saida: number;
  faturamento_planejado: number;
  caixa_necessario_medio: number;
  meses_criticos: string[];
  alertas: string[];
}

export const defaultCompra: Omit<Compra, 'id'> = {
  estacao: '',
  marca: '',
  categoria: 'menina',
  valor_total: 0,
  prazo_pagamento: 180,
  num_entregas: 1,
  data_entrega_4: null,
  is_sapatos: false,
  qtd_pecas: 0,
};

export const CATEGORIAS_LABELS: Record<CategoriaCompra, string> = {
  menina: 'Menina',
  menino: 'Menino',
  bebe: 'Bebê',
  sapatos: 'Sapatos',
};
