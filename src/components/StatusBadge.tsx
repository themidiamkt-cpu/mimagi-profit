import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: "aberta" | "quitada" | "em_atraso" | "pendente" | "pago" | "atrasado";
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const getVariant = () => {
    switch (status) {
      case "quitada":
      case "pago":
        return "default";
      case "em_atraso":
      case "atrasado":
        return "destructive";
      case "aberta":
      case "pendente":
        return "secondary";
      default:
        return "secondary";
    }
  };

  const getLabel = () => {
    switch (status) {
      case "aberta":
        return "Aberta";
      case "quitada":
        return "Quitada";
      case "em_atraso":
        return "Em Atraso";
      case "pendente":
        return "Pendente";
      case "pago":
        return "Pago";
      case "atrasado":
        return "Atrasado";
      default:
        return status;
    }
  };

  return (
    <Badge variant={getVariant()} className="font-medium">
      {getLabel()}
    </Badge>
  );
};
