import {
  LayoutDashboard,
  PieChart,
  Package,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  BarChart3,
  PlayCircle,
  Store,
  LayoutGrid,
  Eye,
  LogOut,
  User,
  Receipt,
  ShoppingBag,
  Star,
  RefreshCw,
  Shield,
  Box,
  Settings2
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { useAuthContext } from '@/contexts/AuthContext';
import { useDashboardContext } from '@/contexts/DashboardContext';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const menuItems = [
  { title: 'Visão Geral', path: '/visao', icon: Eye },
  { title: 'Metas e Custos', path: '/planejamento', icon: TrendingUp },
  { title: 'Estoque e Fluxo', path: '/estoque', icon: Box },
  { title: 'Simulação', path: '/simulacao', icon: Settings2 },
  { title: 'Histórico', path: '/historico', icon: BarChart3 },
];

const intelligenceItems = [
  { title: 'Fichinhas', path: '/fichinhas', icon: Receipt },
  { title: 'Clientes', path: '/growth', icon: BarChart3 },
  { title: 'Vendas', path: '/bling-sales', icon: ShoppingBag },
  { title: 'Produtos', path: '/produtos', icon: Package },
];

const simulatorItems = [
  { title: 'Variáveis', path: '/variaveis', icon: LayoutGrid },
  { title: 'Distribuição', path: '/distribuicao', icon: PieChart },
  { title: 'Custos', path: '/custos', icon: DollarSign },
  { title: 'Compras', path: '/compras', icon: ShoppingCart },
  { title: 'Canais', path: '/canais', icon: Store },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { profile, signOut } = useAuthContext();
  const { isSyncing } = useDashboardContext();
  const { isAdmin } = useUserRole();
  const isCollapsed = state === 'collapsed';

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-sidebar-primary flex items-center justify-center rounded">
            <span className="text-sidebar-primary-foreground font-bold text-lg">M</span>
          </div>
          {!isCollapsed && (
            <div>
              <h1 className="font-bold text-sidebar-foreground text-lg tracking-tight">
                {profile?.nome_loja || 'MIMAGI'}
              </h1>
              <p className="text-xs text-sidebar-foreground/60 uppercase tracking-wider">
                Profit Planner
              </p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Menu Principal */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/30 uppercase text-[11px] font-light tracking-[0.1em] px-3 mb-2">
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.path}
                      className="flex items-center gap-3 px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="w-5 h-5 shrink-0" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Inteligência de Vendas */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/30 uppercase text-[11px] font-light tracking-[0.1em] px-3 mb-2">
            Inteligência de Vendas
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {intelligenceItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.path}
                      className="flex items-center gap-3 px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="w-5 h-5 shrink-0" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Simulador Estratégico */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/30 uppercase text-[11px] font-light tracking-[0.1em] px-3 mb-2">
            Simulador Estratégico
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {simulatorItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.path}
                      className="flex items-center gap-3 px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="w-5 h-5 shrink-0" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Section */}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase text-xs tracking-wider">
              Administração
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Painel Admin">
                    <NavLink
                      to="/admin"
                      className="flex items-center gap-3 px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <Shield className="w-5 h-5 shrink-0" />
                      <span className="font-medium">Painel Admin</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Status de Sincronização */}
        {!isCollapsed && isSyncing && (
          <div className="px-5 py-2 mt-auto">
            <div className="flex items-center gap-2 text-[10px] text-primary font-medium uppercase tracking-widest animate-pulse">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>Sincronizando Bling...</span>
            </div>
          </div>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        {!isCollapsed ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start gap-3 h-auto py-3 px-3">
                <div className="w-8 h-8 bg-sidebar-primary/20 rounded-full flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-sidebar-primary" />
                </div>
                <div className="flex flex-col items-start text-left overflow-hidden">
                  <span className="text-sm font-medium truncate w-full text-sidebar-foreground">
                    {profile?.nome || 'Usuário'}
                  </span>
                  <span className="text-xs text-sidebar-foreground/60 truncate w-full flex items-center gap-1">
                    <Store className="w-3 h-3" />
                    {profile?.nome_loja || 'Minha Loja'}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-muted-foreground">
                <User className="w-4 h-4 mr-2" />
                {profile?.email}
              </DropdownMenuItem>
              {profile?.instagram_loja && (
                <DropdownMenuItem className="text-muted-foreground">
                  @{profile.instagram_loja.replace('@', '')}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button variant="ghost" size="icon" onClick={handleLogout} className="w-full">
            <LogOut className="w-5 h-5 text-sidebar-foreground/60" />
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
