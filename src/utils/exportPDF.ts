import jsPDF from 'jspdf';
import { PlanejamentoFinanceiro, CalculatedValues, SimulationValues } from '@/types/financial';
import { formatCurrency, formatPercent, formatNumber } from './formatters';

export function exportToPDF(
  data: PlanejamentoFinanceiro,
  calculated: CalculatedValues,
  simulation: SimulationValues
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Header
  doc.setFillColor(10, 37, 64);
  doc.rect(0, 0, pageWidth, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('MIMAGI PROFIT PLANNER', pageWidth / 2, 18, { align: 'center' });
  
  doc.setTextColor(0, 0, 0);
  y = 45;

  // Seção 1
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('1. VARIÁVEIS PRINCIPAIS', 14, y);
  y += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Investimento Ciclo: ${formatCurrency(data.investimento_ciclo)}`, 14, y);
  doc.text(`Margem: ${data.margem}x`, 100, y);
  y += 6;
  doc.text(`Investimento Mensal: ${formatCurrency(calculated.investimento_mensal)}`, 14, y);
  doc.text(`Faturamento Mensal: ${formatCurrency(calculated.faturamento_mensal)}`, 100, y);
  y += 6;
  doc.text(`Faturamento Ciclo: ${formatCurrency(calculated.faturamento_ciclo)}`, 14, y);
  y += 12;

  // Seção 2
  doc.setFont('helvetica', 'bold');
  doc.text('2. DISTRIBUIÇÃO POR PÚBLICO', 14, y);
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.text(`Menina: ${formatPercent(data.perc_menina)} | Menino: ${formatPercent(data.perc_menino)} | Bebê: ${formatPercent(data.perc_bebe)}`, 14, y);
  y += 12;

  // Seção 3
  doc.setFont('helvetica', 'bold');
  doc.text('3. ROUPAS X SAPATOS', 14, y);
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.text(`Roupas: ${formatPercent(data.perc_roupas)} | Sapatos: ${formatPercent(data.perc_sapatos)}`, 14, y);
  y += 12;

  // Seção 6
  doc.setFont('helvetica', 'bold');
  doc.text('6. TICKET MÉDIO E QUANTIDADE', 14, y);
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.text(`TM Menina: ${formatCurrency(data.tm_menina)} | TM Menino: ${formatCurrency(data.tm_menino)} | TM Bebê: ${formatCurrency(data.tm_bebe)}`, 14, y);
  y += 6;
  doc.text(`Total Peças/Mês: ${formatNumber(calculated.qtd_pecas_total)}`, 14, y);
  y += 12;

  // Seção 7
  doc.setFont('helvetica', 'bold');
  doc.text('7. CUSTOS FIXOS', 14, y);
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Mensal: ${formatCurrency(calculated.custo_fixo_mensal)} | Total Ciclo: ${formatCurrency(calculated.custo_fixo_ciclo)}`, 14, y);
  y += 12;

  // Seção 8
  doc.setFont('helvetica', 'bold');
  doc.text('8. RESULTADO', 14, y);
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.text(`Lucro Bruto: ${formatCurrency(calculated.lucro_bruto)}`, 14, y);
  doc.text(`Lucro Líquido: ${formatCurrency(calculated.lucro_liquido)}`, 100, y);
  y += 6;
  doc.text(`Margem: ${formatPercent(calculated.margem_lucro)}`, 14, y);
  y += 12;

  // Seção 9
  doc.setFont('helvetica', 'bold');
  doc.text('9. PONTO DE EQUILÍBRIO', 14, y);
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.text(`Faturamento Mínimo: ${formatCurrency(calculated.faturamento_minimo_mensal)}/mês`, 14, y);
  y += 6;
  doc.text(`Peças Mínimas: ${formatNumber(calculated.pecas_minimas_mensal)}/mês`, 14, y);
  y += 12;

  // Seção 12
  doc.setFont('helvetica', 'bold');
  doc.text('12. SIMULAÇÃO', 14, y);
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.text(`Faturamento Desejado: ${formatCurrency(simulation.faturamento_mensal_desejado)}/mês`, 14, y);
  y += 6;
  doc.text(`Investimento Necessário: ${formatCurrency(simulation.investimento_mensal_necessario)}/mês`, 14, y);
  y += 6;
  doc.text(`Peças Necessárias: ${formatNumber(simulation.qtd_minima_pecas)}/mês`, 14, y);

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pageWidth / 2, 285, { align: 'center' });

  doc.save('mimagi-profit-planner.pdf');
}
