/**
 * ============================================================================
 * PROJETO: Doce Gestor - Sistema de Gestão para Confeitarias
 * REPOSITÓRIO: https://github.com/junin1737/confeitaria
 * ARQUIVO: src/pages/SuppliersPage.tsx
 * DESCRIÇÃO: FASE 1 — Cadastro e Gestão de Fornecedores de Insumos e Embalagens.
 * ============================================================================
 */

import { useEffect, useState, type FormEvent } from "react";
import {
  Check,
  Download,
  MessageCircle,
  Plus,
  Search,
  Trash2,
  Truck,
} from "lucide-react";
import {
  deleteFornecedor,
  fetchFornecedores,
  fetchProximoCodigoFornecedor,
  lookupCep,
  saveFornecedor,
  type Fornecedor,
} from "../api";
import { whatsappUrl } from "../whatsapp";

export function SuppliersPage({ onAction }: { onAction: (msg: string) => void }) {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | "new" | null>(null);

  // Form State
  const [proximoCod, setProximoCod] = useState("");
  const [formCodigo, setFormCodigo] = useState("");
  const [formRazaoSocial, setFormRazaoSocial] = useState("");
  const [formNomeFantasia, setFormNomeFantasia] = useState("");
  const [formCnpjCpf, setFormCnpjCpf] = useState("");
  const [formTelefone, setFormTelefone] = useState("");
  const [formCelular, setFormCelular] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formContato, setFormContato] = useState("");
  const [formCep, setFormCep] = useState("");
  const [formLogradouro, setFormLogradouro] = useState("");
  const [formNumero, setFormNumero] = useState("");
  const [formComplemento, setFormComplemento] = useState("");
  const [formBairro, setFormBairro] = useState("");
  const [formCidadeNome, setFormCidadeNome] = useState("");
  const [formStatus, setFormStatus] = useState<"ativo" | "inativo">("ativo");
  const [formObservacoes, setFormObservacoes] = useState("");

  const [cepLoading, setCepLoading] = useState(false);
  const [cepMessage, setCepMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [lista, prox] = await Promise.all([
        fetchFornecedores(),
        fetchProximoCodigoFornecedor(),
      ]);
      setFornecedores(lista);
      setProximoCod(prox);
      if (lista.length > 0 && selectedId === null) {
        selecionarFornecedor(lista[0]);
      }
    } catch (err: any) {
      onAction(err?.message || "Erro ao carregar fornecedores.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const selecionarFornecedor = (f: Fornecedor) => {
    setSelectedId(f.id);
    setFormCodigo(f.codigo);
    setFormRazaoSocial(f.razaoSocial);
    setFormNomeFantasia(f.nomeFantasia || "");
    setFormCnpjCpf(f.cnpjCpf || "");
    setFormTelefone(f.telefone || "");
    setFormCelular(f.celular || "");
    setFormEmail(f.email || "");
    setFormContato(f.contato || "");
    setFormCep(f.cep || "");
    setFormLogradouro(f.logradouro || "");
    setFormNumero(f.numero || "");
    setFormComplemento(f.complemento || "");
    setFormBairro(f.bairro || "");
    setFormCidadeNome(f.cidadeNome || "");
    setFormStatus(f.status || "ativo");
    setFormObservacoes(f.observacoes || "");
    setCepMessage("");
    setFormError("");
  };

  const iniciarNovoFornecedor = () => {
    setSelectedId("new");
    setFormCodigo(proximoCod);
    setFormRazaoSocial("");
    setFormNomeFantasia("");
    setFormCnpjCpf("");
    setFormTelefone("");
    setFormCelular("");
    setFormEmail("");
    setFormContato("");
    setFormCep("");
    setFormLogradouro("");
    setFormNumero("");
    setFormComplemento("");
    setFormBairro("");
    setFormCidadeNome("");
    setFormStatus("ativo");
    setFormObservacoes("");
    setCepMessage("");
    setFormError("");
  };

  const handleBuscarCep = async () => {
    const limpo = formCep.replace(/\D/g, "");
    if (limpo.length !== 8) {
      setCepMessage("Informe um CEP válido com 8 números.");
      return;
    }
    setCepLoading(true);
    setCepMessage("");
    try {
      const res = await lookupCep(limpo);
      setFormLogradouro(res.logradouro || "");
      setFormBairro(res.bairro || "");
      setFormCidadeNome(res.cidadeNome || "");
      setCepMessage(res.generico ? "CEP geral preenchido." : "Endereço localizado!");
    } catch {
      setCepMessage("CEP não encontrado.");
    } finally {
      setCepLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formRazaoSocial.trim()) {
      setFormError("Informe a Razão Social ou Nome do fornecedor.");
      return;
    }
    setSaving(true);
    try {
      const salvo = await saveFornecedor({
        id: selectedId === "new" || selectedId == null ? undefined : selectedId,
        codigo: formCodigo,
        razaoSocial: formRazaoSocial,
        nomeFantasia: formNomeFantasia,
        cnpjCpf: formCnpjCpf,
        telefone: formTelefone,
        celular: formCelular,
        email: formEmail,
        contato: formContato,
        cep: formCep,
        logradouro: formLogradouro,
        numero: formNumero,
        complemento: formComplemento,
        bairro: formBairro,
        status: formStatus,
        observacoes: formObservacoes,
      });

      onAction(`Fornecedor "${salvo.razaoSocial}" salvo com sucesso!`);
      await carregarDados();
      setSelectedId(salvo.id);
    } catch (err: any) {
      setFormError(err?.message || "Erro ao salvar fornecedor.");
    } finally {
      setSaving(false);
    }
  };

  const handleExcluir = async (id: number) => {
    if (!confirm("Deseja realmente excluir este fornecedor?")) return;
    try {
      await deleteFornecedor(id);
      onAction("Fornecedor excluído.");
      setSelectedId(null);
      carregarDados();
    } catch (err: any) {
      alert(err.message || "Não foi possível excluir o fornecedor.");
    }
  };

  const exportarCsv = () => {
    const cabecalho = ["codigo", "razao_social", "nome_fantasia", "cnpj_cpf", "celular", "email", "contato", "status"];
    const linhas = fornecedores.map((f) =>
      [f.codigo, f.razaoSocial, f.nomeFantasia || "", f.cnpjCpf || "", f.celular || "", f.email || "", f.contato || "", f.status]
        .map((v) => `"${String(v).replaceAll('"', '""')}"`)
        .join(";")
    );
    const blob = new Blob([[cabecalho.join(";"), ...linhas].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fornecedores.csv";
    a.click();
    URL.revokeObjectURL(url);
    onAction("Lista de fornecedores exportada.");
  };

  const fornecedoresFiltrados = fornecedores.filter((f) => {
    return (
      f.razaoSocial.toLowerCase().includes(query.toLowerCase()) ||
      (f.nomeFantasia && f.nomeFantasia.toLowerCase().includes(query.toLowerCase())) ||
      f.codigo.toLowerCase().includes(query.toLowerCase())
    );
  });

  return (
    <>
      <section className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-dot" /> compras & matérias-primas
          </div>
          <h1>
            Fornecedores <span className="heading-count">{fornecedores.length}</span>
          </h1>
          <p>
            Parceiros de embalagens, laticínios, chocolates nobres e insumos da confeitaria.
          </p>
        </div>
        <div className="heading-actions">
          <button className="button secondary" onClick={exportarCsv}>
            <Download size={16} /> Exportar
          </button>
          <button className="button primary" onClick={iniciarNovoFornecedor}>
            <Plus size={17} /> Novo fornecedor
          </button>
        </div>
      </section>

      <section className="employee-layout">
        {/* Painel Esquerdo: Lista */}
        <div className="panel employee-list-panel">
          <div className="panel-heading">
            <div>
              <div className="section-kicker">Parceiros Cadastrados</div>
              <h2>Todos os fornecedores</h2>
            </div>
          </div>

          <div className="search-box">
            <Search size={16} />
            <input
              placeholder="Buscar por nome, fantasia ou código..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="employee-list">
            {loading ? <div className="employee-empty">Carregando fornecedores...</div> : null}
            {!loading && fornecedoresFiltrados.length === 0 ? (
              <div className="employee-empty">Nenhum fornecedor cadastrado.</div>
            ) : null}

            {fornecedoresFiltrados.map((item) => {
              const ativo = selectedId === item.id;
              return (
                <button
                  key={item.id}
                  className={`employee-row ${ativo ? "selected" : ""}`}
                  onClick={() => selecionarFornecedor(item)}
                >
                  <div className="employee-avatar" style={{ background: "#edf3fa", color: "#6982a3" }}>
                    <Truck size={17} />
                  </div>
                  <div className="employee-row-copy">
                    <strong>{item.nomeFantasia || item.razaoSocial}</strong>
                    <span>{item.codigo} • {item.contato || item.telefone || "Sem contato"}</span>
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
              <Truck size={36} style={{ color: "#d0c7c1", margin: "0 auto 12px" }} />
              <strong>Selecione um fornecedor ao lado</strong>
              <p>Ou clique no botão "Novo fornecedor" para cadastrar.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="employee-detail-head">
                <div className="detail-title">
                  <div
                    className="employee-avatar"
                    style={{ background: "#edf3fa", color: "#6982a3", width: "44px", height: "44px" }}
                  >
                    <Truck size={22} />
                  </div>
                  <div>
                    <span className="live-pill">
                      {selectedId === "new" ? "NOVO FORNECEDOR" : formStatus.toUpperCase()}
                    </span>
                    <h2>{formNomeFantasia || formRazaoSocial || "Novo Fornecedor"}</h2>
                    <p>{formCodigo} • {formContato ? `Contato: ${formContato}` : "Sem representante"}</p>
                  </div>
                </div>

                <div className="detail-actions">
                  {formCelular && (
                    <a
                      href={whatsappUrl(formCelular, `Olá ${formContato || ""}, tudo bem? Aqui é da confeitaria!`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="button secondary"
                      style={{ color: "#25D366" }}
                    >
                      <MessageCircle size={15} /> WhatsApp
                    </a>
                  )}
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
                    <Check size={14} /> {saving ? "Salvando..." : "Salvar fornecedor"}
                  </button>
                </div>
              </div>

              {formError && (
                <div style={{ padding: "10px 14px", margin: "14px 0", background: "#fdf2f2", color: "#991b1b", borderRadius: "8px", fontSize: "12px" }}>
                  {formError}
                </div>
              )}

              {/* Seções de Detalhe (.detail-sections) */}
              <div className="detail-sections" style={{ marginTop: "20px" }}>
                {/* Dados da Empresa */}
                <div className="subpanel">
                  <div className="subpanel-head">
                    <div>
                      <div className="section-kicker">Identificação</div>
                      <h3>Dados da Empresa</h3>
                    </div>
                  </div>
                  <div style={{ display: "grid", gap: "12px", marginTop: "12px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: "10px" }}>
                      <div className="field">
                        <label>Código</label>
                        <input value={formCodigo} onChange={(e) => setFormCodigo(e.target.value)} required />
                      </div>
                      <div className="field">
                        <label>Razão Social *</label>
                        <input value={formRazaoSocial} onChange={(e) => setFormRazaoSocial(e.target.value)} required />
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      <div className="field">
                        <label>Nome Fantasia</label>
                        <input value={formNomeFantasia} onChange={(e) => setFormNomeFantasia(e.target.value)} />
                      </div>
                      <div className="field">
                        <label>CNPJ / CPF</label>
                        <input value={formCnpjCpf} onChange={(e) => setFormCnpjCpf(e.target.value)} placeholder="00.000.000/0001-00" />
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      <div className="field">
                        <label>Vendedor / Representante</label>
                        <input value={formContato} onChange={(e) => setFormContato(e.target.value)} placeholder="Nome do representante" />
                      </div>
                      <div className="field">
                        <label>Celular / WhatsApp</label>
                        <input value={formCelular} onChange={(e) => setFormCelular(e.target.value)} placeholder="(11) 99999-9999" />
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      <div className="field">
                        <label>Telefone Comercial</label>
                        <input value={formTelefone} onChange={(e) => setFormTelefone(e.target.value)} />
                      </div>
                      <div className="field">
                        <label>E-mail para Pedidos</label>
                        <input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Endereço & Insumos */}
                <div className="subpanel">
                  <div className="subpanel-head">
                    <div>
                      <div className="section-kicker">Localização & Linha de Fornecimento</div>
                      <h3>Endereço e Notas</h3>
                    </div>
                  </div>
                  <div style={{ display: "grid", gap: "12px", marginTop: "12px" }}>
                    <div className="field">
                      <label>CEP</label>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <input value={formCep} onChange={(e) => setFormCep(e.target.value)} placeholder="00000-000" style={{ flex: 1 }} />
                        <button type="button" className="button secondary" onClick={handleBuscarCep} disabled={cepLoading} style={{ height: "34px", fontSize: "11px" }}>
                          {cepLoading ? "Buscando..." : "Buscar CEP"}
                        </button>
                      </div>
                      {cepMessage && <small style={{ color: "var(--c-muted)", fontSize: "10px", marginTop: "4px" }}>{cepMessage}</small>}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 90px", gap: "10px" }}>
                      <div className="field">
                        <label>Logradouro / Rua</label>
                        <input value={formLogradouro} onChange={(e) => setFormLogradouro(e.target.value)} />
                      </div>
                      <div className="field">
                        <label>Número</label>
                        <input value={formNumero} onChange={(e) => setFormNumero(e.target.value)} />
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      <div className="field">
                        <label>Bairro</label>
                        <input value={formBairro} onChange={(e) => setFormBairro(e.target.value)} />
                      </div>
                      <div className="field">
                        <label>Cidade / UF</label>
                        <input value={formCidadeNome} onChange={(e) => setFormCidadeNome(e.target.value)} placeholder="Ex: São Paulo / SP" />
                      </div>
                    </div>

                    <div className="field">
                      <label>Complemento</label>
                      <input value={formComplemento} onChange={(e) => setFormComplemento(e.target.value)} />
                    </div>

                    <div className="field">
                      <label>Linha de Insumos Fornecidos / Observações</label>
                      <textarea
                        rows={2}
                        value={formObservacoes}
                        onChange={(e) => setFormObservacoes(e.target.value)}
                        placeholder="Ex: Fornece chocolates nobres, confeitos, cakeboards... Dias de entrega, pedido mínimo..."
                      />
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
