/**
 * ============================================================================
 * PROJETO: Doce Gestor - Sistema de Gestão para Confeitarias
 * REPOSITÓRIO: https://github.com/junin1737/confeitaria
 * ARQUIVO: src/pages/StockPage.tsx
 * DESCRIÇÃO: FASE 1 — Gestão Completa de Estoque e Insumos:
 *            - Fluxo completo de Consulta (Somente Leitura), Cadastro e Edição.
 *            - Código interno sequencial (INS-001, INS-002...).
 *            - Vínculo persistido com Fornecedor Parceiro e Local de Armazenamento.
 *            - Conversor inteligente de unidades (Compra vs. Uso na Receita).
 *            - Movimentação rápida de estoque (Entrada por embalagem/base, Baixa e Inventário).
 *            - Rastreabilidade de produtos/fichas técnicas que utilizam cada insumo.
 * ============================================================================
 */

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  Boxes,
  Check,
  ChefHat,
  DollarSign,
  Download,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import {
  ajustarEstoqueInsumoApi,
  deleteInsumo,
  fetchFornecedores,
  fetchInsumos,
  fetchProximoCodigoInsumo,
  saveInsumo,
  type Fornecedor,
  type Insumo,
  type InsumoInput,
} from "../api";

type FiltroCategoria = "todos" | "ingrediente" | "embalagem" | "decoracao" | "outro" | "criticos";

function parseNumeroFlex(val: string | number): number {
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  const limpo = String(val ?? "").trim().replace(",", ".");
  if (!limpo) return 0;
  const num = Number(limpo);
  return isNaN(num) ? 0 : num;
}

