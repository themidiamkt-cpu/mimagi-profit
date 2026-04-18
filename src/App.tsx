import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
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
import Custos from "./pages/Custos";
import Compras from "./pages/Compras";
import FluxoCaixa from "./pages/FluxoCaixa";
import Resultados from "./pages/Resultados";
import SimulacaoPage from "./pages/Simulacao";
import Canais from "./pages/Canais";
import VisaoGeral from "./pages/VisaoGeral";
import Planejamento from "./pages/Planejamento";
import Historico from "./pages/Historico";
import Estoque from "./pages/Estoque";
import Financeiro from "./pages/Financeiro";
import Fichinhas from "./pages/Fichinhas";
import GrowthOS from "./pages/GrowthOS";
import BlingCallback from "./pages/BlingCallback";
import CustomerDetail from "./pages/CustomerDetail";
import CustomerRegistration from "./pages/CustomerRegistration";
import TabDetail from "./pages/TabDetail";
import BlingSales from "./pages/BlingSales";
import Produtos from "./pages/Produtos";
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
        <Route path="/planejamento" element={<Planejamento />} />
        <Route path="/estoque" element={<Estoque />} />
        <Route path="/financeiro" element={<Financeiro />} />
        <Route path="/historico" element={<Historico />} />
        {/* Clientes */}
        <Route path="/fichinhas" element={<Fichinhas />} />
        <Route path="/fichinhas/cadastro" element={<CustomerRegistration />} />
        <Route path="/fichinhas/:id" element={<CustomerDetail />} />
        <Route path="/fichinhas/tab/:id" element={<TabDetail />} />
        <Route path="/bling-sales" element={<BlingSales />} />
        <Route path="/growth" element={<GrowthOS />} />
        {/* Default */}
        <Route path="/" element={<Navigate to="/visao" replace />} />
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
            <Route path="/callback" element={<BlingCallback />} />

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
