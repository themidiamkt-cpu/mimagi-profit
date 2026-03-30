import { useState } from 'react';
import { SectionCard } from '../SectionCard';
import { Compra, defaultCompra, CalendarioCompra, CategoriaCompra, CATEGORIAS_LABELS } from '@/types/compras';
import { formatCurrency } from '@/utils/formatters';
import { Plus, Trash2, Package, Calendar, Eye, Truck, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Props {
  compras: Compra[];
  saving: boolean;
  addCompra: (compra: Omit<Compra, 'id'>) => void;
  updateCompra: (id: string, updates: Partial<Compra>) => void;
  removeCompra: (id: string) => void;
  calcularCalendario: (compra: Compra) => CalendarioCompra;
  totalComprometido: number;
}

export function ComprasPagamentos({ compras, saving, addCompra, updateCompra, removeCompra, calcularCalendario, totalComprometido }: Props) {
  const [novaCompra, setNovaCompra] = useState<Omit<Compra, 'id'>>(defaultCompra);
  const [showForm, setShowForm] = useState(false);
  const [calendarioModal, setCalendarioModal] = useState<CalendarioCompra | null>(null);

  const handleAddCompra = () => {
    if (!novaCompra.estacao || !novaCompra.marca || novaCompra.valor_total <= 0) {
      return;
    }
    addCompra(novaCompra);
    setNovaCompra(defaultCompra);
    setShowForm(false);
  };

  const calcularInfoCompra = (compra: Compra) => {
    const mesesPrazo = Math.round(compra.prazo_pagamento / 30);
    const valorPorEntrega = compra.valor_total / compra.num_entregas;
    const valorPorParcela = valorPorEntrega / mesesPrazo;
    
    return {
      valorPorEntrega,
      valorPorParcela,
      mesesPrazo,
      totalParcelas: compra.num_entregas * mesesPrazo,
    };
  };

  const verificarConsistencia = (compra: typeof novaCompra) => {
    const avisos: string[] = [];
    const datasPreenchidas = [compra.data_entrega_1, compra.data_entrega_2, compra.data_entrega_3, compra.data_entrega_4]
      .slice(0, compra.num_entregas)
      .filter(Boolean).length;
    
    if (datasPreenchidas < compra.num_entregas) {
      avisos.push(`Faltam ${compra.num_entregas - datasPreenchidas} data(s) de entrega`);
    }

    if (compra.prazo_pagamento % 30 !== 0) {
      avisos.push(`Prazo ${compra.prazo_pagamento} dias não é múltiplo de 30 (será arredondado para ${Math.round(compra.prazo_pagamento / 30)} meses)`);
    }

    return avisos;
  };

  const abrirCalendario = (compra: Compra) => {
    const calendario = calcularCalendario(compra);
    setCalendarioModal(calendario);
  };

  const prazoNaoMultiplo30 = novaCompra.prazo_pagamento % 30 !== 0;

  return (
    <SectionCard title="Compras & Pagamentos" icon={<Package className="w-5 h-5" />}>
      {/* Resumo de compras */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="stat-block">
          <span className="stat-label">Total Comprometido</span>
          <span className="stat-value text-accent">{formatCurrency(totalComprometido)}</span>
        </div>
        <div className="stat-block">
          <span className="stat-label">Compras Cadastradas</span>
          <span className="stat-value">{compras.length}</span>
        </div>
        <div className="stat-block">
          <span className="stat-label">Prazo Padrão</span>
          <span className="stat-value">180 dias (6 meses)</span>
        </div>
      </div>

      {/* Botão adicionar */}
      {!showForm && (
        <Button
          onClick={() => setShowForm(true)}
          className="mb-6 bg-accent hover:bg-accent/90 text-accent-foreground"
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Compra
        </Button>
      )}

      {/* Formulário nova compra */}
      {showForm && (
        <div className="border border-border p-4 mb-6 bg-muted/30">
          <h4 className="text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2">
            <Package className="w-4 h-4" />
            Nova Compra
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
            <div>
              <label className="corporate-label">Estação</label>
              <input
                type="text"
                className="corporate-input text-left"
                placeholder="Ex: Verão 2026"
                value={novaCompra.estacao}
                onChange={(e) => setNovaCompra(prev => ({ ...prev, estacao: e.target.value }))}
              />
            </div>
            
            <div>
              <label className="corporate-label">Marca</label>
              <input
                type="text"
                className="corporate-input text-left"
                placeholder="Ex: Nini Bambini"
                value={novaCompra.marca}
                onChange={(e) => setNovaCompra(prev => ({ ...prev, marca: e.target.value }))}
              />
            </div>

            <div>
              <label className="corporate-label">Categoria</label>
              <Select
                value={novaCompra.categoria}
                onValueChange={(v) => setNovaCompra(prev => ({ ...prev, categoria: v as CategoriaCompra }))}
              >
                <SelectTrigger className="rounded-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORIAS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="corporate-label">Valor Total (R$)</label>
              <input
                type="number"
                className="corporate-input"
                value={novaCompra.valor_total || ''}
                onChange={(e) => setNovaCompra(prev => ({ ...prev, valor_total: Number(e.target.value) || 0 }))}
              />
            </div>
            
            <div>
              <label className="corporate-label">Nº Entregas</label>
              <Select
                value={String(novaCompra.num_entregas)}
                onValueChange={(v) => setNovaCompra(prev => ({ ...prev, num_entregas: Number(v) }))}
              >
                <SelectTrigger className="rounded-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Entrega</SelectItem>
                  <SelectItem value="2">2 Entregas</SelectItem>
                  <SelectItem value="3">3 Entregas</SelectItem>
                  <SelectItem value="4">4 Entregas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="corporate-label">Prazo (dias)</label>
              <input
                type="number"
                className="corporate-input"
                value={novaCompra.prazo_pagamento}
                onChange={(e) => setNovaCompra(prev => ({ ...prev, prazo_pagamento: Number(e.target.value) || 180 }))}
              />
              {prazoNaoMultiplo30 && (
                <span className="text-xs text-warning flex items-center gap-1 mt-1">
                  <AlertTriangle className="w-3 h-3" />
                  Arredondado para {Math.round(novaCompra.prazo_pagamento / 30)} meses
                </span>
              )}
            </div>
          </div>

          {/* Datas de entrega */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {[1, 2, 3, 4].slice(0, novaCompra.num_entregas).map((num) => (
              <div key={num}>
                <label className="corporate-label flex items-center gap-1">
                  <Truck className="w-3 h-3" />
                  Data Entrega {num}
                </label>
                <input
                  type="date"
                  className="corporate-input text-left"
                  value={novaCompra[`data_entrega_${num}` as keyof typeof novaCompra] as string || ''}
                  onChange={(e) => setNovaCompra(prev => ({ 
                    ...prev, 
                    [`data_entrega_${num}`]: e.target.value || null 
                  }))}
                />
              </div>
            ))}
          </div>

          {/* Avisos de consistência */}
          {verificarConsistencia(novaCompra).length > 0 && (
            <div className="bg-warning/10 border-l-4 border-warning p-3 mb-4">
              <div className="flex items-center gap-2 text-warning font-semibold text-sm mb-1">
                <AlertTriangle className="w-4 h-4" />
                Atenção
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                {verificarConsistencia(novaCompra).map((aviso, i) => (
                  <li key={i}>• {aviso}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Preview dos valores calculados */}
          {novaCompra.valor_total > 0 && novaCompra.num_entregas > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-3 bg-muted/50 border border-border">
              <div>
                <span className="text-xs text-muted-foreground uppercase">Valor/Entrega</span>
                <div className="font-mono text-lg">{formatCurrency(novaCompra.valor_total / novaCompra.num_entregas)}</div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground uppercase">Meses do Prazo</span>
                <div className="font-mono text-lg">{Math.round(novaCompra.prazo_pagamento / 30)}</div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground uppercase">Valor/Parcela</span>
                <div className="font-mono text-lg text-accent">
                  {formatCurrency((novaCompra.valor_total / novaCompra.num_entregas) / Math.round(novaCompra.prazo_pagamento / 30))}
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleAddCompra}
              disabled={saving || !novaCompra.estacao || !novaCompra.marca || novaCompra.valor_total <= 0}
              className="bg-success hover:bg-success/90 text-success-foreground"
            >
              Salvar Compra
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowForm(false);
                setNovaCompra(defaultCompra);
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Lista de compras */}
      {compras.length > 0 && (
        <div className="overflow-x-auto">
          <table className="corporate-table">
            <thead>
              <tr>
                <th>Estação</th>
                <th>Marca</th>
                <th>Categoria</th>
                <th>Valor Total</th>
                <th>Entregas</th>
                <th>Valor/Parcela</th>
                <th>Datas Entrega</th>
                <th className="w-24">Ações</th>
              </tr>
            </thead>
            <tbody>
              {compras.map((compra) => {
                const info = calcularInfoCompra(compra);
                const datas = [compra.data_entrega_1, compra.data_entrega_2, compra.data_entrega_3, compra.data_entrega_4]
                  .slice(0, compra.num_entregas)
                  .filter(Boolean);
                
                return (
                  <tr key={compra.id}>
                    <td className="font-medium">{compra.estacao}</td>
                    <td>{compra.marca}</td>
                    <td>
                      <span className="badge-primary">{CATEGORIAS_LABELS[compra.categoria]}</span>
                    </td>
                    <td className="font-mono">{formatCurrency(compra.valor_total)}</td>
                    <td className="text-center">{compra.num_entregas}</td>
                    <td className="font-mono text-accent">{formatCurrency(info.valorPorParcela)}</td>
                    <td className="text-sm">
                      {datas.map((d, i) => (
                        <span key={i} className="mr-2">
                          {d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}
                        </span>
                      ))}
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => abrirCalendario(compra)}
                          className="text-accent hover:text-accent hover:bg-accent/10"
                          title="Ver calendário de pagamentos"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeCompra(compra.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {compras.length === 0 && !showForm && (
        <div className="text-center py-8 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Nenhuma compra cadastrada.</p>
          <p className="text-sm">Clique em "Adicionar Compra" para começar.</p>
        </div>
      )}

      {/* Info sobre regras de pagamento */}
      <div className="mt-6 p-4 bg-muted/50 border border-border text-sm">
        <h5 className="font-semibold mb-2 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Regras de Pagamento
        </h5>
        <ul className="space-y-1 text-muted-foreground">
          <li>• Início do pagamento: 30 dias após cada entrega</li>
          <li>• Término do pagamento: início + prazo (ex: 180 dias = 6 parcelas mensais)</li>
          <li>• Número de parcelas por entrega = Prazo ÷ 30 dias</li>
          <li>• Valor por parcela = Valor da entrega ÷ número de meses</li>
          <li>• Parcelas posicionadas no dia 01 ou 15 conforme data de início</li>
        </ul>
      </div>

      {/* Modal Calendário */}
      <Dialog open={!!calendarioModal} onOpenChange={() => setCalendarioModal(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto rounded-none">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Calendário de Pagamentos - {calendarioModal?.marca} ({calendarioModal?.estacao})
            </DialogTitle>
          </DialogHeader>

          {calendarioModal && (
            <div className="space-y-6">
              {/* Resumo */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="stat-block">
                  <span className="stat-label">Valor Total</span>
                  <span className="stat-value">{formatCurrency(calendarioModal.valor_total)}</span>
                </div>
                <div className="stat-block">
                  <span className="stat-label">Valor/Entrega</span>
                  <span className="stat-value">{formatCurrency(calendarioModal.valor_por_entrega)}</span>
                </div>
                <div className="stat-block">
                  <span className="stat-label">Meses do Prazo</span>
                  <span className="stat-value">{calendarioModal.meses_prazo}</span>
                </div>
                <div className="stat-block">
                  <span className="stat-label">Valor/Parcela</span>
                  <span className="stat-value text-accent">{formatCurrency(calendarioModal.valor_por_parcela)}</span>
                </div>
              </div>

              {/* Entregas */}
              {calendarioModal.entregas.map((entrega) => (
                <div key={entrega.entrega_num} className="border border-border">
                  <div className="bg-muted p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4" />
                      <span className="font-semibold">Entrega {entrega.entrega_num}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {entrega.data_entrega.toLocaleDateString('pt-BR')} → Pagamento: {entrega.inicio_pagamento.toLocaleDateString('pt-BR')} a {entrega.fim_pagamento.toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="corporate-table">
                      <thead>
                        <tr>
                          <th>Parcela</th>
                          <th>Competência</th>
                          <th>Dia</th>
                          <th className="text-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entrega.parcelas.map((parcela, idx) => (
                          <tr key={idx}>
                            <td>{parcela.parcela_num}/{calendarioModal.meses_prazo}</td>
                            <td className="font-mono">{parcela.competencia_mes}</td>
                            <td>{parcela.data_referencia}</td>
                            <td className="text-right font-mono">{formatCurrency(parcela.valor)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-muted">
                          <td colSpan={3} className="font-semibold">Total Entrega {entrega.entrega_num}</td>
                          <td className="text-right font-mono font-semibold">
                            {formatCurrency(entrega.parcelas.reduce((sum, p) => sum + p.valor, 0))}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}
