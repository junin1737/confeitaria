/**
 * ============================================================================
 * PROJETO: Doce Gestor - Sistema de Gestão para Confeitarias
 * REPOSITÓRIO: https://github.com/junin1737/confeitaria
 * ARQUIVO: src/pages/EmployeesPage.tsx
 * DESCRIÇÃO: Gestão completa de colaboradores, busca de CEP, comissões e evolução.
 * ============================================================================
 * 
 * [FUNCIONALIDADES IMPLEMENTADAS NA TELA]
 * 1. Formulário em abas (Dados do Funcionário, Resumo de Vendas e Evolução Temporal).
 * 2. Consulta automática de CEP via ViaCEP com detecção de CEP genérico.
 * 3. Seleção dinâmica de UF e Cidades com integridade territorial.
 * 4. Botão de 1 clique para conversar no WhatsApp com o colaborador.
 * ============================================================================
 */

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Download,
  Eye,
  EyeOff,
  FileText,
  Plus,
  Search,
  ShieldCheck,
} from "lucide-react";
import {
  fetchCidades,
  fetchEstados,
  fetchFuncionarios,
  iniciais,
  lookupCep,
  saveFuncionario,
  type Cidade,
  type Estado,
  type Funcionario,
} from "../api";
import type { EmployeeTab } from "../data";
import { WhatsAppIcon, whatsappUrl } from "../whatsapp";
import { EmployeeEvolution, EmployeeSummary } from "./AppPages";

const AVATARS = ["coral", "sage", "lavender"] as const;

type FormState = {
  codigo: string;
  nome: string;
  cpf: string;
  dataNascimento: string;
  email: string;
  telefone: string;
  celular: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  ufId: number | null;
  cidadeId: number | null;
  dataCadastro: string;
  dataAdmissao: string;
  dataDemissao: string;
  salarioFixo: string;
  status: "ativo" | "inativo";
  senha: string;
  senhaConfirmacao: string;
  temSenha: boolean;
};

function todayISO() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function emptyForm(codigo = ""): FormState {
  return {
    codigo,
    nome: "",
    cpf: "",
    dataNascimento: "",
    email: "",
    telefone: "",
    celular: "",
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    ufId: null,
    cidadeId: null,
    dataCadastro: todayISO(),
    dataAdmissao: "",
    dataDemissao: "",
    salarioFixo: "0",
    status: "ativo",
    senha: "",
    senhaConfirmacao: "",
    temSenha: false,
  };
}

function fromFuncionario(item: Funcionario): FormState {
  return {
    codigo: item.codigo,
    nome: item.nome,
    cpf: formatCpf(item.cpf),
    dataNascimento: item.dataNascimento,
    email: item.email,
    telefone: formatPhone(item.telefone),
    celular: formatPhone(item.celular),
    cep: formatCep(item.cep),
    logradouro: item.logradouro,
    numero: item.numero,
    complemento: item.complemento,
    bairro: item.bairro,
    ufId: item.ufId,
    cidadeId: item.cidadeId,
    dataCadastro: item.dataCadastro,
    dataAdmissao: item.dataAdmissao,
    dataDemissao: item.dataDemissao,
    salarioFixo: String(item.salarioFixo),
    status: item.status,
    senha: "",
    senhaConfirmacao: "",
    temSenha: item.temSenha,
  };
}

function digits(value: string) {
  return value.replace(/\D/g, "");
}

function formatCpf(value: string) {
  const raw = digits(value).slice(0, 11);
  return raw
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function formatCep(value: string) {
  const raw = digits(value).slice(0, 8);
  return raw.replace(/(\d{5})(\d{1,3})/, "$1-$2");
}

function formatPhone(value: string) {
  const raw = digits(value).slice(0, 11);
  if (raw.length <= 10) {
    return raw.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d{1,4})$/, "$1-$2");
  }
  return raw.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d{1,4})$/, "$1-$2");
}

function formatDate(value: string) {
  if (!value) return "";
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR");
}

