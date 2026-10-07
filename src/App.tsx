/**
 * ============================================================================
 * PROJETO: Doce Gestor - Sistema de Gestão para Confeitarias
 * REPOSITÓRIO: https://github.com/junin1737/confeitaria
 * ARQUIVO: src/App.tsx
 * DESCRIÇÃO: Componente raiz da aplicação React, layout principal e roteamento.
 * ============================================================================
 * 
 * [ARQUITETURA DE INTERFACE & CONTROLE DE ACESSO]
 * 1. Verifica autenticação do usuário (fetchMe) na inicialização.
 * 2. Renderiza LoginPage caso o usuário não esteja logado.
 * 3. Gerencia navegação SPA (Single Page Application) com controle de estado.
 * 4. Exibe o 'Painel Master' exclusivamente para usuários com perfil 'master'.
 * 5. Barra lateral responsiva com suporte a gaveta mobile e temas visuais.
 * ============================================================================
 */

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Bell,
  Cake,
  ChefHat,
  ChevronsUpDown,
  CircleHelp,
  ClipboardList,
  LayoutDashboard,
  Menu,
  Package,
  Settings,
  ShoppingCart,
  Sparkles,
  Store,
  Truck,
  UserRound,
  Users,
  Wallet,
  X,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { NAV_GROUPS, PLACEHOLDERS, type PageKey } from "./data";
import { PlaceholderPage } from "./pages/AppPages";
import { DashboardPage } from "./pages/DashboardPage";
import { EmployeesPage } from "./pages/EmployeesPage";
import { SettingsPage } from "./pages/SettingsPage";
import { AdminPage } from "./pages/AdminPage";
import { ProductsPage } from "./pages/ProductsPage";
import { StockPage } from "./pages/StockPage";
import { CustomersPage } from "./pages/CustomersPage";
import { SuppliersPage } from "./pages/SuppliersPage";
import { ProductionPage } from "./pages/ProductionPage";
import { PurchasesPage } from "./pages/PurchasesPage";
import { OrdersPage } from "./pages/OrdersPage";
import { fetchMe, iniciais, logoutRequest, type UsuarioSessao } from "./api";
import { LoginPage } from "./pages/LoginPage";
import { applyTheme, loadSavedTheme, saveTheme, type ThemeColors } from "./theme";

const ICONS = {
  dashboard: LayoutDashboard,
  pedidos: ClipboardList,
  catalogo: Cake,
  producao: ChefHat,
  compras: ShoppingCart,
  estoque: Package,
  clientes: Users,
  fornecedores: Truck,
  funcionarios: UserRound,
  financeiro: Wallet,
  relatorios: BarChart3,
};

function pageLabel(page: PageKey) {
  if (page === "dashboard") return "Visão geral";
  if (page === "admin") return "Painel Master (Admin)";
  if (page === "configuracoes") return "Parâmetros do Sistema";
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (item.key === page) return item.label;
    }
  }
  return "Configurações";
}

