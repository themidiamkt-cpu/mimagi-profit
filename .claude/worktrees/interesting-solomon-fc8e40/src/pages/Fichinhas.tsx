import { FichinhasTab } from "@/components/FichinhasTab";

const Fichinhas = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium text-foreground">Fichinhas</h1>
        <p className="text-muted-foreground text-sm">
          Gestão de clientes e fichinhas de pagamento
        </p>
      </div>
      <FichinhasTab />
    </div>
  );
};

export default Fichinhas;
