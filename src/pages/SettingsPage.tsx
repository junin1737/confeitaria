/**
 * ============================================================================
 * PROJETO: Gestão com Sabor - Sistema de Gestão para Confeitarias
 * REPOSITÓRIO: https://github.com/junin1737/confeitaria
 * ARQUIVO: src/pages/SettingsPage.tsx
 * DESCRIÇÃO: Tela de Parâmetros e Configurações do Sistema reestruturada para
 *            máxima intuitividade e usabilidade.
 *            Abas claras com cards agrupados por contexto:
 *            1. 🏢 Dados da Empresa (Identificação, Endereço, Contato e Fiscal)
 *            2. 💰 Custos & Precificação (Taxa hora, Custos fixos/gás, Margens padrão)
 *            3. 💳 Formas de Pagamento (Chave Pix oficial e taxas de cartões)
 *            4. 💬 Mensagens Rápidas (Modelos de WhatsApp para pedidos e aniversários)
 *            5. 👥 Equipe & Acessos (Usuários do sistema)
 *            6. 🎨 Visual & Cores (Paleta e temas visuais)
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
  Palette,
  Calculator,
  MessageCircle,
  DollarSign,
  Sparkles,
  MapPin,
  Phone,
  FileSpreadsheet,
  Save,
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

export type SettingsTab =
  | "empresa"
  | "precificacao"
  | "pagamentos"
  | "mensagens"
  | "usuarios"
  | "visual";

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
  const [tab, setTab] = useState<SettingsTab>("empresa");

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

  // Estado: Parâmetros Globais de Custos & Precificação (salvos localmente para orientar novas receitas)
  const [custoHoraPadrao, setCustoHoraPadrao] = useState<number>(() => {
    const salvo = localStorage.getItem("gcs_param_custo_hora");
    return salvo ? Number(salvo) : 20.0;
  });
  const [percentualFixosPadrao, setPercentualFixosPadrao] = useState<number>(() => {
    const salvo = localStorage.getItem("gcs_param_percentual_fixos");
    return salvo ? Number(salvo) : 15.0;
  });
  const [margemLucroPadrao, setMargemLucroPadrao] = useState<number>(() => {
    const salvo = localStorage.getItem("gcs_param_margem_padrao");
    return salvo ? Number(salvo) : 100.0;
  });

  // Estado: Formas de Pagamento & Pix
  const [chavePix, setChavePix] = useState<string>(() => {
    return localStorage.getItem("gcs_param_chave_pix") || "";
  });
  const [tipoChavePix, setTipoChavePix] = useState<string>(() => {
    return localStorage.getItem("gcs_param_tipo_pix") || "cnpj";
  });
  const [beneficiarioPix, setBeneficiarioPix] = useState<string>(() => {
    return localStorage.getItem("gcs_param_beneficiario_pix") || "";
  });
  const [diasCartaoCredito, setDiasCartaoCredito] = useState<number>(() => {
    const salvo = localStorage.getItem("gcs_param_dias_cartao");
    return salvo ? Number(salvo) : 30;
  });
  const [taxaCartaoCredito, setTaxaCartaoCredito] = useState<number>(() => {
    const salvo = localStorage.getItem("gcs_param_taxa_cartao");
    return salvo ? Number(salvo) : 2.99;
  });

  // Estado: Mensagens
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [loadingMensagens, setLoadingMensagens] = useState(false);
  const [savingKey, setSavingKey] = useState("");

  // Estado: Usuários / Colaboradores
  const [usuarios, setUsuarios] = useState<Funcionario[]>([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);

  const activePreset = presetIdFor(colors);

  // Carregamento de dados sob demanda
  useEffect(() => {
    if (tab === "empresa" && !empresa.razaoSocial) {
      setLoadingEmpresa(true);
      fetchDadosEmpresa()
        .then((data) => {
          setEmpresa(data);
          if (data.cnpj) setCnpjInput(data.cnpj);
        })
        .catch((err) => onAction(err?.message || "Falha ao carregar dados da empresa"))
        .finally(() => setLoadingEmpresa(false));
    } else if (tab === "mensagens" && mensagens.length === 0) {
      setLoadingMensagens(true);
      fetchMensagens()
        .then((data) => setMensagens(data.mensagens))
        .catch((err) => onAction(err?.message || "Falha ao carregar mensagens"))
        .finally(() => setLoadingMensagens(false));
    } else if (tab === "usuarios" && usuarios.length === 0) {
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

  // Busca instantânea de CNPJ na Receita Federal
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
      onAction("Dados oficiais da empresa puxados com sucesso da Receita!");
    } catch (e: any) {
      onAction(e?.message || "Não foi possível puxar os dados do CNPJ.");
    } finally {
      setBuscandoCnpj(false);
    }
  }

  // Salvar ficha cadastral da empresa
  async function handleSalvarEmpresa(e: FormEvent) {
    e.preventDefault();
    try {
      setSalvandoEmpresa(true);
      const salva = await saveDadosEmpresa(empresa);
      setEmpresa(salva);
      onAction("Dados cadastrais da empresa salvos com sucesso!");
    } catch (e: any) {
      onAction(e?.message || "Erro ao salvar dados da empresa.");
    } finally {
      setSalvandoEmpresa(false);
    }
  }

  // Salvar parâmetros de custos e precificação
  function handleSalvarPrecificacao(e: FormEvent) {
    e.preventDefault();
    localStorage.setItem("gcs_param_custo_hora", String(custoHoraPadrao));
    localStorage.setItem("gcs_param_percentual_fixos", String(percentualFixosPadrao));
    localStorage.setItem("gcs_param_margem_padrao", String(margemLucroPadrao));
    onAction("Parâmetros de custos e precificação salvos com sucesso!");
  }

  // Salvar parâmetros de pagamentos
  function handleSalvarPagamentos(e: FormEvent) {
    e.preventDefault();
    localStorage.setItem("gcs_param_chave_pix", chavePix);
    localStorage.setItem("gcs_param_tipo_pix", tipoChavePix);
    localStorage.setItem("gcs_param_beneficiario_pix", beneficiarioPix);
    localStorage.setItem("gcs_param_dias_cartao", String(diasCartaoCredito));
    localStorage.setItem("gcs_param_taxa_cartao", String(taxaCartaoCredito));
    onAction("Parâmetros de recebimento e chave Pix salvos com sucesso!");
  }

  return (
    <>
      {/* CABEÇALHO DA TELA */}
      <section className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-dot" /> configurações
          </div>
          <h1>Parâmetros do Sistema</h1>
          <p>
            Configure as regras do seu negócio, custos de mão de obra, dados fiscais da empresa e formas de recebimento.
          </p>
        </div>
      </section>

      {/* NAVEGAÇÃO POR ABAS EM ESTILO PÍLULA MODERNO */}
      <nav className="param-tabs-nav" aria-label="Abas de Parâmetros">
        <button
          type="button"
          className={`param-tab-item ${tab === "empresa" ? "active" : ""}`}
          onClick={() => setTab("empresa")}
        >
          <Building2 size={16} />
          <span>Dados da Empresa</span>
        </button>

        <button
          type="button"
          className={`param-tab-item ${tab === "precificacao" ? "active" : ""}`}
          onClick={() => setTab("precificacao")}
        >
          <Calculator size={16} />
          <span>Custos & Precificação</span>
        </button>

        <button
          type="button"
          className={`param-tab-item ${tab === "pagamentos" ? "active" : ""}`}
          onClick={() => setTab("pagamentos")}
        >
          <CreditCard size={16} />
          <span>Meios de Pagamento</span>
        </button>

        <button
          type="button"
          className={`param-tab-item ${tab === "mensagens" ? "active" : ""}`}
          onClick={() => setTab("mensagens")}
        >
          <MessageCircle size={16} />
          <span>Mensagens Rápidas</span>
        </button>

        <button
          type="button"
          className={`param-tab-item ${tab === "usuarios" ? "active" : ""}`}
          onClick={() => setTab("usuarios")}
        >
          <Users size={16} />
          <span>Equipe & Acessos</span>
        </button>

        <button
          type="button"
          className={`param-tab-item ${tab === "visual" ? "active" : ""}`}
          onClick={() => setTab("visual")}
        >
          <Palette size={16} />
          <span>Identidade Visual</span>
        </button>
      </nav>

      {/* =========================================================================
          ABA 1: DADOS DA EMPRESA (FICHA CADASTRAL ORGANIZADA POR BLOCOS)
          ========================================================================= */}
      {tab === "empresa" && (
        <div>
          {/* BARRA SUPERIOR DE PUXAR CNPJ */}
          <div
            className="param-card"
            style={{
              background: "linear-gradient(135deg, #fff7ed 0%, #fff 100%)",
              borderColor: "#fed7aa",
              marginBottom: 16,
            }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span className="param-badge-soft" style={{ background: "#ffedd5", color: "#c2410c" }}>
                    <Globe size={13} /> Consulta Automática
                  </span>
                  <strong style={{ fontSize: 14, color: "#9a3412" }}>Preenchimento Inteligente por CNPJ</strong>
                </div>
                <p style={{ fontSize: 12, color: "#78350f", margin: 0 }}>
                  Informe o CNPJ da confeitaria para carregar Razão Social, endereço completo e dados da Receita Federal em 1 clique.
                </p>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center", width: "100%", maxWidth: 380 }}>
                <div style={{ position: "relative", flex: 1 }}>
                  <Search size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
                  <input
                    type="text"
                    placeholder="00.000.000/0000-00"
                    value={cnpjInput}
                    onChange={(e) => setCnpjInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleBuscarCnpj();
                      }
                    }}
                    style={{
                      width: "100%",
                      padding: "8px 10px 8px 32px",
                      background: "#ffffff",
                      border: "1px solid #fdba74",
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  />
                </div>
                <button
                  type="button"
                  className="button primary"
                  onClick={handleBuscarCnpj}
                  disabled={buscandoCnpj}
                  style={{
                    padding: "8px 16px",
                    fontSize: 13,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: "#ea580c",
                    borderColor: "#ea580c",
                  }}
                >
                  {buscandoCnpj ? (
                    "Consultando..."
                  ) : (
                    <>
                      <Search size={14} /> Puxar Dados
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {loadingEmpresa ? (
            <div className="param-card" style={{ textAlign: "center", padding: 40, color: "var(--c-muted)" }}>
              Carregando dados da empresa...
            </div>
          ) : (
            <form onSubmit={handleSalvarEmpresa}>
              {/* CARD 1: IDENTIFICAÇÃO BÁSICA */}
              <div className="param-card">
                <div className="param-card-header">
                  <div>
                    <h3>
                      <Building2 size={16} style={{ color: "var(--c-primary)" }} /> Identificação da Confeitaria
                    </h3>
                    <p>Informações principais que identificam sua empresa e aparecem em relatórios e orçamentos.</p>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
                  <div className="param-field">
                    <label>Razão Social / Nome Oficial *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: SEBASTIAO MACHADO SOBRINHO..."
                      value={empresa.razaoSocial || ""}
                      onChange={(e) => setEmpresa({ ...empresa, razaoSocial: e.target.value })}
                    />
                    <span className="param-hint">Nome empresarial registrado na Receita Federal</span>
                  </div>

                  <div className="param-field">
                    <label>Nome Fantasia / Nome do Ateliê</label>
                    <input
                      type="text"
                      placeholder="Ex: Gestão com Sabor / Ateliê Sonho Doce"
                      value={empresa.nomeFantasia || ""}
                      onChange={(e) => setEmpresa({ ...empresa, nomeFantasia: e.target.value })}
                    />
                    <span className="param-hint">Nome comercial pelo qual seus clientes conhecem sua marca</span>
                  </div>

                  <div className="param-field">
                    <label>Nome do Responsável / Titular</label>
                    <input
                      type="text"
                      placeholder="Ex: Sebastiao Machado"
                      value={empresa.responsavel || ""}
                      onChange={(e) => setEmpresa({ ...empresa, responsavel: e.target.value })}
                    />
                    <span className="param-hint">Confeiteira(o) ou administrador legal do negócio</span>
                  </div>

                  <div className="param-field">
                    <label>Ramo de Atividade</label>
                    <input
                      type="text"
                      placeholder="Ex: Fabricação de Alimentos / Confeitaria Artesanal"
                      value={empresa.ramoAtividade || ""}
                      onChange={(e) => setEmpresa({ ...empresa, ramoAtividade: e.target.value })}
                    />
                    <span className="param-hint">Segmento principal de atuação</span>
                  </div>
                </div>
              </div>

              {/* CARD 2: DOCUMENTOS E ENQUADRAMENTO FISCAL */}
              <div className="param-card">
                <div className="param-card-header">
                  <div>
                    <h3>
                      <FileSpreadsheet size={16} style={{ color: "#2563eb" }} /> Documentos & Dados Fiscais
                    </h3>
                    <p>Documentação exigida para emissão de notas fiscais, cupons e conformidade tributária.</p>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 20 }}>
                  <div className="param-field">
                    <label>CNPJ / CPF *</label>
                    <input
                      type="text"
                      placeholder="00.000.000/0000-00"
                      value={empresa.cnpj || ""}
                      onChange={(e) => setEmpresa({ ...empresa, cnpj: e.target.value })}
                      style={{ fontWeight: 700 }}
                    />
                  </div>

                  <div className="param-field">
                    <label>Inscrição Estadual (IE) / RG</label>
                    <input
                      type="text"
                      placeholder="Ex: 0039775430054 ou Isento"
                      value={empresa.inscricaoEstadual || ""}
                      onChange={(e) => setEmpresa({ ...empresa, inscricaoEstadual: e.target.value })}
                    />
                  </div>

                  <div className="param-field">
                    <label>Inscrição Municipal</label>
                    <input
                      type="text"
                      placeholder="Ex: 1234567"
                      value={empresa.inscricaoMunicipal || ""}
                      onChange={(e) => setEmpresa({ ...empresa, inscricaoMunicipal: e.target.value })}
                    />
                  </div>

                  <div className="param-field">
                    <label>CNAE Principal</label>
                    <input
                      type="text"
                      placeholder="Ex: 1091-1/02"
                      value={empresa.cnae || ""}
                      onChange={(e) => setEmpresa({ ...empresa, cnae: e.target.value })}
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                    gap: 16,
                    padding: 16,
                    background: "#f8fafc",
                    borderRadius: 10,
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: "#334155", display: "block", marginBottom: 8 }}>
                      Optante pelo Simples Nacional?
                    </label>
                    <div style={{ display: "flex", gap: 20 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13 }}>
                        <input
                          type="radio"
                          name="optanteSimples"
                          value="Sim"
                          checked={empresa.optanteSimples === "Sim"}
                          onChange={() => setEmpresa({ ...empresa, optanteSimples: "Sim" })}
                        />
                        Sim, Optante
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13 }}>
                        <input
                          type="radio"
                          name="optanteSimples"
                          value="Não"
                          checked={empresa.optanteSimples === "Não"}
                          onChange={() => setEmpresa({ ...empresa, optanteSimples: "Não" })}
                        />
                        Não Optante
                      </label>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: "#334155", display: "block", marginBottom: 8 }}>
                      Regime Tributário
                    </label>
                    <select
                      value={empresa.regimeTributario || "Normal"}
                      onChange={(e) => setEmpresa({ ...empresa, regimeTributario: e.target.value })}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13 }}
                    >
                      <option value="Normal">Simples Nacional (ME / EPP)</option>
                      <option value="Microempreendedor Individual - MEI">Microempreendedor Individual (MEI)</option>
                      <option value="Excedido o sublimite do estado">Excedido o sublimite do estado</option>
                      <option value="Lucro Presumido">Lucro Presumido</option>
                      <option value="Lucro Real">Lucro Real</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* CARD 3: ENDEREÇO COMPLETO */}
              <div className="param-card">
                <div className="param-card-header">
                  <div>
                    <h3>
                      <MapPin size={16} style={{ color: "#16a34a" }} /> Endereço & Localização
                    </h3>
                    <p>Endereço físico da cozinha/ateliê para entregas, retiradas e notas fiscais.</p>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "130px 120px 1fr 100px", gap: 14, marginBottom: 14 }}>
                  <div className="param-field">
                    <label>CEP</label>
                    <input
                      type="text"
                      placeholder="00000-000"
                      value={empresa.cep || ""}
                      onChange={(e) => setEmpresa({ ...empresa, cep: e.target.value })}
                    />
                  </div>

                  <div className="param-field">
                    <label>Tipo</label>
                    <select
                      value={empresa.tipoLogradouro || "Rua"}
                      onChange={(e) => setEmpresa({ ...empresa, tipoLogradouro: e.target.value })}
                    >
                      <option value="Rua">Rua</option>
                      <option value="Avenida">Avenida</option>
                      <option value="Alameda">Alameda</option>
                      <option value="Praça">Praça</option>
                      <option value="Rodovia">Rodovia</option>
                    </select>
                  </div>

                  <div className="param-field">
                    <label>Logradouro / Rua</label>
                    <input
                      type="text"
                      placeholder="Ex: Major Olímpio Franco"
                      value={empresa.logradouro || ""}
                      onChange={(e) => setEmpresa({ ...empresa, logradouro: e.target.value })}
                    />
                  </div>

                  <div className="param-field">
                    <label>Número</label>
                    <input
                      type="text"
                      placeholder="712"
                      value={empresa.numero || ""}
                      onChange={(e) => setEmpresa({ ...empresa, numero: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1.2fr 80px", gap: 14 }}>
                  <div className="param-field">
                    <label>Complemento</label>
                    <input
                      type="text"
                      placeholder="Sala, Apto, Bloco..."
                      value={empresa.complemento || ""}
                      onChange={(e) => setEmpresa({ ...empresa, complemento: e.target.value })}
                    />
                  </div>

                  <div className="param-field">
                    <label>Bairro</label>
                    <input
                      type="text"
                      placeholder="Centro"
                      value={empresa.bairro || ""}
                      onChange={(e) => setEmpresa({ ...empresa, bairro: e.target.value })}
                    />
                  </div>

                  <div className="param-field">
                    <label>Município / Cidade</label>
                    <input
                      type="text"
                      placeholder="Sua cidade"
                      value={empresa.municipio || ""}
                      onChange={(e) => setEmpresa({ ...empresa, municipio: e.target.value })}
                    />
                  </div>

                  <div className="param-field">
                    <label>UF</label>
                    <input
                      type="text"
                      placeholder="SP"
                      maxLength={2}
                      value={empresa.uf || ""}
                      onChange={(e) => setEmpresa({ ...empresa, uf: e.target.value.toUpperCase().slice(0, 2) })}
                      style={{ textAlign: "center", textTransform: "uppercase" }}
                    />
                  </div>
                </div>
              </div>

              {/* CARD 4: CANAIS DE CONTATO */}
              <div className="param-card">
                <div className="param-card-header">
                  <div>
                    <h3>
                      <Phone size={16} style={{ color: "#d97706" }} /> Contatos & Comunicação
                    </h3>
                    <p>Telefone, WhatsApp e canais digitais do ateliê.</p>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
                  <div className="param-field">
                    <label>WhatsApp / Celular Comercial</label>
                    <div style={{ display: "flex", gap: 6 }}>
                      <input
                        type="text"
                        placeholder="DDD"
                        maxLength={3}
                        style={{ width: 60, textAlign: "center" }}
                        value={empresa.dddCelular || ""}
                        onChange={(e) => setEmpresa({ ...empresa, dddCelular: e.target.value })}
                      />
                      <input
                        type="text"
                        placeholder="99999-9999"
                        value={empresa.celular || ""}
                        onChange={(e) => setEmpresa({ ...empresa, celular: e.target.value })}
                        style={{ flex: 1 }}
                      />
                    </div>
                  </div>

                  <div className="param-field">
                    <label>Telefone Fixo</label>
                    <div style={{ display: "flex", gap: 6 }}>
                      <input
                        type="text"
                        placeholder="DDD"
                        maxLength={3}
                        style={{ width: 60, textAlign: "center" }}
                        value={empresa.dddTelefone || ""}
                        onChange={(e) => setEmpresa({ ...empresa, dddTelefone: e.target.value })}
                      />
                      <input
                        type="text"
                        placeholder="3333-3333"
                        value={empresa.telefone || ""}
                        onChange={(e) => setEmpresa({ ...empresa, telefone: e.target.value })}
                        style={{ flex: 1 }}
                      />
                    </div>
                  </div>

                  <div className="param-field">
                    <label>E-mail da Empresa</label>
                    <input
                      type="email"
                      placeholder="contato@atelie.com.br"
                      value={empresa.email || ""}
                      onChange={(e) => setEmpresa({ ...empresa, email: e.target.value })}
                    />
                  </div>

                  <div className="param-field">
                    <label>Instagram / Site</label>
                    <input
                      type="text"
                      placeholder="@seuatelie ou site.com.br"
                      value={empresa.site || ""}
                      onChange={(e) => setEmpresa({ ...empresa, site: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* BARRA DE AÇÃO FLUTUANTE / SALVAR */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 20 }}>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => {
                    fetchDadosEmpresa().then((d) => setEmpresa(d));
                    onAction("Alterações canceladas.");
                  }}
                  disabled={salvandoEmpresa}
                >
                  Descartar Alterações
                </button>

                <button
                  type="submit"
                  className="button primary"
                  disabled={salvandoEmpresa}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 24px",
                    fontWeight: 700,
                  }}
                >
                  <Save size={16} />
                  {salvandoEmpresa ? "Salvando..." : "Salvar Dados da Empresa"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* =========================================================================
          ABA 2: CUSTOS & PRECIFICAÇÃO (REGRAS DE FORMAÇÃO DE PREÇO)
          ========================================================================= */}
      {tab === "precificacao" && (
        <form onSubmit={handleSalvarPrecificacao}>
          <div className="param-card">
            <div className="param-card-header">
              <div>
                <h3>
                  <Calculator size={16} style={{ color: "var(--c-primary)" }} /> Parâmetros de Mão de Obra e Custos Fixos
                </h3>
                <p>
                  Defina os valores padrão que serão sugeridos ao cadastrar qualquer nova receita ou produto.
                </p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20, marginBottom: 20 }}>
              <div className="param-field">
                <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <DollarSign size={14} style={{ color: "#16a34a" }} />
                  Valor da Sua Hora de Trabalho (R$/hora)
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#64748b" }}>R$</span>
                  <input
                    type="number"
                    step="0.50"
                    min="0"
                    required
                    value={custoHoraPadrao}
                    onChange={(e) => setCustoHoraPadrao(Number(e.target.value))}
                    style={{ fontWeight: 700, fontSize: 14 }}
                  />
                </div>
                <span className="param-hint">
                  Ex: R$ 20,00/hora. Se uma receita levar 30 minutos de forno/preparo, seu custo de mão de obra será R$ 10,00.
                </span>
              </div>

              <div className="param-field">
                <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Sparkles size={14} style={{ color: "#d97706" }} />
                  Custos Invisíveis & Gás (%)
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={percentualFixosPadrao}
                    onChange={(e) => setPercentualFixosPadrao(Number(e.target.value))}
                    style={{ fontWeight: 700, fontSize: 14 }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#64748b" }}>%</span>
                </div>
                <span className="param-hint">
                  Percentual aplicado sobre os custos para cobrir gás de cozinha, energia, água e produtos de limpeza (padrão sugerido: 15%).
                </span>
              </div>

              <div className="param-field">
                <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Check size={14} style={{ color: "#2563eb" }} />
                  Margem de Lucro Desejada Padrão (%)
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="number"
                    min="0"
                    required
                    value={margemLucroPadrao}
                    onChange={(e) => setMargemLucroPadrao(Number(e.target.value))}
                    style={{ fontWeight: 700, fontSize: 14 }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#64748b" }}>%</span>
                </div>
                <span className="param-hint">
                  Margem padrão aplicada sobre o custo total para sugerir o preço de venda no cardápio (Ex: 100% dobra o valor do custo).
                </span>
              </div>
            </div>

            {/* SIMULAÇÃO VISUAL EM TEMPO REAL */}
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                padding: 16,
                marginTop: 10,
              }}
            >
              <h4 style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", margin: "0 0 8px" }}>
                Exemplo Prático de Como Funciona no Sistema:
              </h4>
              <p style={{ fontSize: 12, color: "#475569", margin: "0 0 12px" }}>
                Para uma receita com <strong>R$ 20,00</strong> de ingredientes que demora <strong>60 minutos</strong> de preparo:
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                <div style={{ padding: 10, background: "#fff", borderRadius: 8, border: "1px solid #cbd5e1" }}>
                  <span style={{ fontSize: 11, color: "#64748b", display: "block" }}>1. Insumos Diretos</span>
                  <strong style={{ fontSize: 14, color: "#0f172a" }}>R$ 20,00</strong>
                </div>

                <div style={{ padding: 10, background: "#fff", borderRadius: 8, border: "1px solid #cbd5e1" }}>
                  <span style={{ fontSize: 11, color: "#64748b", display: "block" }}>2. Mão de Obra (60 min)</span>
                  <strong style={{ fontSize: 14, color: "#0f172a" }}>R$ {custoHoraPadrao.toFixed(2)}</strong>
                </div>

                <div style={{ padding: 10, background: "#fff", borderRadius: 8, border: "1px solid #cbd5e1" }}>
                  <span style={{ fontSize: 11, color: "#64748b", display: "block" }}>3. Custos Fixos ({percentualFixosPadrao}%)</span>
                  <strong style={{ fontSize: 14, color: "#0f172a" }}>
                    R$ {(((20 + custoHoraPadrao) * percentualFixosPadrao) / 100).toFixed(2)}
                  </strong>
                </div>

                <div style={{ padding: 10, background: "#fef2f2", borderRadius: 8, border: "1px solid #fecaca" }}>
                  <span style={{ fontSize: 11, color: "#991b1b", display: "block", fontWeight: 700 }}>Preço de Venda Sugerido</span>
                  <strong style={{ fontSize: 15, color: "#b91c1c" }}>
                    R$ {((20 + custoHoraPadrao + ((20 + custoHoraPadrao) * percentualFixosPadrao) / 100) * (1 + margemLucroPadrao / 100)).toFixed(2)}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
            <button
              type="submit"
              className="button primary"
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 24px", fontWeight: 700 }}
            >
              <Save size={16} /> Salvar Parâmetros de Custos
            </button>
          </div>
        </form>
      )}

      {/* =========================================================================
          ABA 3: MEIOS DE PAGAMENTO (PIX & CARTÕES)
          ========================================================================= */}
      {tab === "pagamentos" && (
        <form onSubmit={handleSalvarPagamentos}>
          {/* CARD PIX */}
          <div className="param-card">
            <div className="param-card-header">
              <div>
                <h3>
                  <CreditCard size={16} style={{ color: "#059669" }} /> Chave Pix Principal do Ateliê
                </h3>
                <p>
                  Esta chave é informada aos clientes e pode ser anexada automaticamente nas mensagens de orçamento e confirmação de pedidos.
                </p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
              <div className="param-field">
                <label>Tipo e Valor da Chave Pix *</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <select
                    value={tipoChavePix}
                    onChange={(e) => setTipoChavePix(e.target.value)}
                    style={{ width: 130 }}
                  >
                    <option value="cnpj">CNPJ</option>
                    <option value="cpf">CPF</option>
                    <option value="email">E-mail</option>
                    <option value="telefone">Celular</option>
                    <option value="aleatoria">Aleatória</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Informe a chave Pix..."
                    value={chavePix}
                    onChange={(e) => setChavePix(e.target.value)}
                    style={{ flex: 1, fontWeight: 600 }}
                  />
                </div>
                <span className="param-hint">Chave onde seus clientes farão os pagamentos</span>
              </div>

              <div className="param-field">
                <label>Nome do Titular / Favorecido</label>
                <input
                  type="text"
                  placeholder="Nome que aparece ao transferir o Pix"
                  value={beneficiarioPix}
                  onChange={(e) => setBeneficiarioPix(e.target.value)}
                />
                <span className="param-hint">Confirmação de segurança para o cliente na hora da transferência</span>
              </div>
            </div>
          </div>

          {/* CARD CARTÕES */}
          <div className="param-card">
            <div className="param-card-header">
              <div>
                <h3>
                  <DollarSign size={16} style={{ color: "#2563eb" }} /> Maquininha & Taxas de Cartão
                </h3>
                <p>
                  Parâmetros para cálculo automático de dedução de taxas e fluxo de caixa de recebíveis.
                </p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
              <div className="param-field">
                <label>Taxa Média Cartão de Crédito (%)</label>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={taxaCartaoCredito}
                    onChange={(e) => setTaxaCartaoCredito(Number(e.target.value))}
                  />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#64748b" }}>%</span>
                </div>
                <span className="param-hint">Taxa cobrada pela operadora (ex: 2.99%)</span>
              </div>

              <div className="param-field">
                <label>Prazo Médio de Liberação (Dias)</label>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="number"
                    min="0"
                    value={diasCartaoCredito}
                    onChange={(e) => setDiasCartaoCredito(Number(e.target.value))}
                  />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#64748b" }}>dias</span>
                </div>
                <span className="param-hint">Geralmente 1 dia (se antecipado) ou 30 dias</span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
            <button
              type="submit"
              className="button primary"
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 24px", fontWeight: 700 }}
            >
              <Save size={16} /> Salvar Formas de Pagamento
            </button>
          </div>
        </form>
      )}

      {/* =========================================================================
          ABA 4: MENSAGENS RÁPIDAS (WHATSAPP COM TAGS DINÂMICAS)
          ========================================================================= */}
      {tab === "mensagens" && (
        <div className="param-card">
          <div className="param-card-header">
            <div>
              <h3>
                <MessageCircle size={16} style={{ color: "#16a34a" }} /> Mensagens Prontas de WhatsApp
              </h3>
              <p>
                Textos utilizados nos atalhos rápidos do dia a dia (aniversários, orçamentos, confirmações).
                Use as tags <code>{"{nome}"}</code> e <code>{"{empresa}"}</code> para preenchimento dinâmico.
              </p>
            </div>
          </div>

          {loadingMensagens && mensagens.length === 0 ? (
            <p className="today-empty">Carregando mensagens...</p>
          ) : mensagens.length === 0 ? (
            <p className="today-empty">Nenhum modelo de mensagem configurado.</p>
          ) : (
            <div style={{ display: "grid", gap: 16 }}>
              {mensagens.map((mensagem) => (
                <form
                  key={mensagem.chave}
                  style={{
                    background: "#faf8f6",
                    border: "1px solid var(--c-border)",
                    borderRadius: 12,
                    padding: 16,
                  }}
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
                        onAction("Modelo de mensagem salvo com sucesso!");
                      })
                      .catch((error) => onAction(error instanceof Error ? error.message : "Falha ao salvar"))
                      .finally(() => setSavingKey(""));
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="param-badge-soft">Gatilho Automático</span>
                      <strong style={{ fontSize: 13, color: "var(--c-text)" }}>{mensagem.chave}</strong>
                    </div>
                    <button
                      className="button primary"
                      type="submit"
                      disabled={savingKey === mensagem.chave}
                      style={{ padding: "6px 14px", fontSize: 12 }}
                    >
                      {savingKey === mensagem.chave ? "Salvando..." : "Salvar Texto"}
                    </button>
                  </div>

                  <div style={{ display: "grid", gap: 10 }}>
                    <div className="param-field">
                      <label>Título / Finalidade</label>
                      <input name="titulo" defaultValue={mensagem.titulo} />
                    </div>

                    <div className="param-field">
                      <label>Texto da Mensagem</label>
                      <textarea name="texto" rows={4} defaultValue={mensagem.texto} />
                    </div>
                  </div>
                </form>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          ABA 5: EQUIPE & ACESSOS
          ========================================================================= */}
      {tab === "usuarios" && (
        <div className="param-card">
          <div className="param-card-header">
            <div>
              <h3>
                <Users size={16} style={{ color: "#7c3aed" }} /> Usuários com Acesso ao Sistema
              </h3>
              <p>Colaboradores que possuem credenciais ativas para operar esta confeitaria.</p>
            </div>
          </div>

          {loadingUsuarios ? (
            <p className="today-empty">Carregando usuários...</p>
          ) : usuarios.length === 0 ? (
            <div style={{ textAlign: "center", padding: 30, color: "var(--c-muted)" }}>
              <Users size={32} style={{ margin: "0 auto 8px", opacity: 0.5 }} />
              <p>Nenhum colaborador adicional cadastrado.</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e2e8f0", color: "#64748b" }}>
                    <th style={{ padding: "10px 12px" }}>Código</th>
                    <th style={{ padding: "10px 12px" }}>Nome do Usuário</th>
                    <th style={{ padding: "10px 12px" }}>Login / E-mail</th>
                    <th style={{ padding: "10px 12px" }}>Telefone</th>
                    <th style={{ padding: "10px 12px" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((u) => (
                    <tr key={u.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "10px 12px", fontWeight: 700, color: "#d97706" }}>#{u.codigo}</td>
                      <td style={{ padding: "10px 12px", fontWeight: 700, color: "#1e293b" }}>{u.nome}</td>
                      <td style={{ padding: "10px 12px", color: "#64748b" }}>{u.email || "-"}</td>
                      <td style={{ padding: "10px 12px", color: "#64748b" }}>{u.celular || u.telefone || "-"}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: "3px 8px",
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
        </div>
      )}

      {/* =========================================================================
          ABA 6: IDENTIDADE VISUAL & CORES
          ========================================================================= */}
      {tab === "visual" && (
        <div className="param-card">
          <div className="param-card-header">
            <div>
              <h3>
                <Palette size={16} style={{ color: "var(--c-primary)" }} /> Cores e Tema do Sistema
              </h3>
              <p>
                Escolha uma combinação de cores que combina com a identidade visual da sua marca. As alterações valem para todo o sistema.
              </p>
            </div>
            <button
              className="button subtle"
              onClick={() => {
                onColorsChange(DEFAULT_THEME);
                onAction("Tema original padrão restaurado.");
              }}
            >
              <RotateCcw size={14} /> Restaurar Padrão
            </button>
          </div>

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
                    onAction(`Tema "${preset.name}" aplicado!`);
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

          <div style={{ marginTop: 24, paddingTop: 18, borderTop: "1px solid #f1ece7" }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: "var(--c-text)", marginBottom: 12 }}>
              Ajuste Fino de Cada Cor:
            </h4>
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
          </div>
        </div>
      )}
    </>
  );
}
