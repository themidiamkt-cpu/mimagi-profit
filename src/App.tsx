import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { DashboardProvider } from "@/contexts/DashboardContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import Cadastro from "./pages/Cadastro";
import AguardandoAprovacao from "./pages/AguardandoAprovacao";
import Admin from "./pages/Admin";
import Variaveis from "./pages/Variaveis";
import Distribuicao from "./pages/Distribuicao";
import Produtos from "./pages/Produtos";
import Custos from "./pages/Custos";
import Compras from "./pages/Compras";
import FluxoCaixa from "./pages/FluxoCaixa";
import Resultados from "./pages/Resultados";
import SimulacaoPage from "./pages/Simulacao";
import Canais from "./pages/Canais";
import VisaoGeral from "./pages/VisaoGeral";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const DashboardRoutes = () => (
  <DashboardProvider>
    <DashboardLayout>
      <Routes>
        <Route path="/variaveis" element={<Variaveis />} />
        <Route path="/distribuicao" element={<Distribuicao />} />
        <Route path="/produtos" element={<Produtos />} />
        <Route path="/custos" element={<Custos />} />
        <Route path="/compras" element={<Compras />} />
        <Route path="/fluxo" element={<FluxoCaixa />} />
        <Route path="/resultados" element={<Resultados />} />
        <Route path="/simulacao" element={<SimulacaoPage />} />
        <Route path="/canais" element={<Canais />} />
        <Route path="/visao" element={<VisaoGeral />} />
        <Route path="/" element={<Navigate to="/variaveis" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </DashboardLayout>
  </DashboardProvider>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/cadastro" element={<Cadastro />} />
            
            {/* Pending approval route */}
            <Route path="/aguardando-aprovacao" element={<AguardandoAprovacao />} />
            
            {/* Admin route */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requireAdmin>
                  <Admin />
                </ProtectedRoute>
              }
            />
            
            {/* Protected routes */}
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <DashboardRoutes />
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
