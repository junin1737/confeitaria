/**
 * ============================================================================
 * PROJETO: Doce Gestor - Sistema de Gestão para Confeitarias
 * REPOSITÓRIO: https://github.com/junin1737/confeitaria
 * ARQUIVO: src/pages/CustomersPage.tsx
 * DESCRIÇÃO: FASE 1 — Cadastro de Clientes, Aniversários e Contatos WhatsApp.
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
  User,
  Users,
} from "lucide-react";
import {
  deleteCliente,
  fetchClientes,
  fetchProximoCodigoCliente,
  lookupCep,
  saveCliente,
  type Cliente,
} from "../api";
import { whatsappUrl } from "../whatsapp";

export function CustomersPage({ onAction }: { onAction: (msg: string) => void }) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | "new" | null>(null);

  // Formulário de Cliente
  const [proximoCod, setProximoCod] = useState("");
  const [formCodigo, setFormCodigo] = useState("");
  const [formNome, setFormNome] = useState("");
  const [formCpfCnpj, setFormCpfCnpj] = useState("");
  const [formTelefone, setFormTelefone] = useState("");
  const [formCelular, setFormCelular] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formDataNascimento, setFormDataNascimento] = useState("");
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
        fetchClientes(),
        fetchProximoCodigoCliente(),
      ]);
      setClientes(lista);
      setProximoCod(prox);
      if (lista.length > 0 && selectedId === null) {
        selecionarCliente(lista[0]);
      }
    } catch (err: any) {
      onAction(err?.message || "Erro ao carregar clientes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const selecionarCliente = (c: Cliente) => {
    setSelectedId(c.id);
    setFormCodigo(c.codigo);
    setFormNome(c.nome);
    setFormCpfCnpj(c.cpfCnpj || "");
    setFormTelefone(c.telefone || "");
    setFormCelular(c.celular || "");
    setFormEmail(c.email || "");
    setFormDataNascimento(c.dataNascimento || "");
    setFormCep(c.cep || "");
    setFormLogradouro(c.logradouro || "");
    setFormNumero(c.numero || "");
    setFormComplemento(c.complemento || "");
    setFormBairro(c.bairro || "");
    setFormCidadeNome(c.cidadeNome || "");
    setFormStatus(c.status || "ativo");
    setFormObservacoes(c.observacoes || "");
    setCepMessage("");
    setFormError("");
  };

  const iniciarNovoCliente = () => {
    setSelectedId("new");
    setFormCodigo(proximoCod);
    setFormNome("");
    setFormCpfCnpj("");
    setFormTelefone("");
    setFormCelular("");
    setFormEmail("");
    setFormDataNascimento("");
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
      setCepMessage(res.generico ? "CEP geral da cidade preenchido." : "Endereço encontrado!");
    } catch (err: any) {
      setCepMessage("CEP não localizado.");
    } finally {
      setCepLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formNome.trim()) {
      setFormError("Informe o nome do cliente.");
      return;
    }
    setSaving(true);
    try {
      const salvo = await saveCliente({
        id: selectedId === "new" || selectedId == null ? undefined : selectedId,
        codigo: formCodigo,
        nome: formNome,
        cpfCnpj: formCpfCnpj,
        telefone: formTelefone,
        celular: formCelular,
        email: formEmail,
        dataNascimento: formDataNascimento,
        cep: formCep,
        logradouro: formLogradouro,
        numero: formNumero,
        complemento: formComplemento,
        bairro: formBairro,
        status: formStatus,
        observacoes: formObservacoes,
      });

      onAction(`Cliente "${salvo.nome}" salvo com sucesso!`);
      await carregarDados();
      setSelectedId(salvo.id);
    } catch (err: any) {
      setFormError(err?.message || "Erro ao salvar cliente.");
    } finally {
      setSaving(false);
    }
  };

  const handleExcluir = async (id: number) => {
    if (!confirm("Deseja realmente excluir este cliente?")) return;
    try {
      await deleteCliente(id);
      onAction("Cliente excluído.");
      setSelectedId(null);
      carregarDados();
    } catch (err: any) {
      alert(err.message || "Não foi possível excluir o cliente.");
    }
  };

  const exportarCsv = () => {
    const cabecalho = ["codigo", "nome", "cpf_cnpj", "celular", "email", "aniversario", "cidade", "status"];
    const linhas = clientes.map((c) =>
      [c.codigo, c.nome, c.cpfCnpj || "", c.celular || "", c.email || "", c.dataNascimento || "", c.cidadeNome || "", c.status]
        .map((v) => `"${String(v).replaceAll('"', '""')}"`)
        .join(";")
    );
    const blob = new Blob([[cabecalho.join(";"), ...linhas].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "clientes.csv";
    a.click();
    URL.revokeObjectURL(url);
    onAction("Lista de clientes exportada.");
  };

  const clientesFiltrados = clientes.filter((c) => {
    return (
      c.nome.toLowerCase().includes(query.toLowerCase()) ||
      c.codigo.toLowerCase().includes(query.toLowerCase()) ||
      (c.celular && c.celular.includes(query))
    );
  });

  return (
    <>
      <section className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-dot" /> relacionamento & festas
          </div>
          <h1>
            Clientes <span className="heading-count">{clientes.length}</span>
          </h1>
          <p>
            Base de clientes, controle de aniversariantes e contato rápido via WhatsApp.
          </p>
        </div>
        <div className="heading-actions">
          <button className="button secondary" onClick={exportarCsv}>
            <Download size={16} /> Exportar
          </button>
          <button className="button primary" onClick={iniciarNovoCliente}>
            <Plus size={17} /> Novo cliente
          </button>
        </div>
      </section>

      <section className="employee-layout">
        {/* Painel Esquerdo: Lista de Clientes */}
        <div className="panel employee-list-panel">
          <div className="panel-heading">
            <div>
              <div className="section-kicker">Clientes Cadastrados</div>
              <h2>Todos os clientes</h2>
            </div>
          </div>

          <div className="search-box">
            <Search size={16} />
            <input
              placeholder="Buscar por nome, código ou telefone..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="employee-list">
            {loading ? <div className="employee-empty">Carregando clientes...</div> : null}
            {!loading && clientesFiltrados.length === 0 ? (
              <div className="employee-empty">Nenhum cliente cadastrado.</div>
            ) : null}

            {clientesFiltrados.map((item) => {
              const ativo = selectedId === item.id;
              return (
                <button
                  key={item.id}
                  className={`employee-row ${ativo ? "selected" : ""}`}
                  onClick={() => selecionarCliente(item)}
                >
                  <div className="employee-avatar" style={{ background: "#fbecef", color: "#aa6976" }}>
                    <User size={17} />
                  </div>
                  <div className="employee-row-copy">
                    <strong>{item.nome}</strong>
                    <span>{item.codigo} • {item.celular || "Sem telefone"}</span>
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
              <Users size={36} style={{ color: "#d0c7c1", margin: "0 auto 12px" }} />
              <strong>Selecione um cliente ao lado</strong>
              <p>Ou clique no botão "Novo cliente" para cadastrar.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="employee-detail-head">
                <div className="detail-title">
                  <div
                    className="employee-avatar"
                    style={{ background: "#fbecef", color: "#aa6976", width: "44px", height: "44px" }}
                  >
                    <User size={22} />
                  </div>
                  <div>
                    <span className="live-pill">
                      {selectedId === "new" ? "NOVO CLIENTE" : formStatus.toUpperCase()}
                    </span>
                    <h2>{formNome || "Novo Cliente"}</h2>
                    <p>{formCodigo} • {formCelular || "Sem contato"}</p>
                  </div>
                </div>

                <div className="detail-actions">
                  {formCelular && (
                    <a
                      href={whatsappUrl(formCelular, `Olá ${formNome}, tudo bem? Aqui é do ateliê!`)}
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
                    <Check size={14} /> {saving ? "Salvando..." : "Salvar cliente"}
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
                {/* Dados Pessoais & Contato */}
                <div className="subpanel">
                  <div className="subpanel-head">
                    <div>
                      <div className="section-kicker">Identificação</div>
                      <h3>Dados de Contato</h3>
                    </div>
                  </div>
                  <div style={{ display: "grid", gap: "12px", marginTop: "12px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: "10px" }}>
                      <div className="field">
                        <label>Código</label>
                        <input value={formCodigo} onChange={(e) => setFormCodigo(e.target.value)} required />
                      </div>
                      <div className="field">
                        <label>Nome Completo *</label>
                        <input value={formNome} onChange={(e) => setFormNome(e.target.value)} required />
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      <div className="field">
                        <label>CPF / CNPJ</label>
                        <input value={formCpfCnpj} onChange={(e) => setFormCpfCnpj(e.target.value)} placeholder="000.000.000-00" />
                      </div>
                      <div className="field">
                        <label>Data de Aniversário</label>
                        <input type="date" value={formDataNascimento} onChange={(e) => setFormDataNascimento(e.target.value)} />
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      <div className="field">
                        <label>Celular / WhatsApp *</label>
                        <input value={formCelular} onChange={(e) => setFormCelular(e.target.value)} placeholder="(11) 99999-9999" />
                      </div>
                      <div className="field">
                        <label>Telefone Fixo</label>
                        <input value={formTelefone} onChange={(e) => setFormTelefone(e.target.value)} placeholder="(11) 3333-3333" />
                      </div>
                    </div>

                    <div className="field">
                      <label>E-mail</label>
                      <input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="cliente@email.com" />
                    </div>
                  </div>
                </div>

                {/* Endereço de Entrega */}
                <div className="subpanel">
                  <div className="subpanel-head">
                    <div>
                      <div className="section-kicker">Localização</div>
                      <h3>Endereço de Entrega</h3>
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
                      <label>Complemento / Apto</label>
                      <input value={formComplemento} onChange={(e) => setFormComplemento(e.target.value)} />
                    </div>

                    <div className="field">
                      <label>Observações / Preferências</label>
                      <textarea
                        rows={2}
                        value={formObservacoes}
                        onChange={(e) => setFormObservacoes(e.target.value)}
                        placeholder="Restrições alimentares, recheios favoritos, observações de entrega..."
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