export function StockPage({ onAction }: { onAction: (msg: string) => void }) {
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState<FiltroCategoria>("todos");
  const [selectedId, setSelectedId] = useState<number | "new" | null>(null);
  const [editMode, setEditMode] = useState<boolean>(false);

  // Estado do Formulário de Insumo (strings nos campos numéricos para permitir limpar e digitar livremente)
  const [proximoCod, setProximoCod] = useState("INS-001");
  const [formCodigo, setFormCodigo] = useState("");
  const [formNome, setFormNome] = useState("");
  const [formCategoria, setFormCategoria] = useState<Insumo["categoria"]>("ingrediente");
  const [formStatus, setFormStatus] = useState<"ativo" | "inativo">("ativo");
  const [formMarca, setFormMarca] = useState("");
  const [formFornecedorId, setFormFornecedorId] = useState<number | null>(null);
  const [formLocalArmazenamento, setFormLocalArmazenamento] = useState("");
  const [formObservacoes, setFormObservacoes] = useState("");
  const [formUnidadeCompra, setFormUnidadeCompra] = useState<Insumo["unidadeCompra"]>("g");
  const [formUnidadeMedida, setFormUnidadeMedida] = useState<Insumo["unidadeMedida"]>("g");
  const [formQtdEmbalagem, setFormQtdEmbalagem] = useState<string>("1000");
  const [formPrecoCompra, setFormPrecoCompra] = useState<string>("");
  const [formEstoqueAtual, setFormEstoqueAtual] = useState<string>("0");
  const [formEstoqueMinimo, setFormEstoqueMinimo] = useState<string>("0");

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Modal de Movimentação Rápida de Estoque (Entrada / Saída / Inventário)
  const [modalMovimentoAberto, setModalMovimentoAberto] = useState(false);
  const [movTipo, setMovTipo] = useState<"entrada" | "saida" | "ajuste">("entrada");
  const [movModoUnidade, setMovModoUnidade] = useState<"embalagem" | "base">("embalagem");
  const [movQuantidade, setMovQuantidade] = useState<string>("1");
  const [movNovoPreco, setMovNovoPreco] = useState<string>("");
  const [movMotivo, setMovMotivo] = useState<string>("");
  const [movSalvando, setMovSalvando] = useState(false);
  const [movErro, setMovErro] = useState("");

  const selecionarInsumo = (item: Insumo, manterEdicao = false) => {
    setSelectedId(item.id);
    setEditMode(manterEdicao);
    setFormCodigo(item.codigo || `INS-${String(item.id).padStart(3, "0")}`);
    setFormNome(item.nome);
    setFormCategoria(item.categoria);
    setFormStatus(item.status || "ativo");
    setFormMarca(item.marca || "");
    setFormFornecedorId(item.fornecedorId ?? null);
    setFormLocalArmazenamento(item.localArmazenamento || "");
    setFormObservacoes(item.observacoes || "");
    setFormUnidadeCompra(item.unidadeCompra);
    setFormUnidadeMedida(item.unidadeMedida);
    setFormQtdEmbalagem(String(item.quantidadeEmbalagem));
    setFormPrecoCompra(String(item.precoCompra));
    setFormEstoqueAtual(String(item.estoqueAtual));
    setFormEstoqueMinimo(String(item.estoqueMinimo));
    setFormError("");
  };

  const carregarDados = async (idParaSelecionar?: number | "new" | null) => {
    setLoading(true);
    try {
      const [listaInsumos, listaFornec, proxCodigo] = await Promise.all([
        fetchInsumos(),
        fetchFornecedores(),
        fetchProximoCodigoInsumo(),
      ]);
      setInsumos(listaInsumos);
      setFornecedores(listaFornec);
      setProximoCod(proxCodigo);

      const alvoId = idParaSelecionar !== undefined ? idParaSelecionar : selectedId;
      if (alvoId && alvoId !== "new") {
        const encontrado = listaInsumos.find((i) => i.id === alvoId);
        if (encontrado) {
          selecionarInsumo(encontrado, false);
          return;
        }
      }
      if (listaInsumos.length > 0 && (alvoId === null || alvoId === undefined)) {
        selecionarInsumo(listaInsumos[0], false);
      }
    } catch (err: any) {
      onAction(err?.message || "Erro ao carregar estoque.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados(null);
  }, []);

  const iniciarNovoInsumo = async () => {
    let codigoNovo = proximoCod;
    try {
      codigoNovo = await fetchProximoCodigoInsumo();
      setProximoCod(codigoNovo);
    } catch {
      // Usa proximoCod em cache
    }
    setSelectedId("new");
    setEditMode(true);
    setFormCodigo(codigoNovo);
    setFormNome("");
    setFormCategoria("ingrediente");
    setFormStatus("ativo");
    setFormMarca("");
    setFormFornecedorId(null);
    setFormLocalArmazenamento("");
    setFormObservacoes("");
    setFormUnidadeCompra("g");
    setFormUnidadeMedida("g");
    setFormQtdEmbalagem("1000");
    setFormPrecoCompra("");
    setFormEstoqueAtual("0");
    setFormEstoqueMinimo("0");
    setFormError("");
  };

  // Valores numéricos convertidos do formulário
  const qtdEmbalagemNum = parseNumeroFlex(formQtdEmbalagem);
  const precoCompraNum = parseNumeroFlex(formPrecoCompra);
  const estoqueAtualNum = parseNumeroFlex(formEstoqueAtual);
  const estoqueMinimoNum = parseNumeroFlex(formEstoqueMinimo);

  // Cálculo do fator de conversão e custo unitário em tempo real
  const { fatorConversao, qtdTotalBasePreview, custoUnitarioPreview } = useMemo(() => {
    let fator = 1;
    if (formUnidadeCompra === "kg" && formUnidadeMedida === "g") fator = 1000;
    else if (formUnidadeCompra === "g" && formUnidadeMedida === "kg") fator = 0.001;
    else if (formUnidadeCompra === "l" && formUnidadeMedida === "ml") fator = 1000;
    else if (formUnidadeCompra === "ml" && formUnidadeMedida === "l") fator = 0.001;

    const totalBase = Math.max(0, qtdEmbalagemNum * fator);
    const custoUnit = totalBase > 0 && precoCompraNum > 0 ? precoCompraNum / totalBase : 0;
    return {
      fatorConversao: fator,
      qtdTotalBasePreview: totalBase,
      custoUnitarioPreview: custoUnit,
    };
  }, [formUnidadeCompra, formUnidadeMedida, qtdEmbalagemNum, precoCompraNum]);

  const equivalenciaEmbalagens =
    qtdTotalBasePreview > 0 ? Math.round((estoqueAtualNum / qtdTotalBasePreview) * 10) / 10 : 0;
  const valorFinanceiroItem = Math.max(0, estoqueAtualNum) * custoUnitarioPreview;

  const insumoSelecionado = useMemo(
    () => (selectedId !== "new" && selectedId != null ? insumos.find((i) => i.id === selectedId) ?? null : null),
    [insumos, selectedId],
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!formNome.trim()) {
      setFormError("Informe o nome do insumo ou matéria-prima.");
      return;
    }
    if (qtdEmbalagemNum <= 0) {
      setFormError("A quantidade na embalagem deve ser maior que zero.");
      return;
    }
    if (precoCompraNum <= 0) {
      setFormError("O preço pago na embalagem deve ser maior que zero.");
      return;
    }

    setSaving(true);
    try {
      const payload: InsumoInput = {
        id: selectedId === "new" || selectedId == null ? undefined : selectedId,
        codigo: formCodigo.trim() || undefined,
        nome: formNome.trim(),
        categoria: formCategoria,
        status: formStatus,
        marca: formMarca.trim() || undefined,
        fornecedorId: formFornecedorId,
        localArmazenamento: formLocalArmazenamento.trim() || undefined,
        observacoes: formObservacoes.trim() || undefined,
        unidadeCompra: formUnidadeCompra,
        unidadeMedida: formUnidadeMedida,
        quantidadeEmbalagem: qtdEmbalagemNum,
        precoCompra: precoCompraNum,
        estoqueAtual: estoqueAtualNum,
        estoqueMinimo: Math.max(0, estoqueMinimoNum),
      };

      const salvo = await saveInsumo(payload);
      onAction(
        selectedId === "new"
          ? `Insumo "${salvo.nome}" cadastrado com sucesso!`
          : `Insumo "${salvo.nome}" atualizado com sucesso!`,
      );
      await carregarDados(salvo.id);
    } catch (err: any) {
      setFormError(err?.message || "Erro ao salvar insumo.");
    } finally {
      setSaving(false);
    }
  };

  const handleExcluir = async (id: number) => {
    const alvo = insumos.find((i) => i.id === id);
    if (!confirm(`Deseja realmente excluir o insumo "${alvo?.nome || id}"?`)) return;
    try {
      await deleteInsumo(id);
      onAction("Insumo excluído com sucesso.");
      setSelectedId(null);
      setEditMode(false);
      await carregarDados(null);
    } catch (err: any) {
      setFormError(err?.message || "Não foi possível excluir o insumo.");
    }
  };

  const abrirModalMovimento = (tipoInicial: "entrada" | "saida" | "ajuste" = "entrada") => {
    if (!insumoSelecionado) return;
    setMovTipo(tipoInicial);
    setMovModoUnidade(tipoInicial === "entrada" ? "embalagem" : "base");
    setMovQuantidade(tipoInicial === "entrada" ? "1" : "");
    setMovNovoPreco(String(insumoSelecionado.precoCompra));
    setMovMotivo("");
    setMovErro("");
    setModalMovimentoAberto(true);
  };

  const handleConfirmarMovimento = async (e: FormEvent) => {
    e.preventDefault();
    if (!insumoSelecionado) return;
    setMovErro("");

    const qtd = parseNumeroFlex(movQuantidade);
    if ((movTipo !== "ajuste" && qtd <= 0) || (movTipo === "ajuste" && qtd < 0)) {
      setMovErro("Informe uma quantidade válida para a movimentação.");
      return;
    }

    const novoPreco = movTipo === "entrada" ? parseNumeroFlex(movNovoPreco) : undefined;

    setMovSalvando(true);
    try {
      const atualizado = await ajustarEstoqueInsumoApi(insumoSelecionado.id, {
        tipo: movTipo,
        quantidade: qtd,
        modoUnidade: movModoUnidade,
        novoPrecoCompra: novoPreco && novoPreco > 0 ? novoPreco : undefined,
        motivo: movMotivo.trim() || undefined,
      });

      setModalMovimentoAberto(false);
      onAction(`Estoque de "${atualizado.nome}" atualizado para ${atualizado.estoqueAtual} ${atualizado.unidadeMedida}!`);
      await carregarDados(atualizado.id);
    } catch (err: any) {
      setMovErro(err?.message || "Erro ao movimentar estoque.");
    } finally {
      setMovSalvando(false);
    }
  };

  const exportarCsv = () => {
    const cabecalho = [
      "codigo",
      "nome",
      "categoria",
      "marca",
      "fornecedor",
      "local_armazenamento",
      "embalagem_compra",
      "preco_pago",
      "custo_unitario",
      "estoque_atual",
      "estoque_minimo",
      "status",
    ];
    const linhas = insumos.map((i) =>
      [
        i.codigo || "",
        i.nome,
        i.categoria,
        i.marca || "",
        i.fornecedorNome || "",
        i.localArmazenamento || "",
        `${i.quantidadeEmbalagem} ${i.unidadeCompra}`,
        i.precoCompra.toFixed(2),
        i.custoUnitario.toFixed(4),
        `${i.estoqueAtual} ${i.unidadeMedida}`,
        `${i.estoqueMinimo} ${i.unidadeMedida}`,
        i.status || "ativo",
      ]
        .map((v) => `"${String(v).replaceAll('"', '""')}"`)
        .join(";"),
    );
    const blob = new Blob([[cabecalho.join(";"), ...linhas].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "estoque_insumos.csv";
    a.click();
    URL.revokeObjectURL(url);
    onAction("Lista de insumos exportada em CSV.");
  };

  const insumosFiltrados = useMemo(() => {
    const termo = query.trim().toLowerCase();
    return insumos.filter((item) => {
      const bateTexto =
        !termo ||
        item.nome.toLowerCase().includes(termo) ||
        (item.codigo && item.codigo.toLowerCase().includes(termo)) ||
        (item.marca && item.marca.toLowerCase().includes(termo)) ||
        (item.fornecedorNome && item.fornecedorNome.toLowerCase().includes(termo));

      const critico = (item.estoqueMinimo > 0 && item.estoqueAtual <= item.estoqueMinimo) || item.estoqueAtual <= 0;
      const bateCat =
        filtroCategoria === "todos"
          ? true
          : filtroCategoria === "criticos"
          ? critico
          : item.categoria === filtroCategoria;

      return bateTexto && bateCat;
    });
  }, [insumos, query, filtroCategoria]);

  // Indicadores Gerais de Estoque
  const insumosCriticos = useMemo(
    () => insumos.filter((i) => (i.estoqueMinimo > 0 && i.estoqueAtual <= i.estoqueMinimo) || i.estoqueAtual <= 0).length,
    [insumos],
  );

  const valorTotalEstoque = useMemo(
    () => insumos.reduce((acc, i) => acc + Math.max(0, i.estoqueAtual) * i.custoUnitario, 0),
    [insumos],
  );

  // Simulação de saldo para a modal de movimentação rápida
  const previewSaldoMovimento = useMemo(() => {
    if (!insumoSelecionado) return 0;
    const qtd = parseNumeroFlex(movQuantidade);
    let fator = 1;
    if (insumoSelecionado.unidadeCompra === "kg" && insumoSelecionado.unidadeMedida === "g") fator = 1000;
    else if (insumoSelecionado.unidadeCompra === "l" && insumoSelecionado.unidadeMedida === "ml") fator = 1000;
    const baseEmb = insumoSelecionado.quantidadeEmbalagem * fator;
    const delta = movModoUnidade === "embalagem" ? qtd * baseEmb : qtd;
    if (movTipo === "entrada") return Math.round((insumoSelecionado.estoqueAtual + delta) * 1000) / 1000;
    if (movTipo === "saida") return Math.round((insumoSelecionado.estoqueAtual - delta) * 1000) / 1000;
    return Math.round(delta * 1000) / 1000;
  }, [insumoSelecionado, movQuantidade, movModoUnidade, movTipo]);

  return (
    <>
      <section className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-dot" /> suprimentos & compras
          </div>
          <h1>
            Estoque e Insumos <span className="heading-count">{insumos.length}</span>
          </h1>
          <p>
            Consulte saldos, cadastre matérias-primas e embalagens, vincule fornecedores e acompanhe o custo nas receitas.
          </p>
        </div>
        <div className="heading-actions">
          <button className="button secondary" onClick={() => carregarDados(selectedId)} title="Atualizar lista">
            <RefreshCw size={15} /> Atualizar
          </button>
          <button className="button secondary" onClick={exportarCsv}>
            <Download size={16} /> Exportar
          </button>
          <button className="button primary" onClick={iniciarNovoInsumo}>
            <Plus size={17} /> Novo insumo
          </button>
        </div>
      </section>

      {/* Cards de Resumo de Estoque para o Dono do Negócio */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <div className="panel" style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "var(--c-primary-soft)",
              color: "var(--c-primary)",
              display: "grid",
              placeItems: "center",
            }}
          >
            <Package size={20} />
          </div>
          <div>
            <span style={{ fontSize: "11px", color: "var(--c-muted)", fontWeight: 600 }}>Total de Insumos</span>
            <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--c-text)" }}>{insumos.length} itens</div>
          </div>
        </div>

        <div className="panel" style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "#e9f5ee",
              color: "#2e7d32",
              display: "grid",
              placeItems: "center",
            }}
          >
            <DollarSign size={20} />
          </div>
          <div>
            <span style={{ fontSize: "11px", color: "var(--c-muted)", fontWeight: 600 }}>Capital em Estoque</span>
            <div style={{ fontSize: "18px", fontWeight: 800, color: "#2e7d32" }}>
              R$ {valorTotalEstoque.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setFiltroCategoria(filtroCategoria === "criticos" ? "todos" : "criticos")}
          className="panel"
          style={{
            padding: "14px 18px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            textAlign: "left",
            cursor: "pointer",
            border: filtroCategoria === "criticos" ? "2px solid #c62828" : undefined,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: insumosCriticos > 0 ? "#fbecef" : "#f3f4f6",
              color: insumosCriticos > 0 ? "#c62828" : "#6b7280",
              display: "grid",
              placeItems: "center",
            }}
          >
            <AlertTriangle size={20} />
          </div>
          <div>
            <span style={{ fontSize: "11px", color: "var(--c-muted)", fontWeight: 600 }}>Alerta de Reposição</span>
            <div style={{ fontSize: "18px", fontWeight: 800, color: insumosCriticos > 0 ? "#c62828" : "var(--c-text)" }}>
              {insumosCriticos} {insumosCriticos === 1 ? "item crítico" : "itens críticos"}
            </div>
          </div>
        </button>
      </div>

      <section className="employee-layout">
        {/* Painel Esquerdo: Lista e Filtros */}
        <div className="panel employee-list-panel">
          <div className="panel-heading" style={{ flexDirection: "column", alignItems: "stretch", gap: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div className="section-kicker">Itens Cadastrados</div>
                <h2>Matérias-Primas & Embalagens</h2>
              </div>
            </div>
            <div className="employee-filter" style={{ flexWrap: "wrap" }}>
              {(
                [
                  { id: "todos", label: "Todos" },
                  { id: "ingrediente", label: "Ingredientes" },
                  { id: "embalagem", label: "Embalagens" },
                  { id: "decoracao", label: "Decoração" },
                  { id: "outro", label: "Outros" },
                  { id: "criticos", label: `Repor (${insumosCriticos})` },
                ] as const
              ).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={filtroCategoria === cat.id ? "active" : ""}
                  onClick={() => setFiltroCategoria(cat.id)}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="search-box">
            <Search size={16} />
            <input
              placeholder="Buscar por nome, código (INS-), marca ou fornecedor..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="employee-list">
            {loading ? <div className="employee-empty">Carregando insumos...</div> : null}
            {!loading && insumosFiltrados.length === 0 ? (
              <div className="employee-empty">Nenhum insumo encontrado para este filtro.</div>
            ) : null}

            {insumosFiltrados.map((item) => {
              const ativo = selectedId === item.id;
              const critico = (item.estoqueMinimo > 0 && item.estoqueAtual <= item.estoqueMinimo) || item.estoqueAtual <= 0;

              return (
                <button
                  key={item.id}
                  type="button"
                  className={`employee-row ${ativo ? "selected" : ""}`}
                  onClick={() => selecionarInsumo(item, false)}
                >
                  <div
                    className="employee-avatar"
                    style={{
                      background: item.categoria === "embalagem" ? "#edf3fa" : "var(--c-primary-soft)",
                      color: item.categoria === "embalagem" ? "#6982a3" : "var(--c-primary)",
                    }}
                  >
                    <Package size={17} />
                  </div>
                  <div className="employee-row-copy">
                    <strong>{item.nome}</strong>
                    <span>
                      {item.codigo ? `${item.codigo} • ` : ""}
                      {item.marca ? `${item.marca} • ` : ""}
                      {item.fornecedorNome ? `${item.fornecedorNome} • ` : ""}
                      {item.quantidadeEmbalagem} {item.unidadeCompra} (R$ {item.precoCompra.toFixed(2)})
                    </span>
                  </div>
                  <div style={{ textAlign: "right", marginLeft: "auto" }}>
                    <div style={{ fontSize: "11px", fontWeight: "bold", color: critico ? "#bd6a6a" : "var(--c-text)" }}>
                      {item.estoqueAtual} {item.unidadeMedida}
                    </div>
                    {critico && (
                      <span
                        style={{
                          fontSize: "9px",
                          background: "#fbecef",
                          color: "#bd6a6a",
                          padding: "1px 5px",
                          borderRadius: "4px",
                          fontWeight: 700,
                        }}
                      >
                        {item.estoqueAtual <= 0 ? "Zerado!" : "Repor!"}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Painel Direito: Consulta, Cadastro e Edição */}
        <div className="employee-detail panel">
          {selectedId == null && !loading ? (
            <div className="employee-empty" style={{ padding: "60px 20px" }}>
              <Package size={36} style={{ color: "#d0c7c1", margin: "0 auto 12px" }} />
              <strong>Selecione um insumo ao lado</strong>
              <p>Ou clique em "Novo insumo" para cadastrar matéria-prima ou embalagem.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="employee-detail-head">
                <div className="detail-title">
                  <div
                    className="employee-avatar"
                    style={{
                      background: "var(--c-primary-soft)",
                      color: "var(--c-primary)",
                      width: "44px",
                      height: "44px",
                    }}
                  >
                    <Boxes size={22} />
                  </div>
                  <div>
                    <span className="live-pill">
                      {selectedId === "new" ? "NOVO CADASTRO" : formCategoria.toUpperCase()}
                    </span>
                    <h2>{formNome || "Novo Insumo"}</h2>
                    <p>
                      {formCodigo || proximoCod}
                      {formMarca ? ` • Marca: ${formMarca}` : ""}
                      {insumoSelecionado?.fornecedorNome ? ` • Fornecedor: ${insumoSelecionado.fornecedorNome}` : ""}
                    </p>
                  </div>
                </div>

                <div className="detail-actions">
                  {!editMode && selectedId !== "new" && selectedId != null ? (
                    <>
                      <button
                        type="button"
                        className="button secondary"
                        onClick={() => abrirModalMovimento("entrada")}
                        style={{ color: "#2e7d32", borderColor: "#c8e6c9", background: "#f1f8e9" }}
                        title="Dar entrada ou baixa rápida no saldo de estoque"
                      >
                        <ArrowUpCircle size={14} /> Movimentar Estoque
                      </button>
                      <button
                        type="button"
                        className="button secondary"
                        onClick={() => handleExcluir(selectedId)}
                        style={{ color: "var(--c-danger)" }}
                      >
                        <Trash2 size={14} /> Excluir
                      </button>
                      <button
                        type="button"
                        className="button primary"
                        onClick={() => setEditMode(true)}
                      >
                        <Pencil size={14} /> Editar insumo
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="button secondary"
                        onClick={() => {
                          if (selectedId !== "new" && selectedId != null) {
                            const atual = insumos.find((i) => i.id === selectedId);
                            if (atual) {
                              selecionarInsumo(atual, false);
                            } else {
                              setEditMode(false);
                            }
                          } else if (insumos.length > 0) {
                            selecionarInsumo(insumos[0], false);
                          } else {
                            setSelectedId(null);
                            setEditMode(false);
                          }
                          setFormError("");
                        }}
                      >
                        Cancelar
                      </button>
                      {selectedId !== "new" && selectedId != null ? (
                        <button
                          type="button"
                          className="button secondary"
                          onClick={() => handleExcluir(selectedId)}
                          style={{ color: "var(--c-danger)" }}
                        >
                          <Trash2 size={14} /> Excluir
                        </button>
                      ) : null}
                      <button type="submit" disabled={saving} className="button primary">
                        <Check size={14} /> {saving ? "Salvando..." : "Salvar insumo"}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {formError && (
                <div
                  style={{
                    padding: "10px 14px",
                    margin: "14px 0",
                    background: "#fdf2f2",
                    color: "#991b1b",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                >
                  {formError}
                </div>
              )}

              {/* Cards de Métricas do Insumo (.detail-stat-grid) */}
              <div className="detail-stat-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
                <div>
                  <span>Custo Base na Receita</span>
                  <strong style={{ color: "var(--c-primary)" }}>
                    R$ {custoUnitarioPreview.toFixed(4)}
                  </strong>
                  <small>
                    Por {formUnidadeMedida}
                    {formUnidadeMedida === "g"
                      ? ` (R$ ${(custoUnitarioPreview * 1000).toFixed(2)}/kg)`
                      : formUnidadeMedida === "ml"
                      ? ` (R$ ${(custoUnitarioPreview * 1000).toFixed(2)}/L)`
                      : ""}
                  </small>
                </div>
                <div>
                  <span>Preço Pago na Embalagem</span>
                  <strong>R$ {precoCompraNum.toFixed(2)}</strong>
                  <small>
                    Embalagem de {qtdEmbalagemNum || 0} {formUnidadeCompra}
                  </small>
                </div>
                <div>
                  <span>Estoque Disponível</span>
                  <strong
                    style={{
                      color:
                        (estoqueAtualNum <= estoqueMinimoNum && estoqueMinimoNum > 0) || estoqueAtualNum <= 0
                          ? "#bd6a6a"
                          : "#4fa27a",
                    }}
                  >
                    {estoqueAtualNum} {formUnidadeMedida}
                  </strong>
                  <small>
                    {equivalenciaEmbalagens > 0 ? `≈ ${equivalenciaEmbalagens} emb. • ` : ""}
                    Mín: {estoqueMinimoNum} {formUnidadeMedida}
                  </small>
                </div>
                <div>
                  <span>Valor em Estoque</span>
                  <strong style={{ color: "#2e7d32" }}>R$ {valorFinanceiroItem.toFixed(2)}</strong>
                  <small>{insumoSelecionado?.fornecedorNome || "Fornecedor não vinculado"}</small>
                </div>
              </div>

              {/* Banner Modo Consulta (Somente Leitura) */}
              {!editMode && selectedId !== "new" && (
                <div
                  style={{
                    marginTop: "14px",
                    padding: "10px 14px",
                    background: "#fcfaf8",
                    border: "1px dashed var(--c-border)",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "var(--c-muted)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "8px",
                  }}
                >
                  <span>
                    Modo de consulta (somente leitura). Clique em <b>"Editar insumo"</b> para alterar os dados cadastrais ou em{" "}
                    <b>"Movimentar Estoque"</b> para registrar entradas/baixas.
                  </span>
                  <div style={{ display: "flex", gap: "12px" }}>
                    <button
                      type="button"
                      className="text-button"
                      style={{ fontSize: "12px", color: "#2e7d32", fontWeight: 700, padding: 0 }}
                      onClick={() => abrirModalMovimento("entrada")}
                    >
                      + Entrada / Baixa
                    </button>
                    <button
                      type="button"
                      className="text-button"
                      style={{ fontSize: "12px", color: "var(--c-primary)", fontWeight: 700, padding: 0 }}
                      onClick={() => setEditMode(true)}
                    >
                      Habilitar edição
                    </button>
                  </div>
                </div>
              )}

              {/* Seções de Formulário */}
              <fieldset disabled={!editMode} style={{ border: "none", padding: 0, margin: 0, minWidth: 0 }}>
                <div className="detail-sections" style={{ marginTop: "16px" }}>
                  {/* Subpainel 1: Identificação e Fornecedor */}
                  <div className="subpanel">
                    <div className="subpanel-head">
                      <div>
                        <div className="section-kicker">Dados do Insumo</div>
                        <h3>Identificação & Fornecedor</h3>
                      </div>
                    </div>
                    <div style={{ display: "grid", gap: "12px", marginTop: "12px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "10px" }}>
                        <div className="field">
                          <label>Código Interno</label>
                          <input
                            value={formCodigo}
                            onChange={(e) => setFormCodigo(e.target.value)}
                            placeholder="INS-001"
                          />
                        </div>
                        <div className="field">
                          <label>Nome do Insumo / Matéria-Prima *</label>
                          <input
                            value={formNome}
                            onChange={(e) => setFormNome(e.target.value)}
                            placeholder="Ex: Leite Condensado 395g, Chocolate Nobre 50%..."
                            required
                          />
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 120px", gap: "10px" }}>
                        <div className="field">
                          <label>Categoria *</label>
                          <select
                            value={formCategoria}
                            onChange={(e) => {
                              const novaCat = e.target.value as Insumo["categoria"];
                              setFormCategoria(novaCat);
                              if (selectedId === "new" && novaCat === "embalagem") {
                                setFormUnidadeCompra("un");
                                setFormUnidadeMedida("un");
                                if (formQtdEmbalagem === "1000") setFormQtdEmbalagem("100");
                              }
                            }}
                          >
                            <option value="ingrediente">Ingrediente</option>
                            <option value="embalagem">Embalagem</option>
                            <option value="decoracao">Decoração</option>
                            <option value="outro">Outro</option>
                          </select>
                        </div>
                        <div className="field">
                          <label>Marca / Fabricante</label>
                          <input
                            value={formMarca}
                            onChange={(e) => setFormMarca(e.target.value)}
                            placeholder="Ex: Nestlé, Melken, Callebaut..."
                          />
                        </div>
                        <div className="field">
                          <label>Status</label>
                          <select
                            value={formStatus}
                            onChange={(e) => setFormStatus(e.target.value as "ativo" | "inativo")}
                          >
                            <option value="ativo">Ativo</option>
                            <option value="inativo">Inativo</option>
                          </select>
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                        <div className="field">
                          <label>
                            <Truck size={12} style={{ display: "inline", marginRight: 4 }} />
                            Fornecedor Parceiro
                          </label>
                          <select
                            value={formFornecedorId ?? ""}
                            onChange={(e) => setFormFornecedorId(e.target.value ? Number(e.target.value) : null)}
                          >
                            <option value="">Selecione o fornecedor (opcional)...</option>
                            {fornecedores.map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.nomeFantasia || f.razaoSocial} ({f.codigo})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="field">
                          <label>Local de Armazenamento</label>
                          <input
                            list="locais-armazenamento-list"
                            value={formLocalArmazenamento}
                            onChange={(e) => setFormLocalArmazenamento(e.target.value)}
                            placeholder="Ex: Estoque Seco, Geladeira, Freezer..."
                          />
                          <datalist id="locais-armazenamento-list">
                            <option value="Estoque Seco / Prateleira" />
                            <option value="Geladeira / Refrigerado" />
                            <option value="Freezer / Congelado" />
                            <option value="Armário de Embalagens" />
                            <option value="Bancada de Produção" />
                          </datalist>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Subpainel 2: Compra, Conversão de Embalagem & Controle de Saldo */}
                  <div className="subpanel">
                    <div className="subpanel-head">
                      <div>
                        <div className="section-kicker">Conversor Universal</div>
                        <h3>Compra, Fracionamento & Saldo</h3>
                      </div>
                    </div>
                    <div style={{ display: "grid", gap: "12px", marginTop: "12px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                        <div className="field">
                          <label>Qtd na Embalagem *</label>
                          <input
                            type="number"
                            step="any"
                            min="0.001"
                            value={formQtdEmbalagem}
                            onChange={(e) => setFormQtdEmbalagem(e.target.value)}
                            placeholder="Ex: 395, 1, 100"
                            required
                          />
                        </div>
                        <div className="field">
                          <label>Unidade de Compra *</label>
                          <select
                            value={formUnidadeCompra}
                            onChange={(e) => {
                              const u = e.target.value as Insumo["unidadeCompra"];
                              setFormUnidadeCompra(u);
                              if (u === "kg") setFormUnidadeMedida("g");
                              else if (u === "l") setFormUnidadeMedida("ml");
                              else setFormUnidadeMedida(u);
                            }}
                          >
                            <option value="g">gramas (g)</option>
                            <option value="kg">quilos (kg)</option>
                            <option value="ml">mililitros (ml)</option>
                            <option value="l">litros (L)</option>
                            <option value="un">unidades (un)</option>
                          </select>
                        </div>
                        <div className="field">
                          <label>Unidade de Uso (Receita)</label>
                          <select
                            value={formUnidadeMedida}
                            onChange={(e) => setFormUnidadeMedida(e.target.value as Insumo["unidadeMedida"])}
                          >
                            <option value="g">gramas (g)</option>
                            <option value="ml">mililitros (ml)</option>
                            <option value="un">unidades (un)</option>
                            <option value="kg">quilos (kg)</option>
                            <option value="l">litros (L)</option>
                          </select>
                        </div>
                      </div>

                      <div className="field">
                        <label>Preço Pago na Embalagem (R$) *</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={formPrecoCompra}
                          onChange={(e) => setFormPrecoCompra(e.target.value)}
                          placeholder="Ex: 6.89"
                          required
                          style={{ fontSize: "16px", fontWeight: "bold", color: "var(--c-text)" }}
                        />
                        {qtdEmbalagemNum > 0 && precoCompraNum > 0 && (
                          <small
                            style={{
                              display: "block",
                              marginTop: "4px",
                              padding: "6px 10px",
                              borderRadius: "6px",
                              background: "#fcf8f5",
                              border: "1px solid #f0e4dc",
                              color: "#5b4f49",
                              fontSize: "11px",
                            }}
                          >
                            1 embalagem de <b>{qtdEmbalagemNum} {formUnidadeCompra}</b> por{" "}
                            <b>R$ {precoCompraNum.toFixed(2)}</b> rende{" "}
                            <b>{qtdTotalBasePreview} {formUnidadeMedida}</b> para uso nas fichas técnicas (Custo:{" "}
                            <b style={{ color: "var(--c-primary)" }}>
                              R$ {custoUnitarioPreview.toFixed(4)} / {formUnidadeMedida}
                            </b>
                            ).
                          </small>
                        )}
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                        <div className="field">
                          <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span>Estoque Atual ({formUnidadeMedida})</span>
                            {editMode && qtdTotalBasePreview > 0 && (
                              <span style={{ display: "flex", gap: "6px" }}>
                                <button
                                  type="button"
                                  className="text-button"
                                  style={{ fontSize: "10px", color: "var(--c-primary)", padding: 0 }}
                                  onClick={() =>
                                    setFormEstoqueAtual(
                                      String(Math.round((estoqueAtualNum + qtdTotalBasePreview) * 1000) / 1000),
                                    )
                                  }
                                  title={`Adicionar 1 embalagem (+${qtdTotalBasePreview} ${formUnidadeMedida})`}
                                >
                                  +1 emb.
                                </button>
                                <button
                                  type="button"
                                  className="text-button"
                                  style={{ fontSize: "10px", color: "var(--c-primary)", padding: 0 }}
                                  onClick={() =>
                                    setFormEstoqueAtual(
                                      String(Math.round((estoqueAtualNum + qtdTotalBasePreview * 5) * 1000) / 1000),
                                    )
                                  }
                                  title={`Adicionar 5 embalagens (+${qtdTotalBasePreview * 5} ${formUnidadeMedida})`}
                                >
                                  +5 emb.
                                </button>
                              </span>
                            )}
                          </label>
                          <input
                            type="number"
                            step="any"
                            value={formEstoqueAtual}
                            onChange={(e) => setFormEstoqueAtual(e.target.value)}
                          />
                        </div>
                        <div className="field">
                          <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span>Estoque Mínimo ({formUnidadeMedida})</span>
                            {editMode && qtdTotalBasePreview > 0 && (
                              <button
                                type="button"
                                className="text-button"
                                style={{ fontSize: "10px", color: "var(--c-muted)", padding: 0 }}
                                onClick={() => setFormEstoqueMinimo(String(qtdTotalBasePreview))}
                                title="Definir estoque mínimo equivalente a 1 embalagem"
                              >
                                Usar 1 emb.
                              </button>
                            )}
                          </label>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={formEstoqueMinimo}
                            onChange={(e) => setFormEstoqueMinimo(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Observações */}
                <div className="subpanel" style={{ marginTop: "12px" }}>
                  <div className="field">
                    <label>Observações / Notas de Compra e Armazenamento</label>
                    <textarea
                      rows={2}
                      value={formObservacoes}
                      onChange={(e) => setFormObservacoes(e.target.value)}
                      placeholder="Ex: Comprar apenas lote com no mínimo 60 dias de validade; conservar em local fresco..."
                    />
                  </div>
                </div>
              </fieldset>

              {/* Seção de Rastreabilidade: Produtos / Fichas Técnicas que usam este insumo */}
              {selectedId !== "new" && insumoSelecionado && (
                <div className="subpanel" style={{ marginTop: "16px" }}>
                  <div className="subpanel-head">
                    <div>
                      <div className="section-kicker">Rastreabilidade de Fichas Técnicas</div>
                      <h3>
                        <ChefHat size={15} style={{ display: "inline", marginRight: 6, color: "var(--c-primary)" }} />
                        Produtos que utilizam este insumo ({insumoSelecionado.produtosVinculados?.length ?? 0})
                      </h3>
                    </div>
                  </div>

                  {!insumoSelecionado.produtosVinculados || insumoSelecionado.produtosVinculados.length === 0 ? (
                    <p style={{ fontSize: "12px", color: "var(--c-muted)", margin: "10px 0 0" }}>
                      Este insumo ainda não foi vinculado a nenhuma ficha técnica de produto acabado.
                    </p>
                  ) : (
                    <div style={{ marginTop: "10px", border: "1px solid var(--c-border)", borderRadius: "8px", overflow: "hidden" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                        <thead>
                          <tr style={{ background: "#fcfaf8", borderBottom: "1px solid var(--c-border)", textAlign: "left" }}>
                            <th style={{ padding: "8px 12px" }}>Código</th>
                            <th style={{ padding: "8px 12px" }}>Produto Acabado</th>
                            <th style={{ padding: "8px 12px", textAlign: "right" }}>Qtd na Receita</th>
                            <th style={{ padding: "8px 12px", textAlign: "right" }}>Custo Rateado Atual</th>
                          </tr>
                        </thead>
                        <tbody>
                          {insumoSelecionado.produtosVinculados.map((pv) => (
                            <tr key={pv.id} style={{ borderBottom: "1px solid #f5efe9" }}>
                              <td style={{ padding: "8px 12px", fontWeight: 700, color: "var(--c-muted)" }}>{pv.codigo}</td>
                              <td style={{ padding: "8px 12px", fontWeight: 600 }}>{pv.nome}</td>
                              <td style={{ padding: "8px 12px", textAlign: "right" }}>
                                {pv.quantidade} {pv.unidade}
                              </td>
                              <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, color: "var(--c-primary)" }}>
                                R$ {(pv.quantidade * custoUnitarioPreview).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* BARRA DE AÇÕES INFERIOR: Visível no modo de edição/cadastro */}
              {editMode && (
                <div className="form-actions-bar" style={{ marginTop: "24px" }}>
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => {
                      if (selectedId !== "new" && selectedId != null) {
                        const atual = insumos.find((i) => i.id === selectedId);
                        if (atual) {
                          selecionarInsumo(atual, false);
                        } else {
                          setEditMode(false);
                        }
                      } else if (insumos.length > 0) {
                        selecionarInsumo(insumos[0], false);
                      } else {
                        setSelectedId(null);
                        setEditMode(false);
                      }
                      setFormError("");
                    }}
                    disabled={saving}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="button primary" disabled={saving}>
                    <Check size={16} /> {saving ? "Salvando..." : "Salvar insumo"}
                  </button>
                </div>
              )}
            </form>
          )}
        </div>
      </section>

      {/* MODAL DE MOVIMENTAÇÃO RÁPIDA DE ESTOQUE */}
      {modalMovimentoAberto && insumoSelecionado && (
        <div className="modal-backdrop">
          <div className="modal-window" style={{ maxWidth: "520px" }}>
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div className="brand-mark" style={{ width: "32px", height: "32px" }}>
                  <Boxes size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0 }}>Movimentar Estoque — {insumoSelecionado.nome}</h3>
                  <small style={{ color: "var(--c-muted)", fontSize: "11px" }}>
                    Saldo atual: <b>{insumoSelecionado.estoqueAtual} {insumoSelecionado.unidadeMedida}</b> (Embalagem:{" "}
                    {insumoSelecionado.quantidadeEmbalagem} {insumoSelecionado.unidadeCompra})
                  </small>
                </div>
              </div>
              <button type="button" onClick={() => setModalMovimentoAberto(false)} className="modal-close">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleConfirmarMovimento} style={{ padding: "20px" }}>
              {movErro && (
                <div
                  style={{
                    padding: "10px 14px",
                    marginBottom: "14px",
                    background: "#fdf2f2",
                    color: "#991b1b",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                >
                  {movErro}
                </div>
              )}

              {/* Seleção do Tipo de Movimento */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "16px" }}>
                <button
                  type="button"
                  onClick={() => {
                    setMovTipo("entrada");
                    setMovModoUnidade("embalagem");
                    setMovQuantidade("1");
                  }}
                  style={{
                    padding: "10px",
                    borderRadius: "8px",
                    border: movTipo === "entrada" ? "2px solid #2e7d32" : "1px solid var(--c-border)",
                    background: movTipo === "entrada" ? "#e8f5e9" : "#fff",
                    color: movTipo === "entrada" ? "#2e7d32" : "var(--c-text)",
                    fontWeight: 700,
                    fontSize: "12px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  <ArrowUpCircle size={15} /> Entrada (+)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMovTipo("saida");
                    setMovModoUnidade("base");
                    setMovQuantidade("");
                  }}
                  style={{
                    padding: "10px",
                    borderRadius: "8px",
                    border: movTipo === "saida" ? "2px solid #c62828" : "1px solid var(--c-border)",
                    background: movTipo === "saida" ? "#ffebee" : "#fff",
                    color: movTipo === "saida" ? "#c62828" : "var(--c-text)",
                    fontWeight: 700,
                    fontSize: "12px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  <ArrowDownCircle size={15} /> Baixa / Perda (-)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMovTipo("ajuste");
                    setMovModoUnidade("base");
                    setMovQuantidade(String(insumoSelecionado.estoqueAtual));
                  }}
                  style={{
                    padding: "10px",
                    borderRadius: "8px",
                    border: movTipo === "ajuste" ? "2px solid #0288d1" : "1px solid var(--c-border)",
                    background: movTipo === "ajuste" ? "#e1f5fe" : "#fff",
                    color: movTipo === "ajuste" ? "#0288d1" : "var(--c-text)",
                    fontWeight: 700,
                    fontSize: "12px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  <RefreshCw size={14} /> Inventário (=)
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                <div className="field">
                  <label>Informar quantidade em:</label>
                  <select
                    value={movModoUnidade}
                    onChange={(e) => setMovModoUnidade(e.target.value as "embalagem" | "base")}
                  >
                    <option value="embalagem">
                      Embalagens fechadas ({insumoSelecionado.quantidadeEmbalagem} {insumoSelecionado.unidadeCompra})
                    </option>
                    <option value="base">
                      Unidade direta de estoque ({insumoSelecionado.unidadeMedida})
                    </option>
                  </select>
                </div>

                <div className="field">
                  <label>
                    {movTipo === "ajuste" ? "Novo Saldo Contado *" : "Quantidade *"} (
                    {movModoUnidade === "embalagem" ? "embalagens" : insumoSelecionado.unidadeMedida})
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={movQuantidade}
                    onChange={(e) => setMovQuantidade(e.target.value)}
                    placeholder="Ex: 2"
                    required
                    autoFocus
                  />
                </div>
              </div>

              {movTipo === "entrada" && (
                <div className="field" style={{ marginBottom: "14px" }}>
                  <label>Preço Pago por Embalagem nesta Compra (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={movNovoPreco}
                    onChange={(e) => setMovNovoPreco(e.target.value)}
                    placeholder={String(insumoSelecionado.precoCompra)}
                  />
                  <small style={{ fontSize: "11px", color: "var(--c-muted)" }}>
                    Se o preço da embalagem mudou, as receitas vinculadas serão recalculadas automaticamente.
                  </small>
                </div>
              )}

              <div className="field" style={{ marginBottom: "16px" }}>
                <label>Observação / Motivo (opcional)</label>
                <input
                  value={movMotivo}
                  onChange={(e) => setMovMotivo(e.target.value)}
                  placeholder={
                    movTipo === "entrada"
                      ? "Ex: Compra avulsa no atacadista"
                      : movTipo === "saida"
                      ? "Ex: Perda / avaria / consumo interno"
                      : "Ex: Contagem física semanal"
                  }
                />
              </div>

              {/* Resumo do Saldo Resultante */}
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: "8px",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "18px",
                  fontSize: "13px",
                }}
              >
                <span>
                  Saldo anterior: <b>{insumoSelecionado.estoqueAtual} {insumoSelecionado.unidadeMedida}</b>
                </span>
                <span>→</span>
                <span>
                  Novo saldo:{" "}
                  <b style={{ color: previewSaldoMovimento <= 0 ? "#c62828" : "#2e7d32", fontSize: "14px" }}>
                    {previewSaldoMovimento} {insumoSelecionado.unidadeMedida}
                  </b>
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setModalMovimentoAberto(false)}
                  disabled={movSalvando}
                >
                  Cancelar
                </button>
                <button type="submit" className="button primary" disabled={movSalvando}>
                  <Check size={15} /> {movSalvando ? "Confirmando..." : "Confirmar Movimentação"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
