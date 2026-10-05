/**
 * ============================================================================
 * PROJETO: Doce Gestor - Sistema de Gestão para Confeitarias
 * REPOSITÓRIO: https://github.com/junin1737/confeitaria
 * ARQUIVO: src/pages/SuppliersPage.tsx
 * DESCRIÇÃO: FASE 1 — Cadastro e Gestão de Fornecedores com Formulário Dedicado,
 *            Código Auto-incrementado (+1), Busca de CEP e Ações Salvar/Cancelar.
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
  X,
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
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Controle de exibição do formulário dedicado
  const [formAberto, setFormAberto] = useState(false);
  const [modoEdicao, setModoEdicao] = useState<"novo" | "editar">("novo");

  // Form State
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
      const lista = await fetchFornecedores();
      setFornecedores(lista);
      if (lista.length > 0 && selectedId === null) {
        setSelectedId(lista[0].id);
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

  const abrirNovoFornecedor = async () => {
    try {
      const prox = await fetchProximoCodigoFornecedor();
      setFormCodigo(prox);
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
      setModoEdicao("novo");
      setFormAberto(true);
    } catch (err: any) {
      onAction("Erro ao obter próximo código de fornecedor.");
    }
  };

  const abrirEditarFornecedor = (f: Fornecedor) => {
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
      setCepMessage(res.generico ? "CEP geral da cidade preenchido." : "Endereço localizado!");
    } catch (err: any) {
      setCepMessage("CEP não localizado.");
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
    setFormError("");
    try {
      const salvo = await saveFornecedor({
        id: modoEdicao === "editar" && selectedId ? selectedId : undefined,
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
      setFormAberto(false);
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

  const fornecedorAtivo = fornecedores.find((f) => f.id === selectedId) || null;

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
          <button className="button primary" onClick={abrirNovoFornecedor}>
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
                  onClick={() => setSelectedId(item.id)}
                >
                  <div className="employee-avatar" style={{ background: "#edf3fa", color: "#617c9b" }}>
                    <Truck size={17} />
                  </div>
                  <div className="employee-row-copy">
                    <strong>{item.nomeFantasia || item.razaoSocial}</strong>
                    <span>{item.codigo} • {item.cidadeNome || "Sem cidade"}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Painel Direito: Cartão de Visão Geral do Fornecedor */}
        <div className="employee-detail panel">
          {!fornecedorAtivo && !loading ? (
            <div className="employee-empty" style={{ padding: "60px 20px" }}>
              <Truck size={36} style={{ color: "#d0c7c1", margin: "0 auto 12px" }} />
              <strong>Nenhum fornecedor selecionado</strong>
              <p>Clique em um fornecedor ao lado ou no botão "Novo fornecedor" para cadastrar.</p>
              <button className="button primary" style={{ marginTop: "14px" }} onClick={abrirNovoFornecedor}>
                <Plus size={16} /> Novo fornecedor
              </button>
            </div>
          ) : fornecedorAtivo ? (
            <div>
              <div className="employee-detail-head">
                <div className="detail-title">
                  <div
                    className="employee-avatar"
                    style={{ background: "#edf3fa", color: "#617c9b", width: "48px", height: "48px" }}
                  >
                    <Truck size={24} />
                  </div>
                  <div>
                    <span className="live-pill">
                      {fornecedorAtivo.status.toUpperCase()}
                    </span>
                    <h2>{fornecedorAtivo.nomeFantasia || fornecedorAtivo.razaoSocial}</h2>
                    <p>{fornecedorAtivo.codigo} • {fornecedorAtivo.razaoSocial}</p>
                  </div>
                </div>

                <div className="detail-actions">
                  {fornecedorAtivo.celular && (
                    <a
                      href={whatsappUrl(fornecedorAtivo.celular, `Olá, aqui é da confeitaria sobre cotação de insumos!`)}
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
                    onClick={() => abrirEditarFornecedor(fornecedorAtivo)}
                  >
                    Editar dados
                  </button>
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => handleExcluir(fornecedorAtivo.id)}
                    style={{ color: "var(--c-danger)" }}
                  >
                    <Trash2 size={14} /> Excluir
                  </button>
                </div>
              </div>

              {/* Informações Resumidas do Fornecedor */}
              <div className="detail-stat-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginTop: "20px" }}>
                <div>
                  <span>Contato Principal</span>
                  <strong>{fornecedorAtivo.contato || "Representante Geral"}</strong>
                  <small>{fornecedorAtivo.celular || fornecedorAtivo.telefone || "Sem telefone"}</small>
                </div>
                <div>
                  <span>CNPJ / CPF</span>
                  <strong>{fornecedorAtivo.cnpjCpf || "Não cadastrado"}</strong>
                  <small>Documento fiscal da empresa</small>
                </div>
                <div>
                  <span>Localização</span>
                  <strong>{fornecedorAtivo.cidadeNome || "Não informada"}</strong>
                  <small>{fornecedorAtivo.bairro ? `Bairro: ${fornecedorAtivo.bairro}` : "Sem bairro"}</small>
                </div>
              </div>

              <div className="detail-sections" style={{ marginTop: "16px" }}>
                <div className="subpanel">
                  <div className="subpanel-head">
                    <div>
                      <div className="section-kicker">Canais</div>
                      <h3>Contatos Diretos</h3>
                    </div>
                  </div>
                  <div style={{ marginTop: "12px", display: "grid", gap: "10px", fontSize: "13px" }}>
                    <div><strong>E-mail:</strong> {fornecedorAtivo.email || "Não informado"}</div>
                    <div><strong>Telefone Comercial:</strong> {fornecedorAtivo.telefone || "Não informado"}</div>
                    <div><strong>WhatsApp / Celular:</strong> {fornecedorAtivo.celular || "Não informado"}</div>
                  </div>
                </div>

                <div className="subpanel">
                  <div className="subpanel-head">
                    <div>
                      <div className="section-kicker">Distribuição</div>
                      <h3>Endereço</h3>
                    </div>
                  </div>
                  <div style={{ marginTop: "12px", display: "grid", gap: "8px", fontSize: "13px" }}>
                    <div><strong>CEP:</strong> {fornecedorAtivo.cep || "Não informado"}</div>
                    <div><strong>Logradouro:</strong> {fornecedorAtivo.logradouro || "Não informado"}, {fornecedorAtivo.numero || "S/N"}</div>
                    <div><strong>Bairro:</strong> {fornecedorAtivo.bairro || "—"}</div>
                    <div><strong>Cidade/UF:</strong> {fornecedorAtivo.cidadeNome || "—"}</div>
                  </div>
                </div>
              </div>

              {fornecedorAtivo.observacoes && (
                <div className="subpanel" style={{ marginTop: "16px" }}>
                  <div className="subpanel-head">
                    <div>
                      <div className="section-kicker">Histórico & Prazos</div>
                      <h3>Observações e Condições Comerciais</h3>
                    </div>
                  </div>
                  <p style={{ marginTop: "10px", fontSize: "13px", color: "var(--c-text)", lineHeight: 1.5 }}>
                    {fornecedorAtivo.observacoes}
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* FORMULÁRIO DEDICADO DE CADASTRO / EDIÇÃO DE FORNECEDOR                    */}
      {/* ========================================================================= */}
      {formAberto && (
        <div className="modal-backdrop">
          <div className="modal-window" style={{ maxWidth: "760px" }}>
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div className="brand-mark" style={{ width: "32px", height: "32px", background: "#617c9b" }}>
                  <Truck size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0 }}>
                    {modoEdicao === "novo" ? "Cadastrar Novo Fornecedor" : `Editar Fornecedor — ${formRazaoSocial}`}
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

              {/* SEÇÃO 1: IDENTIFICAÇÃO DA EMPRESA */}
              <fieldset style={{ border: "none", padding: 0, margin: "0 0 20px 0" }}>
                <div className="section-kicker">Identificação Jurídica</div>
                <div className="form-grid">
                  <div className="field">
                    <label>Código Interno</label>
                    <input value={formCodigo} readOnly />
                  </div>

                  <div className="field span-2">
                    <label>Razão Social / Nome Oficial *</label>
                    <input
                      value={formRazaoSocial}
                      onChange={(e) => setFormRazaoSocial(e.target.value)}
                      placeholder="Ex: Cacau & Confeitos Distribuidora LTDA"
                      required
                      autoFocus
                    />
                  </div>

                  <div className="field span-2">
                    <label>Nome Fantasia (Como você conhece)</label>
                    <input
                      value={formNomeFantasia}
                      onChange={(e) => setFormNomeFantasia(e.target.value)}
                      placeholder="Ex: Cacau Distribuidora"
                    />
                  </div>

                  <div className="field">
                    <label>CNPJ / CPF</label>
                    <input
                      value={formCnpjCpf}
                      onChange={(e) => setFormCnpjCpf(e.target.value)}
                      placeholder="00.000.000/0000-00"
                    />
                  </div>
                </div>
              </fieldset>

              {/* SEÇÃO 2: CONTATO E REPRESENTANTE */}
              <fieldset style={{ border: "none", padding: 0, margin: "0 0 20px 0" }}>
                <div className="section-kicker">Contato & Comercial</div>
                <div className="form-grid">
                  <div className="field">
                    <label>Nome do Representante / Contato</label>
                    <input
                      value={formContato}
                      onChange={(e) => setFormContato(e.target.value)}
                      placeholder="Ex: Carlos (Vendedor)"
                    />
                  </div>

                  <div className="field">
                    <label>WhatsApp / Celular Comercial</label>
                    <input
                      value={formCelular}
                      onChange={(e) => setFormCelular(e.target.value)}
                      placeholder="(11) 98765-4321"
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

                  <div className="field span-2">
                    <label>E-mail para Pedidos e Cotações</label>
                    <input
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="pedidos@fornecedor.com.br"
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
              </fieldset>

              {/* SEÇÃO 3: LOCALIZAÇÃO */}
              <fieldset style={{ border: "none", padding: 0, margin: "0 0 20px 0" }}>
                <div className="section-kicker">Endereço da Empresa</div>
                <div className="form-grid">
                  <div className="field cep-field">
                    <label>CEP</label>
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
                      placeholder="Ex: Avenida Industrial"
                    />
                  </div>

                  <div className="field">
                    <label>Número</label>
                    <input
                      value={formNumero}
                      onChange={(e) => setFormNumero(e.target.value)}
                      placeholder="500"
                    />
                  </div>

                  <div className="field">
                    <label>Complemento / Galpão</label>
                    <input
                      value={formComplemento}
                      onChange={(e) => setFormComplemento(e.target.value)}
                      placeholder="Galpão 3"
                    />
                  </div>

                  <div className="field">
                    <label>Bairro</label>
                    <input
                      value={formBairro}
                      onChange={(e) => setFormBairro(e.target.value)}
                      placeholder="Distrito Industrial"
                    />
                  </div>

                  <div className="field">
                    <label>Cidade / UF</label>
                    <input
                      value={formCidadeNome}
                      onChange={(e) => setFormCidadeNome(e.target.value)}
                      placeholder="São Paulo / SP"
                    />
                  </div>
                </div>
              </fieldset>

              {/* SEÇÃO 4: CONDIÇÕES & PRAZOS */}
              <fieldset style={{ border: "none", padding: 0, margin: "0 0 10px 0" }}>
                <div className="section-kicker">Condições Comerciais & Prazos</div>
                <div className="field">
                  <label>Observações Comerciais (Dias de entrega, pedido mínimo, prazo de faturamento)</label>
                  <textarea
                    rows={3}
                    value={formObservacoes}
                    onChange={(e) => setFormObservacoes(e.target.value)}
                    placeholder="Ex: Entrega toda terça e quinta. Pedido mínimo de R$ 300,00. Boleto 28 dias."
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
                  <Check size={16} /> {saving ? "Salvando..." : "Salvar fornecedor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
