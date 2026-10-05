/**
 * ============================================================================
 * PROJETO: Doce Gestor - Sistema de Gestão para Confeitarias
 * REPOSITÓRIO: https://github.com/junin1737/confeitaria
 * ARQUIVO: src/data.ts
 * DESCRIÇÃO: Estrutura de navegação, rotas ativas, placeholders e dados de apoio.
 * ============================================================================
 */

/**
 * [TIPO: PageKey]
 * Identificador de todas as telas suportadas pela aplicação.
 */
export type PageKey =
  | "dashboard"
  | "pedidos"
  | "catalogo"
  | "producao"
  | "compras"
  | "estoque"
  | "clientes"
  | "fornecedores"
  | "funcionarios"
  | "financeiro"
  | "relatorios"
  | "configuracoes"
  | "admin";

export type EmployeeTab = "dados" | "resumo" | "evolucao";

/**
 * [BLOCO: NAVEGAÇÃO DA BARRA LATERAL]
 * Agrupamento hierárquico dos módulos do sistema (Visão Geral, Operação e Gestão).
 */
export const NAV_GROUPS = [
  {
    label: "Visão geral",
    items: [{ key: "dashboard" as const, label: "Dashboard" }],
  },
  {
    label: "Operação",
    items: [
      { key: "pedidos" as const, label: "Pedidos e encomendas", badge: "8" },
      { key: "catalogo" as const, label: "Produtos e receitas" },
      { key: "producao" as const, label: "Produção" },
      { key: "compras" as const, label: "Compras" },
      { key: "estoque" as const, label: "Estoque e insumos", badge: "3" },
    ],
  },
  {
    label: "Gestão",
    items: [
      { key: "clientes" as const, label: "Clientes" },
      { key: "fornecedores" as const, label: "Fornecedores" },
      { key: "funcionarios" as const, label: "Funcionários" },
      { key: "financeiro" as const, label: "Financeiro" },
      { key: "relatorios" as const, label: "Relatórios" },
    ],
  },
] as const;

/**
 * [DADOS DE DEMONSTRAÇÃO: Pedidos Recentes]
 */
export const RECENT_ORDERS = [
  {
    id: "#1048",
    client: "Mariana Costa",
    product: "Bolo Red Velvet · 1 un.",
    date: "Hoje, 14:30",
    value: "R$ 248,00",
    status: "Em produção",
    tone: "amber" as const,
  },
  {
    id: "#1047",
    client: "Ateliê Aurora",
    product: "Kit festa · 50 un.",
    date: "Hoje, 10:00",
    value: "R$ 680,00",
    status: "Confirmado",
    tone: "blue" as const,
  },
  {
    id: "#1046",
    client: "Paula Mendes",
    product: "Torta de limão · 1 un.",
    date: "17 set, 16:00",
    value: "R$ 185,00",
    status: "Aguardando pagamento",
    tone: "rose" as const,
  },
  {
    id: "#1045",
    client: "Carolina Dias",
    product: "Doces finos · 100 un.",
    date: "17 set, 09:00",
    value: "R$ 420,00",
    status: "Confirmado",
    tone: "blue" as const,
  },
];

/**
 * [DADOS DE DEMONSTRAÇÃO: Colaboradores]
 */
export const EMPLOYEES = [
  {
    name: "Beatriz Almeida",
    role: "Confeiteira",
    initials: "BA",
    color: "coral" as const,
    sales: "R$ 8.420",
    commission: "R$ 320,40",
    status: "Ativo",
  },
  {
    name: "Lucas Ribeiro",
    role: "Atendente",
    initials: "LR",
    color: "sage" as const,
    sales: "R$ 5.180",
    commission: "R$ 155,40",
    status: "Ativo",
  },
  {
    name: "Camila Torres",
    role: "Entregadora",
    initials: "CT",
    color: "lavender" as const,
    sales: "R$ 2.960",
    commission: "R$ 88,80",
    status: "Ativo",
  },
];

export const SALES_SERIES = [48, 61, 54, 72, 64, 80, 74, 92, 87, 101, 94, 116];
export const SALES_MONTHS = ["Out", "Nov", "Dez", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set"];
export const EVOLUTION_BARS = [54, 69, 58, 76, 63, 88, 74, 92, 78, 84, 90, 100];

/**
 * [BLOCO: PLACEHOLDERS DAS PRÓXIMAS ETAPAS]
 * Configuração dos cartões de boas-vindas para as telas ainda em desenvolvimento.
 */
export const PLACEHOLDERS: Record<
  Exclude<PageKey, "dashboard" | "funcionarios" | "configuracoes" | "admin">,
  {
    eyebrow: string;
    title: string;
    copy: string;
    items: string[];
  }
> = {
  pedidos: {
    eyebrow: "operação",
    title: "Pedidos e encomendas",
    copy: "Centralize cada encomenda, do orçamento à entrega.",
    items: ["Pedidos em produção", "Agenda de entregas", "Status e pagamentos"],
  },
  catalogo: {
    eyebrow: "operação",
    title: "Produtos e receitas",
    copy: "Seu catálogo com fichas técnicas e formação de preço.",
    items: ["Bolos e doces", "Fichas técnicas", "Custos e margens"],
  },
  producao: {
    eyebrow: "operação",
    title: "Produção",
    copy: "Organize o que entra no forno, o que está pronto e o que ainda precisa ser feito.",
    items: ["Ordens de produção", "Fila do dia", "Fichas e rendimento"],
  },
  compras: {
    eyebrow: "operação",
    title: "Compras",
    copy: "Controle pedidos a fornecedores e a entrada de insumos no ateliê.",
    items: ["Pedidos de compra", "Fornecedores", "Recebimento de mercadorias"],
  },
  estoque: {
    eyebrow: "operação",
    title: "Estoque e insumos",
    copy: "Saiba o que está acabando antes de faltar.",
    items: ["Insumos críticos", "Movimentações", "Fornecedores"],
  },
  clientes: {
    eyebrow: "gestão",
    title: "Clientes",
    copy: "Conheça quem compra e volte a encantar.",
    items: ["Clientes ativos", "Histórico de pedidos", "Aniversariantes"],
  },
  fornecedores: {
    eyebrow: "gestão",
    title: "Fornecedores",
    copy: "Cadastre quem abastece o ateliê e acompanhe prazos, contatos e compras.",
    items: ["Cadastro de fornecedores", "Contatos e prazos", "Histórico de compras"],
  },
  financeiro: {
    eyebrow: "gestão",
    title: "Financeiro",
    copy: "Tenha clareza do que entra, sai e está por vir.",
    items: ["Contas a pagar", "Contas a receber", "Fluxo de caixa"],
  },
  relatorios: {
    eyebrow: "gestão",
    title: "Relatórios",
    copy: "Transforme os dados do ateliê em decisões melhores.",
    items: ["Vendas por período", "Produtos mais vendidos", "Margem e custos"],
  },
};
