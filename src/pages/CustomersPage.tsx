/**
 * ============================================================================
 * PROJETO: Doce Gestor - Sistema de Gestão para Confeitarias
 * REPOSITÓRIO: https://github.com/junin1737/confeitaria
 * ARQUIVO: src/pages/CustomersPage.tsx
 * DESCRIÇÃO: FASE 1 — Cadastro Completo de Clientes com Formulário Dedicado,
 *            Campos Primários Auto-incrementados (+1), Busca de CEP e WhatsApp.
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
  X,
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
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Controle de exibição do formulário dedicado (modal / tela de edição)
  const [formAberto, setFormAberto] = useState(false);
  const [modoEdicao, setModoEdicao] = useState<"novo" | "editar">("novo");

  // Estado dos campos do formulário
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
      const lista = await fetchClientes();
      setClientes(lista);
      if (lista.length > 0 && selectedId === null) {
        setSelectedId(lista[0].id);
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

  // Iniciar novo cadastro de cliente com código sempre último + 1
  const abrirNovoCliente = async () => {
    try {
      const proximo = await fetchProximoCodigoCliente();
      setFormCodigo(proximo);
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
      setModoEdicao("novo");
      setFormAberto(true);
    } catch (err: any) {
      onAction("Erro ao obter próximo código do cliente.");
    }
  };

  // Abrir formulário para editar cliente existente
  const abrirEditarCliente = (c: Cliente) => {
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
    setModoEdicao("editar");
    setFormAberto(true);
  };

  const fecharFormulario = () => {
    setFormAberto(false);
    setFormError("");
    setCepMessage("");
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
      setCepMessage(res.generico ? "CEP geral da cidade preenchido." : "Endereço localizado com sucesso!");
    } catch (err: any) {
      setCepMessage("CEP não localizado. Preencha manualmente.");
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
    setFormError("");
    try {
      const salvo = await saveCliente({
        id: modoEdicao === "editar" && selectedId ? selectedId : undefined,
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
      setFormAberto(false);
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

  const clienteAtivo = clientes.find((c) => c.id === selectedId) || null;

  return (
    <>
      <section className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-dot" /> Relacionamento & Festas
          </div>
          <h1>
            Clientes <span className="heading-count">{clientes.length}</span>
          </h1>
          <p>
            Base de clientes, controle de aniversariantes e contato direto via WhatsApp.
          </p>
        </div>
        <div className="heading-actions">
          <button className="button secondary" onClick={exportarCsv}>
            <Download size={16} /> Exportar
          </button>
          <button className="button primary" onClick={abrirNovoCliente}>
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
              placeholder="Buscar por nome, código ou celular..."
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
                  onClick={() => setSelectedId(item.id)}
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

        {/* Painel Direito: Cartão de Visão Geral do Cliente Selecionado */}
        <div className="employee-detail panel">
          {!clienteAtivo && !loading ? (
            <div className="employee-empty" style={{ padding: "60px 20px" }}>
              <Users size={36} style={{ color: "#d0c7c1", margin: "0 auto 12px" }} />
              <strong>Nenhum cliente selecionado</strong>
              <p>Clique em um cliente ao lado ou no botão "Novo cliente" para cadastrar.</p>
              <button className="button primary" style={{ marginTop: "14px" }} onClick={abrirNovoCliente}>
                <Plus size={16} /> Novo cliente
              </button>
            </div>
          ) : clienteAtivo ? (
            <div>
              <div className="employee-detail-head">
                <div className="detail-title">
                  <div
                    className="employee-avatar"
                    style={{ background: "#fbecef", color: "#aa6976", width: "48px", height: "48px" }}
                  >
                    <User size={24} />
                  </div>
                  <div>
                    <span className="live-pill">
                      {clienteAtivo.status.toUpperCase()}
                    </span>
                    <h2>{clienteAtivo.nome}</h2>
                    <p>{clienteAtivo.codigo} • Cadastrado no sistema</p>
                  </div>
                </div>

                <div className="detail-actions">
                  {clienteAtivo.celular && (
                    <a
                      href={whatsappUrl(clienteAtivo.celular, `Olá ${clienteAtivo.nome}, tudo bem? Aqui é da confeitaria!`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="button secondary"
                      style={{ color: "#25D366" }}
                    >
                      <MessageCircle size={15} /> WhatsApp
                    </a>
                  )}
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => abrirEditarCliente(clienteAtivo)}
                  >
                    Editar dados
                  </button>
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => handleExcluir(clienteAtivo.id)}
                    style={{ color: "var(--c-danger)" }}
                  >
                    <Trash2 size={14} /> Excluir
                  </button>
                </div>
              </div>

              {/* Informações Resumidas do Cliente */}
              <div className="detail-stat-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginTop: "20px" }}>
                <div>
                  <span>WhatsApp / Celular</span>
                  <strong>{clienteAtivo.celular || "Não informado"}</strong>
                  <small>{clienteAtivo.telefone ? `Fixo: ${clienteAtivo.telefone}` : "Sem telefone fixo"}</small>
                </div>
                <div>
                  <span>Data de Aniversário</span>
                  <strong>
                    {clienteAtivo.dataNascimento
                      ? new Date(clienteAtivo.dataNascimento + "T12:00:00").toLocaleDateString("pt-BR")
                      : "Não informada"}
                  </strong>
                  <small>Lembrete automático para encomendas</small>
                </div>
                <div>
                  <span>Localização</span>
                  <strong>{clienteAtivo.cidadeNome || "Cidade não informada"}</strong>
                  <small>{clienteAtivo.bairro ? `Bairro: ${clienteAtivo.bairro}` : "Sem bairro"}</small>
                </div>
              </div>

              <div className="detail-sections" style={{ marginTop: "16px" }}>
                <div className="subpanel">
                  <div className="subpanel-head">
                    <div>
                      <div className="section-kicker">Contato & Documento</div>
                      <h3>Identificação</h3>
                    </div>
                  </div>
                  <div style={{ marginTop: "12px", display: "grid", gap: "10px", fontSize: "13px" }}>
                    <div><strong>CPF/CNPJ:</strong> {clienteAtivo.cpfCnpj || "Não cadastrado"}</div>
                    <div><strong>E-mail:</strong> {clienteAtivo.email || "Não cadastrado"}</div>
                    <div><strong>Código:</strong> {clienteAtivo.codigo}</div>
                  </div>
                </div>

                <div className="subpanel">
                  <div className="subpanel-head">
                    <div>
                      <div className="section-kicker">Entrega</div>
                      <h3>Endereço Completo</h3>
                    </div>
                  </div>
                  <div style={{ marginTop: "12px", display: "grid", gap: "8px", fontSize: "13px" }}>
                    <div><strong>CEP:</strong> {clienteAtivo.cep || "Não informado"}</div>
                    <div><strong>Logradouro:</strong> {clienteAtivo.logradouro || "Não informado"}, {clienteAtivo.numero || "S/N"}</div>
                    <div><strong>Complemento:</strong> {clienteAtivo.complemento || "—"}</div>
                    <div><strong>Bairro:</strong> {clienteAtivo.bairro || "—"}</div>
                    <div><strong>Cidade/UF:</strong> {clienteAtivo.cidadeNome || "—"}</div>
                  </div>
                </div>
              </div>

              {clienteAtivo.observacoes && (
                <div className="subpanel" style={{ marginTop: "16px" }}>
                  <div className="subpanel-head">
                    <div>
                      <div className="section-kicker">Preferências</div>
                      <h3>Observações e Restrições</h3>
                    </div>
                  </div>
                  <p style={{ marginTop: "10px", fontSize: "13px", color: "var(--c-text)", lineHeight: 1.5 }}>
                    {clienteAtivo.observacoes}
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* FORMULÁRIO DEDICADO DE CADASTRO / EDIÇÃO DE CLIENTE                       */}
      {/* ========================================================================= */}
      {formAberto && (
        <div className="modal-backdrop">
          <div className="modal-window" style={{ maxWidth: "760px" }}>
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div className="brand-mark" style={{ width: "32px", height: "32px" }}>
                  <User size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0 }}>
                    {modoEdicao === "novo" ? "Cadastrar Novo Cliente" : `Editar Cliente — ${formNome}`}
                  </h3>
                  <small style={{ color: "var(--c-muted)", fontSize: "11px" }}>
                    Código Interno: <b>{formCodigo}</b>
                  </small>
                </div>
              </div>
              <button type="button" onClick={fecharFormulario} className="modal-close">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: "22px" }}>
              {formError && (
                <div style={{ padding: "12px 16px", marginBottom: "18px", background: "#fdf2f2", color: "#991b1b", borderRadius: "10px", fontSize: "13px" }}>
                  {formError}
                </div>
              )}

              {/* SEÇÃO 1: DADOS PESSOAIS */}
              <fieldset style={{ border: "none", padding: 0, margin: "0 0 20px 0" }}>
                <div className="section-kicker">Identificação</div>
                <div className="form-grid">
                  <div className="field">
                    <label>Código Interno</label>
                    <input value={formCodigo} readOnly />
                  </div>
                  <div className="field span-2">
                    <label>Nome Completo do Cliente *</label>
                    <input
                      value={formNome}
                      onChange={(e) => setFormNome(e.target.value)}
                      placeholder="Ex: Maria Carolina Silva"
                      required
                      autoFocus
                    />
                  </div>

                  <div className="field">
                    <label>CPF ou CNPJ</label>
                    <input
                      value={formCpfCnpj}
                      onChange={(e) => setFormCpfCnpj(e.target.value)}
                      placeholder="000.000.000-00"
                    />
                  </div>

                  <div className="field">
                    <label>Data de Aniversário</label>
                    <input
                      type="date"
                      value={formDataNascimento}
                      onChange={(e) => setFormDataNascimento(e.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label>Status do Cliente</label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as "ativo" | "inativo")}
                    >
                      <option value="ativo">Ativo</option>
                      <option value="inativo">Inativo</option>
                    </select>
                  </div>
                </div>
              </fieldset>

              {/* SEÇÃO 2: CONTATO E COMUNICAÇÃO */}
              <fieldset style={{ border: "none", padding: 0, margin: "0 0 20px 0" }}>
                <div className="section-kicker">Contato & Notificações</div>
                <div className="form-grid">
                  <div className="field">
                    <label>Celular / WhatsApp *</label>
                    <input
                      value={formCelular}
                      onChange={(e) => setFormCelular(e.target.value)}
                      placeholder="(11) 98765-4321"
                      required
                    />
                  </div>

                  <div className="field">
                    <label>Telefone Fixo</label>
                    <input
                      value={formTelefone}
                      onChange={(e) => setFormTelefone(e.target.value)}
                      placeholder="(11) 3456-7890"
                    />
                  </div>

                  <div className="field">
                    <label>E-mail</label>
                    <input
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="cliente@exemplo.com.br"
                    />
                  </div>
                </div>
              </fieldset>

              {/* SEÇÃO 3: ENDEREÇO DE ENTREGA */}
              <fieldset style={{ border: "none", padding: 0, margin: "0 0 20px 0" }}>
                <div className="section-kicker">Endereço de Entrega & Encomendas</div>
                <div className="form-grid">
                  <div className="field cep-field">
                    <label>CEP (Busca Automática)</label>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <input
                        value={formCep}
                        onChange={(e) => setFormCep(e.target.value)}
                        placeholder="00000-000"
                        style={{ flex: 1 }}
                      />
                      <button
                        type="button"
                        className="button secondary"
                        onClick={handleBuscarCep}
                        disabled={cepLoading}
                        style={{ height: "40px", padding: "0 14px" }}
                      >
                        {cepLoading ? "Buscando..." : "Buscar CEP"}
                      </button>
                    </div>
                    {cepMessage && (
                      <small style={{ color: "var(--c-primary)", fontSize: "11px", marginTop: "4px", display: "block" }}>
                        {cepMessage}
                      </small>
                    )}
                  </div>

                  <div className="field span-2">
                    <label>Rua / Logradouro</label>
                    <input
                      value={formLogradouro}
                      onChange={(e) => setFormLogradouro(e.target.value)}
                      placeholder="Ex: Rua das Flores"
                    />
                  </div>

                  <div className="field">
                    <label>Número</label>
                    <input
                      value={formNumero}
                      onChange={(e) => setFormNumero(e.target.value)}
                      placeholder="123"
                    />
                  </div>

                  <div className="field">
                    <label>Complemento / Apto</label>
                    <input
                      value={formComplemento}
                      onChange={(e) => setFormComplemento(e.target.value)}
                      placeholder="Apto 42, Bloco B"
                    />
                  </div>

                  <div className="field">
                    <label>Bairro</label>
                    <input
                      value={formBairro}
                      onChange={(e) => setFormBairro(e.target.value)}
                      placeholder="Ex: Jardim Paulista"
                    />
                  </div>

                  <div className="field">
                    <label>Cidade / UF</label>
                    <input
                      value={formCidadeNome}
                      onChange={(e) => setFormCidadeNome(e.target.value)}
                      placeholder="Ex: São Paulo / SP"
                    />
                  </div>
                </div>
              </fieldset>

              {/* SEÇÃO 4: OBSERVAÇÕES & PREFERÊNCIAS */}
              <fieldset style={{ border: "none", padding: 0, margin: "0 0 10px 0" }}>
                <div className="section-kicker">Preferências do Cliente</div>
                <div className="field">
                  <label>Observações, Restrições Alimentares ou Preferências</label>
                  <textarea
                    rows={3}
                    value={formObservacoes}
                    onChange={(e) => setFormObservacoes(e.target.value)}
                    placeholder="Ex: Alérgica a nozes, prefere brigadeiro meio amargo, deixar encomenda na portaria..."
                  />
                </div>
              </fieldset>

              {/* BARRA DE AÇÕES: CANCELAR E SALVAR */}
              <div className="form-actions-bar">
                <button
                  type="button"
                  className="button secondary"
                  onClick={fecharFormulario}
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="button primary"
                  disabled={saving}
                >
                  <Check size={16} /> {saving ? "Salvando..." : "Salvar cliente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