export default function App() {
  const [page, setPage] = useState<PageKey>("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [colors, setColors] = useState<ThemeColors>(() => {
    const saved = loadSavedTheme();
    applyTheme(saved);
    return saved;
  });
  const [authReady, setAuthReady] = useState(false);
  const [usuario, setUsuario] = useState<UsuarioSessao | null>(null);

  useEffect(() => {
    applyTheme(colors);
    saveTheme(colors);
  }, [colors]);

  useEffect(() => {
    fetchMe()
      .then(setUsuario)
      .finally(() => setAuthReady(true));
  }, []);

  const firstName = usuario?.nome.split(/\s+/)[0] ?? "olá";
  const title = useMemo(
    () => (page === "dashboard" ? `Bom dia, ${firstName}` : pageLabel(page)),
    [page, firstName],
  );

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  }

  function goTo(next: PageKey) {
    setPage(next);
    setMenuOpen(false);
  }

  async function handleLogout() {
    await logoutRequest();
    setUsuario(null);
    setPage("dashboard");
  }

  if (!authReady) {
    return (
      <div className="login-shell">
        <div className="login-card login-loading">Carregando o ateliê...</div>
      </div>
    );
  }

  if (!usuario) {
    return <LoginPage onLoggedIn={setUsuario} />;
  }

  const avatar = iniciais(usuario.nome);
  const perfilLabel = usuario.perfil === "master" ? "Master" : usuario.perfil;

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-brand">
          <div className="brand-mark">
            <Cake size={19} strokeWidth={2.4} />
          </div>
          <div>
            <strong>Gestão com Sabor</strong>
            <span>gestão inteligente</span>
          </div>
          <button className="icon-button mobile-close" onClick={() => setMenuOpen(false)} aria-label="Fechar menu">
            <X size={18} />
          </button>
        </div>

        <div className="company-switcher" onClick={() => notify("Seletor de empresa: disponível na versão online")}>
          <div className="company-avatar">
            <Store size={15} />
          </div>
          <div className="company-copy">
            <strong>{usuario.empresaNome}</strong>
            <span>Minha empresa</span>
          </div>
          <ChevronsUpDown size={15} className="muted-icon" />
        </div>

        <nav className="nav-area" aria-label="Navegação principal">
          {NAV_GROUPS.map((group) => (
            <div className="nav-group" key={group.label}>
              <div className="nav-label">{group.label}</div>
              {group.items.map((item) => {
                const Icon = ICONS[item.key];
                const active = page === item.key;
                return (
                  <button
                    key={item.key}
                    className={`nav-item ${active ? "active" : ""}`}
                    onClick={() => goTo(item.key)}
                  >
                    <Icon size={17} strokeWidth={active ? 2.2 : 1.8} />
                    <span>{item.label}</span>
                    {"badge" in item && item.badge ? <em>{item.badge}</em> : null}
                  </button>
                );
              })}
            </div>
          ))}
          <div className="nav-group nav-bottom">
            <div className="nav-label">Sistema</div>
            {usuario.perfil === "master" || usuario.perfil === "superadmin" ? (
              <button
                className={`nav-item ${page === "admin" ? "active" : ""}`}
                onClick={() => goTo("admin")}
                style={{ fontWeight: 700, color: page === "admin" ? undefined : "var(--color-primary, #b33951)" }}
              >
                <ShieldCheck size={17} />
                <span>Painel Master</span>
              </button>
            ) : null}
            <button
              className={`nav-item ${page === "configuracoes" ? "active" : ""}`}
              onClick={() => goTo("configuracoes")}
            >
              <Settings size={17} />
              <span>Parâmetros</span>
            </button>
            <button className="nav-item" onClick={() => notify("Central de ajuda aberta em breve")}>
              <CircleHelp size={17} />
              <span>Central de ajuda</span>
            </button>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="mini-progress">
            <span>Plano inicial</span>
            <strong>60%</strong>
            <div>
              <i style={{ width: "60%" }} />
            </div>
          </div>
          <div className="profile-row">
            <div className="profile-avatar">{avatar}</div>
            <div className="profile-copy">
              <strong>{usuario.nome}</strong>
              <span>{perfilLabel}</span>
            </div>
            <button className="icon-button" onClick={handleLogout} aria-label="Sair">
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>

      {menuOpen ? (
        <button className="mobile-scrim visible" onClick={() => setMenuOpen(false)} aria-label="Fechar menu" />
      ) : null}

      <main className="main-content">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMenuOpen(true)} aria-label="Abrir menu">
            <Menu size={20} />
          </button>
          <div className="breadcrumb">
            <span>{usuario.empresaNome}</span>
            <i>/</i>
            <strong>{page === "dashboard" ? "Visão geral" : title}</strong>
          </div>
          <div className="topbar-actions">
            <button className="icon-button" onClick={() => notify("Você está em modo demonstração")} aria-label="Ajuda">
              <CircleHelp size={18} />
            </button>
            <button
              className="icon-button notification"
              onClick={() => notify("Você tem 3 alertas novos")}
              aria-label="Notificações"
            >
              <Bell size={18} />
              <i />
            </button>
            <div className="top-profile">
              <div className="profile-avatar small">{avatar}</div>
              <ChevronsUpDown size={14} />
            </div>
            <button
              className="button secondary"
              onClick={handleLogout}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                fontSize: "13px",
                fontWeight: 700,
                color: "#c62828",
                borderColor: "#fecaca",
                background: "#fef2f2",
                borderRadius: "8px",
                cursor: "pointer",
              }}
              title="Encerrar sessão"
            >
              <LogOut size={15} />
              <span>Sair</span>
            </button>
          </div>
        </header>

        <div className="page-wrap">
          {page === "admin" ? <AdminPage /> : null}
          {page === "dashboard" ? (
            <DashboardPage onAction={notify} onNavigate={(next) => goTo(next)} userName={firstName} />
          ) : null}
          {page === "pedidos" ? <OrdersPage onAction={notify} /> : null}
          {page === "catalogo" ? <ProductsPage onAction={notify} /> : null}
          {page === "producao" ? <ProductionPage onAction={notify} /> : null}
          {page === "compras" ? <PurchasesPage onAction={notify} /> : null}
          {page === "estoque" ? <StockPage onAction={notify} /> : null}
          {page === "clientes" ? <CustomersPage onAction={notify} /> : null}
          {page === "fornecedores" ? <SuppliersPage onAction={notify} /> : null}
          {page === "funcionarios" ? <EmployeesPage onAction={notify} /> : null}
          {page === "configuracoes" ? (
            <SettingsPage colors={colors} onColorsChange={setColors} onAction={notify} />
          ) : null}
          {page !== "dashboard" &&
          page !== "pedidos" &&
          page !== "funcionarios" &&
          page !== "configuracoes" &&
          page !== "admin" &&
          page !== "catalogo" &&
          page !== "producao" &&
          page !== "compras" &&
          page !== "estoque" &&
          page !== "clientes" &&
          page !== "fornecedores" ? (
            <PlaceholderPage
              iconKey={page}
              title={PLACEHOLDERS[page].title}
              copy={PLACEHOLDERS[page].copy}
              eyebrow={PLACEHOLDERS[page].eyebrow}
              items={PLACEHOLDERS[page].items}
              onAction={notify}
            />
          ) : null}
        </div>
      </main>

      {toast ? (
        <div className="toast">
          <span className="toast-dot">
            <Sparkles size={13} />
          </span>
          {toast}
        </div>
      ) : null}
    </div>
  );
}
