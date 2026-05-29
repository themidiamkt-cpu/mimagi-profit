import React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { DateRange } from "react-day-picker";
import {
    addDaysToDateString,
    dateStringToLocalNoon,
    dateToLocalDateString,
    endOfMonthDateString,
    endOfWeekDateString,
    getSaoPauloDateString,
    startOfMonthDateString,
    startOfWeekDateString,
} from "@/utils/saoPauloDate";

interface AdvancedDatePickerProps {
    dateStart: string;
    dateEnd: string;
    onRangeSelect: (start: string, end: string, label: string, compare?: boolean) => void;
    label?: string;
    compare?: boolean;
}

const presets = [
    { label: "Hoje", getValue: () => {
        const today = getSaoPauloDateString();
        return { start: today, end: today };
    } },
    { label: "Ontem", getValue: () => {
        const yesterday = addDaysToDateString(getSaoPauloDateString(), -1);
        return { start: yesterday, end: yesterday };
    } },
    { label: "Hoje e ontem", getValue: () => {
        const today = getSaoPauloDateString();
        return { start: addDaysToDateString(today, -1), end: today };
    } },
    { label: "Últimos 7 dias", getValue: () => {
        const today = getSaoPauloDateString();
        return { start: addDaysToDateString(today, -7), end: today };
    } },
    { label: "Últimos 14 dias", getValue: () => {
        const today = getSaoPauloDateString();
        return { start: addDaysToDateString(today, -14), end: today };
    } },
    { label: "Últimos 28 dias", getValue: () => {
        const today = getSaoPauloDateString();
        return { start: addDaysToDateString(today, -28), end: today };
    } },
    { label: "Últimos 30 dias", getValue: () => {
        const today = getSaoPauloDateString();
        return { start: addDaysToDateString(today, -30), end: today };
    } },
    { label: "Esta semana", getValue: () => {
        const today = getSaoPauloDateString();
        return { start: startOfWeekDateString(today), end: today };
    } },
    {
        label: "Semana passada", getValue: () => {
            const previousWeekDay = addDaysToDateString(getSaoPauloDateString(), -7);
            return { start: startOfWeekDateString(previousWeekDay), end: endOfWeekDateString(previousWeekDay) };
        }
    },
    { label: "Este mês", getValue: () => {
        const today = getSaoPauloDateString();
        return { start: startOfMonthDateString(today), end: today };
    } },
    {
        label: "Mês passado", getValue: () => {
            const previousMonthDay = addDaysToDateString(startOfMonthDateString(getSaoPauloDateString()), -1);
            return { start: startOfMonthDateString(previousMonthDay), end: endOfMonthDateString(previousMonthDay) };
        }
    },
    { label: "Máximo", getValue: () => ({ start: "2022-01-01", end: getSaoPauloDateString() }) },
];

export function AdvancedDatePicker({ dateStart, dateEnd, onRangeSelect, label, compare = false }: AdvancedDatePickerProps) {
    const [open, setOpen] = React.useState(false);
    const [selectedLabel, setSelectedLabel] = React.useState(label || "Últimos 7 dias");
    const [isCompare, setIsCompare] = React.useState(compare);

    const [range, setRange] = React.useState<DateRange | undefined>({
        from: dateStringToLocalNoon(dateStart),
        to: dateStringToLocalNoon(dateEnd),
    });

    const formatDate = (dateStr: string) => {
        if (!dateStr) return "";
        // Usa split para garantir que a data seja lida corretamente sem deslocamento de timezone
        const [year, month, day] = dateStr.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        return format(date, "d 'de' MMM 'de' yyyy", { locale: ptBR });
    };

    const currentLabel = `${selectedLabel}: ${formatDate(dateStart)} a ${formatDate(dateEnd)}`;

    const handlePresetClick = (preset: typeof presets[0]) => {
        const { start, end } = preset.getValue();

        setRange({ from: dateStringToLocalNoon(start), to: dateStringToLocalNoon(end) });
        onRangeSelect(start, end, preset.label, isCompare);
        setSelectedLabel(preset.label);
        setOpen(false);
    };

    const handleApply = () => {
        if (range?.from && range?.to) {
            onRangeSelect(
                dateToLocalDateString(range.from),
                dateToLocalDateString(range.to),
                "Personalizado",
                isCompare
            );
            setSelectedLabel("Personalizado");
            setOpen(false);
        }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        "w-auto justify-start text-left font-normal bg-background border-border hover:bg-accent/50 transition-colors",
                        !dateStart && "text-muted-foreground"
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                    <span className="text-xs md:text-sm font-medium">{currentLabel}</span>
                    <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 flex flex-col md:flex-row bg-card border-border shadow-2xl" align="start">
                {/* Sidebar Presets */}
                <div className="w-full md:w-48 border-b md:border-b-0 md:border-r border-border p-2 space-y-1 bg-muted/30">
                    <p className="px-2 py-1.5 text-[10px] font-medium text-muted-foreground   tracking-wider">Usados recentemente</p>
                    {presets.map((preset) => (
                        <button
                            key={preset.label}
                            onClick={() => handlePresetClick(preset)}
                            className={cn(
                                "w-full text-left px-3 py-2 text-xs rounded-md transition-all flex items-center gap-2",
                                selectedLabel === preset.label
                                    ? "bg-primary text-primary-foreground font-medium shadow-none shadow-primary/20"
                                    : "hover:bg-accent/50 text-foreground/70 hover:text-foreground"
                            )}
                        >
                            <div className={cn(
                                "w-2.5 h-2.5 rounded-full border border-current transition-colors",
                                selectedLabel === preset.label ? "bg-white border-white" : "bg-transparent border-foreground/30"
                            )} />
                            {preset.label}
                        </button>
                    ))}
                </div>

                {/* Dual Calendar & Comparison Area */}
                <div className="flex flex-col">
                    <div className="p-4 flex flex-col gap-4">
                        <Calendar
                            mode="range"
                            selected={range}
                            onSelect={setRange}
                            numberOfMonths={2}
                            locale={ptBR}
                            className="rounded-md border-0"
                            classNames={{
                                months: "flex flex-col md:flex-row space-y-4 md:space-x-8 md:space-y-0",
                            }}
                        />

                        <div className="flex flex-col gap-4 pt-4 border-t border-border mt-2">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="compare"
                                        checked={isCompare}
                                        onCheckedChange={(val) => setIsCompare(!!val)}
                                    />
                                    <label htmlFor="compare" className="text-sm font-medium leading-none cursor-pointer">
                                        Comparar
                                    </label>
                                </div>

                                <div className="hidden sm:flex items-center gap-2 ml-auto">
                                    <div className="bg-muted px-3 py-1.5 rounded text-[10px] font-medium border border-border min-w-[120px] text-center">
                                        {range?.from ? format(range.from, "d 'de' MMMM", { locale: ptBR }) : "—"}
                                    </div>
                                    <span className="text-muted-foreground">—</span>
                                    <div className="bg-muted px-3 py-1.5 rounded text-[10px] font-medium border border-border min-w-[120px] text-center">
                                        {range?.to ? format(range.to, "d 'de' MMMM", { locale: ptBR }) : "—"}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between items-center pt-2">
                                <span className="text-[10px] text-muted-foreground">Fuso horário: Horário de São Paulo</span>
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
                                    <Button size="sm" onClick={handleApply}>Atualizar</Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
