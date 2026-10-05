/**
 * ============================================================================
 * PROJETO: Doce Gestor - Sistema de Gestão para Confeitarias
 * REPOSITÓRIO: https://github.com/junin1737/confeitaria
 * ARQUIVO: src/pages/StockPage.tsx
 * DESCRIÇÃO: FASE 1 — Gestão de Estoque e Insumos com Design System Nativo.
 * ============================================================================
 */

import { useEffect, useState, type FormEvent } from "react";
import {
  Boxes,
  Check,
  Download,
  Package,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import {
  deleteInsumo,
  fetchFornecedores,
  fetchInsumos,
  saveInsumo,
  type Fornecedor,
  type Insumo,
  type InsumoInput,
} from "../api";

export function StockPage({ onAction }: { onAction: (msg: string) => void }) {
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState<string>("todos");
  const [selectedId, setSelectedId] = useState<number | "new" | null>(null);

  // Form de Insumo
  const [formNome, setFormNome] = useState("");
  const [formCategoria, setFormCategoria] = useState<Insumo["categoria"]>("ingrediente");
  const [formMarca, setFormMarca] = useState("");
  const [formFornecedorId, setFormFornecedorId] = useState<number | null>(null);
  const [formUnidadeCompra, setFormUnidadeCompra] = useState<Insumo["unidadeCompra"]>("g");
  const [formUnidadeMedida, setFormUnidadeMedida] = useState<Insumo["unidadeMedida"]>("g");
  const [formQtdEmbalagem, setFormQtdEmbalagem] = useState(1000);
  const [formPrecoCompra, setFormPrecoCompra] = useState(10);
  const [formEstoqueAtual, setFormEstoqueAtual] = useState(0);
  const [formEstoqueMinimo, setFormEstoqueMinimo] = useState(0);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [listaInsumos, listaFornec] = await Promise.all([
        fetchInsumos(),
        fetchFornecedores(),
      ]);
      setInsumos(listaInsumos);
      setFornecedores(listaFornec);
      if (listaInsumos.length > 0 && selectedId === null) {
        selecionarInsumo(listaInsumos[0]);
      }
    } catch (err: any) {
      onAction(err?.message || "Erro ao carregar estoque.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const selecionarInsumo = (item: Insumo) => {
    setSelectedId(item.id);
    setFormNome(item.nome);
    setFormCategoria(item.categoria);
    setFormMarca(item.marca || "");
    setFormFornecedorId(item.fornecedorId || null);
    setFormUnidadeCompra(item.unidadeCompra);
    setFormUnidadeMedida(item.unidadeMedida);
    setFormQtdEmbalagem(item.quantidadeEmbalagem);
    setFormPrecoCompra(item.precoCompra);
    setFormEstoqueAtual(item.estoqueAtual);
    setFormEstoqueMinimo(item.estoqueMinimo);
    setFormError("");
  };

  const iniciarNovoInsumo = () => {
    setSelectedId("new");
    setFormNome("");
    setFormCategoria("ingrediente");
    setFormMarca("");
    setFormFornecedorId(null);
    setFormUnidadeCompra("g");
    setFormUnidadeMedida("g");
    setFormQtdEmbalagem(1000);
    setFormPrecoCompra(10);
    setFormEstoqueAtual(0);
    setFormEstoqueMinimo(0);
    setFormError("");
  };

  // Cálculo prévio do custo unitário
  let custoUnitarioPreview = 0;
  if (formQtdEmbalagem > 0 && formPrecoCompra > 0) {
    if (formUnidadeCompra === "kg" && formUnidadeMedida === "g") {
      custoUnitarioPreview = formPrecoCompra / (formQtdEmbalagem * 1000);
    } else if (formUnidadeCompra === "l" && formUnidadeMedida === "ml") {
      custoUnitarioPreview = formPrecoCompra / (formQtdEmbalagem * 1000);
    } else {
      custoUnitarioPreview = formPrecoCompra / formQtdEmbalagem;
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formNome.trim()) {
      setFormError("Informe o nome do insumo.");
      return;
    }
    if (formQtdEmbalagem <= 0) {
      setFormError("A quantidade da embalagem deve ser maior que zero.");
      return;
    }
    if (formPrecoCompra <= 0) {
      setFormError("O preço de compra deve ser maior que zero.");
      return;
    }

    setSaving(true);
    try {
      const payload: InsumoInput = {
        id: selectedId === "new" || selectedId == null ? undefined : selectedId,
        nome: formNome,
        categoria: formCategoria,
        marca: formMarca.trim() || undefined,
        fornecedorId: formFornecedorId,
        unidadeCompra: formUnidadeCompra,
        unidadeMedida: formUnidadeMedida,
        quantidadeEmbalagem: formQtdEmbalagem,
        precoCompra: formPrecoCompra,
        estoqueAtual: formEstoqueAtual,
        estoqueMinimo: formEstoqueMinimo,
      };

      const salvo = await saveInsumo(payload);
      onAction(`Insumo "${salvo.nome}" salvo com sucesso!`);
      await carregarDados();
      setSelectedId(salvo.id);
    } catch (err: any) {
      setFormError(err?.message || "Erro ao salvar insumo.");
    } finally {
      setSaving(false);
    }
  };

  const handleExcluir = async (id: number) => {
    if (!confirm("Deseja realmente excluir este insumo?")) return;
    try {
      await deleteInsumo(id);
      onAction("Insumo excluído.");
      setSelectedId(null);
      carregarDados();
    } catch (err: any) {
      alert(err.message || "Não foi possível excluir o insumo.");
    }
  };

  const exportarCsv = () => {
    const cabecalho = ["nome", "categoria", "marca", "unidade_compra", "preco_pago", "custo_unitario", "estoque_atual", "estoque_minimo"];
    const linhas = insumos.map((i) =>
      [
        i.nome,
        i.categoria,
        i.marca || "",
        `${i.quantidadeEmbalagem} ${i.unidadeCompra}`,
        i.precoCompra.toFixed(2),
        i.custoUnitario.toFixed(4),
        i.estoqueAtual,
        i.estoqueMinimo,
      ]
        .map((v) => `"${String(v).replaceAll('"', '""')}"`)
        .join(";")
    );
    const blob = new Blob([[cabecalho.join(";"), ...linhas].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "estoque_insumos.csv";
    a.click();
    URL.revokeObjectURL(url);
    onAction("Lista de insumos exportada.");
  };

  const insumosFiltrados = insumos.filter((item) => {
    const bateTexto =
      item.nome.toLowerCase().includes(query.toLowerCase()) ||
      (item.marca && item.marca.toLowerCase().includes(query.toLowerCase()));
    const bateCat = filtroCategoria === "todos" || item.categoria === filtroCategoria;
    return bateTexto && bateCat;
  });

  const insumosCriticos = insumos.filter((i) => i.estoqueMinimo > 0 && i.estoqueAtual <= i.estoqueMinimo).length;

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
            Controle de matérias-primas, embalagens de compra e conversão de custos para as receitas.
            {insumosCriticos > 0 && (
              <span style={{ marginLeft: "8px", color: "var(--c-danger)", fontWeight: 600 }}>
                ({insumosCriticos} {insumosCriticos === 1 ? "item abaixo" : "itens abaixo"} do estoque mínimo)
              </span>
            )}
          </p>
        </div>
        <div className="heading-actions">
          <button className="button secondary" onClick={exportarCsv}>
            <Download size={16} /> Exportar
          </button>
          <button className="button primary" onClick={iniciarNovoInsumo}>
            <Plus size={17} /> Novo insumo
          </button>
        </div>
      </section>

      <section className="employee-layout">
        {/* Painel Esquerdo: Lista */}
        <div className="panel employee-list-panel">
          <div className="panel-heading">
            <div>
              <div className="section-kicker">Itens Cadastrados</div>
              <h2>Matérias-Primas</h2>
            </div>
            <div className="employee-filter">
              {(["todos", "ingrediente", "embalagem", "decoracao"] as const).map((cat) => (
                <button
                  key={cat}
                  className={filtroCategoria === cat ? "active" : ""}
                  onClick={() => setFiltroCategoria(cat)}
                >
                  {cat === "todos" ? "Todos" : cat === "ingrediente" ? "Ingredientes" : cat === "embalagem" ? "Embalagens" : "Decoração"}
                </button>
              ))}
            </div>
          </div>

          <div className="search-box">
            <Search size={16} />
            <input
              placeholder="Buscar insumo ou marca..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="employee-list">
            {loading ? <div className="employee-empty">Carregando insumos...</div> : null}
            {!loading && insumosFiltrados.length === 0 ? (
              <div className="employee-empty">Nenhum insumo encontrado.</div>
            ) : null}

            {insumosFiltrados.map((item) => {
              const ativo = selectedId === item.id;
              const critico = item.estoqueMinimo > 0 && item.estoqueAtual <= item.estoqueMinimo;

              return (
                <button
                  key={item.id}
                  className={`employee-row ${ativo ? "selected" : ""}`}
                  onClick={() => selecionarInsumo(item)}
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
                      {item.marca ? `${item.marca} • ` : ""}
                      {item.quantidadeEmbalagem} {item.unidadeCompra} • R$ {item.precoCompra.toFixed(2)}
                    </span>
                  </div>
                  <div style={{ textAlign: "right", marginLeft: "auto" }}>
                    <div style={{ fontSize: "11px", fontWeight: "bold", color: critico ? "#bd6a6a" : "var(--c-text)" }}>
                      {item.estoqueAtual} {item.unidadeMedida}
                    </div>
                    {critico && (
                      <span style={{ fontSize: "9px", background: "#fbecef", color: "#bd6a6a", padding: "1px 5px", borderRadius: "4px", fontWeight: 700 }}>
                        Repor!
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Painel Direito: Formulário e Detalhes */}
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
                      {selectedId === "new" ? "NOVO INSUMO" : formCategoria.toUpperCase()}
                    </span>
                    <h2>{formNome || "Novo Insumo"}</h2>
                    <p>{formMarca || "Sem marca definida"}</p>
                  </div>
                </div>

                <div className="detail-actions">
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
                </div>
              </div>

              {formError && (
                <div style={{ padding: "10px 14px", margin: "14px 0", background: "#fdf2f2", color: "#991b1b", borderRadius: "8px", fontSize: "12px" }}>
                  {formError}
                </div>
              )}

              {/* Cards de Métricas do Insumo (.detail-stat-grid) */}
              <div className="detail-stat-grid">
                <div>
                  <span>Custo Base na Receita</span>
                  <strong style={{ color: "var(--c-primary)" }}>
                    R$ {custoUnitarioPreview.toFixed(4)}
                  </strong>
                  <small>Por {formUnidadeMedida}</small>
                </div>
                <div>
                  <span>Preço Pago na Embalagem</span>
                  <strong>R$ {formPrecoCompra.toFixed(2)}</strong>
                  <small>Pacote de {formQtdEmbalagem} {formUnidadeCompra}</small>
                </div>
                <div>
                  <span>Estoque Disponível</span>
                  <strong style={{ color: formEstoqueAtual <= formEstoqueMinimo && formEstoqueMinimo > 0 ? "#bd6a6a" : "#4fa27a" }}>
                    {formEstoqueAtual} {formUnidadeMedida}
                  </strong>
                  <small>Mínimo de segurança: {formEstoqueMinimo} {formUnidadeMedida}</small>
                </div>
              </div>

              {/* Seções de Formulário */}
              <div className="detail-sections" style={{ marginTop: "16px" }}>
                {/* Dados Gerais */}
                <div className="subpanel">
                  <div className="subpanel-head">
                    <div>
                      <div className="section-kicker">Dados do Insumo</div>
                      <h3>Identificação</h3>
                    </div>
                  </div>
                  <div style={{ display: "grid", gap: "12px", marginTop: "12px" }}>
                    <div className="field">
                      <label>Nome do Insumo *</label>
                      <input
                        value={formNome}
                        onChange={(e) => setFormNome(e.target.value)}
                        placeholder="Ex: Leite Condensado 395g, Chocolate 50%..."
                        required
                      />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      <div className="field">
                        <label>Categoria</label>
                        <select
                          value={formCategoria}
                          onChange={(e) => setFormCategoria(e.target.value as any)}
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
                          placeholder="Nestlé, Melken, Callebaut..."
                        />
                      </div>
                    </div>

                    <div className="field">
                      <label>Fornecedor Parceiro</label>
                      <select
                        value={formFornecedorId || ""}
                        onChange={(e) => setFormFornecedorId(Number(e.target.value) || null)}
                      >
                        <option value="">Selecione o fornecedor (opcional)...</option>
                        {fornecedores.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.nomeFantasia || f.razaoSocial} ({f.codigo})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Conversão de Embalagem & Preço Pago */}
                <div className="subpanel">
                  <div className="subpanel-head">
                    <div>
                      <div className="section-kicker">Conversor Universal</div>
                      <h3>Compra & Fracionamento</h3>
                    </div>
                  </div>
                  <div style={{ display: "grid", gap: "12px", marginTop: "12px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      <div className="field">
                        <label>Qtd na Embalagem</label>
                        <input
                          type="number"
                          step="any"
                          min="0.001"
                          value={formQtdEmbalagem}
                          onChange={(e) => setFormQtdEmbalagem(Number(e.target.value))}
                          required
                        />
                      </div>
                      <div className="field">
                        <label>Unidade de Compra</label>
                        <select
                          value={formUnidadeCompra}
                          onChange={(e) => {
                            const u = e.target.value as any;
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
                    </div>

                    <div className="field">
                      <label>Preço Pago na Embalagem (R$) *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={formPrecoCompra}
                        onChange={(e) => setFormPrecoCompra(Number(e.target.value))}
                        required
                        style={{ fontSize: "16px", fontWeight: "bold", color: "var(--c-text)" }}
                      />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      <div className="field">
                        <label>Estoque Atual ({formUnidadeMedida})</label>
                        <input
                          type="number"
                          step="any"
                          value={formEstoqueAtual}
                          onChange={(e) => setFormEstoqueAtual(Number(e.target.value))}
                        />
                      </div>
                      <div className="field">
                        <label>Estoque Mínimo ({formUnidadeMedida})</label>
                        <input
                          type="number"
                          step="any"
                          value={formEstoqueMinimo}
                          onChange={(e) => setFormEstoqueMinimo(Number(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>
      </section>
    </>
  );
}
