/**
 * ============================================================================
 * PROJETO: Gestão com Sabor - Sistema de Gestão para Confeitarias
 * REPOSITÓRIO: https://github.com/junin1737/confeitaria
 * ARQUIVO: src/pages/SettingsPage.tsx
 * DESCRIÇÃO: Configurações do Sistema com 5 Abas Operacionais Completas:
 *            1. Geral (Cores, Temas e Identidade Visual)
 *            2. Mensagens (Templates de WhatsApp com tags dinâmicas)
 *            3. Empresa (Ficha Cadastral do Emitente completa c/ busca de CNPJ)
 *            4. Usuários (Colaboradores com acesso ao sistema e perfis)
 *            5. Pagamentos (Configurações de Meios de Pagamento & Chave Pix)
 * ============================================================================
 */

import { useEffect, useState, type FormEvent } from "react";
import {
  RotateCcw,
  Building2,
  Search,
  Check,
  Globe,
  CreditCard,
  Users,
} from "lucide-react";
import {
  fetchMensagens,
  saveMensagem,
  fetchDadosEmpresa,
  saveDadosEmpresa,
  lookupCnpj,
  fetchFuncionarios,
  type Mensagem,
  type EmpresaAdminDto,
  type Funcionario,
} from "../api";
import {
  DEFAULT_THEME,
  THEME_COLOR_FIELDS,
  THEME_PRESETS,
  presetIdFor,
  type ThemeColors,
} from "../theme";

type SettingsTab = "geral" | "mensagens" | "empresa" | "usuarios" | "pagamentos";

function HexField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  return (
    <input
      className="color-hex"
      value={draft}
      onChange={(event) => {
        const next = event.target.value.trim();
        setDraft(next);
        if (/^#([0-9a-fA-F]{6})$/.test(next)) onChange(next.toLowerCase());
      }}
      spellCheck={false}
    />
  );
}

