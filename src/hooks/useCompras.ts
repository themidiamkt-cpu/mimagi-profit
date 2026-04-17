import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Compra, CategoriaCompra, ParcelaCalculada, FluxoCaixaMensal, ResumoExecutivo, CalendarioCompra } from '@/types/compras';
import { toast } from '@/hooks/use-toast';

export function useCompras(
  planejamentoId: string | null,
  custoFixoMensal: number,
  margem: number,
  faturamentoMensal: number,
  userId: string | null
) {
  const [compras, setCompras] = useState<Compra[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Carregar compras
  useEffect(() => {
    if (userId) {
      loadCompras();
    } else {
      setLoading(false);
    }
  }, [planejamentoId, userId]);

  const loadCompras = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      let query = supabase
        .from('compras')
        .select('*')
        .eq('user_id', userId);

      if (planejamentoId) {
        query = query.eq('planejamento_id', planejamentoId);
      }

      const { data, error } = await query.order('created_at', { ascending: true });

      if (error) throw error;

      if (data) {
        setCompras(data.map(c => ({
          id: c.id,
          planejamento_id: c.planejamento_id || undefined,
          estacao: c.estacao,
          marca: c.marca,
          categoria: (c.categoria as CategoriaCompra) || 'menina',
          valor_total: Number(c.valor_total) || 0,
          prazo_pagamento: c.prazo_pagamento || 180,
          num_entregas: c.num_entregas || 1,
          data_entrega_1: c.data_entrega_1,
          data_entrega_2: c.data_entrega_2,
          data_entrega_3: c.data_entrega_3,
          data_entrega_4: c.data_entrega_4,
          is_sapatos: !!c.is_sapatos,
          qtd_pecas: Number(c.qtd_pecas) || 0,
          created_at: c.created_at,
          updated_at: c.updated_at,
        })));
      }
    } catch (error) {
      console.error('Erro ao carregar compras:', error);
      toast({
        title: 'Erro ao carregar compras',
        description: 'Não foi possível carregar os dados de compras.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Adicionar compra
  const addCompra = useCallback(async (compra: Omit<Compra, 'id'>) => {
    if (!planejamentoId || !userId) {
      console.warn('PlanejamentoId ou UserId ausente para adicionar compra');
      return;
    }

    try {
      setSaving(true);
      const { data, error } = await supabase
        .from('compras')
        .insert({
          ...compra,
          planejamento_id: planejamentoId,
          user_id: userId,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const newCompra: Compra = {
          id: data.id,
          planejamento_id: data.planejamento_id || undefined,
          estacao: data.estacao,
          marca: data.marca,
          categoria: (data.categoria as CategoriaCompra) || 'menina',
          valor_total: Number(data.valor_total) || 0,
          prazo_pagamento: data.prazo_pagamento || 180,
          num_entregas: data.num_entregas || 1,
          data_entrega_1: data.data_entrega_1,
          data_entrega_2: data.data_entrega_2,
          data_entrega_3: data.data_entrega_3,
          data_entrega_4: data.data_entrega_4,
          is_sapatos: !!data.is_sapatos,
          qtd_pecas: Number(data.qtd_pecas) || 0,
          created_at: data.created_at,
          updated_at: data.updated_at,
        };
        setCompras(prev => [...prev, newCompra]);
        toast({
          title: 'Compra adicionada',
          description: 'A compra foi registrada com sucesso.',
        });
      }
    } catch (error: any) {
      console.error('Erro ao adicionar compra:', error);
      toast({
        title: 'Erro ao adicionar',
        description: error.message || 'Não foi possível registrar a compra.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }, [planejamentoId, userId]);

  // Atualizar compra
  const updateCompra = useCallback(async (id: string, updates: Partial<Compra>) => {
    if (!userId) return;
    try {
      setSaving(true);
      const { error } = await supabase
        .from('compras')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;

      setCompras(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    } catch (error: any) {
      console.error('Erro ao atualizar compra:', error);
      toast({
        title: 'Erro ao atualizar',
        description: error.message || 'Não foi possível atualizar a compra.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }, [userId]);

  // Remover compra
  const removeCompra = useCallback(async (id: string) => {
    if (!userId) return;
    try {
      setSaving(true);
      const { error } = await supabase
        .from('compras')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;

      setCompras(prev => prev.filter(c => c.id !== id));
      toast({
        title: 'Compra removida',
        description: 'A compra foi removida com sucesso.',
      });
    } catch (error: any) {
      console.error('Erro ao remover compra:', error);
      toast({
        title: 'Erro ao remover',
        description: error.message || 'Não foi possível remover a compra.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }, [userId]);

  // Calcular número de meses do prazo
  const calcularMesesPrazo = (prazoDias: number): number => {
    return Math.round(prazoDias / 30);
  };

  // Calcular parcelas para uma compra (modelo mensal)
  const calcularParcelas = (compra: Compra): ParcelaCalculada[] => {
    const parcelas: ParcelaCalculada[] = [];
    const entregas = [compra.data_entrega_1, compra.data_entrega_2, compra.data_entrega_3, compra.data_entrega_4]
      .slice(0, compra.num_entregas)
      .filter((d): d is string => d !== null);

    if (entregas.length === 0) return parcelas;

    const mesesPrazo = calcularMesesPrazo(compra.prazo_pagamento);
    const valorPorEntrega = compra.valor_total / compra.num_entregas;
    const valorPorParcela = valorPorEntrega / mesesPrazo;

    entregas.forEach((dataEntrega, entregaIndex) => {
      const dataBase = new Date(dataEntrega + 'T00:00:00');

      // Início do pagamento = entrega + 30 dias
      const inicioPagamento = new Date(dataBase);
      inicioPagamento.setDate(inicioPagamento.getDate() + 30);

      // Fim do pagamento = início + prazo
      const fimPagamento = new Date(inicioPagamento);
      fimPagamento.setDate(fimPagamento.getDate() + compra.prazo_pagamento);

      // Determinar se a 1ª parcela cai no dia 1 ou 15
      // Se INICIO cair entre dia 1 e 15 → parcela entra no dia 15
      // Se cair após dia 15 → parcela entra no dia 01 do mês seguinte
      let mesAtual = new Date(inicioPagamento);
      let dataReferenciaPrimeira: '01' | '15';

      if (inicioPagamento.getDate() <= 15) {
        dataReferenciaPrimeira = '15';
        mesAtual.setDate(15);
      } else {
        dataReferenciaPrimeira = '01';
        mesAtual.setMonth(mesAtual.getMonth() + 1);
        mesAtual.setDate(1);
      }

      // Gerar MESES_PRAZO parcelas mensais
      for (let i = 0; i < mesesPrazo; i++) {
        const competenciaMes = `${mesAtual.getFullYear()}-${String(mesAtual.getMonth() + 1).padStart(2, '0')}`;

        // Alternar entre 01 e 15 mensalmente
        const dataReferencia: '01' | '15' = i === 0
          ? dataReferenciaPrimeira
          : (i % 2 === 0 ? dataReferenciaPrimeira : (dataReferenciaPrimeira === '01' ? '15' : '01'));

        parcelas.push({
          compra_id: compra.id,
          marca: compra.marca,
          estacao: compra.estacao,
          entrega_num: entregaIndex + 1,
          parcela_num: i + 1,
          data_referencia: dataReferencia,
          competencia_mes: competenciaMes,
          valor: valorPorParcela,
          inicio_entrega: inicioPagamento,
          fim_entrega: fimPagamento,
        });

        // Avançar para o próximo mês
        mesAtual.setMonth(mesAtual.getMonth() + 1);
      }
    });

    return parcelas;
  };

  // Calcular calendário de pagamentos para uma compra
  const calcularCalendario = (compra: Compra): CalendarioCompra => {
    const mesesPrazo = calcularMesesPrazo(compra.prazo_pagamento);
    const valorPorEntrega = compra.valor_total / compra.num_entregas;
    const valorPorParcela = valorPorEntrega / mesesPrazo;

    const entregas = [compra.data_entrega_1, compra.data_entrega_2, compra.data_entrega_3, compra.data_entrega_4]
      .slice(0, compra.num_entregas)
      .filter((d): d is string => d !== null);

    const entregasCalendario = entregas.map((dataEntrega, index) => {
      const dataBase = new Date(dataEntrega + 'T00:00:00');
      const inicioPagamento = new Date(dataBase);
      inicioPagamento.setDate(inicioPagamento.getDate() + 30);
      const fimPagamento = new Date(inicioPagamento);
      fimPagamento.setDate(fimPagamento.getDate() + compra.prazo_pagamento);

      const parcelas = calcularParcelas(compra).filter(p => p.entrega_num === index + 1);

      return {
        entrega_num: index + 1,
        data_entrega: dataBase,
        inicio_pagamento: inicioPagamento,
        fim_pagamento: fimPagamento,
        parcelas,
      };
    });

    return {
      compra_id: compra.id,
      marca: compra.marca,
      estacao: compra.estacao,
      valor_total: compra.valor_total,
      num_entregas: compra.num_entregas,
      meses_prazo: mesesPrazo,
      valor_por_entrega: valorPorEntrega,
      valor_por_parcela: valorPorParcela,
      entregas: entregasCalendario,
    };
  };

  // Calcular fluxo de caixa mensal
  const calcularFluxoCaixa = useCallback((): FluxoCaixaMensal[] => {
    const fluxo: Map<string, FluxoCaixaMensal> = new Map();

    // Gerar meses de 2025 a 2027 (3 anos)
    const meses: string[] = [];
    for (let ano = 2025; ano <= 2027; ano++) {
      for (let mes = 1; mes <= 12; mes++) {
        meses.push(`${ano}-${String(mes).padStart(2, '0')}`);
      }
    }

    // Inicializar todos os meses
    meses.forEach(mes => {
      const [ano, mesNum] = mes.split('-').map(Number);
      const data = new Date(ano, mesNum - 1, 1);
      const mesDisplay = data.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });

      fluxo.set(mes, {
        mes,
        mes_display: mesDisplay.charAt(0).toUpperCase() + mesDisplay.slice(1),
        custo_compras: 0,
        custos_fixos: custoFixoMensal,
        total_saidas: custoFixoMensal,
        faturamento_necessario: 0,
        status: 'verde',
      });
    });

    // Somar parcelas por mês
    if (Array.isArray(compras)) {
      compras.forEach(compra => {
        const parcelas = calcularParcelas(compra);
        parcelas.forEach(parcela => {
          const mesData = fluxo.get(parcela.competencia_mes);
          if (mesData) {
            mesData.custo_compras += parcela.valor;
            mesData.total_saidas = mesData.custo_compras + mesData.custos_fixos;
          }
        });
      });
    }

    // Calcular faturamento necessário e status
    const margemContribuicao = margem > 0 ? (margem - 1) / margem : 0;

    fluxo.forEach((mesData) => {
      mesData.faturamento_necessario = margemContribuicao > 0
        ? mesData.total_saidas / margemContribuicao
        : 0;

      // Status baseado na comparação com faturamento planejado
      const ratio = faturamentoMensal > 0 ? mesData.faturamento_necessario / faturamentoMensal : 0;

      if (ratio <= 0.8) {
        mesData.status = 'verde';
      } else if (ratio <= 1.0) {
        mesData.status = 'amarelo';
      } else {
        mesData.status = 'vermelho';
      }
    });

    return Array.from(fluxo.values());
  }, [compras, custoFixoMensal, margem, faturamentoMensal]);

  // Calcular resumo executivo
  const calcularResumoExecutivo = useCallback((): ResumoExecutivo => {
    const fluxo = calcularFluxoCaixa();

    // Filtrar apenas meses com compras
    const mesesComCompras = fluxo.filter(m => m.custo_compras > 0);

    if (mesesComCompras.length === 0) {
      return {
        mes_maior_comprometimento: '-',
        valor_maximo_saida: 0,
        faturamento_planejado: faturamentoMensal,
        caixa_necessario_medio: custoFixoMensal,
        meses_criticos: [],
        alertas: [],
      };
    }

    // Encontrar mês de maior saída
    const mesMaiorSaida = mesesComCompras.reduce((prev, curr) =>
      curr.total_saidas > prev.total_saidas ? curr : prev,
      mesesComCompras[0]
    );

    // Identificar meses críticos (vermelho)
    const mesesCriticos = mesesComCompras
      .filter(m => m.status === 'vermelho')
      .map(m => m.mes_display);

    // Calcular média de caixa necessário
    const mediaTotal = mesesComCompras.reduce((sum, m) => sum + m.total_saidas, 0) / mesesComCompras.length;

    // Gerar alertas
    const alertas: string[] = [];

    if (mesesCriticos.length > 0) {
      alertas.push(`${mesesCriticos.length} mês(es) crítico(s) identificado(s)`);
    }

    if (mesMaiorSaida.total_saidas > faturamentoMensal) {
      alertas.push('Pico de caixa supera o faturamento planejado');
    }

    const totalCompras = Array.isArray(compras) ? compras.reduce((sum, c) => sum + Number(c.valor_total || 0), 0) : 0;
    if (totalCompras > faturamentoMensal * 6) {
      alertas.push('Volume de compras pode gerar risco de caixa');
    }

    return {
      mes_maior_comprometimento: mesMaiorSaida.mes_display,
      valor_maximo_saida: mesMaiorSaida.total_saidas,
      faturamento_planejado: faturamentoMensal,
      caixa_necessario_medio: mediaTotal,
      meses_criticos: mesesCriticos,
      alertas,
    };
  }, [calcularFluxoCaixa, faturamentoMensal, custoFixoMensal, compras]);

  // Calcular custo real mensal (para usar em outros componentes)
  const getCustoRealMensal = (mes: string): number => {
    const fluxo = calcularFluxoCaixa();
    const mesData = fluxo.find(f => f.mes === mes);
    return mesData ? mesData.total_saidas : custoFixoMensal;
  };

  // Obter total comprometido
  const getTotalComprometido = useCallback((): number => {
    if (!Array.isArray(compras)) return 0;
    return compras.reduce((sum, c) => sum + Number(c.valor_total || 0), 0);
  }, [compras]);

  return {
    compras,
    loading,
    saving,
    addCompra,
    updateCompra,
    removeCompra,
    calcularParcelas,
    calcularCalendario,
    calcularFluxoCaixa,
    calcularResumoExecutivo,
    getCustoRealMensal,
    getTotalComprometido,
    reload: loadCompras,
  };
}