export function EmployeesPage({ onAction }: { onAction: (message: string) => void }) {
  const [tab, setTab] = useState<EmployeeTab>("dados");
  const [period, setPeriod] = useState("Últimos 6 meses");
  const [list, setList] = useState<Funcionario[]>([]);
  const [proximoCodigo, setProximoCodigo] = useState("FUNC-001");
  const [selectedId, setSelectedId] = useState<number | "new" | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [estados, setEstados] = useState<Estado[]>([]);
  const [cidades, setCidades] = useState<Cidade[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"todos" | "ativo" | "inativo">("todos");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [cepMessage, setCepMessage] = useState("");
  const [cepError, setCepError] = useState("");
  const [formError, setFormError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const selected = selectedId === "new" ? null : list.find((item) => item.id === selectedId) ?? null;
  const editing = selectedId === "new" || selectedId != null;

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return list.filter((item) => {
      if (filter !== "todos" && item.status !== filter) return false;
      if (!term) return true;
      return [item.nome, item.codigo, item.cpf, item.email, item.celular].some((value) =>
        value.toLowerCase().includes(term),
      );
    });
  }, [list, query, filter]);

  async function loadList(selectId?: number | "new") {
    const data = await fetchFuncionarios();
    setList(data.funcionarios);
    setProximoCodigo(data.proximoCodigo);
    if (selectId === "new") {
      setSelectedId("new");
      setForm(emptyForm(data.proximoCodigo));
    } else if (selectId) {
      const current = data.funcionarios.find((item) => item.id === selectId);
      if (current) {
        setSelectedId(current.id);
        setForm(fromFuncionario(current));
      }
    }
    return data.funcionarios;
  }

  useEffect(() => {
    let active = true;
    Promise.all([fetchFuncionarios(), fetchEstados()])
      .then(([data, estadosData]) => {
        if (!active) return;
        setList(data.funcionarios);
        setProximoCodigo(data.proximoCodigo);
        setEstados(estadosData.estados);
        if (data.funcionarios[0]) {
          setSelectedId(data.funcionarios[0].id);
          setForm(fromFuncionario(data.funcionarios[0]));
        }
      })
      .catch((error) => {
        if (active) setFormError(error instanceof Error ? error.message : "Falha ao carregar funcionários.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!form.ufId) {
      setCidades([]);
      return;
    }
    let active = true;
    fetchCidades(form.ufId)
      .then((items) => {
        if (active) setCidades(items);
      })
      .catch((error) => {
        if (active) setFormError(error instanceof Error ? error.message : "Não foi possível carregar as cidades.");
      });
    return () => {
      active = false;
    };
  }, [form.ufId]);

  function patch(partial: Partial<FormState>) {
    setForm((current) => ({ ...current, ...partial }));
  }

  function startNew() {
    setTab("dados");
    setSelectedId("new");
    setForm(emptyForm(proximoCodigo));
    setFormError("");
    setCepError("");
    setCepMessage("");
  }

  function selectEmployee(item: Funcionario) {
    setSelectedId(item.id);
    setForm(fromFuncionario(item));
    setTab("dados");
    setFormError("");
    setCepError("");
    setCepMessage("");
    setShowPassword(false);
  }

  async function handleCep() {
    const cep = digits(form.cep);
    if (cep.length !== 8) {
      setCepError("Informe um CEP com 8 dígitos.");
      setCepMessage("");
      return;
    }
    setCepLoading(true);
    setCepError("");
    setCepMessage("");
    try {
      const result = await lookupCep(cep);
      patch({
        cep: formatCep(result.cep),
        logradouro: result.generico ? "" : result.logradouro,
        bairro: result.generico ? "" : result.bairro,
        ufId: result.ufId,
        cidadeId: result.cidadeId,
      });
      if (result.generico) {
        setCepMessage(result.mensagem ?? "CEP genérico: preenchemos somente a cidade e a UF.");
      } else {
        setCepMessage("Endereço encontrado.");
      }
    } catch (error) {
      setCepError(error instanceof Error ? error.message : "CEP inválido.");
    } finally {
      setCepLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError("");
    if (form.senha !== form.senhaConfirmacao) {
      setFormError("A senha e a confirmação não conferem.");
      return;
    }
    setSaving(true);
    try {
      const saved = await saveFuncionario({
        id: selectedId === "new" || selectedId == null ? undefined : selectedId,
        codigo: form.codigo,
        nome: form.nome,
        cpf: form.cpf,
        dataNascimento: form.dataNascimento,
        email: form.email,
        telefone: form.telefone,
        celular: form.celular,
        cep: form.cep,
        logradouro: form.logradouro,
        numero: form.numero,
        complemento: form.complemento,
        bairro: form.bairro,
        ufId: form.ufId,
        cidadeId: form.cidadeId,
        dataCadastro: form.dataCadastro,
        dataAdmissao: form.dataAdmissao,
        dataDemissao: form.dataDemissao,
        salarioFixo: Number(form.salarioFixo.replace(",", ".")) || 0,
        status: form.status,
        senha: form.senha,
        senhaConfirmacao: form.senhaConfirmacao,
      });
      await loadList(saved.id);
      setForm(fromFuncionario(saved));
      onAction(selectedId === "new" ? "Funcionário cadastrado." : "Cadastro atualizado.");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  function exportList() {
    const header = ["codigo", "nome", "cpf", "status", "email", "celular", "cidade", "uf", "salario_fixo"];
    const lines = [
      header.join(";"),
      ...list.map((item) =>
        [item.codigo, item.nome, item.cpf, item.status, item.email, item.celular, item.cidadeNome, item.ufSigla, item.salarioFixo]
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(";"),
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "funcionarios.csv";
    link.click();
    URL.revokeObjectURL(url);
    onAction("Lista de funcionários exportada.");
  }

  const celularOk = digits(form.celular).length >= 10;
  const avatarTone = selected ? AVATARS[selected.id % AVATARS.length] : "coral";

  return (
    <>
      <section className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-dot" /> gestão de pessoas
          </div>
          <h1>
            Funcionários <span className="heading-count">{list.length}</span>
          </h1>
          <p>Cadastre a equipe e preserve o histórico mesmo quando alguém for desativado.</p>
        </div>
        <div className="heading-actions">
          <button className="button secondary" onClick={exportList}>
            <Download size={16} /> Exportar
          </button>
          <button className="button primary" onClick={startNew}>
            <Plus size={17} /> Novo funcionário
          </button>
        </div>
      </section>

      <section className="employee-layout">
        <div className="panel employee-list-panel">
          <div className="panel-heading">
            <div>
              <div className="section-kicker">Equipe do ateliê</div>
              <h2>Todos os funcionários</h2>
            </div>
            <div className="employee-filter">
              {(["todos", "ativo", "inativo"] as const).map((item) => (
                <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>
                  {item === "todos" ? "Todos" : item === "ativo" ? "Ativos" : "Inativos"}
                </button>
              ))}
            </div>
          </div>
          <div className="search-box">
            <Search size={16} />
            <input
              placeholder="Buscar por nome, código ou CPF"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="employee-list">
            {loading ? <div className="employee-empty">Carregando equipe...</div> : null}
            {!loading && filtered.length === 0 ? (
              <div className="employee-empty">Nenhum funcionário encontrado.</div>
            ) : null}
            {filtered.map((item) => (
              <button
                key={item.id}
                className={`employee-row ${selectedId === item.id ? "selected" : ""}`}
                onClick={() => selectEmployee(item)}
              >
                <div className={`employee-avatar ${AVATARS[item.id % AVATARS.length]}`}>{iniciais(item.nome)}</div>
                <div className="employee-row-copy">
                  <strong>{item.nome}</strong>
                  <span>{item.codigo}</span>
                </div>
                <span className={`employee-status ${item.status === "inativo" ? "inactive" : ""}`}>
                  <i />
                  {item.status === "ativo" ? "Ativo" : "Inativo"}
                </span>
              </button>
            ))}
            <button className="add-list-button" onClick={startNew}>
              <Plus size={16} /> Adicionar funcionário
            </button>
          </div>
        </div>

        <div className="employee-detail">
          {!editing ? (
            <div className="employee-empty-detail">
              <h2>Selecione um funcionário</h2>
              <p>Ou cadastre o primeiro colaborador para começar a gestão da equipe.</p>
              <button className="button primary" onClick={startNew}>
                <Plus size={16} /> Novo funcionário
              </button>
            </div>
          ) : (
            <>
              <div className="employee-detail-head">
                <div className="detail-title">
                  <div className={`employee-avatar ${avatarTone} large`}>
                    {form.nome ? iniciais(form.nome) : "NF"}
                  </div>
                  <div>
                    <div className="eyebrow">
                      <span className={`live-pill ${form.status === "inativo" ? "inactive" : ""}`}>
                        {form.status === "ativo" ? "ATIVO" : "INATIVO"}
                      </span>
                      {form.dataCadastro ? ` desde ${formatDate(form.dataCadastro)}` : " novo cadastro"}
                    </div>
                    <h2>{form.nome || "Novo funcionário"}</h2>
                    <p>código {form.codigo}</p>
                  </div>
                </div>
              </div>
              <div className="detail-actions">
                <button className="button subtle" type="button" onClick={() => onAction("A folha entra na próxima etapa")}>
                  <FileText size={15} /> Gerar folha
                </button>
                {tab === "dados" ? (
                  <button className="button primary" type="submit" form="employee-form" disabled={saving}>
                    {saving ? "Salvando..." : "Salvar cadastro"}
                  </button>
                ) : null}
              </div>
              <div className="tabs">
                <button className={tab === "dados" ? "active" : ""} onClick={() => setTab("dados")}>
                  Dados do Funcionário
                </button>
                <button className={tab === "resumo" ? "active" : ""} onClick={() => setTab("resumo")}>
                  Resumo
                </button>
                <button className={tab === "evolucao" ? "active" : ""} onClick={() => setTab("evolucao")}>
                  Evolução
                </button>
              </div>

              {tab === "dados" ? (
                <form id="employee-form" className="employee-form" onSubmit={handleSubmit}>
                  {formError ? <div className="login-error">{formError}</div> : null}

                  <fieldset>
                    <div className="section-kicker">Dados pessoais</div>
                    <div className="form-grid">
                      <label>
                        <span>Código interno</span>
                        <input value={form.codigo} readOnly />
                      </label>
                      <label className="span-2">
                        <span>Nome completo</span>
                        <input value={form.nome} onChange={(event) => patch({ nome: event.target.value })} required />
                      </label>
                      <label>
                        <span>CPF</span>
                        <input
                          value={form.cpf}
                          onChange={(event) => patch({ cpf: formatCpf(event.target.value) })}
                          inputMode="numeric"
                          placeholder="000.000.000-00"
                        />
                      </label>
                      <label>
                        <span>Data de nascimento</span>
                        <input
                          type="date"
                          value={form.dataNascimento}
                          onChange={(event) => patch({ dataNascimento: event.target.value })}
                        />
                      </label>
                      <label className="span-2">
                        <span>E-mail</span>
                        <input
                          type="email"
                          value={form.email}
                          onChange={(event) => patch({ email: event.target.value })}
                        />
                      </label>
                      <label>
                        <span>Telefone</span>
                        <input
                          value={form.telefone}
                          onChange={(event) => patch({ telefone: formatPhone(event.target.value) })}
                          placeholder="(00) 0000-0000"
                        />
                      </label>
                      <label>
                        <span>Celular</span>
                        <div className="input-with-action whatsapp-field">
                          <a
                            className={`whatsapp-prefix ${celularOk ? "" : "is-disabled"}`}
                            href={celularOk ? whatsappUrl(form.celular) : undefined}
                            target="_blank"
                            rel="noreferrer"
                            aria-label="Abrir WhatsApp"
                            title={celularOk ? "Conversar no WhatsApp" : "Informe um celular valido"}
                            onClick={(event) => {
                              if (!celularOk) event.preventDefault();
                            }}
                          >
                            <WhatsAppIcon size={16} />
                          </a>
                          <input
                            value={form.celular}
                            onChange={(event) => patch({ celular: formatPhone(event.target.value) })}
                            placeholder="(00) 00000-0000"
                          />
                        </div>
                      </label>
                    </div>
                  </fieldset>

                  <fieldset>
                    <div className="section-kicker">Endereço</div>
                    <div className="form-grid">
                      <label className="cep-field">
                        <span>CEP</span>
                        <div className="input-with-action">
                          <input
                            value={form.cep}
                            onChange={(event) => patch({ cep: formatCep(event.target.value) })}
                            onBlur={() => {
                              if (digits(form.cep).length === 8) void handleCep();
                            }}
                            placeholder="00000-000"
                          />
                          <button type="button" className="icon-action" onClick={() => void handleCep()} disabled={cepLoading}>
                            {cepLoading ? "..." : <Search size={14} />}
                          </button>
                        </div>
                        {cepError ? <small className="field-error">{cepError}</small> : null}
                        {cepMessage ? <small className="field-ok">{cepMessage}</small> : null}
                      </label>
                      <label className="span-2">
                        <span>Rua / avenida</span>
                        <input
                          value={form.logradouro}
                          onChange={(event) => patch({ logradouro: event.target.value })}
                        />
                      </label>
                      <label>
                        <span>Número</span>
                        <input value={form.numero} onChange={(event) => patch({ numero: event.target.value })} />
                      </label>
                      <label>
                        <span>Complemento</span>
                        <input
                          value={form.complemento}
                          onChange={(event) => patch({ complemento: event.target.value })}
                        />
                      </label>
                      <label>
                        <span>Bairro</span>
                        <input value={form.bairro} onChange={(event) => patch({ bairro: event.target.value })} />
                      </label>
                      <label>
                        <span>UF</span>
                        <select
                          value={form.ufId ?? ""}
                          onChange={(event) =>
                            patch({
                              ufId: event.target.value ? Number(event.target.value) : null,
                              cidadeId: null,
                            })
                          }
                        >
                          <option value="">Selecione</option>
                          {estados.map((estado) => (
                            <option key={estado.id} value={estado.id}>
                              {estado.sigla} — {estado.nome}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>Cidade</span>
                        <select
                          value={form.cidadeId ?? ""}
                          disabled={!form.ufId}
                          onChange={(event) =>
                            patch({ cidadeId: event.target.value ? Number(event.target.value) : null })
                          }
                        >
                          <option value="">{form.ufId ? "Selecione" : "Escolha a UF primeiro"}</option>
                          {cidades.map((cidade) => (
                            <option key={cidade.id} value={cidade.id}>
                              {cidade.nome}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </fieldset>

                  <fieldset>
                    <div className="section-kicker">Dados profissionais</div>
                    <div className="form-grid">
                      <label>
                        <span>Data de cadastro</span>
                        <input type="date" value={form.dataCadastro} readOnly />
                      </label>
                      <label>
                        <span>Data de admissão</span>
                        <input
                          type="date"
                          value={form.dataAdmissao}
                          onChange={(event) => patch({ dataAdmissao: event.target.value })}
                        />
                      </label>
                      <label>
                        <span>Data de demissão</span>
                        <input
                          type="date"
                          value={form.dataDemissao}
                          onChange={(event) =>
                            patch({
                              dataDemissao: event.target.value,
                              status: event.target.value ? "inativo" : form.status,
                            })
                          }
                        />
                      </label>
                      <label>
                        <span>Salário fixo</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={form.salarioFixo}
                          onChange={(event) => patch({ salarioFixo: event.target.value })}
                        />
                      </label>
                      <label>
                        <span>Status</span>
                        <select
                          value={form.status}
                          onChange={(event) => patch({ status: event.target.value as "ativo" | "inativo" })}
                        >
                          <option value="ativo">Ativo</option>
                          <option value="inativo">Inativo</option>
                        </select>
                      </label>
                    </div>
                    <p className="form-note">
                      Funcionários inativos permanecem no cadastro para consulta de histórico, vendas, comissões e
                      folhas anteriores.
                    </p>
                  </fieldset>

                  <fieldset>
                    <div className="section-kicker">Acesso e senha</div>
                    <div className="form-grid">
                      <label>
                        <span>Senha</span>
                        <div className="input-with-action">
                          <input
                            type={showPassword ? "text" : "password"}
                            value={form.senha}
                            onChange={(event) => patch({ senha: event.target.value })}
                            placeholder={
                              selectedId === "new"
                                ? "Defina uma senha"
                                : form.temSenha
                                  ? "Deixe em branco para manter"
                                  : "Cadastrar senha"
                            }
                            autoComplete="new-password"
                            required={selectedId === "new"}
                          />
                          <button
                            type="button"
                            className="icon-action"
                            onClick={() => setShowPassword((value) => !value)}
                            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                          >
                            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                      </label>
                      <label>
                        <span>Confirmação de senha</span>
                        <input
                          type={showPassword ? "text" : "password"}
                          value={form.senhaConfirmacao}
                          onChange={(event) => patch({ senhaConfirmacao: event.target.value })}
                          autoComplete="new-password"
                          required={selectedId === "new" || Boolean(form.senha)}
                        />
                      </label>
                    </div>
                    <p className="form-note">
                      <ShieldCheck size={13} /> A senha é gravada de forma criptografada. A confirmação serve só para
                      validação e não é armazenada.
                    </p>
                  </fieldset>
                </form>
              ) : null}

              {tab === "resumo" ? <EmployeeSummary onAction={onAction} /> : null}
              {tab === "evolucao" ? <EmployeeEvolution period={period} setPeriod={setPeriod} /> : null}
            </>
          )}
        </div>
      </section>
    </>
  );
}
