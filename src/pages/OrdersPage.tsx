/**
 * ============================================================================
 * PROJETO: Gestão com Sabor - Sistema de Gestão para Confeitarias
 * REPOSITÓRIO: https://github.com/junin1737/confeitaria
 * ARQUIVO: src/pages/OrdersPage.tsx
 * DESCRIÇÃO: Módulo Completo de Vendas, PDV (Balcão) e Encomendas:
 *            - Visualização em lista/cards por status (Pendente, Em Produção, Pronto, Entregue).
 *            - Criação rápida de pedidos com busca de clientes e produtos.
 *            - Cálculo automático de totais, descontos, frete, sinal e restante.
 *            - Ações rápidas de avanço de status, registro de pagamentos e impressão.
 * ============================================================================
 */

import { useEffect, useState, useMemo } from "react";
import {
  ClipboardList,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  User,
  Phone,
  CheckCircle2,
  Clock3,
  ChefHat,
  Truck,
  XCircle,
  DollarSign,
  Trash2,
  X,
  CreditCard,
  QrCode,
  Banknote,
  AlertCircle,
  FileText,
} from "lucide-react";
import {
  fetchPedidos,
  savePedido,
  updatePedidoStatus,
  registrarPagamentoPedidoApi,
  deletePedido,
  fetchClientes,
  fetchProdutos,
  type Pedido,
  type Cliente,
  type Produto,
} from "../api";

interface OrdersPageProps {
  onAction: (msg: string) => void;
}