export function SettingsPage({
  colors,
  onColorsChange,
  onAction,
}: {
  colors: ThemeColors;
  onColorsChange: (colors: ThemeColors) => void;
  onAction: (message: string) => void;
}) {
  const [tab, setTab] = useState<SettingsTab>("geral");

  // Estado: Mensagens
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [loadingMensagens, setLoadingMensagens] = useState(false);
  const [savingKey, setSavingKey] = useState("");

  // Estado: Ficha Cadastral da Empresa
  const [empresa, setEmpresa] = useState<Partial<EmpresaAdminDto>>({
    tipoLogradouro: "Rua",
    optanteSimples: "Sim",
    regimeTributario: "Normal",
  });
  const [loadingEmpresa, setLoadingEmpresa] = useState(false);
  const [salvandoEmpresa, setSalvandoEmpresa] = useState(false);
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);
  const [cnpjInput, setCnpjInput] = useState("");

  // Estado: Usuários / Colaboradores
  const [usuarios, setUsuarios] = useState<Funcionario[]>([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);

  // Estado: Pagamentos
  const [chavePix, setChavePix] = useState("");
  const [tipoChavePix, setTipoChavePix] = useState("cnpj");
  const [beneficiarioPix, setBeneficiarioPix] = useState("");
  const [diasCartaoCredito, setDiasCartaoCredito] = useState(30);
  const [taxaCartaoCredito, setTaxaCartaoCredito] = useState(2.99);

  const activePreset = presetIdFor(colors);

  // Carregamento de dados sob demanda conforme a aba selecionada
  useEffect(() => {
    if (tab === "mensagens") {
      setLoadingMensagens(true);
      fetchMensagens()
        .then((data) => setMensagens(data.mensagens))
        .catch((err) => onAction(err?.message || "Falha ao carregar mensagens"))
        .finally(() => setLoadingMensagens(false));
    } else if (tab === "empresa") {
      setLoadingEmpresa(true);
      fetchDadosEmpresa()
        .then((data) => {
          setEmpresa(data);
          if (data.cnpj) setCnpjInput(data.cnpj);
        })
        .catch((err) => onAction(err?.message || "Falha ao carregar dados da empresa"))
        .finally(() => setLoadingEmpresa(false));
    } else if (tab === "usuarios") {
      setLoadingUsuarios(true);
      fetchFuncionarios()
        .then((res) => setUsuarios(res.funcionarios))
        .catch((err) => onAction(err?.message || "Falha ao carregar equipe"))
        .finally(() => setLoadingUsuarios(false));
    }
  }, [tab]);

  function updateColor(key: keyof ThemeColors, value: string) {
    onColorsChange({ ...colors, [key]: value });
  }

  // Busca e preenchimento instantâneo ao informar o CNPJ
  async function handleBuscarCnpj() {
    const limpo = cnpjInput.replace(/\D/g, "");
    if (limpo.length !== 14) {
      onAction("Informe um CNPJ válido com 14 dígitos.");
      return;
    }

    try {
      setBuscandoCnpj(true);
      const dados = await lookupCnpj(limpo);
      setEmpresa((prev) => ({
        ...prev,
        cnpj: dados.cnpj,
        razaoSocial: dados.razaoSocial || prev.razaoSocial,
        nomeFantasia: dados.nomeFantasia || prev.nomeFantasia,
        responsavel: dados.responsavel || prev.responsavel,
        cep: dados.cep || prev.cep,
        tipoLogradouro: dados.tipoLogradouro || prev.tipoLogradouro || "Rua",
        logradouro: dados.logradouro || prev.logradouro,
        numero: dados.numero || prev.numero,
        complemento: dados.complemento || prev.complemento,
        bairro: dados.bairro || prev.bairro,
        uf: dados.uf || prev.uf,
        municipio: dados.municipio || prev.municipio,
        dddTelefone: dados.dddTelefone || prev.dddTelefone,
        telefone: dados.telefone || prev.telefone,
        dddCelular: dados.dddCelular || prev.dddCelular,
        celular: dados.celular || prev.celular,
        email: dados.email || prev.email,
        ramoAtividade: dados.ramoAtividade || prev.ramoAtividade,
        cnae: dados.cnae || prev.cnae,
        inscricaoEstadual: dados.inscricaoEstadual || prev.inscricaoEstadual,
        optanteSimples: dados.optanteSimples || prev.optanteSimples || "Sim",
        regimeTributario: dados.regimeTributario || prev.regimeTributario || "Normal",
      }));
      onAction("Dados da empresa obtidos com sucesso da Receita Federal!");
    } catch (e: any) {
      onAction(e?.message || "Não foi possível puxar os dados do CNPJ.");
    } finally {
      setBuscandoCnpj(false);
    }
  }

  // Salva ficha cadastral da empresa
  async function handleSalvarEmpresa(e: FormEvent) {
    e.preventDefault();
    try {
      setSalvandoEmpresa(true);
      const salva = await saveDadosEmpresa(empresa);
      setEmpresa(salva);
      onAction("Ficha cadastral da empresa salva com sucesso!");
    } catch (e: any) {
      onAction(e?.message || "Erro ao salvar dados da empresa.");
    } finally {
      setSalvandoEmpresa(false);
    }
  }

  return (
    <>
      <section className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-dot" /> sistema
          </div>
          <h1>Configurações</h1>
          <p>Personalize a operação, dados fiscais da empresa, equipe e meios de recebimento.</p>
        </div>
      </section>

      {/* ABAS OPERACIONAIS */}
      <div className="settings-tabs">
        <button className={tab === "geral" ? "active" : ""} onClick={() => setTab("geral")}>
          Geral
        </button>
        <button className={tab === "mensagens" ? "active" : ""} onClick={() => setTab("mensagens")}>
          Mensagens
        </button>
        <button className={tab === "empresa" ? "active" : ""} onClick={() => setTab("empresa")}>
          Empresa
        </button>
        <button className={tab === "usuarios" ? "active" : ""} onClick={() => setTab("usuarios")}>
          Usuários
        </button>
        <button className={tab === "pagamentos" ? "active" : ""} onClick={() => setTab("pagamentos")}>
          Pagamentos
        </button>
      </div>

      {/* ABA 1: GERAL (CORES E TEMAS) */}
      {tab === "geral" && (
        <section className="panel settings-panel">
          <div className="panel-heading">
            <div>
              <div className="section-kicker">Aparência</div>
              <h2>Cores e temas</h2>
            </div>
            <button
              className="button subtle"
              onClick={() => {
                onColorsChange(DEFAULT_THEME);
                onAction("Tema original restaurado");
              }}
            >
              <RotateCcw size={15} /> Restaurar original
            </button>
          </div>

          <p className="settings-copy">
            Escolha um dos 10 temas prontos ou ajuste cada cor. As mudanças valem para todo o sistema e ficam salvas neste
            navegador.
          </p>

          <div className="theme-grid">
            {THEME_PRESETS.map((preset) => {
              const selected = activePreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  className={`theme-card ${selected ? "active" : ""}`}
                  onClick={() => {
                    onColorsChange(preset.colors);
                    onAction(`Tema "${preset.name}" aplicado`);
                  }}
                >
                  <div className="theme-card-preview">
                    {THEME_COLOR_FIELDS.slice(0, 5).map((f) => (
                      <span key={f.key} style={{ background: preset.colors[f.key] }} />
                    ))}
                  </div>
                  <div className="theme-card-body">
                    <strong>{preset.name}</strong>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="color-field-grid">
            {THEME_COLOR_FIELDS.map((field) => (
              <label key={field.key} className="color-field">
                <span className="color-swatch-wrap">
                  <input
                    type="color"
                    value={colors[field.key]}
                    onChange={(event) => updateColor(field.key, event.target.value)}
                    aria-label={field.label}
                  />
                </span>
                <span>
                  <strong>{field.label}</strong>
                  <small>{field.hint}</small>
                </span>
                <HexField value={colors[field.key]} onChange={(value) => updateColor(field.key, value)} />
              </label>
            ))}
          </div>
        </section>
      )}

      {/* ABA 2: MENSAGENS PRONTAS */}
      {tab === "mensagens" && (
        <section className="panel settings-panel">
          <div className="panel-heading">
            <div>
              <div className="section-kicker">WhatsApp</div>
              <h2>Mensagens prontas</h2>
            </div>
          </div>
          <p className="settings-copy">
            Esses textos são usados nos atalhos do dia. Use {"{nome}"} e {"{empresa}"} para personalizar.
          </p>
          {loadingMensagens && mensagens.length === 0 ? (
            <p className="today-empty">Carregando mensagens...</p>
          ) : mensagens.length === 0 ? (
            <p className="today-empty">Nenhuma mensagem cadastrada.</p>
          ) : (
            <div className="message-editor-list">
              {mensagens.map((mensagem) => (
                <form
                  key={mensagem.chave}
                  className="message-editor"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const formData = new FormData(event.currentTarget);
                    setSavingKey(mensagem.chave);
                    void saveMensagem(
                      mensagem.chave,
                      String(formData.get("titulo") ?? ""),
                      String(formData.get("texto") ?? ""),
                    )
                      .then((saved) => {
                        setMensagens((current) =>
                          current.map((item) => (item.chave === saved.chave ? saved : item)),
                        );
                        onAction("Mensagem salva.");
                      })
                      .catch((error) => onAction(error instanceof Error ? error.message : "Falha ao salvar"))
                      .finally(() => setSavingKey(""));
                  }}
                >
                  <label>
                    <span>Nome</span>
                    <input name="titulo" defaultValue={mensagem.titulo} />
                  </label>
                  <label>
                    <span>Texto</span>
                    <textarea name="texto" rows={5} defaultValue={mensagem.texto} />
                  </label>
                  <button className="button primary" type="submit" disabled={savingKey === mensagem.chave}>
                    {savingKey === mensagem.chave ? "Salvando..." : "Salvar mensagem"}
                  </button>
                </form>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ABA 3: FICHA CADASTRAL COMPLETA DA EMPRESA (COM CONSULTA DE CNPJ) */}
      {tab === "empresa" && (
        <section className="panel settings-panel">
          <div className="panel-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <div className="section-kicker" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <Building2 size={16} /> Ficha Cadastral do Emitente
              </div>
              <h2>Dados da Empresa</h2>
            </div>

            {/* BARRA DE BUSCA RÁPIDA POR CNPJ */}
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", background: "#f8fafc", padding: "0.5rem 0.75rem", borderRadius: 10, border: "1px solid #cbd5e1" }}>
              <Search size={16} style={{ color: "#64748b" }} />
              <input
                type="text"
                placeholder="Informe o CNPJ para puxar dados..."
                value={cnpjInput}
                onChange={(e) => setCnpjInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleBuscarCnpj();
                  }
                }}
                style={{
                  border: "none",
                  background: "transparent",
                  outline: "none",
                  fontSize: "0.85rem",
                  width: 210,
                  fontWeight: 600,
                }}
              />
              <button
                type="button"
                className="button primary"
                onClick={handleBuscarCnpj}
                disabled={buscandoCnpj}
                style={{ padding: "0.4rem 0.85rem", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.35rem" }}
              >
                {buscandoCnpj ? (
                  "Buscando..."
                ) : (
                  <>
                    <Globe size={14} /> Puxar CNPJ
                  </>
                )}
              </button>
            </div>
          </div>

          <p className="settings-copy">
            Preencha a ficha cadastral oficial da confeitaria para emissão fiscal, orçamentos e identificação.
            Ao digitar o CNPJ e clicar em &quot;Puxar CNPJ&quot;, os dados oficiais da Receita Federal são importados automaticamente.
          </p>

          {loadingEmpresa ? (
            <p className="today-empty">Carregando dados da empresa...</p>
          ) : (
            <form onSubmit={handleSalvarEmpresa} style={{ marginTop: "1.25rem" }}>
              <div
                style={{
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  padding: "1.5rem",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                }}
              >
                {/* LINHA 1: RAZÃO SOCIAL & LOGO PREVIEW */}
                <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                      Razão Social *
                    </label>
                    <input
                      type="text"
                      value={empresa.razaoSocial || ""}
                      onChange={(e) => setEmpresa({ ...empresa, razaoSocial: e.target.value })}
                      required
                      placeholder="Ex: SEBASTIAO MACHADO SOBRINHO JUNIOR..."
                      style={{ width: "100%", padding: "0.6rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
                    />
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: 8, padding: "0.5rem" }}>
                    <span style={{ fontSize: "0.75rem", color: "#64748b", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <Building2 size={16} /> Gestão com Sabor
                    </span>
                  </div>
                </div>

                {/* LINHA 2: NOME FANTASIA & RESPONSÁVEL */}
                <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                      Nome Fantasia
                    </label>
                    <input
                      type="text"
                      value={empresa.nomeFantasia || ""}
                      onChange={(e) => setEmpresa({ ...empresa, nomeFantasia: e.target.value })}
                      placeholder="Ex: TIAOCARDS / Ateliê Doce Sabor"
                      style={{ width: "100%", padding: "0.6rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                      Responsável
                    </label>
                    <input
                      type="text"
                      value={empresa.responsavel || ""}
                      onChange={(e) => setEmpresa({ ...empresa, responsavel: e.target.value })}
                      placeholder="Ex: SEBASTIAO"
                      style={{ width: "100%", padding: "0.6rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
                    />
                  </div>
                </div>

                {/* LINHA 3: ENDEREÇO (CEP, TIPO, LOGRADOURO, NÚMERO, COMPLEMENTO) */}
                <div style={{ display: "grid", gridTemplateColumns: "130px 110px 2fr 100px 1.2fr", gap: "0.75rem", marginBottom: "1rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                      CEP
                    </label>
                    <input
                      type="text"
                      value={empresa.cep || ""}
                      onChange={(e) => setEmpresa({ ...empresa, cep: e.target.value })}
                      placeholder="00000-000"
                      style={{ width: "100%", padding: "0.6rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                      Tipo
                    </label>
                    <select
                      value={empresa.tipoLogradouro || "Rua"}
                      onChange={(e) => setEmpresa({ ...empresa, tipoLogradouro: e.target.value })}
                      style={{ width: "100%", padding: "0.6rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
                    >
                      <option value="Rua">Rua</option>
                      <option value="Avenida">Avenida</option>
                      <option value="Alameda">Alameda</option>
                      <option value="Praça">Praça</option>
                      <option value="Rodovia">Rodovia</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                      Logradouro
                    </label>
                    <input
                      type="text"
                      value={empresa.logradouro || ""}
                      onChange={(e) => setEmpresa({ ...empresa, logradouro: e.target.value })}
                      placeholder="Ex: MAJOR OLIMPIO FRANCO"
                      style={{ width: "100%", padding: "0.6rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                      Número
                    </label>
                    <input
                      type="text"
                      value={empresa.numero || ""}
                      onChange={(e) => setEmpresa({ ...empresa, numero: e.target.value })}
                      placeholder="712"
                      style={{ width: "100%", padding: "0.6rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                      Complemento
                    </label>
                    <input
                      type="text"
                      value={empresa.complemento || ""}
                      onChange={(e) => setEmpresa({ ...empresa, complemento: e.target.value })}
                      placeholder="Sala, Apto..."
                      style={{ width: "100%", padding: "0.6rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
                    />
                  </div>
                </div>

                {/* LINHA 4: BAIRRO, UF, MUNICÍPIO */}
                <div style={{ display: "grid", gridTemplateColumns: "1.5fr 80px 1.5fr", gap: "1rem", marginBottom: "1rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                      Bairro
                    </label>
                    <input
                      type="text"
                      value={empresa.bairro || ""}
                      onChange={(e) => setEmpresa({ ...empresa, bairro: e.target.value })}
                      placeholder="CENTRO"
                      style={{ width: "100%", padding: "0.6rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                      UF
                    </label>
                    <input
                      type="text"
                      value={empresa.uf || ""}
                      onChange={(e) => setEmpresa({ ...empresa, uf: e.target.value.toUpperCase().slice(0, 2) })}
                      placeholder="MG"
                      maxLength={2}
                      style={{ width: "100%", padding: "0.6rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.9rem", textAlign: "center", textTransform: "uppercase" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                      Município
                    </label>
                    <input
                      type="text"
                      value={empresa.municipio || ""}
                      onChange={(e) => setEmpresa({ ...empresa, municipio: e.target.value })}
                      placeholder="Matutina"
                      style={{ width: "100%", padding: "0.6rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
                    />
                  </div>
                </div>

                {/* LINHA 5: TELEFONE, FAX, CELULAR */}
                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1.2fr", gap: "1rem", marginBottom: "1rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                      Telefone Fixo
                    </label>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <input
                        type="text"
                        value={empresa.dddTelefone || ""}
                        onChange={(e) => setEmpresa({ ...empresa, dddTelefone: e.target.value })}
                        placeholder="DDD"
                        maxLength={3}
                        style={{ width: 60, padding: "0.6rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.9rem", textAlign: "center" }}
                      />
                      <input
                        type="text"
                        value={empresa.telefone || ""}
                        onChange={(e) => setEmpresa({ ...empresa, telefone: e.target.value })}
                        placeholder="99733 5942"
                        style={{ flex: 1, padding: "0.6rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                      Fax
                    </label>
                    <input
                      type="text"
                      value={empresa.fax || ""}
                      onChange={(e) => setEmpresa({ ...empresa, fax: e.target.value })}
                      placeholder="Número fax"
                      style={{ width: "100%", padding: "0.6rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                      Celular / 0800
                    </label>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <input
                        type="text"
                        value={empresa.dddCelular || ""}
                        onChange={(e) => setEmpresa({ ...empresa, dddCelular: e.target.value })}
                        placeholder="DDD"
                        maxLength={3}
                        style={{ width: 60, padding: "0.6rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.9rem", textAlign: "center" }}
                      />
                      <input
                        type="text"
                        value={empresa.celular || ""}
                        onChange={(e) => setEmpresa({ ...empresa, celular: e.target.value })}
                        placeholder="99733 5942"
                        style={{ flex: 1, padding: "0.6rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
                      />
                    </div>
                  </div>
                </div>

                {/* LINHA 6: CNPJ, IE, INSCRIÇÃO MUNICIPAL */}
                <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                      CNPJ / CPF *
                    </label>
                    <input
                      type="text"
                      value={empresa.cnpj || ""}
                      onChange={(e) => setEmpresa({ ...empresa, cnpj: e.target.value })}
                      placeholder="40.918.528/0001-69"
                      style={{ width: "100%", padding: "0.6rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.9rem", fontWeight: 700 }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                      Inscrição Estadual (IE) / RG
                    </label>
                    <input
                      type="text"
                      value={empresa.inscricaoEstadual || ""}
                      onChange={(e) => setEmpresa({ ...empresa, inscricaoEstadual: e.target.value })}
                      placeholder="0039775430054"
                      style={{ width: "100%", padding: "0.6rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                      Inscrição Municipal
                    </label>
                    <input
                      type="text"
                      value={empresa.inscricaoMunicipal || ""}
                      onChange={(e) => setEmpresa({ ...empresa, inscricaoMunicipal: e.target.value })}
                      placeholder="Insc. Municipal..."
                      style={{ width: "100%", padding: "0.6rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
                    />
                  </div>
                </div>

                {/* LINHA 7: E-MAIL & SITE */}
                <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                      E-mail
                    </label>
                    <input
                      type="email"
                      value={empresa.email || ""}
                      onChange={(e) => setEmpresa({ ...empresa, email: e.target.value })}
                      placeholder="tiaocards@gmail.com"
                      style={{ width: "100%", padding: "0.6rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                      Site / Redes Sociais
                    </label>
                    <input
                      type="text"
                      value={empresa.site || ""}
                      onChange={(e) => setEmpresa({ ...empresa, site: e.target.value })}
                      placeholder="https://meusite.com.br"
                      style={{ width: "100%", padding: "0.6rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
                    />
                  </div>
                </div>

                {/* LINHA 8: RAMO DE ATIVIDADE, CNAE, SUFRAMA, DATA COMPRA */}
                <div style={{ display: "grid", gridTemplateColumns: "1.5fr 120px 120px 140px", gap: "1rem", marginBottom: "1.25rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                      Ramo de Atividade
                    </label>
                    <input
                      type="text"
                      value={empresa.ramoAtividade || ""}
                      onChange={(e) => setEmpresa({ ...empresa, ramoAtividade: e.target.value })}
                      placeholder="Brinquedos / Confeitaria / Alimentos"
                      style={{ width: "100%", padding: "0.6rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                      CNAE
                    </label>
                    <input
                      type="text"
                      value={empresa.cnae || ""}
                      onChange={(e) => setEmpresa({ ...empresa, cnae: e.target.value })}
                      placeholder="4763601"
                      style={{ width: "100%", padding: "0.6rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                      SUFRAMA
                    </label>
                    <input
                      type="text"
                      value={empresa.suframa || ""}
                      onChange={(e) => setEmpresa({ ...empresa, suframa: e.target.value })}
                      placeholder="Suframa..."
                      style={{ width: "100%", padding: "0.6rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                      Compra do Sistema
                    </label>
                    <input
                      type="date"
                      value={empresa.dataCompraSistema || ""}
                      onChange={(e) => setEmpresa({ ...empresa, dataCompraSistema: e.target.value })}
                      style={{ width: "100%", padding: "0.6rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
                    />
                  </div>
                </div>

                {/* LINHA 9: ENQUADRAMENTO TRIBUTÁRIO (SIMPLES NACIONAL & REGIME) */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "1.25rem", padding: "1rem", background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                  <div>
                    <span style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#334155", marginBottom: "0.5rem" }}>
                      Optante Simples Nacional
                    </span>
                    <div style={{ display: "flex", gap: "1.5rem" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", fontSize: "0.9rem" }}>
                        <input
                          type="radio"
                          name="optanteSimples"
                          value="Sim"
                          checked={empresa.optanteSimples === "Sim"}
                          onChange={() => setEmpresa({ ...empresa, optanteSimples: "Sim" })}
                        />
                        Sim
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", fontSize: "0.9rem" }}>
                        <input
                          type="radio"
                          name="optanteSimples"
                          value="Não"
                          checked={empresa.optanteSimples === "Não"}
                          onChange={() => setEmpresa({ ...empresa, optanteSimples: "Não" })}
                        />
                        Não
                      </label>
                    </div>
                  </div>

                  <div>
                    <span style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#334155", marginBottom: "0.5rem" }}>
                      Código do Regime Tributário
                    </span>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", fontSize: "0.85rem" }}>
                        <input
                          type="radio"
                          name="regimeTributario"
                          value="Normal"
                          checked={empresa.regimeTributario === "Normal"}
                          onChange={() => setEmpresa({ ...empresa, regimeTributario: "Normal" })}
                        />
                        Normal (Simples Nacional ME / EPP)
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", fontSize: "0.85rem" }}>
                        <input
                          type="radio"
                          name="regimeTributario"
                          value="Excedido o sublimite do estado"
                          checked={empresa.regimeTributario === "Excedido o sublimite do estado"}
                          onChange={() => setEmpresa({ ...empresa, regimeTributario: "Excedido o sublimite do estado" })}
                        />
                        Excedido o sublimite de receita do estado
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", fontSize: "0.85rem" }}>
                        <input
                          type="radio"
                          name="regimeTributario"
                          value="Microempreendedor Individual - MEI"
                          checked={empresa.regimeTributario === "Microempreendedor Individual - MEI"}
                          onChange={() => setEmpresa({ ...empresa, regimeTributario: "Microempreendedor Individual - MEI" })}
                        />
                        Microempreendedor Individual - MEI
                      </label>
                    </div>
                  </div>
                </div>

                {/* BOTÕES DE AÇÃO: SALVAR / CANCELAR */}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem" }}>
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => {
                      fetchDadosEmpresa().then((d) => setEmpresa(d));
                      onAction("Alterações canceladas");
                    }}
                    disabled={salvandoEmpresa}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="button primary"
                    disabled={salvandoEmpresa}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
                      color: "#fff",
                      border: "none",
                      padding: "0.65rem 1.75rem",
                      fontWeight: 700,
                      boxShadow: "0 4px 10px rgba(22, 163, 74, 0.25)",
                    }}
                  >
                    {salvandoEmpresa ? "Salvando..." : <><Check size={18} /> Salvar Ficha Cadastral</>}
                  </button>
                </div>
              </div>
            </form>
          )}
        </section>
      )}

      {/* ABA 4: USUÁRIOS E EQUIPE */}
      {tab === "usuarios" && (
        <section className="panel settings-panel">
          <div className="panel-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div className="section-kicker" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <Users size={16} /> Gestão de Acessos
              </div>
              <h2>Usuários do Sistema</h2>
            </div>
          </div>

          <p className="settings-copy">
            Lista de usuários e colaboradores com credenciais ativas para operar o Gestão com Sabor nesta confeitaria.
          </p>

          {loadingUsuarios ? (
            <p className="today-empty">Carregando usuários...</p>
          ) : usuarios.length === 0 ? (
            <p className="today-empty">Nenhum colaborador cadastrado ainda.</p>
          ) : (
            <div style={{ overflowX: "auto", marginTop: "1rem" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e2e8f0", color: "#475569" }}>
                    <th style={{ padding: "0.75rem" }}>Cód</th>
                    <th style={{ padding: "0.75rem" }}>Nome do Usuário</th>
                    <th style={{ padding: "0.75rem" }}>E-mail / Login</th>
                    <th style={{ padding: "0.75rem" }}>Telefone</th>
                    <th style={{ padding: "0.75rem" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((u) => (
                    <tr key={u.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "0.75rem", fontWeight: 700, color: "#d97706" }}>#{u.codigo}</td>
                      <td style={{ padding: "0.75rem", fontWeight: 700, color: "#1e293b" }}>{u.nome}</td>
                      <td style={{ padding: "0.75rem", color: "#64748b" }}>{u.email || "-"}</td>
                      <td style={{ padding: "0.75rem", color: "#64748b" }}>{u.celular || u.telefone || "-"}</td>
                      <td style={{ padding: "0.75rem" }}>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            padding: "0.2rem 0.5rem",
                            borderRadius: 6,
                            background: u.status === "ativo" ? "#dcfce7" : "#fee2e2",
                            color: u.status === "ativo" ? "#16a34a" : "#dc2626",
                          }}
                        >
                          {u.status === "ativo" ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* ABA 5: PAGAMENTOS & PIX */}
      {tab === "pagamentos" && (
        <section className="panel settings-panel">
          <div className="panel-heading">
            <div>
              <div className="section-kicker" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <CreditCard size={16} /> Meios de Recebimento
              </div>
              <h2>Configurações de Pagamentos</h2>
            </div>
          </div>

          <p className="settings-copy">
            Defina a chave Pix principal do ateliê para envio automático aos clientes e taxas de maquininha de cartão.
          </p>

          <div
            style={{
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              padding: "1.5rem",
              marginTop: "1.25rem",
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "1.25rem", marginBottom: "1.5rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                  Chave Pix Principal do Ateliê
                </label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <select
                    value={tipoChavePix}
                    onChange={(e) => setTipoChavePix(e.target.value)}
                    style={{ width: 140, padding: "0.6rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
                  >
                    <option value="cnpj">CNPJ</option>
                    <option value="cpf">CPF</option>
                    <option value="email">E-mail</option>
                    <option value="telefone">Celular</option>
                    <option value="aleatoria">Aleatória</option>
                  </select>
                  <input
                    type="text"
                    value={chavePix}
                    onChange={(e) => setChavePix(e.target.value)}
                    placeholder="Informe a chave Pix..."
                    style={{ flex: 1, padding: "0.6rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                  Nome do Favorecido / Titular
                </label>
                <input
                  type="text"
                  value={beneficiarioPix}
                  onChange={(e) => setBeneficiarioPix(e.target.value)}
                  placeholder="Nome que aparece no comprovante Pix"
                  style={{ width: "100%", padding: "0.6rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", marginBottom: "1.5rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                  Taxa Média Cartão de Crédito (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={taxaCartaoCredito}
                  onChange={(e) => setTaxaCartaoCredito(Number(e.target.value))}
                  style={{ width: "100%", padding: "0.6rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                  Prazo de Recebimento Crédito (Dias)
                </label>
                <input
                  type="number"
                  value={diasCartaoCredito}
                  onChange={(e) => setDiasCartaoCredito(Number(e.target.value))}
                  style={{ width: "100%", padding: "0.6rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="button primary"
                onClick={() => onAction("Configurações de recebimento Pix salvas!")}
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                <Check size={18} /> Salvar Parâmetros de Pagamento
              </button>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
