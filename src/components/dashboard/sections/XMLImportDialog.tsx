import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, FileText, Check, AlertCircle, X, ChevronRight, Package } from 'lucide-react';
import { parseNfeXml, ParsedNfe } from '@/utils/xmlParser';
import { formatCurrency } from '@/utils/formatters';
import { Compra, defaultCompra } from '@/types/compras';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (compra: Omit<Compra, 'id'>) => void;
}

export function XMLImportDialog({ open, onOpenChange, onConfirm }: Props) {
    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<ParsedNfe | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [estacao, setEstacao] = useState(`Inverno ${new Date().getFullYear()}`);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        if (!selectedFile.name.toLowerCase().endsWith('.xml')) {
            setError('Por favor, selecione um arquivo XML válido.');
            return;
        }

        setFile(selectedFile);
        setError(null);

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const xmlString = event.target?.result as string;
                const data = parseNfeXml(xmlString);

                if (!data.marca || data.valorTotal === 0) {
                    throw new Error('Não foi possível extrair os dados básicos desta nota.');
                }

                setParsedData(data);
            } catch (err: any) {
                setError(err.message || 'Erro ao processar o arquivo XML.');
                setParsedData(null);
            }
        };
        reader.readAsText(selectedFile);
    };

    const handleConfirm = () => {
        if (!parsedData) return;

        // Converte os dados da NFe para o formato da tabela Compras
        const novaCompra: Omit<Compra, 'id'> = {
            ...defaultCompra,
            estacao: estacao,
            marca: parsedData.marca,
            valor_total: parsedData.valorTotal,
            prazo_pagamento: parsedData.prazoEstimado,
            num_entregas: 1, // Geralmente NFe é uma entrega única
            data_entrega_1: parsedData.dataEmissao, // Usa emissão como base
            categoria: 'menina', // Default
            qtd_pecas: parsedData.qtdPecas,
        };

        onConfirm(novaCompra);
        reset();
    };

    const reset = () => {
        setFile(null);
        setParsedData(null);
        setError(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl rounded-none">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Upload className="w-5 h-5 text-accent" />
                        Importar Compra via XML (NFe)
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 pt-4">
                    {!file ? (
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-border p-12 text-center hover:bg-muted/50 cursor-pointer transition-colors group"
                        >
                            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground group-hover:text-accent transition-colors" />
                            <p className="text-sm font-medium">Clique ou arraste o arquivo XML da NFe aqui</p>
                            <p className="text-xs text-muted-foreground mt-2">Apenas arquivos .xml são aceitos</p>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                className="hidden"
                                accept=".xml"
                            />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-muted border border-border">
                                <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-accent" />
                                    <span className="text-sm font-medium truncate max-w-[300px]">{file.name}</span>
                                </div>
                                <button onClick={() => { setFile(null); setParsedData(null); }} className="text-muted-foreground hover:text-destructive">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {parsedData && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                        <div className="p-3 bg-background border border-border">
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Marca Extraída</p>
                                            <p className="text-sm font-bold truncate">{parsedData.marca}</p>
                                        </div>
                                        <div className="p-3 bg-background border border-border">
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Valor Total</p>
                                            <p className="text-sm font-bold text-primary">{formatCurrency(parsedData.valorTotal)}</p>
                                        </div>
                                        <div className="p-3 bg-background border border-border">
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Total Peças</p>
                                            <p className="text-sm font-bold">{parsedData.qtdPecas}</p>
                                        </div>
                                        <div className="p-3 bg-background border border-border">
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Data Emissão</p>
                                            <p className="text-sm font-bold">{new Date(parsedData.dataEmissao + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                                        </div>
                                        <div className="p-3 bg-background border border-border col-span-2">
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Estação de Destino</p>
                                            <input
                                                className="w-full bg-transparent border-none p-0 text-sm font-bold focus:ring-0"
                                                value={estacao}
                                                onChange={(e) => setEstacao(e.target.value)}
                                                placeholder="Ex: Inverno 2026"
                                            />
                                        </div>
                                    </div>

                                    {parsedData.parcelas.length > 0 && (
                                        <div className="border border-border">
                                            <div className="bg-muted px-3 py-2 text-[10px] font-bold uppercase tracking-wider border-b flex items-center gap-2">
                                                <ChevronRight className="w-3 h-3" />
                                                Detalhamento de Parcelas (Arquivo)
                                            </div>
                                            <div className="max-h-32 overflow-y-auto">
                                                <table className="w-full text-[11px]">
                                                    <thead className="bg-muted/30">
                                                        <tr className="text-left text-muted-foreground">
                                                            <th className="p-2">Nº</th>
                                                            <th className="p-2">Vencimento</th>
                                                            <th className="p-2 text-right">Valor</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y border-t">
                                                        {parsedData.parcelas.map((par, i) => (
                                                            <tr key={i}>
                                                                <td className="p-2">{par.numero || i + 1}</td>
                                                                <td className="p-2">{new Date(par.vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                                                                <td className="p-2 text-right font-mono">{formatCurrency(par.valor)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    <div className="bg-accent/10 border-l-4 border-accent p-3 flex items-start gap-3">
                                        <Package className="w-5 h-5 text-accent mt-0.5" />
                                        <div className="text-xs">
                                            <p className="font-bold text-accent mb-1 uppercase tracking-wider">Aviso de Importação</p>
                                            <p className="text-muted-foreground leading-relaxed">
                                                A compra será cadastrada como **1 única entrega** na data de emissão da nota.
                                                As parcelas do sistema serão recalculadas com base no prazo de **{parsedData.prazoEstimado} dias** para manter a consistência do fluxo de caixa planejado.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {error && (
                        <div className="bg-destructive/10 border-l-4 border-destructive p-3 flex items-center gap-3">
                            <AlertCircle className="w-5 h-5 text-destructive" />
                            <p className="text-xs text-destructive font-medium">{error}</p>
                        </div>
                    )}

                    <div className="flex gap-2 justify-end pt-4 border-t">
                        <Button variant="outline" onClick={reset}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleConfirm}
                            disabled={!parsedData}
                            className="bg-accent hover:bg-accent/90 text-accent-foreground"
                        >
                            <Check className="w-4 h-4 mr-2" />
                            Confirmar Importação
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
