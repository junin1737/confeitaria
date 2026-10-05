/**
 * ============================================================================
 * PROJETO: Gestão com Sabor - Sistema de Gestão para Confeitarias
 * REPOSITÓRIO: https://github.com/junin1737/confeitaria
 * ARQUIVO: src/pages/PurchasesPage.tsx
 * DESCRIÇÃO: Módulo de Compras e Entrada de Nota Fiscal no Estoque.
 *            - Entrada manual de NF-e com fornecedor e itens.
 *            - Importação direta de arquivo XML de NF-e (Modelo 55/65).
 *            - Integração direta: alimenta o estoque e atualiza custos de insumos/produtos.
 * ============================================================================
 */

import { useEffect, useState, useMemo, useRef, type ChangeEvent } from "react";
import {
  FileText,
  Upload,
  Plus,
  RefreshCw,
  Search,
  Check,
  X,
  AlertTriangle,
  Building2,
  Trash2,
  DollarSign,
  FileCode,
} from "lucide-react";
import {
  fetchCompras,
  saveCompraNota,
  parseNfeXmlApi,
  fetchFornecedores,
  fetchInsumos,
  fetchProdutos,
  type CompraNota,
  type CompraItem,
  type Fornecedor,
  type Insumo,
  type Produto,
} from "../api";

interface PurchasesPageProps {
  onAction: (msg: string) => void;
}

