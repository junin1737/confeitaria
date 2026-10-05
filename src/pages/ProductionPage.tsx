/**
 * ============================================================================
 * PROJETO: Gestão com Sabor - Sistema de Gestão para Confeitarias
 * REPOSITÓRIO: https://github.com/junin1737/confeitaria
 * ARQUIVO: src/pages/ProductionPage.tsx
 * DESCRIÇÃO: Módulo Operacional de Produção.
 *            Permite selecionar um produto acabado (que possui receita cadastrada),
 *            informar a quantidade a produzir, visualizar os insumos que serão consumidos,
 *            validar a disponibilidade de estoque e executar a baixa automática das
 *            matérias-primas e a adição no estoque do produto final.
 * ============================================================================
 */

import { useEffect, useState, useMemo } from "react";
import {
  ChefHat,
  Play,
  History,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Package,
  Check,
  X,
  Search,
  RefreshCw,
} from "lucide-react";
import {
  fetchProdutos,
  fetchProducoes,
  executarProducao,
  type Produto,
  type OrdemProducao,
  type ProdutoItemReceita,
} from "../api";

interface ProductionPageProps {
  onAction: (msg: string) => void;
}

export function ProductionPage({ onAction }: ProductionPageProps) {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [producoes, setProducoes] = useState<OrdemProducao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [termoBusca, setTermoBusca] = useState("");

  // Estado da Modal de Nova Produção
  const [modalAberta, setModalAberta] = useState(false);
  const [produtoSelecionadoId, setProdutoSelecionadoId] = useState<number | null>(null);
  const [quantidadeProduzir, setQuantidadeProduzir] = useState<number>(1);
  const [observacoes, setObservacoes] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erroModal, setErroModal] = useState<string | null>(null);

  // Carrega produtos e histórico de produções
  const carregarDados = async () => {
    try {
      setCarregando(true);
      const [listaProds, listaProdsExec] = await Promise.all([
        fetchProdutos(),
        fetchProducoes(),
      ]);
      setProdutos(listaProds);
      setProducoes(listaProdsExec);
    } catch (err: any) {
      onAction("Erro ao carregar dados de produção: " + err.message);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  // Filtra produtos que possuem receita cadastrada (são passíveis de produção)
  const produtosProduziveis = useMemo(() => {
    return produtos.filter(
      (p) =>
        p.status === "ativo" &&
        p.temReceita &&
        (p.itensReceita?.length ?? 0) > 0 &&
        (p.nome.toLowerCase().includes(termoBusca.toLowerCase()) ||
          p.codigo.toLowerCase().includes(termoBusca.toLowerCase()))
    );
  }, [produtos, termoBusca]);

  // Produto atualmente selecionado no modal
  const produtoAtual = useMemo(() => {
    return produtos.find((p) => p.id === produtoSelecionadoId) || null;
  }, [produtos, produtoSelecionadoId]);

  // Cálculo da simulação de insumos a baixar
  const simulacaoBaixa = useMemo(() => {
    if (!produtoAtual || !produtoAtual.itensReceita) return [];
    const rendimentoBase = Number(produtoAtual.rendimentoQuantidade) || 1;
    const multiplicador = (Number(quantidadeProduzir) || 0) / rendimentoBase;

    return produtoAtual.itensReceita.map((ing: ProdutoItemReceita) => {
      const qtdNecessaria = Number(ing.quantidade) * multiplicador;
      const custoParcial = Number(ing.custoTotalItem || 0) * multiplicador;

      return {
        ...ing,
        qtdNecessaria,
        custoParcial,
      };
    });
  }, [produtoAtual, quantidadeProduzir]);

  // Custo total previsto para a batelada
  const custoTotalPrevisto = useMemo(() => {
    return simulacaoBaixa.reduce((acc: number, item) => acc + (item.custoParcial || 0), 0);
  }, [simulacaoBaixa]);

  const abrirModalProducao = (prodId?: number) => {
    setProdutoSelecionadoId(prodId || (produtosProduziveis[0]?.id ?? null));
    setQuantidadeProduzir(1);
    setObservacoes("");
    setErroModal(null);
    setModalAberta(true);
  };

  const handleExecutarProducao = async () => {
    if (!produtoSelecionadoId) {
      setErroModal("Selecione um produto para produzir.");
      return;
    }
    if (quantidadeProduzir <= 0) {
      setErroModal("A quantidade a produzir deve ser maior que zero.");
      return;
    }

    try {
      setSalvando(true);
      setErroModal(null);
      await executarProducao(produtoSelecionadoId, quantidadeProduzir, observacoes);
      onAction(`Produção de ${quantidadeProduzir}x realizada com sucesso! Insumos baixados.`);
      setModalAberta(false);
      await carregarDados();
    } catch (err: any) {
      setErroModal(err.message || "Erro ao executar ordem de produção.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="orders-page" style={{ padding: "1.5rem" }}>
      {/* CABEÇALHO DA PÁGINA */}
      <div className="page-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <span className="eyebrow" style={{ color: "#d97706", fontWeight: 700, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <ChefHat size={16} /> Linha de Produção & Confeitaria
          </span>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, margin: "0.25rem 0", color: "#1e293b" }}>
            Ordens de Produção
          </h1>
          <p style={{ margin: 0, color: "#64748b", fontSize: "0.95rem" }}>
            Produza produtos acabados com baixa automática proporcional de matéria-prima e embalagens do estoque.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            type="button"
            className="button secondary"
            onClick={carregarDados}
            title="Atualizar dados"
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            <RefreshCw size={16} /> Atualizar
          </button>
          <button
            type="button"
            className="button primary"
            onClick={() => abrirModalProducao()}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
              color: "#fff",
              border: "none",
              fontWeight: 700,
              boxShadow: "0 4px 12px rgba(217, 119, 6, 0.25)",
            }}
          >
            <Play size={16} /> Nova Produção
          </button>
        </div>
      </div>

      {/* CARDS DE RESUMO OPERACIONAL */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "1.25rem",
          marginBottom: "1.75rem",
        }}
      >
        <div className="panel" style={{ padding: "1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "#fef3c7", color: "#d97706", display: "grid", placeItems: "center" }}>
            <ChefHat size={26} />
          </div>
          <div>
            <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>Produtos com Receita Pronta</span>
            <h3 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800, color: "#1e293b" }}>
              {produtosProduziveis.length}
            </h3>
          </div>
        </div>

        <div className="panel" style={{ padding: "1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "#dbeafe", color: "#2563eb", display: "grid", placeItems: "center" }}>
            <Layers size={26} />
          </div>
          <div>
            <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>Ordens Executadas</span>
            <h3 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800, color: "#1e293b" }}>
              {producoes.length}
            </h3>
          </div>
        </div>

        <div className="panel" style={{ padding: "1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "#dcfce7", color: "#16a34a", display: "grid", placeItems: "center" }}>
            <CheckCircle2 size={26} />
          </div>
          <div>
            <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>Unidades Fabricadas</span>
            <h3 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800, color: "#1e293b" }}>
              {producoes.reduce((acc, p) => acc + (p.quantidadeProduzida || 0), 0)}
            </h3>
          </div>
        </div>
      </div>

      {/* GRID DE PRODUTOS DISPONÍVEIS PARA PRODUÇÃO */}
      <div className="panel" style={{ marginBottom: "2rem", padding: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 800, margin: 0, color: "#1e293b" }}>
              Cardápio de Produção (Produtos com Receita Técnica)
            </h2>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
              Clique em &quot;Produzir&quot; para abrir a simulação de baixa e adicionar ao estoque final.
            </p>
          </div>

          <div style={{ position: "relative", width: 280 }}>
            <Search size={16} style={{ position: "absolute", left: 12, top: 12, color: "#94a3b8" }} />
            <input
              type="text"
              placeholder="Buscar por código ou nome..."
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              style={{
                width: "100%",
                padding: "0.55rem 0.75rem 0.55rem 2.25rem",
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                fontSize: "0.9rem",
              }}
            />
          </div>
        </div>

        {carregando ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#94a3b8" }}>Carregando dados...</div>
        ) : produtosProduziveis.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", background: "#f8fafc", borderRadius: 12, border: "1px dashed #cbd5e1" }}>
            <ChefHat size={40} style={{ color: "#94a3b8", marginBottom: "0.75rem" }} />
            <p style={{ fontWeight: 700, color: "#334155", margin: 0 }}>Nenhum produto com receita cadastrada encontrado.</p>
            <p style={{ fontSize: "0.85rem", color: "#64748b", marginTop: "0.25rem" }}>
              Cadastre um produto e inclua sua Ficha Técnica/Receita na aba de Produtos para que ele apareça aqui.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: "1.25rem",
            }}
          >
            {produtosProduziveis.map((prod) => (
              <div
                key={prod.id}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  padding: "1.25rem",
                  background: "#fff",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
                  transition: "transform 0.15s ease, box-shadow 0.15s ease",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#d97706", background: "#fef3c7", padding: "0.2rem 0.5rem", borderRadius: 6 }}>
                      CÓD: {prod.codigo}
                    </span>
                    <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>
                      Estoque: <strong style={{ color: prod.estoqueAtual > 0 ? "#16a34a" : "#dc2626" }}>{prod.estoqueAtual} {prod.unidadeVenda}</strong>
                    </span>
                  </div>

                  <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: "0.25rem 0", color: "#1e293b" }}>
                    {prod.nome}
                  </h3>

                  <p style={{ fontSize: "0.85rem", color: "#64748b", margin: "0 0 1rem 0" }}>
                    {prod.grupoNome ? `Grupo: ${prod.grupoNome}` : "Sem grupo"}
                  </p>

                  <div style={{ background: "#f8fafc", padding: "0.75rem", borderRadius: 8, fontSize: "0.85rem", marginBottom: "1rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                      <span style={{ color: "#64748b" }}>Rendimento Base:</span>
                      <strong>{prod.rendimentoQuantidade} {prod.rendimentoUnidade || prod.unidadeVenda}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                      <span style={{ color: "#64748b" }}>Ingredientes:</span>
                      <strong>{prod.itensReceita.length} itens</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#64748b" }}>Custo Insumos:</span>
                      <strong style={{ color: "#0f766e" }}>
                        R$ {Number(prod.custoInsumos || 0).toFixed(2)}
                      </strong>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="button primary"
                  onClick={() => abrirModalProducao(prod.id)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    padding: "0.65rem",
                    background: "#0f766e",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    fontWeight: 700,
                  }}
                >
                  <Play size={16} /> Produzir Este Item
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* HISTÓRICO DE PRODUÇÕES EXECUTADAS */}
      <div className="panel" style={{ padding: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
          <History size={20} style={{ color: "#64748b" }} />
          <h2 style={{ fontSize: "1.15rem", fontWeight: 800, margin: 0, color: "#1e293b" }}>
            Histórico Recente de Ordens de Produção
          </h2>
        </div>

        {producoes.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "#94a3b8", background: "#f8fafc", borderRadius: 8 }}>
            Nenhuma ordem de produção realizada ainda.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e2e8f0", color: "#475569" }}>
                  <th style={{ padding: "0.75rem" }}>OP #</th>
                  <th style={{ padding: "0.75rem" }}>Data/Hora</th>
                  <th style={{ padding: "0.75rem" }}>Produto Fabricado</th>
                  <th style={{ padding: "0.75rem", textAlign: "right" }}>Qtd Produzida</th>
                  <th style={{ padding: "0.75rem", textAlign: "right" }}>Custo do Lote</th>
                  <th style={{ padding: "0.75rem" }}>Insumos Baixados</th>
                  <th style={{ padding: "0.75rem" }}>Observações</th>
                </tr>
              </thead>
              <tbody>
                {producoes.map((op) => (
                  <tr key={op.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "0.75rem", fontWeight: 700, color: "#d97706" }}>
                      #{op.id}
                    </td>
                    <td style={{ padding: "0.75rem", color: "#64748b" }}>
                      {op.dataProducao ? new Date(op.dataProducao).toLocaleString("pt-BR") : "-"}
                    </td>
                    <td style={{ padding: "0.75rem", fontWeight: 700, color: "#1e293b" }}>
                      {op.produtoNome} <span style={{ fontSize: "0.75rem", color: "#64748b" }}>({op.produtoCodigo})</span>
                    </td>
                    <td style={{ padding: "0.75rem", textAlign: "right", fontWeight: 700, color: "#16a34a" }}>
                      +{op.quantidadeProduzida}
                    </td>
                    <td style={{ padding: "0.75rem", textAlign: "right", fontWeight: 700, color: "#0f766e" }}>
                      R$ {Number(op.custoTotal || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: "0.75rem" }}>
                      <details style={{ cursor: "pointer" }}>
                        <summary style={{ fontSize: "0.8rem", color: "#2563eb", fontWeight: 600 }}>
                          Ver {op.insumosBaixados.length} itens baixados
                        </summary>
                        <ul style={{ margin: "0.5rem 0 0 0", paddingLeft: "1.25rem", fontSize: "0.8rem", color: "#475569" }}>
                          {op.insumosBaixados.map((ib, i) => (
                            <li key={i}>
                              {ib.insumoNome}: <strong>-{Number(ib.quantidadeBaixada).toFixed(2)} {ib.unidade}</strong> (R$ {Number(ib.custoTotal).toFixed(2)})
                            </li>
                          ))}
                        </ul>
                      </details>
                    </td>
                    <td style={{ padding: "0.75rem", color: "#64748b", fontSize: "0.85rem" }}>
                      {op.observacoes || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: EXECUTAR ORDEM DE PRODUÇÃO */}
      {modalAberta && (
        <div
          className="modal-backdrop"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem",
          }}
        >
          <div
            className="modal-window"
            style={{
              background: "#fff",
              borderRadius: 16,
              maxWidth: 720,
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              border: "1px solid #e2e8f0",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* TOPO DA MODAL */}
            <div
              style={{
                padding: "1.25rem 1.5rem",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#f8fafc",
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "#fef3c7", color: "#d97706", display: "grid", placeItems: "center" }}>
                  <Play size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: "1.2rem", fontWeight: 800, margin: 0, color: "#1e293b" }}>
                    Executar Ordem de Produção
                  </h2>
                  <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
                    Baixa de insumos e entrada automática no estoque de acabados
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalAberta(false)}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "#94a3b8" }}
              >
                <X size={22} />
              </button>
            </div>

            {/* CORPO DA MODAL */}
            <div style={{ padding: "1.5rem" }}>
              {erroModal && (
                <div
                  style={{
                    padding: "0.85rem 1rem",
                    borderRadius: 8,
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    color: "#dc2626",
                    fontSize: "0.9rem",
                    marginBottom: "1.25rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <AlertTriangle size={18} />
                  <span>{erroModal}</span>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                    Produto a Produzir *
                  </label>
                  <select
                    value={produtoSelecionadoId ?? ""}
                    onChange={(e) => setProdutoSelecionadoId(Number(e.target.value))}
                    style={{
                      width: "100%",
                      padding: "0.65rem",
                      borderRadius: 8,
                      border: "1px solid #cbd5e1",
                      fontSize: "0.9rem",
                      background: "#fff",
                    }}
                  >
                    {produtosProduziveis.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.codigo} - {p.nome} (Atual: {p.estoqueAtual} {p.unidadeVenda})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                    Quantidade a Produzir *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={quantidadeProduzir}
                    onChange={(e) => setQuantidadeProduzir(Math.max(1, Number(e.target.value)))}
                    style={{
                      width: "100%",
                      padding: "0.65rem",
                      borderRadius: 8,
                      border: "1px solid #cbd5e1",
                      fontSize: "0.9rem",
                      fontWeight: 700,
                    }}
                  />
                </div>
              </div>

              {/* SIMULAÇÃO DE BAIXA DOS INSUMOS */}
              <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: "1rem", background: "#f8fafc", marginBottom: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                  <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <Package size={16} /> Previsão de Baixa de Insumos da Receita
                  </h4>
                  <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0f766e" }}>
                    Custo Total Previsto: R$ {custoTotalPrevisto.toFixed(2)}
                  </span>
                </div>

                {simulacaoBaixa.length === 0 ? (
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>Nenhum insumo associado.</p>
                ) : (
                  <div style={{ maxHeight: 220, overflowY: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid #cbd5e1", color: "#64748b", textAlign: "left" }}>
                          <th style={{ padding: "0.4rem" }}>Insumo</th>
                          <th style={{ padding: "0.4rem", textAlign: "right" }}>Necessário</th>
                          <th style={{ padding: "0.4rem", textAlign: "right" }}>Custo Rateado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {simulacaoBaixa.map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "0.4rem", fontWeight: 600, color: "#334155" }}>
                              {item.insumoNome}
                            </td>
                            <td style={{ padding: "0.4rem", textAlign: "right", fontWeight: 700, color: "#dc2626" }}>
                              -{item.qtdNecessaria.toFixed(2)} {item.unidade}
                            </td>
                            <td style={{ padding: "0.4rem", textAlign: "right", color: "#0f766e" }}>
                              R$ {Number(item.custoParcial || 0).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* OBSERVAÇÕES */}
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                  Observações da Batelada / Lote (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Produção para encomenda de casamento, lote 04..."
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.65rem",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    fontSize: "0.9rem",
                  }}
                />
              </div>
            </div>

            {/* RODAPÉ DA MODAL */}
            <div
              style={{
                padding: "1rem 1.5rem",
                borderTop: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.75rem",
                background: "#f8fafc",
                borderBottomLeftRadius: 16,
                borderBottomRightRadius: 16,
              }}
            >
              <button
                type="button"
                className="button secondary"
                onClick={() => setModalAberta(false)}
                disabled={salvando}
                style={{ padding: "0.65rem 1.25rem", fontWeight: 600 }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="button primary"
                onClick={handleExecutarProducao}
                disabled={salvando}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.65rem 1.5rem",
                  fontWeight: 700,
                  background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  boxShadow: "0 4px 10px rgba(22, 163, 74, 0.25)",
                }}
              >
                {salvando ? "Produzindo..." : <><Check size={18} /> Confirmar & Produzir</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
