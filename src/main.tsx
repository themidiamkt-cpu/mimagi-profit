import { createRoot } from "react-dom/client";
import { hasSupabaseConfig } from "./integrations/supabase/config";
import "./index.css";

const root = createRoot(document.getElementById("root")!);

if (!hasSupabaseConfig) {
  root.render(
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <div className="max-w-xl border border-border bg-card p-8 text-left shadow-sm">
        <h1 className="text-2xl font-semibold">Configuracao ausente</h1>
        <p className="mt-3 text-muted-foreground">
          O app precisa das variaveis <code>VITE_SUPABASE_URL</code> e{" "}
          <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> para iniciar.
        </p>
        <p className="mt-3 text-muted-foreground">
          Crie um arquivo <code>.env.local</code> com esses valores e rode o
          build novamente.
        </p>
      </div>
    </div>
  );
} else {
  import("./App.tsx").then(({ default: App }) => {
    root.render(<App />);
  });
}
