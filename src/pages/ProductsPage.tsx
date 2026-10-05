/**
 * ============================================================================
 * PROJETO: Doce Gestor - Sistema de Gestão para Confeitarias
 * REPOSITÓRIO: https://github.com/junin1737/confeitaria
 * ARQUIVO: src/pages/ProductsPage.tsx
 * DESCRIÇÃO: FASE 1 — Cadastro de Produtos com Ficha Técnica & Receita Integrada.
 * ============================================================================
 * 
 * [DESIGN SYSTEM NATIVO DO DOCE GESTOR]
 * Utiliza as classes CSS oficiais do sistema (.page-heading, .panel, .tabs,
 * .employee-layout, .detail-title, .detail-stat-grid, .detail-sections, .subpanel,
 * .field-grid, .field, .button.primary, .button.secondary, etc.) para garantir
 * 100% de coerência visual editorial com o restante do sistema.
 * ============================================================================
 */

import { useEffect, useState, type FormEvent } from "react";
import {
  Cake,
  Calendar,
  Check,
  ChefHat,
  Download,
  FolderPlus,
  History,
  Layers,
  Plus,
  Search,
  Tag,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import {
  deleteProduto,
  fetchGrupos,
  fetchHistoricoCustoProduto,
  fetchInsumos,
  fetchProdutos,
  fetchProximoCodigoProduto,
  fetchSubgrupos,
  fetchTiposItem,
  saveGrupo,
  saveProduto,
  saveSubgrupo,
  saveTipoItem,
  deleteGrupo,
  deleteSubgrupo,
  deleteTipoItem,
  type GrupoProduto,
  type Insumo,
  type Produto,
  type ProdutoCustoHistorico,
  type ProdutoInput,
  type SubgrupoProduto,
  type TipoItem,
} from "../api";

export function ProductsPage({ onAction }: { onAction: (msg: string) => void }) {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [grupos, setGrupos] = useState<GrupoProduto[]>([]);
  const [subgrupos, setSubgrupos] = useState<SubgrupoProduto[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [tiposItem, setTiposItem] = useState<TipoItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros e Seleção
  const [query, setQuery] = useState("");
  const [filtroGrupo, setFiltroGrupo] = useState<number | "todos">("todos");
  const [filtroTipoItem, setFiltroTipoItem] = useState<number | "todos">("todos");
  const [selectedId, setSelectedId] = useState<number | "new" | null>(null);

  // Abas do formulário do produto: "dados", "receita", "historico"
  const [formTab, setFormTab] = useState<"dados" | "receita" | "historico">("dados");

  // Estado do Formulário do Produto
  const [proximoCod, setProximoCod] = useState("");
  const [formCodigo, setFormCodigo] = useState("");
  const [formNome, setFormNome] = useState("");
  const [formDescricao, setFormDescricao] = useState("");
  const [formTipoItemId, setFormTipoItemId] = useState<number | null>(null);
  const [formGrupoId, setFormGrupoId] = useState<number | null>(null);
  const [formSubgrupoId, setFormSubgrupoId] = useState<number | null>(null);
  const [formUnidadeVenda, setFormUnidadeVenda] = useState("unidade");
  const [formPrecoVenda, setFormPrecoVenda] = useState<number>(0);
  const [formEstoqueAtual, setFormEstoqueAtual] = useState<number>(0);
  const [formEstoqueMinimo, setFormEstoqueMinimo] = useState<number>(0);
  const [formStatus, setFormStatus] = useState<"ativo" | "inativo">("ativo");

  // Ficha Técnica / Receita integrada
  const [formTemReceita, setFormTemReceita] = useState(true);
  const [formRendimentoQtd, setFormRendimentoQtd] = useState(1);
  const [formRendimentoUnidade, setFormRendimentoUnidade] = useState("unidade");
  const [formTempoPreparoMinutos, setFormTempoPreparoMinutos] = useState(60);
  const [formCustoHoraTrabalho, setFormCustoHoraTrabalho] = useState(20);
  const [formPercentualCustosFixos, setFormPercentualCustosFixos] = useState(15);
  const [formMargemLucroDesejada, setFormMargemLucroDesejada] = useState(100);
  const [formModoPreparo, setFormModoPreparo] = useState("");
  const [formItensReceita, setFormItensReceita] = useState<
    { insumoId: number; quantidade: number; unidade: string }[]
  >([]);

  // Histórico de Evolução de Custo
  const [historicoCusto, setHistoricoCusto] = useState<ProdutoCustoHistorico[]>([]);
  const [historicoCarregando, setHistoricoCarregando] = useState(false);
  const [dataInicioHist, setDataInicioHist] = useState(
    new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [dataFimHist, setDataFimHist] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Modais de Gestão (Grupos e Tipos de Item)
  const [modalGruposAberto, setModalGruposAberto] = useState(false);
  const [novoGrupoNome, setNovoGrupoNome] = useState("");
  const [novoGrupoCor, setNovoGrupoCor] = useState("#c96852");
  const [novoSubgrupoNome, setNovoSubgrupoNome] = useState("");
  const [novoSubgrupoPaiId, setNovoSubgrupoPaiId] = useState<number | null>(null);

  const [modalTiposAberto, setModalTiposAberto] = useState(false);
  const [novoTipoNome, setNovoTipoNome] = useState("");
  const [novoTipoCodigo, setNovoTipoCodigo] = useState("");
  const [novoTipoDescricao, setNovoTipoDescricao] = useState("");

  // Carregar dados
  const carregarDados = async () => {
    setLoading(true);
    try {
      const [prods, grps, subgrps, ins, prox, tipos] = await Promise.all([
        fetchProdutos(),
        fetchGrupos(),
        fetchSubgrupos(),
        fetchInsumos(),
        fetchProximoCodigoProduto(),
        fetchTiposItem(),
      ]);
      setProdutos(prods);
      setGrupos(grps);
      setSubgrupos(subgrps);
      setInsumos(ins);
      setProximoCod(prox);
      setTiposItem(tipos);

      if (prods.length > 0 && selectedId === null) {
        selecionarProduto(prods[0]);
      }
    } catch (err: any) {
      onAction(err?.message || "Erro ao carregar catálogo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarHistorico = async (prodId: number, de?: string, ate?: string) => {
    setHistoricoCarregando(true);
    try {
      const hist = await fetchHistoricoCustoProduto(prodId, de || dataInicioHist, ate || dataFimHist);
      setHistoricoCusto(hist);
    } catch (err: any) {
      console.error("Erro ao carregar histórico:", err);
    } finally {
      setHistoricoCarregando(false);
    }
  };

  const selecionarProduto = (p: Produto) => {
    setSelectedId(p.id);
    setFormCodigo(p.codigo);
    setFormNome(p.nome);
    setFormDescricao(p.descricao || "");
    setFormTipoItemId(p.tipoItemId ?? tiposItem.find((t) => t.padrao)?.id ?? null);
    setFormGrupoId(p.grupoId);
    setFormSubgrupoId(p.subgrupoId);
    setFormUnidadeVenda(p.unidadeVenda || "unidade");
    setFormPrecoVenda(p.precoVenda || 0);
    setFormEstoqueAtual(p.estoqueAtual || 0);
    setFormEstoqueMinimo(p.estoqueMinimo || 0);
    setFormStatus(p.status || "ativo");

    // Receita integrada
    setFormTemReceita(p.temReceita);
    setFormRendimentoQtd(p.rendimentoQuantidade || 1);
    setFormRendimentoUnidade(p.rendimentoUnidade || p.unidadeVenda || "unidade");
    setFormTempoPreparoMinutos(p.tempoPreparoMinutos || 60);
    setFormCustoHoraTrabalho(p.custoHoraTrabalho ?? 20);
    setFormPercentualCustosFixos(p.percentualCustosFixos ?? 15);
    setFormMargemLucroDesejada(p.margemLucroDesejada ?? 100);
    setFormModoPreparo(p.modoPreparo || "");
    setFormItensReceita(
      p.itensReceita?.map((it) => ({
        insumoId: it.insumoId,
        quantidade: it.quantidade,
        unidade: it.unidade,
      })) || []
    );
    setFormError("");

    // Carrega histórico de evolução de custos
    carregarHistorico(p.id);
  };

  const iniciarNovoProduto = async () => {
    try {
      const prox = await fetchProximoCodigoProduto();
      setProximoCod(prox);
      setFormCodigo(prox);
    } catch {
      setFormCodigo(proximoCod);
    }
    setSelectedId("new");
    setFormNome("");
    setFormDescricao("");
    setFormTipoItemId(tiposItem.find((t) => t.padrao)?.id || tiposItem[0]?.id || null);
    setFormGrupoId(grupos[0]?.id || null);
    setFormSubgrupoId(null);
    setFormUnidadeVenda("unidade");
    setFormPrecoVenda(0);
    setFormEstoqueAtual(0);
    setFormEstoqueMinimo(0);
    setFormStatus("ativo");

    // Receita
    setFormTemReceita(true);
    setFormRendimentoQtd(1);
    setFormRendimentoUnidade("unidade");
    setFormTempoPreparoMinutos(0);
    setFormCustoHoraTrabalho(0);
    setFormPercentualCustosFixos(0);
    setFormMargemLucroDesejada(0);
    setFormModoPreparo("");
    setFormItensReceita([]);
    setHistoricoCusto([]);
    setFormTab("dados");
    setFormError("");
  };

  // Cálculos dinâmicos em tempo real no formulário
  const custoInsumosForm = formItensReceita.reduce((acc, it) => {
    const ins = insumos.find((i) => i.id === Number(it.insumoId));
    if (!ins) return acc;
    return acc + Number(it.quantidade) * Number(ins.custoUnitario);
  }, 0);

  const custoMaoDeObraForm = (Math.max(0, formTempoPreparoMinutos) / 60) * formCustoHoraTrabalho;
  const custosFixosForm = (custoInsumosForm + custoMaoDeObraForm) * (formPercentualCustosFixos / 100);
  const custoTotalProducaoForm = custoInsumosForm + custoMaoDeObraForm + custosFixosForm;
  const rendimentoValido = Math.max(1, formRendimentoQtd);
  const custoPorUnidadeForm = custoTotalProducaoForm / rendimentoValido;

  const precoSugeridoTotalForm = custoTotalProducaoForm * (1 + formMargemLucroDesejada / 100);
  const precoSugeridoPorUnidadeForm = precoSugeridoTotalForm / rendimentoValido;

  const precoCobrado = formPrecoVenda > 0 ? formPrecoVenda : precoSugeridoPorUnidadeForm;
  const lucroRealPorUnidadeForm = precoCobrado - custoPorUnidadeForm;
  const margemRealCalculada =
    custoPorUnidadeForm > 0
      ? Math.round((lucroRealPorUnidadeForm / custoPorUnidadeForm) * 100)
      : 0;

  // Itens da receita do formulário
  const adicionarItemReceita = () => {
    if (insumos.length === 0) {
      alert("Cadastre insumos primeiro na aba Estoque e Insumos!");
      return;
    }
    const primeiro = insumos[0];
    setFormItensReceita([
      ...formItensReceita,
      {
        insumoId: primeiro.id,
        quantidade: primeiro.unidadeMedida === "un" ? 1 : 100,
        unidade: primeiro.unidadeMedida,
      },
    ]);
  };

  const removerItemReceita = (index: number) => {
    setFormItensReceita(formItensReceita.filter((_, i) => i !== index));
  };

  const atualizarItemReceita = (index: number, campo: string, valor: any) => {
    const novos = [...formItensReceita];
    const item = { ...novos[index], [campo]: valor };
    if (campo === "insumoId") {
      const ins = insumos.find((i) => i.id === Number(valor));
      if (ins) item.unidade = ins.unidadeMedida;
    }
    novos[index] = item;
    setFormItensReceita(novos);
  };

  // Salvar Produto com sua Receita
  const handleSubmitProduto = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!formNome.trim()) {
      setFormError("Informe o nome do produto.");
      return;
    }

    setSaving(true);
    try {
      const payload: ProdutoInput = {
        id: selectedId === "new" || selectedId == null ? undefined : selectedId,
        codigo: formCodigo,
        nome: formNome,
        descricao: formDescricao,
        tipoItemId: formTipoItemId,
        grupoId: formGrupoId,
        subgrupoId: formSubgrupoId,
        unidadeVenda: formUnidadeVenda,
        precoVenda: formPrecoVenda || precoSugeridoPorUnidadeForm,
        estoqueAtual: formEstoqueAtual,
        estoqueMinimo: formEstoqueMinimo,
        status: formStatus,
        temReceita: formTemReceita,
        rendimentoQuantidade: rendimentoValido,
        rendimentoUnidade: formRendimentoUnidade,
        tempoPreparoMinutos: formTempoPreparoMinutos,
        custoHoraTrabalho: formCustoHoraTrabalho,
        percentualCustosFixos: formPercentualCustosFixos,
        margemLucroDesejada: formMargemLucroDesejada,
        modoPreparo: formModoPreparo,
        itensReceita: formTemReceita ? formItensReceita : [],
      };

      const salvo = await saveProduto(payload);
      onAction(`Produto "${salvo.nome}" salvo com sucesso!`);
      await carregarDados();
      setSelectedId(salvo.id);
    } catch (err: any) {
      setFormError(err?.message || "Não foi possível salvar o produto.");
    } finally {
      setSaving(false);
    }
  };

  // Excluir Produto
  const handleExcluir = async (id: number) => {
    if (!confirm("Deseja realmente excluir este produto e sua ficha técnica?")) return;
    try {
      await deleteProduto(id);
      onAction("Produto excluído com sucesso.");
      setSelectedId(null);
      carregarDados();
    } catch (err: any) {
      alert(err.message || "Erro ao excluir produto.");
    }
  };

  // Exportar CSV
  const exportarCsv = () => {
    const cabecalho = ["codigo", "nome", "grupo", "subgrupo", "unidade", "preco_custo", "preco_venda", "margem_real", "status"];
    const linhas = produtos.map((p) =>
      [
        p.codigo,
        p.nome,
        p.grupoNome || "",
        p.subgrupoNome || "",
        p.unidadeVenda,
        p.precoCusto.toFixed(2),
        p.precoVenda.toFixed(2),
        `${p.margemLucroRealPercent}%`,
        p.status,
      ]
        .map((v) => `"${String(v).replaceAll('"', '""')}"`)
        .join(";")
    );
    const blob = new Blob([[cabecalho.join(";"), ...linhas].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "produtos_receitas.csv";
    a.click();
    URL.revokeObjectURL(url);
    onAction("Catálogo de produtos exportado em CSV.");
  };

  // Filtros de listagem
  const produtosFiltrados = produtos.filter((p) => {
    const bateTexto =
      p.nome.toLowerCase().includes(query.toLowerCase()) ||
      p.codigo.toLowerCase().includes(query.toLowerCase());
    const bateGrupo = filtroGrupo === "todos" || p.grupoId === filtroGrupo;
    const bateTipo = filtroTipoItem === "todos" || p.tipoItemId === filtroTipoItem;
    return bateTexto && bateGrupo && bateTipo;
  });

  const subgruposDisponiveis = subgrupos.filter((s) => s.grupoId === formGrupoId);

  return (
    <>
      {/* Cabeçalho Oficial */}
      <section className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-dot" /> cardápio & precificação
          </div>
          <h1>
            Produtos e Receitas <span className="heading-count">{produtos.length}</span>
          </h1>
          <p>
            Produtos vendáveis com Ficha Técnica, Custo Médio e Engenharia de Custos integrada.
          </p>
        </div>
        <div className="heading-actions">
          <button className="button secondary" onClick={() => setModalTiposAberto(true)}>
            <Layers size={16} /> Tipos de Item
          </button>
          <button className="button secondary" onClick={() => setModalGruposAberto(true)}>
            <FolderPlus size={16} /> Grupos & Subgrupos
          </button>
          <button className="button secondary" onClick={exportarCsv}>
            <Download size={16} /> Exportar
          </button>
          <button className="button primary" onClick={iniciarNovoProduto}>
            <Plus size={17} /> Novo produto
          </button>
        </div>
      </section>

      {/* Layout Dividido Oficial (.employee-layout) */}
      <section className="employee-layout">
        {/* Painel Esquerdo: Lista de Produtos */}
        <div className="panel employee-list-panel">
          <div className="panel-heading">
            <div>
              <div className="section-kicker">Catálogo Ateliê</div>
              <h2>Todos os produtos</h2>
            </div>
            <div className="employee-filter">
              <button
                className={filtroGrupo === "todos" ? "active" : ""}
                onClick={() => setFiltroGrupo("todos")}
              >
                Todos
              </button>
              {grupos.slice(0, 3).map((g) => (
                <button
                  key={g.id}
                  className={filtroGrupo === g.id ? "active" : ""}
                  onClick={() => setFiltroGrupo(g.id)}
                >
                  {g.nome}
                </button>
              ))}
            </div>
          </div>

          <div className="search-box">
            <Search size={16} />
            <input
              placeholder="Buscar por nome ou código..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", gap: "6px", alignItems: "center", padding: "0 16px 12px", borderBottom: "1px solid var(--c-border)" }}>
            <span style={{ fontSize: "11px", color: "var(--c-muted)", fontWeight: 600 }}>Tipo:</span>
            <select
              value={filtroTipoItem}
              onChange={(e) => setFiltroTipoItem(e.target.value === "todos" ? "todos" : Number(e.target.value))}
              style={{ fontSize: "11px", padding: "3px 8px", border: "1px solid var(--c-border)", borderRadius: "6px", flex: 1 }}
            >
              <option value="todos">Todos os tipos de item</option>
              {tiposItem.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="employee-list">
            {loading ? <div className="employee-empty">Carregando catálogo...</div> : null}
            {!loading && produtosFiltrados.length === 0 ? (
              <div className="employee-empty">Nenhum produto cadastrado.</div>
            ) : null}

            {produtosFiltrados.map((item) => {
              const ativo = selectedId === item.id;
              const margemAlta = item.margemLucroRealPercent >= 50;

              return (
                <button
                  key={item.id}
                  className={`employee-row ${ativo ? "selected" : ""}`}
                  onClick={() => selecionarProduto(item)}
                >
                  <div
                    className="employee-avatar"
                    style={{
                      background: item.grupoNome ? "var(--c-primary-soft)" : "#eee",
                      color: "var(--c-primary)",
                      fontWeight: "bold",
                    }}
                  >
                    <Cake size={18} />
                  </div>
                  <div className="employee-row-copy">
                    <strong>{item.nome}</strong>
                    <span>
                      {item.codigo} • {item.grupoNome || "Sem grupo"} •{" "}
                      <b style={{ color: "var(--c-text)" }}>R$ {item.precoVenda.toFixed(2)}</b>
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      padding: "3px 7px",
                      borderRadius: "6px",
                      background: margemAlta ? "#e9f5ee" : "#fff5df",
                      color: margemAlta ? "#4fa27a" : "#a27a43",
                      marginLeft: "auto",
                    }}
                  >
                    {item.margemLucroRealPercent}%
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Painel Direito: Formulário com Abas (.employee-detail) */}
        <div className="employee-detail panel">
          {selectedId == null && !loading ? (
            <div className="employee-empty" style={{ padding: "60px 20px" }}>
              <Cake size={36} style={{ color: "#d0c7c1", margin: "0 auto 12px" }} />
              <strong>Selecione um produto ao lado</strong>
              <p>Ou clique no botão "Novo produto" acima para cadastrar com sua ficha técnica.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmitProduto}>
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
                    <ChefHat size={22} />
                  </div>
                  <div>
                    <span className="live-pill">
                      {selectedId === "new" ? "NOVO CADASTRO" : formStatus.toUpperCase()}
                    </span>
                    <h2>{formNome || "Novo Produto"}</h2>
                    <p>
                      {formCodigo} • {formGrupoId ? grupos.find((g) => g.id === formGrupoId)?.nome : "Sem grupo"}
                    </p>
                  </div>
                </div>

                <div className="detail-actions">
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => {
                      if (produtos.length > 0) {
                        selecionarProduto(produtos[0]);
                      } else {
                        setSelectedId(null);
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
                    <Check size={14} /> {saving ? "Salvando..." : "Salvar produto"}
                  </button>
                </div>
              </div>

              {formError && (
                <div style={{ padding: "10px 14px", margin: "14px 0", background: "#fdf2f2", color: "#991b1b", borderRadius: "8px", fontSize: "12px" }}>
                  {formError}
                </div>
              )}

              {/* Métricas Principais (.detail-stat-grid) */}
              <div className="detail-stat-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
                <div>
                  <span>Preço de Venda</span>
                  <strong style={{ color: "var(--c-primary)" }}>
                    R$ {(formPrecoVenda || precoSugeridoPorUnidadeForm).toFixed(2)}
                  </strong>
                  <small>Por {formUnidadeVenda}</small>
                </div>
                <div>
                  <span>Custo Atual</span>
                  <strong>R$ {custoPorUnidadeForm.toFixed(2)}</strong>
                  <small>Insumos + Mão de Obra + Fixos</small>
                </div>
                <div>
                  <span>Custo Médio (12m)</span>
                  <strong style={{ color: "#4f7c9b" }}>
                    R$ {(selectedId !== "new" && selectedId != null ? produtos.find((p) => p.id === selectedId)?.custoMedio ?? custoPorUnidadeForm : custoPorUnidadeForm).toFixed(2)}
                  </strong>
                  <small>Média dos últimos 12 meses</small>
                </div>
                <div>
                  <span>Margem Líquida Real</span>
                  <strong style={{ color: margemRealCalculada >= 50 ? "#4fa27a" : "#d97706" }}>
                    {margemRealCalculada}%
                  </strong>
                  <small>Lucro: R$ {lucroRealPorUnidadeForm.toFixed(2)} / un</small>
                </div>
              </div>

              {/* Abas Nativas: "Dados Gerais", "Ficha Técnica / Receita" e "Evolução do Custo" */}
              <div className="tabs">
                <button
                  type="button"
                  className={formTab === "dados" ? "active" : ""}
                  onClick={() => setFormTab("dados")}
                >
                  <Tag size={13} style={{ display: "inline", marginRight: "4px" }} />
                  Dados Gerais do Produto
                </button>
                <button
                  type="button"
                  className={formTab === "receita" ? "active" : ""}
                  onClick={() => setFormTab("receita")}
                >
                  <ChefHat size={13} style={{ display: "inline", marginRight: "4px" }} />
                  Ficha Técnica & Receita ({formItensReceita.length} insumos)
                </button>
                <button
                  type="button"
                  className={formTab === "historico" ? "active" : ""}
                  onClick={() => {
                    setFormTab("historico");
                    if (selectedId && selectedId !== "new") {
                      carregarHistorico(selectedId);
                    }
                  }}
                >
                  <History size={13} style={{ display: "inline", marginRight: "4px" }} />
                  Evolução do Custo ({historicoCusto.length} registros)
                </button>
              </div>

              {/* CONTEÚDO DA ABA 1: DADOS GERAIS */}
              {formTab === "dados" && (
                <div style={{ marginTop: "20px" }} className="detail-sections">
                  {/* Subpainel: Identificação */}
                  <div className="subpanel">
                    <div className="subpanel-head">
                      <div>
                        <div className="section-kicker">Identificação</div>
                        <h3>Dados Básicos</h3>
                      </div>
                    </div>
                    <div style={{ display: "grid", gap: "12px", marginTop: "12px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "10px" }}>
                        <div className="field">
                          <label>Código Interno</label>
                          <input
                            value={formCodigo}
                            onChange={(e) => setFormCodigo(e.target.value)}
                            placeholder="PRD-001"
                            required
                          />
                        </div>
                        <div className="field">
                          <label>Nome do Produto *</label>
                          <input
                            value={formNome}
                            onChange={(e) => setFormNome(e.target.value)}
                            placeholder="Ex: Bolo Vulcão Ninho c/ Nutella"
                            required
                          />
                        </div>
                      </div>

                      <div className="field">
                        <label>Tipo de Item (Classificação) *</label>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <select
                            value={formTipoItemId || ""}
                            onChange={(e) => setFormTipoItemId(Number(e.target.value) || null)}
                            style={{ flex: 1 }}
                            required
                          >
                            <option value="">Selecione o tipo de item...</option>
                            {tiposItem.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.nome} {t.codigo ? `(${t.codigo})` : ""}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="button secondary"
                            onClick={() => setModalTiposAberto(true)}
                            title="Cadastrar / Gerenciar Tipos de Item"
                          >
                            <Plus size={14} /> Novo Tipo
                          </button>
                        </div>
                      </div>

                      <div className="field">
                        <label>Descrição Comercial</label>
                        <textarea
                          rows={2}
                          value={formDescricao}
                          onChange={(e) => setFormDescricao(e.target.value)}
                          placeholder="Descrição atrativa para o cardápio e clientes..."
                        />
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                        <div className="field">
                          <label>Grupo / Categoria *</label>
                          <select
                            value={formGrupoId || ""}
                            onChange={(e) => {
                              const gid = Number(e.target.value) || null;
                              setFormGrupoId(gid);
                              setFormSubgrupoId(null);
                            }}
                          >
                            <option value="">Selecione...</option>
                            {grupos.map((g) => (
                              <option key={g.id} value={g.id}>
                                {g.nome}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="field">
                          <label>Subgrupo</label>
                          <select
                            value={formSubgrupoId || ""}
                            onChange={(e) => setFormSubgrupoId(Number(e.target.value) || null)}
                          >
                            <option value="">Nenhum</option>
                            {subgruposDisponiveis.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.nome}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Subpainel: Venda & Estoque */}
                  <div className="subpanel">
                    <div className="subpanel-head">
                      <div>
                        <div className="section-kicker">Comercial & Estoque</div>
                        <h3>Valores & Pronta Entrega</h3>
                      </div>
                    </div>
                    <div style={{ display: "grid", gap: "12px", marginTop: "12px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                        <div className="field">
                          <label>Unidade de Venda</label>
                          <select
                            value={formUnidadeVenda}
                            onChange={(e) => setFormUnidadeVenda(e.target.value)}
                          >
                            <option value="unidade">Unidade (un)</option>
                            <option value="cento">Cento (100 un)</option>
                            <option value="fatia">Fatia / Pedaço</option>
                            <option value="kg">Quilo (kg)</option>
                            <option value="caixa">Caixa / Kit</option>
                          </select>
                        </div>
                        <div className="field">
                          <label>Status</label>
                          <select
                            value={formStatus}
                            onChange={(e) => setFormStatus(e.target.value as any)}
                          >
                            <option value="ativo">Ativo no Cardápio</option>
                            <option value="inativo">Inativo / Oculto</option>
                          </select>
                        </div>
                      </div>

                      <div className="field">
                        <label>Preço de Venda Praticado (R$) *</label>
                        <input
                          type="number"
                          step="0.50"
                          min="0"
                          value={formPrecoVenda}
                          onChange={(e) => setFormPrecoVenda(Number(e.target.value))}
                          placeholder="Valor cobrado do cliente"
                          style={{ fontSize: "16px", fontWeight: "bold", color: "var(--c-primary)" }}
                        />
                        <small style={{ color: "var(--c-muted)", fontSize: "10px", marginTop: "3px" }}>
                          Sugerido pela ficha técnica: <b>R$ {precoSugeridoPorUnidadeForm.toFixed(2)}</b>
                        </small>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                        <div className="field">
                          <label>Estoque Atual ({formUnidadeVenda})</label>
                          <input
                            type="number"
                            min="0"
                            value={formEstoqueAtual}
                            onChange={(e) => setFormEstoqueAtual(Number(e.target.value))}
                          />
                        </div>
                        <div className="field">
                          <label>Estoque Mínimo</label>
                          <input
                            type="number"
                            min="0"
                            value={formEstoqueMinimo}
                            onChange={(e) => setFormEstoqueMinimo(Number(e.target.value))}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* CONTEÚDO DA ABA 2: FICHA TÉCNICA & RECEITA INTEGRADA */}
              {formTab === "receita" && (
                <div style={{ marginTop: "20px" }}>
                  {/* Seção de Insumos da Receita */}
                  <div className="subpanel" style={{ marginBottom: "16px" }}>
                    <div className="subpanel-head">
                      <div>
                        <div className="section-kicker">Composição da Receita</div>
                        <h3>Ingredientes & Embalagens Utilizados</h3>
                      </div>
                      <button
                        type="button"
                        className="button secondary"
                        onClick={adicionarItemReceita}
                        style={{ height: "30px", fontSize: "11px" }}
                      >
                        <Plus size={14} /> Adicionar Insumo
                      </button>
                    </div>

                    {formItensReceita.length === 0 ? (
                      <div className="employee-empty" style={{ padding: "30px" }}>
                        Nenhum insumo adicionado a esta receita. Clique em "Adicionar Insumo" acima.
                      </div>
                    ) : (
                      <div style={{ marginTop: "12px", border: "1px solid var(--c-border)", borderRadius: "8px", overflow: "hidden" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                          <thead>
                            <tr style={{ background: "#fcfaf8", borderBottom: "1px solid var(--c-border)", textAlign: "left" }}>
                              <th style={{ padding: "8px 12px" }}>Insumo / Matéria-Prima</th>
                              <th style={{ padding: "8px 12px", width: "130px" }}>Quantidade</th>
                              <th style={{ padding: "8px 12px", width: "100px", textAlign: "right" }}>Custo Rateado</th>
                              <th style={{ padding: "8px 12px", width: "50px" }}></th>
                            </tr>
                          </thead>
                          <tbody>
                            {formItensReceita.map((item, idx) => {
                              const ins = insumos.find((i) => i.id === Number(item.insumoId));
                              const custoItem = ins ? Number(item.quantidade) * Number(ins.custoUnitario) : 0;

                              return (
                                <tr key={idx} style={{ borderBottom: "1px solid #f5efe9" }}>
                                  <td style={{ padding: "8px 12px" }}>
                                    <select
                                      value={item.insumoId}
                                      onChange={(e) => atualizarItemReceita(idx, "insumoId", Number(e.target.value))}
                                      style={{ width: "100%", padding: "4px 8px", border: "1px solid var(--c-border)", borderRadius: "6px" }}
                                    >
                                      {insumos.map((i) => (
                                        <option key={i.id} value={i.id}>
                                          {i.nome} (R$ {i.custoUnitario.toFixed(4)} / {i.unidadeMedida})
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                  <td style={{ padding: "8px 12px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                      <input
                                        type="number"
                                        step="any"
                                        min="0.001"
                                        value={item.quantidade}
                                        onChange={(e) => atualizarItemReceita(idx, "quantidade", Number(e.target.value))}
                                        style={{ width: "70px", padding: "4px 8px", border: "1px solid var(--c-border)", borderRadius: "6px", textAlign: "right" }}
                                      />
                                      <span style={{ fontSize: "11px", color: "var(--c-muted)" }}>{item.unidade}</span>
                                    </div>
                                  </td>
                                  <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: "bold" }}>
                                    R$ {custoItem.toFixed(2)}
                                  </td>
                                  <td style={{ padding: "8px 12px", textAlign: "center" }}>
                                    <button
                                      type="button"
                                      onClick={() => removerItemReceita(idx)}
                                      style={{ color: "var(--c-danger)", padding: "4px" }}
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Engenharia de Custos: Tempo, Custos Fixos e Rendimento */}
                  <div className="detail-sections">
                    <div className="subpanel">
                      <div className="subpanel-head">
                        <div>
                          <div className="section-kicker">Mão de Obra & Custos Invisíveis</div>
                          <h3>Parâmetros de Produção</h3>
                        </div>
                      </div>
                      <div style={{ display: "grid", gap: "12px", marginTop: "12px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                          <div className="field">
                            <label>Rendimento da Receita</label>
                            <input
                              type="number"
                              min="1"
                              value={formRendimentoQtd}
                              onChange={(e) => setFormRendimentoQtd(Number(e.target.value))}
                            />
                          </div>
                          <div className="field">
                            <label>Unidade do Rendimento</label>
                            <input
                              value={formRendimentoUnidade}
                              onChange={(e) => setFormRendimentoUnidade(e.target.value)}
                              placeholder="bolo, unidades, etc."
                            />
                          </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                          <div className="field">
                            <label>Tempo de Preparo (min)</label>
                            <input
                              type="number"
                              min="0"
                              value={formTempoPreparoMinutos}
                              onChange={(e) => setFormTempoPreparoMinutos(Number(e.target.value))}
                            />
                          </div>
                          <div className="field">
                            <label>Sua Hora de Trabalho (R$/h)</label>
                            <input
                              type="number"
                              step="0.50"
                              value={formCustoHoraTrabalho}
                              onChange={(e) => setFormCustoHoraTrabalho(Number(e.target.value))}
                            />
                          </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                          <div className="field">
                            <label>Custos Fixos / Gás (%)</label>
                            <input
                              type="number"
                              min="0"
                              value={formPercentualCustosFixos}
                              onChange={(e) => setFormPercentualCustosFixos(Number(e.target.value))}
                            />
                          </div>
                          <div className="field">
                            <label>Margem Desejada (%)</label>
                            <input
                              type="number"
                              min="0"
                              value={formMargemLucroDesejada}
                              onChange={(e) => setFormMargemLucroDesejada(Number(e.target.value))}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Resumo da Formação de Preço */}
                    <div className="subpanel" style={{ background: "#fcfaf8" }}>
                      <div className="subpanel-head">
                        <div>
                          <div className="section-kicker">Engenharia Financeira</div>
                          <h3>Formação do Preço</h3>
                        </div>
                      </div>

                      <div style={{ display: "grid", gap: "8px", marginTop: "14px", fontSize: "12px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", color: "var(--c-muted)" }}>
                          <span>Insumos da Receita:</span>
                          <b>R$ {custoInsumosForm.toFixed(2)}</b>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", color: "var(--c-muted)" }}>
                          <span>Mão de Obra ({formTempoPreparoMinutos} min):</span>
                          <b>R$ {custoMaoDeObraForm.toFixed(2)}</b>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", color: "var(--c-muted)" }}>
                          <span>Custos Fixos / Gás ({formPercentualCustosFixos}%):</span>
                          <b>R$ {custosFixosForm.toFixed(2)}</b>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "8px", borderTop: "1px solid var(--c-border)", fontSize: "13px" }}>
                          <span>Custo de Produção Total:</span>
                          <strong>R$ {custoTotalProducaoForm.toFixed(2)}</strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", color: "var(--c-primary)" }}>
                          <span>Custo por {formRendimentoUnidade}:</span>
                          <b>R$ {custoPorUnidadeForm.toFixed(2)}</b>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "8px", borderTop: "1px dashed var(--c-border)", fontSize: "13px" }}>
                          <span>Preço Sugerido ({formMargemLucroDesejada}%):</span>
                          <strong style={{ color: "var(--c-primary)" }}>
                            R$ {precoSugeridoPorUnidadeForm.toFixed(2)}
                          </strong>
                        </div>
                      </div>

                      <div className="field" style={{ marginTop: "14px" }}>
                        <label>Instruções / Modo de Preparo</label>
                        <textarea
                          rows={3}
                          value={formModoPreparo}
                          onChange={(e) => setFormModoPreparo(e.target.value)}
                          placeholder="Passo a passo para a confeiteira e equipe de produção..."
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* CONTEÚDO DA ABA 3: EVOLUÇÃO DE CUSTO & AUDITORIA */}
              {formTab === "historico" && (
                <div style={{ marginTop: "20px" }} className="detail-sections">
                  <div className="subpanel">
                    <div className="subpanel-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                      <div>
                        <div className="section-kicker">Histórico & Auditoria</div>
                        <h3>Evolução do Custo de Produção</h3>
                      </div>

                      {/* Filtro por Intervalo de Datas (Padrão: Últimos 12 meses) */}
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#fdf8f5", padding: "6px 12px", borderRadius: "8px", border: "1px solid var(--c-border)" }}>
                        <Calendar size={14} style={{ color: "var(--c-primary)" }} />
                        <span style={{ fontSize: "11px", fontWeight: 600 }}>De:</span>
                        <input
                          type="date"
                          value={dataInicioHist}
                          onChange={(e) => {
                            const novaData = e.target.value;
                            setDataInicioHist(novaData);
                            if (selectedId && selectedId !== "new") {
                              carregarHistorico(selectedId, novaData, dataFimHist);
                            }
                          }}
                          style={{ fontSize: "11px", padding: "3px 6px", border: "1px solid var(--c-border)", borderRadius: "4px" }}
                        />
                        <span style={{ fontSize: "11px", fontWeight: 600 }}>Até:</span>
                        <input
                          type="date"
                          value={dataFimHist}
                          onChange={(e) => {
                            const novaData = e.target.value;
                            setDataFimHist(novaData);
                            if (selectedId && selectedId !== "new") {
                              carregarHistorico(selectedId, dataInicioHist, novaData);
                            }
                          }}
                          style={{ fontSize: "11px", padding: "3px 6px", border: "1px solid var(--c-border)", borderRadius: "4px" }}
                        />
                      </div>
                    </div>

                    <div style={{ marginTop: "16px" }}>
                      {historicoCarregando ? (
                        <div style={{ padding: "30px", textAlign: "center", color: "var(--c-muted)", fontSize: "12px" }}>
                          Carregando histórico de custos...
                        </div>
                      ) : historicoCusto.length === 0 ? (
                        <div style={{ padding: "36px 20px", textAlign: "center", background: "#fcfaf8", borderRadius: "8px", border: "1px dashed var(--c-border)" }}>
                          <History size={28} style={{ color: "#d0c7c1", margin: "0 auto 8px" }} />
                          <strong style={{ fontSize: "13px", display: "block" }}>Nenhum registro histórico no período</strong>
                          <p style={{ fontSize: "11px", color: "var(--c-muted)", margin: "4px 0 0" }}>
                            O histórico é registrado automaticamente a cada alteração ou recálculo de insumos do produto.
                          </p>
                        </div>
                      ) : (
                        <div style={{ overflowX: "auto" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                            <thead>
                              <tr style={{ background: "#f9f5f1", borderBottom: "1px solid var(--c-border)", textAlign: "left" }}>
                                <th style={{ padding: "10px 12px", fontWeight: 600 }}>Data / Hora</th>
                                <th style={{ padding: "10px 12px", fontWeight: 600 }}>Custo Total</th>
                                <th style={{ padding: "10px 12px", fontWeight: 600 }}>Insumos</th>
                                <th style={{ padding: "10px 12px", fontWeight: 600 }}>Mão de Obra</th>
                                <th style={{ padding: "10px 12px", fontWeight: 600 }}>Preço de Venda</th>
                                <th style={{ padding: "10px 12px", fontWeight: 600 }}>Margem Real</th>
                                <th style={{ padding: "10px 12px", fontWeight: 600 }}>Motivo</th>
                              </tr>
                            </thead>
                            <tbody>
                              {historicoCusto.map((h, idx) => {
                                const anterior = historicoCusto[idx + 1];
                                const subiu = anterior ? h.custoProducao > anterior.custoProducao : false;
                                const desceu = anterior ? h.custoProducao < anterior.custoProducao : false;

                                const dataFormatada = new Date(h.dataHora).toLocaleString("pt-BR", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                });

                                return (
                                  <tr
                                    key={h.id}
                                    style={{
                                      borderBottom: "1px solid #f2ede7",
                                      background: idx === 0 ? "#fdfbf9" : "transparent",
                                    }}
                                  >
                                    <td style={{ padding: "10px 12px", color: "var(--c-muted)" }}>
                                      {dataFormatada}
                                      {idx === 0 && (
                                        <span style={{ marginLeft: "6px", fontSize: "10px", background: "#e8f3ee", color: "#4fa27a", padding: "1px 5px", borderRadius: "4px", fontWeight: 600 }}>
                                          Atual
                                        </span>
                                      )}
                                    </td>
                                    <td style={{ padding: "10px 12px", fontWeight: "bold" }}>
                                      R$ {h.custoProducao.toFixed(2)}
                                      {subiu && <TrendingUp size={12} style={{ color: "var(--c-danger)", display: "inline", marginLeft: "4px" }} />}
                                      {desceu && <TrendingDown size={12} style={{ color: "#4fa27a", display: "inline", marginLeft: "4px" }} />}
                                    </td>
                                    <td style={{ padding: "10px 12px" }}>R$ {h.custoInsumos.toFixed(2)}</td>
                                    <td style={{ padding: "10px 12px" }}>R$ {h.custoMaoDeObra.toFixed(2)}</td>
                                    <td style={{ padding: "10px 12px", color: "var(--c-primary)", fontWeight: 600 }}>
                                      R$ {h.precoVenda.toFixed(2)}
                                    </td>
                                    <td style={{ padding: "10px 12px" }}>
                                      <span style={{ fontWeight: 600, color: h.margemLucroReal >= 50 ? "#4fa27a" : "#d97706" }}>
                                        {Math.round(h.margemLucroReal)}%
                                      </span>
                                    </td>
                                    <td style={{ padding: "10px 12px", color: "var(--c-muted)", fontSize: "11px" }}>
                                      {h.motivo || "Atualização de valores"}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* BARRA DE AÇÕES INFERIOR: CANCELAR E SALVAR */}
              <div className="form-actions-bar" style={{ marginTop: "24px" }}>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => {
                    if (produtos.length > 0) {
                      selecionarProduto(produtos[0]);
                    } else {
                      setSelectedId(null);
                    }
                    setFormError("");
                  }}
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="button primary"
                  disabled={saving}
                >
                  <Check size={16} /> {saving ? "Salvando..." : "Salvar produto"}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* MODAL DE GESTÃO DE GRUPOS & SUBGRUPOS */}
      {modalGruposAberto && (
        <div className="modal-backdrop">
          <div className="modal-window" style={{ maxWidth: "550px" }}>
            <div className="modal-header">
              <h3>Grupos e Subgrupos de Produtos</h3>
              <button onClick={() => setModalGruposAberto(false)} className="modal-close">
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: "20px", display: "grid", gap: "18px" }}>
              {/* Cadastro de novo Grupo */}
              <div className="subpanel">
                <h4 style={{ fontSize: "12px", marginBottom: "8px" }}>Criar Novo Grupo</h4>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <input
                    value={novoGrupoNome}
                    onChange={(e) => setNovoGrupoNome(e.target.value)}
                    placeholder="Ex: Bolos, Doces Finos..."
                    style={{ flex: 1, padding: "6px 10px", border: "1px solid var(--c-border)", borderRadius: "6px" }}
                  />
                  <input
                    type="color"
                    value={novoGrupoCor}
                    onChange={(e) => setNovoGrupoCor(e.target.value)}
                    title="Cor da etiqueta"
                    style={{ width: "36px", height: "34px", padding: "2px", border: "1px solid var(--c-border)", borderRadius: "6px", cursor: "pointer" }}
                  />
                  <button
                    className="button primary"
                    onClick={async () => {
                      if (!novoGrupoNome.trim()) return;
                      await saveGrupo({ nome: novoGrupoNome, cor: novoGrupoCor });
                      setNovoGrupoNome("");
                      carregarDados();
                      onAction("Grupo criado!");
                    }}
                  >
                    Adicionar Grupo
                  </button>
                </div>
              </div>

              {/* Cadastro de novo Subgrupo */}
              <div className="subpanel">
                <h4 style={{ fontSize: "12px", marginBottom: "8px" }}>Criar Novo Subgrupo</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "8px" }}>
                  <select
                    value={novoSubgrupoPaiId || ""}
                    onChange={(e) => setNovoSubgrupoPaiId(Number(e.target.value) || null)}
                    style={{ padding: "6px 10px", border: "1px solid var(--c-border)", borderRadius: "6px" }}
                  >
                    <option value="">Grupo Pai...</option>
                    {grupos.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.nome}
                      </option>
                    ))}
                  </select>
                  <input
                    value={novoSubgrupoNome}
                    onChange={(e) => setNovoSubgrupoNome(e.target.value)}
                    placeholder="Ex: Bolos Vulcão..."
                    style={{ padding: "6px 10px", border: "1px solid var(--c-border)", borderRadius: "6px" }}
                  />
                  <button
                    className="button primary"
                    onClick={async () => {
                      if (!novoSubgrupoNome.trim() || !novoSubgrupoPaiId) return;
                      await saveSubgrupo({ grupoId: novoSubgrupoPaiId, nome: novoSubgrupoNome });
                      setNovoSubgrupoNome("");
                      carregarDados();
                      onAction("Subgrupo criado!");
                    }}
                  >
                    Adicionar Subgrupo
                  </button>
                </div>
              </div>

              {/* Listagem de Grupos e Subgrupos */}
              <div style={{ maxHeight: "250px", overflowY: "auto", border: "1px solid var(--c-border)", borderRadius: "8px", padding: "10px" }}>
                {grupos.map((g) => {
                  const subs = subgrupos.filter((s) => s.grupoId === g.id);
                  return (
                    <div key={g.id} style={{ marginBottom: "12px", paddingBottom: "8px", borderBottom: "1px solid #f5efe9" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <strong>{g.nome}</strong>
                        <button
                          onClick={async () => {
                            if (!confirm(`Excluir grupo ${g.nome}?`)) return;
                            try {
                              await deleteGrupo(g.id);
                              carregarDados();
                            } catch (err: any) {
                              alert(err.message);
                            }
                          }}
                          style={{ color: "var(--c-danger)", fontSize: "11px" }}
                        >
                          Excluir
                        </button>
                      </div>
                      {subs.length > 0 ? (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "6px" }}>
                          {subs.map((s) => (
                            <span
                              key={s.id}
                              style={{
                                fontSize: "11px",
                                background: "#eee",
                                padding: "2px 8px",
                                borderRadius: "4px",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              {s.nome}
                              <button
                                onClick={async () => {
                                  await deleteSubgrupo(s.id);
                                  carregarDados();
                                }}
                                style={{ color: "#888", border: "none", cursor: "pointer" }}
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ fontSize: "10px", color: "var(--c-muted)" }}>Sem subgrupos</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE GESTÃO DE TIPOS DE ITEM (Insumo, Embalagem, Acabado, Revenda, Semi-acabado) */}
      {modalTiposAberto && (
        <div className="modal-backdrop">
          <div className="modal-window" style={{ maxWidth: "560px" }}>
            <div className="modal-header">
              <h3>Tipos de Item (Classificação)</h3>
              <button onClick={() => setModalTiposAberto(false)} className="modal-close">
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: "20px", display: "grid", gap: "18px" }}>
              {/* Cadastro de novo Tipo de Item */}
              <div className="subpanel">
                <h4 style={{ fontSize: "12px", marginBottom: "8px" }}>Cadastrar Novo Tipo de Item</h4>
                <div style={{ display: "grid", gap: "8px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: "8px" }}>
                    <input
                      value={novoTipoNome}
                      onChange={(e) => setNovoTipoNome(e.target.value)}
                      placeholder="Ex: Mercadoria para Revenda..."
                      style={{ padding: "6px 10px", border: "1px solid var(--c-border)", borderRadius: "6px" }}
                    />
                    <input
                      value={novoTipoCodigo}
                      onChange={(e) => setNovoTipoCodigo(e.target.value)}
                      placeholder="Código (REV)"
                      style={{ padding: "6px 10px", border: "1px solid var(--c-border)", borderRadius: "6px" }}
                    />
                  </div>
                  <input
                    value={novoTipoDescricao}
                    onChange={(e) => setNovoTipoDescricao(e.target.value)}
                    placeholder="Descrição do tipo de item..."
                    style={{ padding: "6px 10px", border: "1px solid var(--c-border)", borderRadius: "6px" }}
                  />
                  <button
                    className="button primary"
                    style={{ justifySelf: "flex-end" }}
                    onClick={async () => {
                      if (!novoTipoNome.trim()) return;
                      await saveTipoItem({
                        nome: novoTipoNome,
                        codigo: novoTipoCodigo,
                        descricao: novoTipoDescricao,
                      });
                      setNovoTipoNome("");
                      setNovoTipoCodigo("");
                      setNovoTipoDescricao("");
                      carregarDados();
                      onAction("Tipo de item cadastrado!");
                    }}
                  >
                    Salvar Tipo de Item
                  </button>
                </div>
              </div>

              {/* Listagem de Tipos Cadastrados */}
              <div style={{ maxHeight: "250px", overflowY: "auto", border: "1px solid var(--c-border)", borderRadius: "8px", padding: "10px" }}>
                {tiposItem.map((t) => (
                  <div
                    key={t.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 4px",
                      borderBottom: "1px solid #f5efe9",
                    }}
                  >
                    <div>
                      <strong>
                        {t.nome} {t.codigo ? `(${t.codigo})` : ""}
                      </strong>
                      {t.padrao && (
                        <span style={{ marginLeft: "6px", fontSize: "10px", background: "#f2ece6", color: "var(--c-primary)", padding: "1px 6px", borderRadius: "4px" }}>
                          Padrão
                        </span>
                      )}
                      {t.descricao && (
                        <p style={{ margin: "2px 0 0", fontSize: "11px", color: "var(--c-muted)" }}>
                          {t.descricao}
                        </p>
                      )}
                    </div>
                    {!t.padrao && (
                      <button
                        onClick={async () => {
                          if (!confirm(`Excluir tipo de item "${t.nome}"?`)) return;
                          try {
                            await deleteTipoItem(t.id);
                            carregarDados();
                            onAction("Tipo de item excluído.");
                          } catch (err: any) {
                            alert(err.message);
                          }
                        }}
                        style={{ color: "var(--c-danger)", fontSize: "11px", border: "none", background: "none", cursor: "pointer" }}
                      >
                        Excluir
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
