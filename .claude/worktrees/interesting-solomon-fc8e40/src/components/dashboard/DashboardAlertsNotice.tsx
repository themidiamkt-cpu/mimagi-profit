import { AlertCircle, AlertTriangle, CheckCircle2, ChevronRight, Info } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert } from "@/types/financial";
import { cn } from "@/lib/utils";

interface DashboardAlertsNoticeProps {
  alerts: Alert[];
  className?: string;
}

const getAlertStyle = (type: Alert["type"]) => {
  switch (type) {
    case "danger":
      return {
        icon: <AlertTriangle className="h-5 w-5 text-destructive" />,
        badgeClassName: "bg-destructive/10 text-destructive",
        containerClassName: "border-destructive/20 bg-destructive/5",
        label: "Crítico",
      };
    case "warning":
      return {
        icon: <AlertCircle className="h-5 w-5 text-warning" />,
        badgeClassName: "bg-warning/10 text-warning",
        containerClassName: "border-warning/20 bg-warning/5",
        label: "Atenção",
      };
    case "info":
      return {
        icon: <Info className="h-5 w-5 text-info" />,
        badgeClassName: "bg-info/10 text-info",
        containerClassName: "border-info/20 bg-info/5",
        label: "Informativo",
      };
  }
};

export const DashboardAlertsNotice = ({
  alerts,
  className,
}: DashboardAlertsNoticeProps) => {
  const criticalAlerts = alerts.filter((alert) => alert.type === "danger" || alert.type === "warning");
  const infoAlerts = alerts.filter((alert) => alert.type === "info");

  const hasDangerAlert = criticalAlerts.some((alert) => alert.type === "danger");
  const hasWarningAlert = criticalAlerts.some((alert) => alert.type === "warning");

  const status = hasDangerAlert ? "danger" : hasWarningAlert ? "warning" : infoAlerts.length > 0 ? "info" : "success";

  const summaryLabel = criticalAlerts.length > 0
    ? `${criticalAlerts.length} alerta${criticalAlerts.length === 1 ? "" : "s"} ativo${criticalAlerts.length === 1 ? "" : "s"}`
    : infoAlerts.length > 0
      ? `${infoAlerts.length} aviso${infoAlerts.length === 1 ? "" : "s"}`
      : "Tudo em ordem";

  const summaryDescription = criticalAlerts.length > 0
    ? "Existem alertas da Visão Geral que merecem atenção."
    : infoAlerts.length > 0
      ? "Existem avisos da Visão Geral para revisar."
      : "Nenhum alerta relevante no momento.";

  const previewMessage = criticalAlerts[0]?.message || infoAlerts[0]?.message || "A Visão Geral está dentro do esperado.";


  const triggerStyles = {
    danger: {
      icon: <AlertTriangle className="h-5 w-5 text-destructive" />,
      iconWrapperClassName: "border-destructive/20 bg-destructive/5",
      badgeClassName: "bg-destructive/10 text-destructive",
      hoverClassName: "hover:border-destructive/20 hover:bg-destructive/5",
    },
    warning: {
      icon: <AlertCircle className="h-5 w-5 text-warning" />,
      iconWrapperClassName: "border-warning/20 bg-warning/5",
      badgeClassName: "bg-warning/10 text-warning",
      hoverClassName: "hover:border-warning/20 hover:bg-warning/5",
    },
    info: {
      icon: <Info className="h-5 w-5 text-info" />,
      iconWrapperClassName: "border-info/20 bg-info/5",
      badgeClassName: "bg-info/10 text-info",
      hoverClassName: "hover:border-info/20 hover:bg-info/5",
    },
    success: {
      icon: <CheckCircle2 className="h-5 w-5 text-success" />,
      iconWrapperClassName: "border-success/20 bg-success/5",
      badgeClassName: "bg-success/10 text-success",
      hoverClassName: "hover:border-success/20 hover:bg-success/5",
    },
  }[status];

  return (
    <Dialog>
      <div className={cn("flex", className)}>
        <DialogTrigger asChild>
          <button
            type="button"
            className={cn(
              "group flex w-full items-center justify-between gap-4 rounded-xl border bg-card px-4 py-3 text-left shadow-none transition-colors",
              triggerStyles.hoverClassName,
            )}
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full border", triggerStyles.iconWrapperClassName)}>
                {triggerStyles.icon}
              </div>

              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-foreground">Alertas</p>
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px]", triggerStyles.badgeClassName)}>
                    {summaryLabel}
                  </span>
                </div>

                <p className="text-sm text-muted-foreground">{summaryDescription}</p>
                <p className="truncate text-xs text-muted-foreground/80">{previewMessage}</p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1 text-muted-foreground transition-colors group-hover:text-foreground">
              <span className="hidden text-xs sm:inline">Abrir</span>
              <ChevronRight className="h-4 w-4" />
            </div>
          </button>
        </DialogTrigger>
      </div>

      <DialogContent className="max-h-[85vh] max-w-2xl gap-0 overflow-hidden p-0">
        <div className="border-b bg-muted/20 px-6 py-5">
          <DialogHeader className="text-left">
            <DialogTitle className="flex items-center gap-2 text-xl">
              {triggerStyles.icon}
              Alertas da Visão Geral
            </DialogTitle>
            <DialogDescription>
              Acompanhe riscos e avisos gerados com base nas vendas reais, ticket médio e ritmo de atingimento da meta.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-6 overflow-y-auto p-6">
          {alerts.length === 0 && (
            <div className="rounded-xl border border-success/20 bg-success/5 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-success" />
                <div>
                  <p className="font-medium text-foreground">Tudo certo por aqui</p>
                  <p className="text-sm text-muted-foreground">
                    Nenhum alerta no momento. A Visão Geral está dentro do esperado.
                  </p>
                </div>
              </div>
            </div>
          )}

          {criticalAlerts.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-foreground">Prioritários</h4>
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                  {criticalAlerts.length}
                </span>
              </div>

              <div className="space-y-3">
                {criticalAlerts.map((alert, index) => {
                  const style = getAlertStyle(alert.type);

                  return (
                    <div key={`${alert.type}-${index}`} className={cn("rounded-xl border p-4", style.containerClassName)}>
                      <div className="flex items-start gap-3">
                        {style.icon}
                        <div className="space-y-2">
                          <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium", style.badgeClassName)}>
                            {style.label}
                          </span>
                          <p className="text-sm text-foreground">{alert.message}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {infoAlerts.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-foreground">Informativos</h4>
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                  {infoAlerts.length}
                </span>
              </div>

              <div className="space-y-3">
                {infoAlerts.map((alert, index) => {
                  const style = getAlertStyle(alert.type);

                  return (
                    <div key={`${alert.type}-${index}`} className={cn("rounded-xl border p-4", style.containerClassName)}>
                      <div className="flex items-start gap-3">
                        {style.icon}
                        <div className="space-y-2">
                          <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium", style.badgeClassName)}>
                            {style.label}
                          </span>
                          <p className="text-sm text-foreground">{alert.message}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
};