export function OrdersPage({ onAction }: OrdersPageProps) {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [proximoCodigo, setProximoCodigo] = useState("PED-0001");
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [carregando, setCarregando] = useState(true);

  // Filtros
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [busca, setBusca] = useState("");

  // Modal de Criação / Edição de Pedido
  const [modalAberto, setModalAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);

  // Campos do Formulário
  const [formCodigo, setFormCodigo] = useState("");
  const [formTipo, setFormTipo] = useState<"balcao" | "encomenda" | "delivery">("encomenda");
  const [formClienteId, setFormClienteId] = useState<number | null>(null);
  const [formDataPedido, setFormDataPedido] = useState(new Date().toISOString().split("T")[0]);
  const [formDataEntrega, setFormDataEntrega] = useState("");
  const [formHoraEntrega, setFormHoraEntrega] = useState("14:00");
  const [formFormaPagamento, setFormFormaPagamento] = useState("pix");
  const [formStatusPagamento, setFormStatusPagamento] = useState("pendente");
  const [formValorDesconto, setFormValorDesconto] = useState<number>(0);
  const [formTaxaEntrega, setFormTaxaEntrega] = useState<number>(0);
  const [formValorSinal, setFormValorSinal] = useState<number>(0);
  const [formObservacoes, setFormObservacoes] = useState("");
  const [formEnderecoEntrega, setFormEnderecoEntrega] = useState("");

  // Itens do Pedido
  const [itensPedido, setItensPedido] = useState<
    { produtoId: number; produtoNome: string; quantidade: number; unidade: string; precoUnitario: number; precoTotal: number; observacoes?: string }[]
  >([]);

  // Item Temporário de Inclusão
  const [prodSelectId, setProdSelectId] = useState<number | null>(null);
  const [prodQtd, setProdQtd] = useState<number>(1);
  const [prodPreco, setProdPreco] = useState<number>(0);
  const [prodObs, setProdObs] = useState("");

  // Modal de Registro de Pagamento
  const [modalPagamentoAberto, setModalPagamentoAberto] = useState(false);
  const [pedidoPagamento, setPedidoPagamento] = useState<Pedido | null>(null);
  const [valorRecebidoInput, setValorRecebidoInput] = useState<number>(0);
  const [formaPagamentoInput, setFormaPagamentoInput] = useState("pix");

  // Carregar Dados da API
  const carregarDados = async () => {
    try {
      setCarregando(true);
      const [resPedidos, resClientes, resProdutos] = await Promise.all([
        fetchPedidos(),
        fetchClientes(),
        fetchProdutos(),
      ]);
      setPedidos(resPedidos.pedidos);
      setProximoCodigo(resPedidos.proximoCodigo);
      setClientes(resClientes);
      setProdutos(resProdutos);
    } catch (err: any) {
      onAction("Erro ao carregar pedidos: " + err.message);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  // Totais do Formulário
  const subtotalProdutos = useMemo(() => {
    return itensPedido.reduce((acc, it) => acc + it.precoTotal, 0);
  }, [itensPedido]);

  const totalCalculado = useMemo(() => {
    return Math.max(0, subtotalProdutos - (Number(formValorDesconto) || 0) + (Number(formTaxaEntrega) || 0));
  }, [subtotalProdutos, formValorDesconto, formTaxaEntrega]);

  const valorRestante = useMemo(() => {
    return Math.max(0, totalCalculado - (Number(formValorSinal) || 0));
  }, [totalCalculado, formValorSinal]);

  // Adicionar Item ao Pedido
  const handleAdicionarItem = () => {
    if (!prodSelectId) {
      alert("Selecione um produto.");
      return;
    }
    const prod = produtos.find((p) => p.id === prodSelectId);
    if (!prod) return;

    const precoUnit = prodPreco > 0 ? prodPreco : prod.precoVenda;
    const total = Math.round(prodQtd * precoUnit * 100) / 100;

    setItensPedido([
      ...itensPedido,
      {
        produtoId: prod.id,
        produtoNome: prod.nome,
        quantidade: prodQtd,
        unidade: prod.unidadeVenda || "UN",
        precoUnitario: precoUnit,
        precoTotal: total,
        observacoes: prodObs.trim() || undefined,
      },
    ]);

    // Limpa campos temporários
    setProdSelectId(null);
    setProdQtd(1);
    setProdPreco(0);
    setProdObs("");
  };

  const handleRemoverItem = (index: number) => {
    setItensPedido(itensPedido.filter((_, i) => i !== index));
  };

  // Abrir Modal de Novo Pedido
  const handleAbrirNovo = () => {
    setFormCodigo(proximoCodigo);
    setFormTipo("encomenda");
    setFormClienteId(null);
    setFormDataPedido(new Date().toISOString().split("T")[0]);
    // Padrão de entrega: amanhã
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    setFormDataEntrega(amanha.toISOString().split("T")[0]);
    setFormHoraEntrega("15:00");
    setFormFormaPagamento("pix");
    setFormStatusPagamento("pendente");
    setFormValorDesconto(0);
    setFormTaxaEntrega(0);
    setFormValorSinal(0);
    setFormObservacoes("");
    setFormEnderecoEntrega("");
    setItensPedido([]);
    setErroForm(null);
    setModalAberto(true);
  };

  // Salvar Pedido
  const handleSalvarPedido = async () => {
    if (itensPedido.length === 0) {
      setErroForm("Adicione ao menos um produto no pedido.");
      return;
    }

    try {
      setSalvando(true);
      setErroForm(null);

      await savePedido({
        codigo: formCodigo,
        clienteId: formClienteId,
        dataPedido: formDataPedido,
        dataEntrega: formDataEntrega || null,
        horaEntrega: formHoraEntrega || null,
        tipo: formTipo,
        status: "pendente",
        formaPagamento: formFormaPagamento,
        statusPagamento: formStatusPagamento,
        valorDesconto: formValorDesconto,
        taxaEntrega: formTaxaEntrega,
        valorSinal: formValorSinal,
        observacoes: formObservacoes,
        enderecoEntrega: formEnderecoEntrega,
        itens: itensPedido.map((it) => ({
          produtoId: it.produtoId,
          quantidade: it.quantidade,
          unidade: it.unidade,
          precoUnitario: it.precoUnitario,
          observacoes: it.observacoes,
        })),
      });

      setModalAberto(false);
      onAction(`Pedido ${formCodigo} registrado com sucesso!`);
      await carregarDados();
    } catch (err: any) {
      setErroForm(err.message || "Erro ao salvar pedido.");
    } finally {
      setSalvando(false);
    }
  };

  // Alterar Status Rápido
  const handleMudarStatus = async (pedido: Pedido, novoStatus: any) => {
    try {
      await updatePedidoStatus(pedido.id, novoStatus);
      onAction(`Pedido ${pedido.codigo} atualizado para "${novoStatus}".`);
      await carregarDados();
    } catch (err: any) {
      alert("Erro ao alterar status: " + err.message);
    }
  };

  // Confirmar Pagamento Restante
  const handleConfirmarPagamento = async () => {
    if (!pedidoPagamento || valorRecebidoInput <= 0) return;
    try {
      await registrarPagamentoPedidoApi(pedidoPagamento.id, valorRecebidoInput, formaPagamentoInput);
      setModalPagamentoAberto(false);
      onAction(`Pagamento registrado para o pedido ${pedidoPagamento.codigo}!`);
      await carregarDados();
    } catch (err: any) {
      alert("Erro ao registrar pagamento: " + err.message);
    }
  };

  // Excluir Pedido
  const handleExcluir = async (pedido: Pedido) => {
    if (!confirm(`Deseja realmente excluir o pedido ${pedido.codigo}?`)) return;
    try {
      await deletePedido(pedido.id);
      onAction(`Pedido ${pedido.codigo} excluído.`);
      await carregarDados();
    } catch (err: any) {
      alert("Erro ao excluir pedido: " + err.message);
    }
  };

  // Filtragem dos pedidos na tela
  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter((p) => {
      const matchStatus = filtroStatus === "todos" || p.status === filtroStatus;
      const matchTipo = filtroTipo === "todos" || p.tipo === filtroTipo;
      const matchBusca =
        !busca.trim() ||
        p.codigo.toLowerCase().includes(busca.toLowerCase()) ||
        (p.clienteNome && p.clienteNome.toLowerCase().includes(busca.toLowerCase()));
      return matchStatus && matchTipo && matchBusca;
    });
  }, [pedidos, filtroStatus, filtroTipo, busca]);

  // Métricas do Topo
  const metricas = useMemo(() => {
    const pendentes = pedidos.filter((p) => p.status === "pendente").length;
    const emProducao = pedidos.filter((p) => p.status === "em_producao").length;
    const prontos = pedidos.filter((p) => p.status === "pronto").length;
    const totalFaturado = pedidos
      .filter((p) => p.status !== "cancelado")
      .reduce((acc, p) => acc + p.valorTotal, 0);

    return { pendentes, emProducao, prontos, totalFaturado };
  }, [pedidos]);

  const badgeStatus = (status: string) => {
    switch (status) {
      case "pendente":
        return { label: "Pendente", bg: "#fef3c7", color: "#92400e", icon: Clock3 };
      case "em_producao":
        return { label: "Em Produção", bg: "#e0e7ff", color: "#3730a3", icon: ChefHat };
      case "pronto":
        return { label: "Pronto p/ Entrega", bg: "#dcfce7", color: "#166534", icon: CheckCircle2 };
      case "entregue":
        return { label: "Entregue / Concluído", bg: "#f3f4f6", color: "#4b5563", icon: Truck };
      case "cancelado":
        return { label: "Cancelado", bg: "#fee2e2", color: "#991b1b", icon: XCircle };
      default:
        return { label: status, bg: "#f3f4f6", color: "#374151", icon: Clock3 };
    }
  };

  return (
    <div className="page-body">
      {/* Cabeçalho da Página */}
      <div className="page-heading">
        <div>
          <h2>Pedidos e Encomendas</h2>
          <p>Gerencie pedidos do balcão, encomendas antecipadas e delivery em um só lugar.</p>
        </div>
        <button className="button primary" onClick={handleAbrirNovo}>
          <Plus size={16} /> Novo Pedido / Venda
        </button>
      </div>

      {/* Cards de Métricas */}
      <div className="detail-stat-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: "20px" }}>
        <div>
          <span>A Confirmar / Novos</span>
          <strong style={{ color: "#d97706" }}>{metricas.pendentes}</strong>
          <small>Aguardando produção</small>
        </div>
        <div>
          <span>Na Cozinha / Produção</span>
          <strong style={{ color: "#4f46e5" }}>{metricas.emProducao}</strong>
          <small>Em preparação ativa</small>
        </div>
        <div>
          <span>Prontos p/ Retirada</span>
          <strong style={{ color: "#16a34a" }}>{metricas.prontos}</strong>
          <small>Aguardando entrega/cliente</small>
        </div>
        <div>
          <span>Volume em Vendas</span>
          <strong style={{ color: "var(--c-primary)" }}>R$ {metricas.totalFaturado.toFixed(2)}</strong>
          <small>Total consolidado</small>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="panel" style={{ padding: "14px 18px", marginBottom: "20px" }}>
        <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: "240px" }}>
            <Search size={15} style={{ position: "absolute", left: "12px", top: "12px", color: "var(--c-muted)" }} />
            <input
              type="text"
              placeholder="Buscar por código (ex: PED-0001) ou nome do cliente..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              style={{ paddingLeft: "34px", width: "100%", height: "38px" }}
            />
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <Filter size={15} color="var(--c-muted)" />
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              style={{ height: "38px", padding: "0 12px" }}
            >
              <option value="todos">Todos os Status</option>
              <option value="pendente">Pendente</option>
              <option value="em_producao">Em Produção</option>
              <option value="pronto">Pronto</option>
              <option value="entregue">Entregue</option>
              <option value="cancelado">Cancelado</option>
            </select>

            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              style={{ height: "38px", padding: "0 12px" }}
            >
              <option value="todos">Todos os Tipos</option>
              <option value="encomenda">Encomendas</option>
              <option value="balcao">Vendas Balcão</option>
              <option value="delivery">Delivery</option>
            </select>
          </div>
        </div>
      </div>

      {/* Listagem de Pedidos */}
      <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
        {carregando ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--c-muted)" }}>
            Carregando pedidos e encomendas...
          </div>
        ) : pedidosFiltrados.length === 0 ? (
          <div style={{ padding: "60px 20px", textAlign: "center" }}>
            <ClipboardList size={40} color="var(--c-muted)" style={{ margin: "0 auto 12px" }} />
            <h4 style={{ margin: 0, fontSize: "16px", color: "var(--c-text)" }}>Nenhum pedido encontrado</h4>
            <p style={{ margin: "6px 0 16px", fontSize: "13px", color: "var(--c-muted)" }}>
              {busca || filtroStatus !== "todos" ? "Tente ajustar os filtros de busca." : "Comece registrando a primeira venda ou encomenda."}
            </p>
            <button className="button primary" onClick={handleAbrirNovo}>
              <Plus size={15} /> Cadastrar Primeiro Pedido
            </button>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "#faf7f5", borderBottom: "1px solid var(--c-border)", color: "var(--c-muted)", fontSize: "11px", textTransform: "uppercase" }}>
                  <th style={{ padding: "12px 16px" }}>Código</th>
                  <th style={{ padding: "12px 16px" }}>Cliente & Contato</th>
                  <th style={{ padding: "12px 16px" }}>Data / Entrega</th>
                  <th style={{ padding: "12px 16px" }}>Itens / Resumo</th>
                  <th style={{ padding: "12px 16px" }}>Valor Total</th>
                  <th style={{ padding: "12px 16px" }}>Pagamento</th>
                  <th style={{ padding: "12px 16px" }}>Status</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {pedidosFiltrados.map((p) => {
                  const b = badgeStatus(p.status);
                  const Icon = b.icon;
                  return (
                    <tr key={p.id} style={{ borderBottom: "1px solid #f1ece7" }}>
                      <td style={{ padding: "14px 16px", fontWeight: "bold", color: "var(--c-primary)" }}>
                        {p.codigo}
                        <div style={{ fontSize: "10px", color: "var(--c-muted)", fontWeight: "normal", textTransform: "uppercase" }}>
                          {p.tipo}
                        </div>
                      </td>

                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ fontWeight: 600, color: "var(--c-text)" }}>
                          {p.clienteNome || "Consumidor Balcão"}
                        </div>
                        {p.clienteTelefone && (
                          <div style={{ fontSize: "11px", color: "var(--c-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                            <Phone size={10} /> {p.clienteTelefone}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: "14px 16px" }}>
                        {p.dataEntrega ? (
                          <>
                            <div style={{ fontWeight: 600 }}>{p.dataEntrega.split("-").reverse().join("/")}</div>
                            {p.horaEntrega && (
                              <div style={{ fontSize: "11px", color: "var(--c-muted)" }}>às {p.horaEntrega}</div>
                            )}
                          </>
                        ) : (
                          <span style={{ color: "var(--c-muted)" }}>{p.dataPedido.split("-").reverse().join("/")}</span>
                        )}
                      </td>

                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ maxWidth: "220px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {p.itens.map((it) => `${it.quantidade}x ${it.produtoNome}`).join(", ")}
                        </div>
                        <small style={{ color: "var(--c-muted)", fontSize: "11px" }}>
                          {p.itens.length} {p.itens.length === 1 ? "produto" : "produtos"}
                        </small>
                      </td>

                      <td style={{ padding: "14px 16px" }}>
                        <strong style={{ fontSize: "14px", color: "var(--c-text)" }}>
                          R$ {p.valorTotal.toFixed(2)}
                        </strong>
                        {p.valorRestante > 0 && (
                          <div style={{ fontSize: "11px", color: "#dc2626" }}>
                            Resta: R$ {p.valorRestante.toFixed(2)}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: "14px 16px" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "2px 8px",
                            borderRadius: "12px",
                            fontSize: "11px",
                            fontWeight: 600,
                            background: p.statusPagamento === "pago" ? "#dcfce7" : p.statusPagamento === "pago_parcial" ? "#fef3c7" : "#fee2e2",
                            color: p.statusPagamento === "pago" ? "#166534" : p.statusPagamento === "pago_parcial" ? "#92400e" : "#991b1b",
                          }}
                        >
                          {p.statusPagamento === "pago" ? "Quitado" : p.statusPagamento === "pago_parcial" ? "Sinal Pago" : "Pendente"}
                        </span>
                        {p.valorRestante > 0 && (
                          <button
                            onClick={() => {
                              setPedidoPagamento(p);
                              setValorRecebidoInput(p.valorRestante);
                              setFormaPagamentoInput(p.formaPagamento || "pix");
                              setModalPagamentoAberto(true);
                            }}
                            style={{
                              display: "block",
                              marginTop: "4px",
                              background: "none",
                              border: "none",
                              color: "var(--c-primary)",
                              fontSize: "11px",
                              cursor: "pointer",
                              textDecoration: "underline",
                              padding: 0,
                            }}
                          >
                            + Receber Restante
                          </button>
                        )}
                      </td>

                      <td style={{ padding: "14px 16px" }}>
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            padding: "4px 9px",
                            borderRadius: "12px",
                            fontSize: "11px",
                            fontWeight: 600,
                            background: b.bg,
                            color: b.color,
                          }}
                        >
                          <Icon size={12} />
                          {b.label}
                        </div>
                      </td>

                      <td style={{ padding: "14px 16px", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "6px" }}>
                          {p.status === "pendente" && (
                            <button
                              className="button secondary"
                              style={{ padding: "4px 8px", fontSize: "11px" }}
                              onClick={() => handleMudarStatus(p, "em_producao")}
                              title="Iniciar Produção"
                            >
                              <ChefHat size={13} /> Produzir
                            </button>
                          )}
                          {p.status === "em_producao" && (
                            <button
                              className="button secondary"
                              style={{ padding: "4px 8px", fontSize: "11px", color: "#166534" }}
                              onClick={() => handleMudarStatus(p, "pronto")}
                              title="Marcar como Pronto"
                            >
                              <CheckCircle2 size={13} /> Pronto
                            </button>
                          )}
                          {p.status === "pronto" && (
                            <button
                              className="button primary"
                              style={{ padding: "4px 8px", fontSize: "11px" }}
                              onClick={() => handleMudarStatus(p, "entregue")}
                              title="Marcar como Entregue"
                            >
                              <Truck size={13} /> Entregar
                            </button>
                          )}
                          <button
                            className="icon-button"
                            onClick={() => handleExcluir(p)}
                            style={{ color: "var(--c-danger)" }}
                            title="Excluir Pedido"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: NOVO PEDIDO / ENCOMENDA */}
      {modalAberto && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "grid",
            placeItems: "center",
            zIndex: 100,
            padding: "20px",
          }}
        >
          <div
            className="panel"
            style={{
              width: "100%",
              maxWidth: "840px",
              maxHeight: "92vh",
              overflowY: "auto",
              background: "#fff",
              borderRadius: "14px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
              padding: "24px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid #f1ece7", paddingBottom: "14px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "18px", color: "var(--c-text)", display: "flex", alignItems: "center", gap: "8px" }}>
                  <ClipboardList size={20} color="var(--c-primary)" /> Novo Pedido ou Encomenda
                </h3>
                <span style={{ fontSize: "12px", color: "var(--c-muted)" }}>Código Gerado: <b>{formCodigo}</b></span>
              </div>
              <button onClick={() => setModalAberto(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--c-muted)" }}>
                <X size={20} />
              </button>
            </div>

            {erroForm && (
              <div style={{ padding: "10px 14px", marginBottom: "16px", background: "#fdf2f2", color: "#991b1b", borderRadius: "8px", fontSize: "12px" }}>
                {erroForm}
              </div>
            )}

            {/* Cabeçalho do Pedido */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px", marginBottom: "16px" }}>
              <div className="field">
                <label>Tipo de Venda *</label>
                <select value={formTipo} onChange={(e) => setFormTipo(e.target.value as any)}>
                  <option value="encomenda">Encomenda Antecipada</option>
                  <option value="balcao">Venda Imediata no Balcão</option>
                  <option value="delivery">Delivery / Entrega</option>
                </select>
              </div>

              <div className="field">
                <label>Cliente</label>
                <select
                  value={formClienteId || ""}
                  onChange={(e) => setFormClienteId(Number(e.target.value) || null)}
                >
                  <option value="">Consumidor Final (Balcão)</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome} {c.celular ? `(${c.celular})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Data do Pedido</label>
                <input
                  type="date"
                  value={formDataPedido}
                  onChange={(e) => setFormDataPedido(e.target.value)}
                />
              </div>
            </div>

            {formTipo !== "balcao" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px", marginBottom: "16px", background: "#faf7f5", padding: "14px", borderRadius: "10px" }}>
                <div className="field">
                  <label>Data de Entrega / Retirada *</label>
                  <input
                    type="date"
                    value={formDataEntrega}
                    onChange={(e) => setFormDataEntrega(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Horário Prometido</label>
                  <input
                    type="time"
                    value={formHoraEntrega}
                    onChange={(e) => setFormHoraEntrega(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Taxa de Entrega (R$)</label>
                  <input
                    type="number"
                    step="0.50"
                    min="0"
                    value={formTaxaEntrega}
                    onChange={(e) => setFormTaxaEntrega(Number(e.target.value))}
                  />
                </div>
              </div>
            )}

            {/* SEÇÃO: ITENS DO PEDIDO */}
            <div style={{ margin: "24px 0", borderTop: "1px solid #f1ece7", paddingTop: "16px" }}>
              <h4 style={{ margin: "0 0 12px", fontSize: "14px", color: "var(--c-text)" }}>
                Itens e Produtos do Pedido
              </h4>

              {/* Formulário de Inclusão de Item */}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 100px 120px 1fr auto", gap: "10px", alignItems: "flex-end", background: "#f8f5f2", padding: "12px", borderRadius: "10px", marginBottom: "14px" }}>
                <div className="field" style={{ margin: 0 }}>
                  <label style={{ fontSize: "11px" }}>Produto *</label>
                  <select
                    value={prodSelectId || ""}
                    onChange={(e) => {
                      const pid = Number(e.target.value) || null;
                      setProdSelectId(pid);
                      const prod = produtos.find((p) => p.id === pid);
                      if (prod) {
                        setProdPreco(prod.precoVenda);
                      }
                    }}
                  >
                    <option value="">Selecione um produto...</option>
                    {produtos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome} - R$ {p.precoVenda.toFixed(2)} ({p.unidadeVenda || "UN"})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field" style={{ margin: 0 }}>
                  <label style={{ fontSize: "11px" }}>Qtd</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={prodQtd}
                    onChange={(e) => setProdQtd(Number(e.target.value))}
                  />
                </div>

                <div className="field" style={{ margin: 0 }}>
                  <label style={{ fontSize: "11px" }}>Preço Unit. (R$)</label>
                  <input
                    type="number"
                    step="0.50"
                    value={prodPreco}
                    onChange={(e) => setProdPreco(Number(e.target.value))}
                  />
                </div>

                <div className="field" style={{ margin: 0 }}>
                  <label style={{ fontSize: "11px" }}>Obs. (ex: sabor recheio)</label>
                  <input
                    type="text"
                    placeholder="Opcional..."
                    value={prodObs}
                    onChange={(e) => setProdObs(e.target.value)}
                  />
                </div>

                <button
                  type="button"
                  className="button primary"
                  onClick={handleAdicionarItem}
                  style={{ height: "38px" }}
                >
                  <Plus size={15} /> Adicionar
                </button>
              </div>

              {/* Tabela de Itens Adicionados */}
              {itensPedido.length > 0 ? (
                <div style={{ border: "1px solid var(--c-border)", borderRadius: "8px", overflow: "hidden", marginBottom: "16px" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                    <thead>
                      <tr style={{ background: "#faf7f5", borderBottom: "1px solid var(--c-border)", color: "var(--c-muted)", fontSize: "11px" }}>
                        <th style={{ padding: "8px 12px", textAlign: "left" }}>Produto</th>
                        <th style={{ padding: "8px 12px", textAlign: "center" }}>Quantidade</th>
                        <th style={{ padding: "8px 12px", textAlign: "right" }}>Preço Unit.</th>
                        <th style={{ padding: "8px 12px", textAlign: "right" }}>Total</th>
                        <th style={{ padding: "8px 12px", textAlign: "center" }}>Remover</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itensPedido.map((it, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid #f1ece7" }}>
                          <td style={{ padding: "10px 12px" }}>
                            <strong>{it.produtoNome}</strong>
                            {it.observacoes && <small style={{ display: "block", color: "var(--c-muted)" }}>{it.observacoes}</small>}
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "center" }}>
                            {it.quantidade} {it.unidade}
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "right" }}>
                            R$ {it.precoUnitario.toFixed(2)}
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: "bold" }}>
                            R$ {it.precoTotal.toFixed(2)}
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "center" }}>
                            <button
                              onClick={() => handleRemoverItem(idx)}
                              style={{ background: "none", border: "none", color: "var(--c-danger)", cursor: "pointer" }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ textAlign: "center", color: "var(--c-muted)", fontSize: "12px", margin: "16px 0" }}>
                  Nenhum produto adicionado ainda.
                </p>
              )}
            </div>

            {/* SEÇÃO: PAGAMENTO E TOTAIS */}
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "20px", borderTop: "1px solid #f1ece7", paddingTop: "18px" }}>
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div className="field">
                    <label>Forma de Pagamento</label>
                    <select
                      value={formFormaPagamento}
                      onChange={(e) => setFormFormaPagamento(e.target.value)}
                    >
                      <option value="pix">PIX</option>
                      <option value="cartao_credito">Cartão de Crédito</option>
                      <option value="cartao_debito">Cartão de Débito</option>
                      <option value="dinheiro">Dinheiro</option>
                      <option value="a_prazo">A Prazo / Crediário</option>
                    </select>
                  </div>

                  <div className="field">
                    <label>Desconto (R$)</label>
                    <input
                      type="number"
                      step="0.50"
                      min="0"
                      value={formValorDesconto}
                      onChange={(e) => setFormValorDesconto(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="field" style={{ marginTop: "10px" }}>
                  <label>Valor de Sinal / Entrada Pago (R$)</label>
                  <input
                    type="number"
                    step="1.00"
                    min="0"
                    value={formValorSinal}
                    onChange={(e) => setFormValorSinal(Number(e.target.value))}
                    placeholder="Quanto o cliente já adiantou"
                  />
                  <small style={{ color: "var(--c-muted)", fontSize: "11px" }}>
                    {valorRestante > 0 ? `Restará a pagar na entrega: R$ ${valorRestante.toFixed(2)}` : "Pedido será registrado como 100% quitado."}
                  </small>
                </div>

                <div className="field" style={{ marginTop: "10px" }}>
                  <label>Observações Gerais do Pedido</label>
                  <textarea
                    rows={2}
                    placeholder="Instruções de embalagem, tema de aniversário..."
                    value={formObservacoes}
                    onChange={(e) => setFormObservacoes(e.target.value)}
                  />
                </div>
              </div>

              {/* Card Resumo Financeiro */}
              <div style={{ background: "#faf8f5", padding: "18px", borderRadius: "12px", border: "1px solid #eee4de", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <h4 style={{ margin: "0 0 12px", fontSize: "14px", color: "var(--c-text)" }}>
                    Resumo do Pedido
                  </h4>

                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "13px" }}>
                    <span style={{ color: "var(--c-muted)" }}>Subtotal dos Produtos:</span>
                    <span>R$ {subtotalProdutos.toFixed(2)}</span>
                  </div>

                  {formTaxaEntrega > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "13px" }}>
                      <span style={{ color: "var(--c-muted)" }}>Taxa de Entrega:</span>
                      <span>+ R$ {formTaxaEntrega.toFixed(2)}</span>
                    </div>
                  )}

                  {formValorDesconto > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "13px", color: "#166534" }}>
                      <span>Desconto Aplicado:</span>
                      <span>- R$ {formValorDesconto.toFixed(2)}</span>
                    </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "space-between", margin: "12px 0 6px", paddingTop: "10px", borderTop: "1px solid #ebdcd3", fontSize: "16px", fontWeight: "bold" }}>
                    <span>Total do Pedido:</span>
                    <span style={{ color: "var(--c-primary)" }}>R$ {totalCalculado.toFixed(2)}</span>
                  </div>

                  {formValorSinal > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#2563eb", marginTop: "4px" }}>
                      <span>Sinal / Entrada:</span>
                      <span>R$ {formValorSinal.toFixed(2)}</span>
                    </div>
                  )}

                  {valorRestante > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#dc2626", marginTop: "4px", fontWeight: "bold" }}>
                      <span>A Pagar na Entrega:</span>
                      <span>R$ {valorRestante.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => setModalAberto(false)}
                    style={{ flex: 1 }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="button primary"
                    disabled={salvando}
                    onClick={handleSalvarPedido}
                    style={{ flex: 1 }}
                  >
                    {salvando ? "Salvando..." : "Confirmar Pedido"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RECEBER PAGAMENTO RESTANTE */}
      {modalPagamentoAberto && pedidoPagamento && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "grid",
            placeItems: "center",
            zIndex: 110,
            padding: "20px",
          }}
        >
          <div
            className="panel"
            style={{
              width: "100%",
              maxWidth: "420px",
              background: "#fff",
              borderRadius: "14px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
              padding: "20px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", borderBottom: "1px solid #f1ece7", paddingBottom: "10px" }}>
              <h3 style={{ margin: 0, fontSize: "16px", color: "var(--c-text)", display: "flex", alignItems: "center", gap: "6px" }}>
                <DollarSign size={18} color="var(--c-primary)" /> Receber Pagamento
              </h3>
              <button onClick={() => setModalPagamentoAberto(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--c-muted)" }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ margin: "0 0 14px", fontSize: "13px", color: "var(--c-muted)" }}>
              Pedido: <b>{pedidoPagamento.codigo}</b> ({pedidoPagamento.clienteNome || "Consumidor"})
            </p>

            <div className="field" style={{ marginBottom: "14px" }}>
              <label>Valor a Receber (R$)</label>
              <input
                type="number"
                step="0.50"
                value={valorRecebidoInput}
                onChange={(e) => setValorRecebidoInput(Number(e.target.value))}
                style={{ fontSize: "16px", fontWeight: "bold", color: "var(--c-primary)" }}
              />
            </div>

            <div className="field" style={{ marginBottom: "18px" }}>
              <label>Forma de Pagamento</label>
              <select
                value={formaPagamentoInput}
                onChange={(e) => setFormaPagamentoInput(e.target.value)}
              >
                <option value="pix">PIX</option>
                <option value="cartao_credito">Cartão de Crédito</option>
                <option value="cartao_debito">Cartão de Débito</option>
                <option value="dinheiro">Dinheiro</option>
              </select>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                className="button secondary"
                onClick={() => setModalPagamentoAberto(false)}
                style={{ flex: 1 }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="button primary"
                onClick={handleConfirmarPagamento}
                style={{ flex: 1 }}
              >
                Confirmar Recebimento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