export function PurchasesPage({ onAction }: PurchasesPageProps) {
  const [compras, setCompras] = useState<CompraNota[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [termoBusca, setTermoBusca] = useState("");

  // Estado do Modal de Nova Entrada de Nota
  const [modalAberta, setModalAberta] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erroModal, setErroModal] = useState<string | null>(null);

  // Campos do Cabeçalho da Nota
  const [fornecedorId, setFornecedorId] = useState<number | null>(null);
  const [numeroNota, setNumeroNota] = useState("");
  const [serieNota, setSerieNota] = useState("");
  const [chaveAcesso, setChaveAcesso] = useState("");
  const [dataEmissao, setDataEmissao] = useState("");
  const [dataEntrada, setDataEntrada] = useState(new Date().toISOString().split("T")[0]);
  const [valorFrete, setValorFrete] = useState<number>(0);
  const [observacoes, setObservacoes] = useState("");
  const [arquivoXml, setArquivoXml] = useState<string | null>(null);

  // Lista de Itens da Nota Fiscal
  const [itensNota, setItensNota] = useState<CompraItem[]>([]);

  // Item Temporário para Inclusão Manual
  const [itemTempTipo, setItemTempTipo] = useState<"insumo" | "produto">("insumo");
  const [itemTempInsumoId, setItemTempInsumoId] = useState<number | null>(null);
  const [itemTempProdutoId, setItemTempProdutoId] = useState<number | null>(null);
  const [itemTempDescricao, setItemTempDescricao] = useState("");
  const [itemTempUnidade, setItemTempUnidade] = useState("un");
  const [itemTempQuantidade, setItemTempQuantidade] = useState<number>(1);
  const [itemTempValorUnitario, setItemTempValorUnitario] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const carregarDados = async () => {
    try {
      setCarregando(true);
      const [listaCompras, listaFornec, listaInsumos, listaProds] = await Promise.all([
        fetchCompras(),
        fetchFornecedores(),
        fetchInsumos(),
        fetchProdutos(),
      ]);
      setCompras(listaCompras);
      setFornecedores(listaFornec);
      setInsumos(listaInsumos);
      setProdutos(listaProds);
    } catch (err: any) {
      onAction("Erro ao carregar compras: " + err.message);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  // Cálculos de totais da nota no modal
  const valorProdutosTotal = useMemo(() => {
    return itensNota.reduce((acc, it) => acc + (it.valorTotal || 0), 0);
  }, [itensNota]);

  const valorNotaTotal = useMemo(() => {
    return valorProdutosTotal + (Number(valorFrete) || 0);
  }, [valorProdutosTotal, valorFrete]);

  // Abre modal para nova nota manual ou limpa campos
  const abrirNovaNota = () => {
    setFornecedorId(fornecedores[0]?.id ?? null);
    setNumeroNota("");
    setSerieNota("1");
    setChaveAcesso("");
    setDataEmissao(new Date().toISOString().split("T")[0]);
    setDataEntrada(new Date().toISOString().split("T")[0]);
    setValorFrete(0);
    setObservacoes("");
    setArquivoXml(null);
    setItensNota([]);
    setErroModal(null);
    setModalAberta(true);
  };

  // Upload e Parse do arquivo XML da NF-e
  const handleUploadXml = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setErroModal(null);
      const text = await file.text();
      setArquivoXml(text);

      const parsed = await parseNfeXmlApi(text);
      if (!parsed.sucesso) {
        setErroModal(parsed.erro || "Falha ao processar arquivo XML.");
        return;
      }

      // Preenche os dados extraídos do XML
      if (parsed.numeroNota) setNumeroNota(parsed.numeroNota);
      if (parsed.serieNota) setSerieNota(parsed.serieNota);
      if (parsed.chaveAcesso) setChaveAcesso(parsed.chaveAcesso);
      if (parsed.dataEmissao) setDataEmissao(parsed.dataEmissao);
      if (parsed.valorFrete) setValorFrete(parsed.valorFrete);

      // Tenta localizar o fornecedor pelo CNPJ/CPF do XML
      if (parsed.fornecedor?.cnpjCpf) {
        const cnpjLimpo = parsed.fornecedor.cnpjCpf.replace(/\D/g, "");
        const fornecEncontrado = fornecedores.find((f) =>
          f.cnpjCpf?.replace(/\D/g, "").includes(cnpjLimpo)
        );
        if (fornecEncontrado) {
          setFornecedorId(fornecEncontrado.id);
        } else {
          setObservacoes(
            (prev) =>
              (prev ? prev + " | " : "") +
              `Fornecedor XML: ${parsed.fornecedor?.razaoSocial} (CNPJ: ${parsed.fornecedor?.cnpjCpf})`
          );
        }
      }

      // Converte e associa itens lidos no XML
      if (parsed.itens && parsed.itens.length > 0) {
        const itensMapeados = parsed.itens.map((it) => {
          // Tenta associar por similaridade de nome com insumos existentes
          const descLower = it.descricao.toLowerCase();
          const insumoMatch = insumos.find((ins) =>
            descLower.includes(ins.nome.toLowerCase()) || ins.nome.toLowerCase().includes(descLower)
          );

          return {
            ...it,
            insumoId: insumoMatch ? insumoMatch.id : null,
          };
        });

        setItensNota(itensMapeados);
      }

      onAction("Arquivo XML importado com sucesso! Verifique os itens e confirme.");
    } catch (err: any) {
      setErroModal("Erro ao ler arquivo XML: " + err.message);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Adiciona item manualmente à lista
  const handleAdicionarItemManual = () => {
    if (!itemTempDescricao.trim()) {
      alert("Informe a descrição do produto ou insumo.");
      return;
    }
    if (itemTempQuantidade <= 0) {
      alert("A quantidade deve ser maior que zero.");
      return;
    }
    if (itemTempValorUnitario < 0) {
      alert("O valor unitário não pode ser negativo.");
      return;
    }

    const valorTotal = itemTempQuantidade * itemTempValorUnitario;

    const novoItem: CompraItem = {
      insumoId: itemTempTipo === "insumo" ? itemTempInsumoId : null,
      produtoId: itemTempTipo === "produto" ? itemTempProdutoId : null,
      descricao: itemTempDescricao.trim(),
      unidade: itemTempUnidade,
      quantidade: itemTempQuantidade,
      valorUnitario: itemTempValorUnitario,
      valorTotal: valorTotal,
    };

    setItensNota([...itensNota, novoItem]);

    // Reseta inputs do item
    setItemTempDescricao("");
    setItemTempQuantidade(1);
    setItemTempValorUnitario(0);
    setItemTempInsumoId(null);
    setItemTempProdutoId(null);
  };

  // Remove um item da tabela do modal
  const handleRemoverItem = (index: number) => {
    setItensNota(itensNota.filter((_, i) => i !== index));
  };

  // Altera a associação de estoque de um item da tabela
  const handleVincularItemEstoque = (index: number, tipo: "insumo" | "produto", id: number | null) => {
    setItensNota((prev) =>
      prev.map((it, idx) => {
        if (idx !== index) return it;
        return {
          ...it,
          insumoId: tipo === "insumo" ? id : null,
          produtoId: tipo === "produto" ? id : null,
        };
      })
    );
  };

  // Salva e grava a entrada da nota e movimentação no estoque
  const handleSalvarEntradaNota = async () => {
    if (!numeroNota.trim()) {
      setErroModal("Informe o número da nota fiscal.");
      return;
    }
    if (itensNota.length === 0) {
      setErroModal("Adicione ao menos um item de mercadoria na nota.");
      return;
    }

    try {
      setSalvando(true);
      setErroModal(null);

      await saveCompraNota({
        fornecedorId,
        numeroNota: numeroNota.trim(),
        serieNota: serieNota.trim() || "1",
        chaveAcesso: chaveAcesso.trim() || null,
        dataEmissao: dataEmissao || null,
        dataEntrada: dataEntrada || new Date().toISOString().split("T")[0],
        valorProdutos: valorProdutosTotal,
        valorFrete: Number(valorFrete) || 0,
        valorTotal: valorNotaTotal,
        observacoes: observacoes.trim() || null,
        arquivoXml,
        itens: itensNota,
      });

      onAction(`Entrada da NF ${numeroNota} gravada com sucesso! Estoque atualizado.`);
      setModalAberta(false);
      await carregarDados();
    } catch (err: any) {
      setErroModal(err.message || "Erro ao salvar entrada de nota fiscal.");
    } finally {
      setSalvando(false);
    }
  };

  // Filtro de busca na lista de compras
  const comprasFiltradas = useMemo(() => {
    return compras.filter(
      (c) =>
        c.numeroNota.toLowerCase().includes(termoBusca.toLowerCase()) ||
        (c.fornecedorNome && c.fornecedorNome.toLowerCase().includes(termoBusca.toLowerCase())) ||
        (c.chaveAcesso && c.chaveAcesso.toLowerCase().includes(termoBusca.toLowerCase()))
    );
  }, [compras, termoBusca]);

  return (
    <div className="orders-page" style={{ padding: "1.5rem" }}>
      {/* CABEÇALHO */}
      <div
        className="page-heading"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <span
            className="eyebrow"
            style={{
              color: "#2563eb",
              fontWeight: 700,
              fontSize: "0.8rem",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            <FileText size={16} /> Módulo de Suprimentos & Compras
          </span>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, margin: "0.25rem 0", color: "#1e293b" }}>
            Entrada de Notas Fiscais & Compras
          </h1>
          <p style={{ margin: 0, color: "#64748b", fontSize: "0.95rem" }}>
            Registre entradas manuais ou importe XMLs da NF-e para alimentar estoques e atualizar custos automaticamente.
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
            onClick={abrirNovaNota}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
              color: "#fff",
              border: "none",
              fontWeight: 700,
              boxShadow: "0 4px 12px rgba(37, 99, 235, 0.25)",
            }}
          >
            <Plus size={16} /> Nova Entrada de Nota
          </button>
        </div>
      </div>

      {/* CARDS DE RESUMO */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "1.25rem",
          marginBottom: "1.75rem",
        }}
      >
        <div className="panel" style={{ padding: "1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "#dbeafe", color: "#2563eb", display: "grid", placeItems: "center" }}>
            <FileText size={26} />
          </div>
          <div>
            <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>Notas Registradas</span>
            <h3 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800, color: "#1e293b" }}>
              {compras.length}
            </h3>
          </div>
        </div>

        <div className="panel" style={{ padding: "1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "#dcfce7", color: "#16a34a", display: "grid", placeItems: "center" }}>
            <DollarSign size={26} />
          </div>
          <div>
            <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>Total em Compras</span>
            <h3 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800, color: "#16a34a" }}>
              R$ {compras.reduce((acc, c) => acc + (c.valorTotal || 0), 0).toFixed(2)}
            </h3>
          </div>
        </div>

        <div className="panel" style={{ padding: "1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "#fef3c7", color: "#d97706", display: "grid", placeItems: "center" }}>
            <Building2 size={26} />
          </div>
          <div>
            <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>Fornecedores Ativos</span>
            <h3 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800, color: "#1e293b" }}>
              {fornecedores.length}
            </h3>
          </div>
        </div>
      </div>

      {/* TABELA DE NOTAS ENTRADAS */}
      <div className="panel" style={{ padding: "1.5rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.25rem",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 800, margin: 0, color: "#1e293b" }}>
              Histórico de Entradas no Estoque
            </h2>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
              Notas fiscais faturadas e integradas ao estoque de matéria-prima.
            </p>
          </div>

          <div style={{ position: "relative", width: 280 }}>
            <Search size={16} style={{ position: "absolute", left: 12, top: 12, color: "#94a3b8" }} />
            <input
              type="text"
              placeholder="Buscar por NF, fornecedor, chave..."
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
        ) : comprasFiltradas.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", background: "#f8fafc", borderRadius: 12, border: "1px dashed #cbd5e1" }}>
            <FileText size={40} style={{ color: "#94a3b8", marginBottom: "0.75rem" }} />
            <p style={{ fontWeight: 700, color: "#334155", margin: 0 }}>Nenhuma entrada de nota fiscal encontrada.</p>
            <p style={{ fontSize: "0.85rem", color: "#64748b", marginTop: "0.25rem" }}>
              Clique em &quot;Nova Entrada de Nota&quot; para dar entrada manual ou importar um arquivo XML da NF-e.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e2e8f0", color: "#475569" }}>
                  <th style={{ padding: "0.75rem" }}>Entrada #</th>
                  <th style={{ padding: "0.75rem" }}>Número / Série</th>
                  <th style={{ padding: "0.75rem" }}>Data Entrada</th>
                  <th style={{ padding: "0.75rem" }}>Fornecedor</th>
                  <th style={{ padding: "0.75rem", textAlign: "right" }}>Valor Total</th>
                  <th style={{ padding: "0.75rem" }}>Itens Recebidos</th>
                </tr>
              </thead>
              <tbody>
                {comprasFiltradas.map((c) => (
                  <tr key={c.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "0.75rem", fontWeight: 700, color: "#2563eb" }}>
                      #{c.id}
                    </td>
                    <td style={{ padding: "0.75rem", fontWeight: 700, color: "#1e293b" }}>
                      NF-e {c.numeroNota} {c.serieNota ? `(Série ${c.serieNota})` : ""}
                    </td>
                    <td style={{ padding: "0.75rem", color: "#64748b" }}>
                      {c.dataEntrada ? new Date(c.dataEntrada + "T00:00:00").toLocaleDateString("pt-BR") : "-"}
                    </td>
                    <td style={{ padding: "0.75rem", color: "#334155" }}>
                      {c.fornecedorNome || c.fornecedorFantasia || "Fornecedor não vinculado"}
                    </td>
                    <td style={{ padding: "0.75rem", textAlign: "right", fontWeight: 700, color: "#16a34a" }}>
                      R$ {Number(c.valorTotal || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: "0.75rem" }}>
                      <details style={{ cursor: "pointer" }}>
                        <summary style={{ fontSize: "0.8rem", color: "#2563eb", fontWeight: 600 }}>
                          Ver {c.itens.length} itens da nota
                        </summary>
                        <ul style={{ margin: "0.5rem 0 0 0", paddingLeft: "1.25rem", fontSize: "0.8rem", color: "#475569" }}>
                          {c.itens.map((it, idx) => (
                            <li key={idx}>
                              {it.descricao}: <strong>+{Number(it.quantidade).toFixed(2)} {it.unidade}</strong> (R$ {Number(it.valorTotal).toFixed(2)})
                            </li>
                          ))}
                        </ul>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: NOVA ENTRADA DE NOTA FISCAL */}
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
              maxWidth: 920,
              width: "100%",
              maxHeight: "92vh",
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
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "#dbeafe", color: "#2563eb", display: "grid", placeItems: "center" }}>
                  <FileText size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: "1.2rem", fontWeight: 800, margin: 0, color: "#1e293b" }}>
                    Entrada de Nota Fiscal no Estoque
                  </h2>
                  <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
                    Preencha manualmente ou importe o XML da NF-e para agilizar
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

              {/* ÁREA DE IMPORTAÇÃO DE XML */}
              <div
                style={{
                  border: "2px dashed #93c5fd",
                  borderRadius: 12,
                  background: "#eff6ff",
                  padding: "1.25rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "1.5rem",
                  flexWrap: "wrap",
                  gap: "1rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <FileCode size={28} style={{ color: "#2563eb" }} />
                  <div>
                    <strong style={{ color: "#1e293b", fontSize: "0.95rem" }}>Importar Arquivo XML da NF-e</strong>
                    <p style={{ margin: 0, fontSize: "0.8rem", color: "#64748b" }}>
                      Carregue o arquivo .xml da nota fiscal do fornecedor para ler os dados e itens automaticamente.
                    </p>
                  </div>
                </div>

                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".xml,text/xml"
                    onChange={handleUploadXml}
                    style={{ display: "none" }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      background: "#2563eb",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      padding: "0.6rem 1.25rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      fontSize: "0.85rem",
                    }}
                  >
                    <Upload size={16} /> Selecionar Arquivo XML
                  </button>
                </div>
              </div>

              {/* DADOS DO CABEÇALHO */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "1rem",
                  marginBottom: "1.25rem",
                }}
              >
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                    Fornecedor
                  </label>
                  <select
                    value={fornecedorId ?? ""}
                    onChange={(e) => setFornecedorId(e.target.value ? Number(e.target.value) : null)}
                    style={{
                      width: "100%",
                      padding: "0.65rem",
                      borderRadius: 8,
                      border: "1px solid #cbd5e1",
                      fontSize: "0.9rem",
                      background: "#fff",
                    }}
                  >
                    <option value="">Selecione ou deixe em branco...</option>
                    {fornecedores.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.razaoSocial} ({f.cnpjCpf || "Sem doc"})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                    Número da Nota *
                  </label>
                  <input
                    type="text"
                    value={numeroNota}
                    onChange={(e) => setNumeroNota(e.target.value)}
                    placeholder="Ex: 1248"
                    style={{ width: "100%", padding: "0.65rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                    Série
                  </label>
                  <input
                    type="text"
                    value={serieNota}
                    onChange={(e) => setSerieNota(e.target.value)}
                    placeholder="Ex: 1"
                    style={{ width: "100%", padding: "0.65rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                    Data de Entrada no Estoque *
                  </label>
                  <input
                    type="date"
                    value={dataEntrada}
                    onChange={(e) => setDataEntrada(e.target.value)}
                    style={{ width: "100%", padding: "0.65rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                    Chave de Acesso (44 dígitos da NF-e)
                  </label>
                  <input
                    type="text"
                    value={chaveAcesso}
                    onChange={(e) => setChaveAcesso(e.target.value)}
                    placeholder="44 dígitos numéricos da nota..."
                    style={{ width: "100%", padding: "0.65rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                    Valor do Frete (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={valorFrete}
                    onChange={(e) => setValorFrete(Number(e.target.value))}
                    style={{ width: "100%", padding: "0.65rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
                  />
                </div>
              </div>

              {/* INCLUSÃO MANUAL DE ITEM */}
              <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: "1rem", background: "#f8fafc", marginBottom: "1.25rem" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1e293b", display: "block", marginBottom: "0.75rem" }}>
                  Adicionar Item à Nota Fiscal
                </span>

                <div style={{ display: "grid", gridTemplateColumns: "1.5fr 2fr 1fr 1fr 1fr auto", gap: "0.75rem", alignItems: "flex-end" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569" }}>Vincular a</label>
                    <select
                      value={itemTempTipo}
                      onChange={(e) => setItemTempTipo(e.target.value as any)}
                      style={{ width: "100%", padding: "0.5rem", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                    >
                      <option value="insumo">Insumo (Matéria-Prima)</option>
                      <option value="produto">Produto (Revenda)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569" }}>Item do Cadastro</label>
                    {itemTempTipo === "insumo" ? (
                      <select
                        value={itemTempInsumoId ?? ""}
                        onChange={(e) => {
                          const val = e.target.value ? Number(e.target.value) : null;
                          setItemTempInsumoId(val);
                          const ins = insumos.find((i) => i.id === val);
                          if (ins) {
                            setItemTempDescricao(ins.nome);
                            setItemTempUnidade(ins.unidadeCompra || "un");
                            setItemTempValorUnitario(Number(ins.precoCompra) || 0);
                          }
                        }}
                        style={{ width: "100%", padding: "0.5rem", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                      >
                        <option value="">Selecione um insumo...</option>
                        {insumos.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.nome} ({i.unidadeCompra})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <select
                        value={itemTempProdutoId ?? ""}
                        onChange={(e) => {
                          const val = e.target.value ? Number(e.target.value) : null;
                          setItemTempProdutoId(val);
                          const prod = produtos.find((p) => p.id === val);
                          if (prod) {
                            setItemTempDescricao(prod.nome);
                            setItemTempUnidade(prod.unidadeVenda || "un");
                            setItemTempValorUnitario(Number(prod.precoCusto) || 0);
                          }
                        }}
                        style={{ width: "100%", padding: "0.5rem", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                      >
                        <option value="">Selecione um produto...</option>
                        {produtos.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nome} ({p.unidadeVenda})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569" }}>Qtd</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={itemTempQuantidade}
                      onChange={(e) => setItemTempQuantidade(Number(e.target.value))}
                      style={{ width: "100%", padding: "0.5rem", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569" }}>Unitário R$</label>
                    <input
                      type="number"
                      step="0.01"
                      value={itemTempValorUnitario}
                      onChange={(e) => setItemTempValorUnitario(Number(e.target.value))}
                      style={{ width: "100%", padding: "0.5rem", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569" }}>Total R$</label>
                    <input
                      type="text"
                      readOnly
                      value={(itemTempQuantidade * itemTempValorUnitario).toFixed(2)}
                      style={{ width: "100%", padding: "0.5rem", borderRadius: 6, border: "1px solid #e2e8f0", background: "#e2e8f0", fontSize: "0.85rem", fontWeight: 700 }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAdicionarItemManual}
                    style={{
                      background: "#0f766e",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      padding: "0.55rem 1rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      fontSize: "0.85rem",
                    }}
                  >
                    + Adicionar
                  </button>
                </div>
              </div>

              {/* TABELA DE ITENS DA NOTA */}
              <div style={{ marginBottom: "1.25rem" }}>
                <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.95rem", fontWeight: 700, color: "#1e293b" }}>
                  Itens da Nota Fiscal ({itensNota.length})
                </h4>

                {itensNota.length === 0 ? (
                  <div style={{ padding: "1.5rem", textAlign: "center", color: "#94a3b8", background: "#f8fafc", borderRadius: 8 }}>
                    Nenhum item adicionado à nota ainda. Importe o XML ou adicione acima.
                  </div>
                ) : (
                  <div style={{ maxHeight: 240, overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: 8 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                      <thead>
                        <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left", color: "#475569" }}>
                          <th style={{ padding: "0.5rem" }}>Descrição do Item</th>
                          <th style={{ padding: "0.5rem" }}>Vinculação no Estoque</th>
                          <th style={{ padding: "0.5rem", textAlign: "right" }}>Qtd</th>
                          <th style={{ padding: "0.5rem", textAlign: "right" }}>Unitário</th>
                          <th style={{ padding: "0.5rem", textAlign: "right" }}>Total</th>
                          <th style={{ padding: "0.5rem", textAlign: "center" }}>Ação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {itensNota.map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "0.5rem", fontWeight: 600, color: "#1e293b" }}>
                              {item.descricao}
                            </td>
                            <td style={{ padding: "0.5rem" }}>
                              <select
                                value={item.insumoId ? `insumo:${item.insumoId}` : item.produtoId ? `produto:${item.produtoId}` : ""}
                                onChange={(e) => {
                                  const [tipo, idStr] = e.target.value.split(":");
                                  handleVincularItemEstoque(idx, tipo as any, idStr ? Number(idStr) : null);
                                }}
                                style={{
                                  padding: "0.3rem",
                                  borderRadius: 4,
                                  border: "1px solid #cbd5e1",
                                  fontSize: "0.8rem",
                                  maxWidth: 220,
                                }}
                              >
                                <option value="">Sem vínculo (apenas despesa)</option>
                                <optgroup label="Matérias-Primas / Insumos">
                                  {insumos.map((i) => (
                                    <option key={`insumo:${i.id}`} value={`insumo:${i.id}`}>
                                      [Insumo] {i.nome}
                                    </option>
                                  ))}
                                </optgroup>
                                <optgroup label="Produtos Acabados">
                                  {produtos.map((p) => (
                                    <option key={`produto:${p.id}`} value={`produto:${p.id}`}>
                                      [Produto] {p.nome}
                                    </option>
                                  ))}
                                </optgroup>
                              </select>
                            </td>
                            <td style={{ padding: "0.5rem", textAlign: "right" }}>
                              {item.quantidade} {item.unidade}
                            </td>
                            <td style={{ padding: "0.5rem", textAlign: "right" }}>
                              R$ {Number(item.valorUnitario).toFixed(2)}
                            </td>
                            <td style={{ padding: "0.5rem", textAlign: "right", fontWeight: 700, color: "#16a34a" }}>
                              R$ {Number(item.valorTotal).toFixed(2)}
                            </td>
                            <td style={{ padding: "0.5rem", textAlign: "center" }}>
                              <button
                                type="button"
                                onClick={() => handleRemoverItem(idx)}
                                style={{ background: "transparent", border: "none", color: "#dc2626", cursor: "pointer" }}
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* TOTAIS DA NOTA */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "2rem",
                  padding: "1rem",
                  background: "#f8fafc",
                  borderRadius: 10,
                  border: "1px solid #e2e8f0",
                }}
              >
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Subtotal Produtos:</span>
                  <div style={{ fontSize: "1rem", fontWeight: 700, color: "#1e293b" }}>
                    R$ {valorProdutosTotal.toFixed(2)}
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Frete:</span>
                  <div style={{ fontSize: "1rem", fontWeight: 700, color: "#1e293b" }}>
                    R$ {Number(valorFrete).toFixed(2)}
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Valor Total da Nota:</span>
                  <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#16a34a" }}>
                    R$ {valorNotaTotal.toFixed(2)}
                  </div>
                </div>
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
                onClick={handleSalvarEntradaNota}
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
                {salvando ? "Salvando..." : <><Check size={18} /> Confirmar Entrada no Estoque</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
