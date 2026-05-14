import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PlanejamentoFinanceiro, CalculatedValues, SimulationValues, Alert, defaultPlanejamento, CanalVenda, CustoExtra, CanaisVendaPorMes, createDefaultCanaisVenda, getCurrentMonthKey } from '@/types/financial';
import { toast } from '@/hooks/use-toast';

interface ParsedCanaisVenda {
  canaisVenda: CanalVenda[];
  canaisVendaPorMes: CanaisVendaPorMes;
  canaisVendaMesAtivo: string;
}

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const cloneCanaisVenda = (canais: CanalVenda[]) =>
  canais.map((canal) => ({ ...canal }));

const cloneCanaisVendaForNewMonth = (canais: CanalVenda[]) =>
  canais.map((canal) => ({
    ...canal,
    realizado_semana_1: 0,
    realizado_semana_2: 0,
    realizado_semana_3: 0,
    realizado_semana_4: 0,
  }));

export function usePlanejamento(userId: string | null) {
  const [data, setData] = useState<PlanejamentoFinanceiro>(defaultPlanejamento);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recordId, setRecordId] = useState<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Carregar último registro do usuário
  useEffect(() => {
    if (userId) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [userId]);

  const parseCanalList = (jsonData: unknown, faturamentoMensalPlanejado: number): CanalVenda[] => {
    if (!jsonData || !Array.isArray(jsonData)) {
      return cloneCanaisVenda(createDefaultCanaisVenda());
    }
    const usedIds = new Set<string>();

    return jsonData.map((item: Record<string, unknown>, index: number) => {
      const perc = Number(item.perc) || 0;
      const metaPadrao = (faturamentoMensalPlanejado * (perc / 100)) / 4;
      const rawId = String(item.id || `canal-${index + 1}`);
      let safeId = rawId;
      let duplicateIndex = 1;

      while (usedIds.has(safeId)) {
        safeId = `${rawId}-${duplicateIndex}`;
        duplicateIndex += 1;
      }

      usedIds.add(safeId);

      return {
        id: safeId,
        nome: String(item.nome || ''),
        perc,
        ticket: Number(item.ticket) || 0,
        meta_semanal: Number(item.meta_semanal) || metaPadrao,
        realizado_semana_1: Number(item.realizado_semana_1) || 0,
        realizado_semana_2: Number(item.realizado_semana_2) || 0,
        realizado_semana_3: Number(item.realizado_semana_3) || 0,
        realizado_semana_4: Number(item.realizado_semana_4) || 0,
        invest: Number(item.invest) || 0,
        cpv: Number(item.cpv) || 0,
        conv: Number(item.conv) || 0,
        hasInvest: Boolean(item.hasInvest),
        roas_esperado: Number(item.roas_esperado) || 0,
      };
    });
  };

  const ensureMonthChannels = (canaisPorMes: CanaisVendaPorMes, mes: string): CanaisVendaPorMes => {
    if (canaisPorMes[mes]) {
      return canaisPorMes;
    }

    const mesesOrdenados = Object.keys(canaisPorMes).sort();
    const ultimoMesComDados = mesesOrdenados[mesesOrdenados.length - 1];
    const canaisBase = ultimoMesComDados
      ? canaisPorMes[ultimoMesComDados]
      : createDefaultCanaisVenda();

    return {
      ...canaisPorMes,
      [mes]: cloneCanaisVendaForNewMonth(canaisBase),
    };
  };

  const parseCanaisVenda = (jsonData: unknown, faturamentoMensalPlanejado: number): ParsedCanaisVenda => {
    const mesAtual = getCurrentMonthKey();

    if (Array.isArray(jsonData)) {
      const canaisVenda = parseCanalList(jsonData, faturamentoMensalPlanejado);

      return {
        canaisVenda,
        canaisVendaMesAtivo: mesAtual,
        canaisVendaPorMes: {
          [mesAtual]: cloneCanaisVenda(canaisVenda),
        },
      };
    }

    if (!isObjectRecord(jsonData) || !isObjectRecord(jsonData.meses)) {
      const canaisVenda = cloneCanaisVenda(defaultPlanejamento.canais_venda);

      return {
        canaisVenda,
        canaisVendaMesAtivo: defaultPlanejamento.canais_venda_mes_ativo,
        canaisVendaPorMes: {
          ...defaultPlanejamento.canais_venda_por_mes,
        },
      };
    }

    const canaisPorMes = Object.entries(jsonData.meses).reduce<CanaisVendaPorMes>((acc, [mes, canaisMes]) => {
      if (Array.isArray(canaisMes)) {
        acc[mes] = parseCanalList(canaisMes, faturamentoMensalPlanejado);
      }

      return acc;
    }, {});

    const mesAtivoSalvo = typeof jsonData.mes_ativo === 'string' && jsonData.mes_ativo
      ? jsonData.mes_ativo
      : mesAtual;
    const canaisPorMesNormalizados = ensureMonthChannels(canaisPorMes, mesAtivoSalvo);
    const canaisVenda = cloneCanaisVenda(canaisPorMesNormalizados[mesAtivoSalvo]);

    return {
      canaisVenda,
      canaisVendaMesAtivo: mesAtivoSalvo,
      canaisVendaPorMes: canaisPorMesNormalizados,
    };
  };

  const parseCustosExtras = (jsonData: unknown): CustoExtra[] => {
    if (!jsonData || !Array.isArray(jsonData)) {
      return [];
    }
    return jsonData.map((item: Record<string, unknown>, index: number) => ({
      id: String(item.id || index + 1),
      nome: String(item.nome || ''),
      valor: Number(item.valor) || 0,
    }));
  };

  const loadData = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const { data: records, error } = await supabase
        .from('planejamentos_financeiros')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (records && records.length > 0) {
        const record = records[0];
        setRecordId(record.id);

        const investimentoCiclo =
          Number(record.investimento_ciclo) || defaultPlanejamento.investimento_ciclo;
        const margem = Number(record.margem) || defaultPlanejamento.margem;
        const faturamentoMensalPlanejado = (investimentoCiclo / 6) * margem;

        // Parse canais_venda and custos_extras from JSON
        const canaisVendaData = parseCanaisVenda(record.canais_venda, faturamentoMensalPlanejado);
        const custosExtras = parseCustosExtras(record.custos_extras);

        setData({
          investimento_ciclo: Number(record.investimento_ciclo) || defaultPlanejamento.investimento_ciclo,
          margem: Number(record.margem) || defaultPlanejamento.margem,
          faturamento_realizado: Number(record.faturamento_realizado) || 0,
          perc_menina: Number(record.perc_menina) || defaultPlanejamento.perc_menina,
          perc_menino: Number(record.perc_menino) || defaultPlanejamento.perc_menino,
          perc_bebe: Number(record.perc_bebe) || defaultPlanejamento.perc_bebe,
          perc_roupas: Number(record.perc_roupas) || defaultPlanejamento.perc_roupas,
          perc_sapatos: Number(record.perc_sapatos) || defaultPlanejamento.perc_sapatos,
          marca_menina_1_nome: record.marca_menina_1_nome || defaultPlanejamento.marca_menina_1_nome,
          marca_menina_1_perc: Number(record.marca_menina_1_perc) || defaultPlanejamento.marca_menina_1_perc,
          marca_menina_2_nome: record.marca_menina_2_nome || defaultPlanejamento.marca_menina_2_nome,
          marca_menina_2_perc: Number(record.marca_menina_2_perc) || defaultPlanejamento.marca_menina_2_perc,
          marca_menina_3_nome: record.marca_menina_3_nome || defaultPlanejamento.marca_menina_3_nome,
          marca_menina_3_perc: Number(record.marca_menina_3_perc) || defaultPlanejamento.marca_menina_3_perc,
          marca_menina_4_nome: record.marca_menina_4_nome || defaultPlanejamento.marca_menina_4_nome,
          marca_menina_4_perc: Number(record.marca_menina_4_perc) || defaultPlanejamento.marca_menina_4_perc,
          marca_menino_1_nome: record.marca_menino_1_nome || defaultPlanejamento.marca_menino_1_nome,
          marca_menino_1_perc: Number(record.marca_menino_1_perc) || defaultPlanejamento.marca_menino_1_perc,
          marca_menino_2_nome: record.marca_menino_2_nome || defaultPlanejamento.marca_menino_2_nome,
          marca_menino_2_perc: Number(record.marca_menino_2_perc) || defaultPlanejamento.marca_menino_2_perc,
          marca_menino_3_nome: record.marca_menino_3_nome || defaultPlanejamento.marca_menino_3_nome,
          marca_menino_3_perc: Number(record.marca_menino_3_perc) || defaultPlanejamento.marca_menino_3_perc,
          marca_menino_4_nome: record.marca_menino_4_nome || defaultPlanejamento.marca_menino_4_nome,
          marca_menino_4_perc: Number(record.marca_menino_4_perc) || defaultPlanejamento.marca_menino_4_perc,
          marca_bebe_1_nome: record.marca_bebe_1_nome || defaultPlanejamento.marca_bebe_1_nome,
          marca_bebe_1_perc: Number(record.marca_bebe_1_perc) || defaultPlanejamento.marca_bebe_1_perc,
          marca_bebe_2_nome: record.marca_bebe_2_nome || defaultPlanejamento.marca_bebe_2_nome,
          marca_bebe_2_perc: Number(record.marca_bebe_2_perc) || defaultPlanejamento.marca_bebe_2_perc,
          marca_bebe_3_nome: record.marca_bebe_3_nome || defaultPlanejamento.marca_bebe_3_nome,
          marca_bebe_3_perc: Number(record.marca_bebe_3_perc) || defaultPlanejamento.marca_bebe_3_perc,
          marca_bebe_4_nome: record.marca_bebe_4_nome || defaultPlanejamento.marca_bebe_4_nome,
          marca_bebe_4_perc: Number(record.marca_bebe_4_perc) || defaultPlanejamento.marca_bebe_4_perc,
          marca_sapato_1_nome: record.marca_sapato_1_nome || defaultPlanejamento.marca_sapato_1_nome,
          marca_sapato_1_perc: Number(record.marca_sapato_1_perc) || defaultPlanejamento.marca_sapato_1_perc,
          marca_sapato_2_nome: record.marca_sapato_2_nome || defaultPlanejamento.marca_sapato_2_nome,
          marca_sapato_2_perc: Number(record.marca_sapato_2_perc) || defaultPlanejamento.marca_sapato_2_perc,
          tipo_menina_vestidos: Number(record.tipo_menina_vestidos) || defaultPlanejamento.tipo_menina_vestidos,
          tipo_menina_conjuntos: Number(record.tipo_menina_conjuntos) || defaultPlanejamento.tipo_menina_conjuntos,
          tipo_menina_casual: Number(record.tipo_menina_casual) || defaultPlanejamento.tipo_menina_casual,
          tipo_menina_basicos: Number(record.tipo_menina_basicos) || defaultPlanejamento.tipo_menina_basicos,
          tipo_menino_conjuntos: Number(record.tipo_menino_conjuntos) || defaultPlanejamento.tipo_menino_conjuntos,
          tipo_menino_casual: Number(record.tipo_menino_casual) || defaultPlanejamento.tipo_menino_casual,
          tipo_menino_basicos: Number(record.tipo_menino_basicos) || defaultPlanejamento.tipo_menino_basicos,
          tipo_bebe_conjuntos: Number(record.tipo_bebe_conjuntos) || defaultPlanejamento.tipo_bebe_conjuntos,
          tipo_bebe_casual: Number(record.tipo_bebe_casual) || defaultPlanejamento.tipo_bebe_casual,
          tipo_bebe_basicos: Number(record.tipo_bebe_basicos) || defaultPlanejamento.tipo_bebe_basicos,
          tm_menina: Number(record.tm_menina) || defaultPlanejamento.tm_menina,
          tm_menino: Number(record.tm_menino) || defaultPlanejamento.tm_menino,
          tm_bebe: Number(record.tm_bebe) || defaultPlanejamento.tm_bebe,
          custo_aluguel: Number(record.custo_aluguel) || defaultPlanejamento.custo_aluguel,
          custo_salarios: Number(record.custo_salarios) || defaultPlanejamento.custo_salarios,
          custo_encargos: Number(record.custo_encargos) || defaultPlanejamento.custo_encargos,
          custo_agua_luz: Number(record.custo_agua_luz) || defaultPlanejamento.custo_agua_luz,
          custo_internet: Number(record.custo_internet) || defaultPlanejamento.custo_internet,
          custo_contador: Number(record.custo_contador) || defaultPlanejamento.custo_contador,
          custo_embalagens: Number(record.custo_embalagens) || defaultPlanejamento.custo_embalagens,
          custo_sistema: Number(record.custo_sistema) || defaultPlanejamento.custo_sistema,
          custo_marketing: Number(record.custo_marketing) || defaultPlanejamento.custo_marketing,
          custo_outros: Number(record.custo_outros) || defaultPlanejamento.custo_outros,
          // Custos extras dinâmicos
          custos_extras: custosExtras,
          // Seção 13: Canais de Venda Dinâmicos
          canais_venda: canaisVendaData.canaisVenda,
          canais_venda_mes_ativo: canaisVendaData.canaisVendaMesAtivo,
          canais_venda_por_mes: canaisVendaData.canaisVendaPorMes,
          // Campos legados
          canal_loja_fisica_perc: Number(record.canal_loja_fisica_perc) ?? defaultPlanejamento.canal_loja_fisica_perc,
          canal_instagram_ads_perc: Number(record.canal_instagram_ads_perc) ?? defaultPlanejamento.canal_instagram_ads_perc,
          canal_instagram_organico_perc: Number(record.canal_instagram_organico_perc) ?? defaultPlanejamento.canal_instagram_organico_perc,
          canal_whatsapp_perc: Number(record.canal_whatsapp_perc) ?? defaultPlanejamento.canal_whatsapp_perc,
          canal_shopee_perc: Number(record.canal_shopee_perc) ?? defaultPlanejamento.canal_shopee_perc,
          canal_indicacoes_perc: Number(record.canal_indicacoes_perc) ?? defaultPlanejamento.canal_indicacoes_perc,
          canal_eventos_perc: Number(record.canal_eventos_perc) ?? defaultPlanejamento.canal_eventos_perc,
          invest_instagram_ads: Number(record.invest_instagram_ads) ?? defaultPlanejamento.invest_instagram_ads,
          invest_promocoes: Number(record.invest_promocoes) ?? defaultPlanejamento.invest_promocoes,
          invest_whatsapp: Number(record.invest_whatsapp) ?? defaultPlanejamento.invest_whatsapp,
          invest_shopee: Number(record.invest_shopee) ?? defaultPlanejamento.invest_shopee,
          invest_influenciadores: Number(record.invest_influenciadores) ?? defaultPlanejamento.invest_influenciadores,
          invest_outros: Number(record.invest_outros) ?? defaultPlanejamento.invest_outros,
          ticket_loja_fisica: Number(record.ticket_loja_fisica) ?? defaultPlanejamento.ticket_loja_fisica,
          ticket_instagram_ads: Number(record.ticket_instagram_ads) ?? defaultPlanejamento.ticket_instagram_ads,
          ticket_whatsapp: Number(record.ticket_whatsapp) ?? defaultPlanejamento.ticket_whatsapp,
          ticket_shopee: Number(record.ticket_shopee) ?? defaultPlanejamento.ticket_shopee,
          cpv_instagram_ads: Number(record.cpv_instagram_ads) ?? defaultPlanejamento.cpv_instagram_ads,
          cpv_whatsapp: Number(record.cpv_whatsapp) ?? defaultPlanejamento.cpv_whatsapp,
          cpv_shopee: Number(record.cpv_shopee) ?? defaultPlanejamento.cpv_shopee,
          conv_instagram_ads: Number(record.conv_instagram_ads) ?? defaultPlanejamento.conv_instagram_ads,
          conv_whatsapp: Number(record.conv_whatsapp) ?? defaultPlanejamento.conv_whatsapp,
          conv_shopee: Number(record.conv_shopee) ?? defaultPlanejamento.conv_shopee,
          conteudo_reels_ads: Number(record.conteudo_reels_ads) ?? defaultPlanejamento.conteudo_reels_ads,
          conteudo_criativos_trafego: Number(record.conteudo_criativos_trafego) ?? defaultPlanejamento.conteudo_criativos_trafego,
          conteudo_stories_dia: Number(record.conteudo_stories_dia) ?? defaultPlanejamento.conteudo_stories_dia,
          conteudo_posts_semana: Number(record.conteudo_posts_semana) ?? defaultPlanejamento.conteudo_posts_semana,
          conteudo_acoes_loja: Number(record.conteudo_acoes_loja) ?? defaultPlanejamento.conteudo_acoes_loja,
          conteudo_whatsapp: Number(record.conteudo_whatsapp) ?? defaultPlanejamento.conteudo_whatsapp,
          conteudo_shopee: Number(record.conteudo_shopee) ?? defaultPlanejamento.conteudo_shopee,
        });
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: 'Erro ao carregar dados',
        description: 'Usando valores padrão.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveData = useCallback(async (newData: PlanejamentoFinanceiro) => {
    if (!userId) return;

    try {
      setSaving(true);

      const restData = { ...newData } as Record<string, unknown>;
      delete restData.canais_venda;
      delete restData.canais_venda_mes_ativo;
      delete restData.canais_venda_por_mes;

      // Prepare data for Supabase - keep monthly channel snapshots inside the same JSON field
      const dbData = {
        ...restData,
        canais_venda: {
          mes_ativo: newData.canais_venda_mes_ativo,
          meses: JSON.parse(JSON.stringify(newData.canais_venda_por_mes)),
        },
        custos_extras: JSON.parse(JSON.stringify(newData.custos_extras)),
        user_id: userId,
      };

      if (recordId) {
        // Atualizar registro existente
        const { error } = await supabase
          .from('planejamentos_financeiros')
          .update(dbData)
          .eq('id', recordId);

        if (error) throw error;
      } else {
        // Criar novo registro
        const { data: result, error } = await supabase
          .from('planejamentos_financeiros')
          .insert(dbData)
          .select()
          .single();

        if (error) throw error;
        if (result) setRecordId(result.id);
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar os dados.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }, [recordId, userId]);


  // Autosave com delay de 2s
  const updateField = useCallback(<K extends keyof PlanejamentoFinanceiro>(
    field: K,
    value: PlanejamentoFinanceiro[K]
  ) => {
    setData(prev => {
      const newData = {
        ...prev,
        [field]: value,
      } as PlanejamentoFinanceiro;

      if (field === 'canais_venda') {
        newData.canais_venda = cloneCanaisVenda(value as CanalVenda[]);
        newData.canais_venda_por_mes = {
          ...prev.canais_venda_por_mes,
          [prev.canais_venda_mes_ativo]: cloneCanaisVenda(value as CanalVenda[]),
        };
      }

      return newData;
    });
  }, []);

  // Efeito para autosave
  useEffect(() => {
    if (loading || !userId) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveData(data);
    }, 2000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [data, saveData, userId, loading]);

  const setCanaisMesAtivo = useCallback((mes: string) => {
    setData(prev => {
      const canaisPorMes = prev.canais_venda_por_mes[mes]
        ? prev.canais_venda_por_mes
        : {
          ...prev.canais_venda_por_mes,
          [mes]: cloneCanaisVendaForNewMonth(
            prev.canais_venda.length > 0 ? prev.canais_venda : createDefaultCanaisVenda()
          ),
        };
      const newData: PlanejamentoFinanceiro = {
        ...prev,
        canais_venda_mes_ativo: mes,
        canais_venda_por_mes: canaisPorMes,
        canais_venda: cloneCanaisVenda(canaisPorMes[mes]),
      };

      return newData;
    });
  }, []);

  // Cálculos automáticos
  const calculated: CalculatedValues = {
    investimento_mensal: data.investimento_ciclo / 6,
    faturamento_mensal: (data.investimento_ciclo / 6) * data.margem,
    faturamento_ciclo: data.investimento_ciclo * data.margem,

    investimento_menina: (data.investimento_ciclo / 6) * (data.perc_menina / 100),
    investimento_menino: (data.investimento_ciclo / 6) * (data.perc_menino / 100),
    investimento_bebe: (data.investimento_ciclo / 6) * (data.perc_bebe / 100),

    faturamento_menina: ((data.investimento_ciclo / 6) * data.margem) * (data.perc_menina / 100),
    faturamento_menino: ((data.investimento_ciclo / 6) * data.margem) * (data.perc_menino / 100),
    faturamento_bebe: ((data.investimento_ciclo / 6) * data.margem) * (data.perc_bebe / 100),

    investimento_roupas: (data.investimento_ciclo / 6) * (data.perc_roupas / 100),
    investimento_sapatos: (data.investimento_ciclo / 6) * (data.perc_sapatos / 100),
    faturamento_roupas: ((data.investimento_ciclo / 6) * data.margem) * (data.perc_roupas / 100),
    faturamento_sapatos: ((data.investimento_ciclo / 6) * data.margem) * (data.perc_sapatos / 100),

    qtd_pecas_menina: Math.round((((data.investimento_ciclo / 6) * data.margem) * (data.perc_menina / 100)) / data.tm_menina),
    qtd_pecas_menino: Math.round((((data.investimento_ciclo / 6) * data.margem) * (data.perc_menino / 100)) / data.tm_menino),
    qtd_pecas_bebe: Math.round((((data.investimento_ciclo / 6) * data.margem) * (data.perc_bebe / 100)) / data.tm_bebe),
    qtd_pecas_total: 0, // Calculado abaixo

    custo_fixo_mensal: data.custo_aluguel + data.custo_salarios + data.custo_encargos +
      data.custo_agua_luz + data.custo_internet + data.custo_contador +
      data.custo_embalagens + data.custo_sistema + data.custo_marketing + data.custo_outros +
      data.custos_extras.reduce((sum, c) => sum + c.valor, 0),
    custo_fixo_ciclo: 0, // Calculado abaixo
    custo_produtos: data.investimento_ciclo / 6,

    lucro_bruto: 0, // Calculado abaixo
    lucro_liquido: 0, // Calculado abaixo
    margem_lucro: 0, // Calculado abaixo

    faturamento_minimo_mensal: 0, // Calculado abaixo
    pecas_minimas_mensal: 0, // Calculado abaixo
  };

  // Cálculos dependentes
  calculated.qtd_pecas_total = calculated.qtd_pecas_menina + calculated.qtd_pecas_menino + calculated.qtd_pecas_bebe;
  calculated.custo_fixo_ciclo = calculated.custo_fixo_mensal * 6;
  calculated.lucro_bruto = calculated.faturamento_mensal - calculated.custo_produtos;
  calculated.lucro_liquido = calculated.lucro_bruto - calculated.custo_fixo_mensal;
  calculated.margem_lucro = calculated.faturamento_mensal > 0 ? (calculated.lucro_liquido / calculated.faturamento_mensal) * 100 : 0;

  // Ponto de equilíbrio
  const ticket_medio_geral = (data.tm_menina * (data.perc_menina / 100)) +
    (data.tm_menino * (data.perc_menino / 100)) +
    (data.tm_bebe * (data.perc_bebe / 100));
  const margem_contribuicao = data.margem > 0 ? (data.margem - 1) / data.margem : 0;
  calculated.faturamento_minimo_mensal = margem_contribuicao > 0 ? calculated.custo_fixo_mensal / margem_contribuicao : 0;
  calculated.pecas_minimas_mensal = ticket_medio_geral > 0 ? Math.ceil(calculated.faturamento_minimo_mensal / ticket_medio_geral) : 0;

  // Alertas automáticos
  const alerts: Alert[] = [];

  if (calculated.lucro_liquido < 0) {
    alerts.push({ type: 'danger', message: 'ATENÇÃO: Lucro líquido negativo! Revise seus custos ou aumente o faturamento.' });
  }

  if (calculated.margem_lucro > 0 && calculated.margem_lucro < 10) {
    alerts.push({ type: 'warning', message: 'Margem de lucro baixa (abaixo de 10%). Considere revisar preços ou custos.' });
  }

  if (calculated.custo_fixo_mensal > calculated.faturamento_mensal * 0.4) {
    alerts.push({ type: 'warning', message: 'Custos fixos representam mais de 40% do faturamento. Considere otimizar.' });
  }

  // Validações de soma
  const somaPublico = data.perc_menina + data.perc_menino + data.perc_bebe;
  if (Math.abs(somaPublico - 100) > 0.01) {
    alerts.push({ type: 'info', message: `Distribuição por público soma ${somaPublico}%. Deve somar 100%.` });
  }


  // Função para simulação
  const calculateSimulation = (faturamento_desejado: number): SimulationValues => {
    const faturamento_ciclo_desejado = faturamento_desejado * 6;
    const investimento_mensal_necessario = faturamento_desejado / data.margem;
    const investimento_ciclo_necessario = investimento_mensal_necessario * 6;
    const delta_investimento_mensal = investimento_mensal_necessario - calculated.investimento_mensal;
    const delta_investimento_ciclo = investimento_ciclo_necessario - data.investimento_ciclo;
    const qtd_minima_pecas = Math.ceil(faturamento_desejado / ticket_medio_geral);

    return {
      faturamento_mensal_desejado: faturamento_desejado,
      faturamento_ciclo_desejado,
      investimento_mensal_necessario,
      investimento_ciclo_necessario,
      delta_investimento_mensal,
      delta_investimento_ciclo,
      qtd_minima_pecas,
    };
  };

  return {
    data,
    calculated,
    alerts,
    loading,
    saving,
    updateField,
    setCanaisMesAtivo,
    calculateSimulation,
    ticket_medio_geral,
    recordId,
  };
}
