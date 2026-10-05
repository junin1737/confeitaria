/**
 * ============================================================================
 * PROJETO: Doce Gestor - Sistema de Gestão para Confeitarias
 * REPOSITÓRIO: https://github.com/junin1737/confeitaria
 * ARQUIVO: src/api.ts
 * DESCRIÇÃO: Cliente HTTP frontend e camada de integração com a API REST.
 * ============================================================================
 * 
 * [RESPONSABILIDADE DESTE MÓDULO]
 * 1. Métodos de Autenticação (login, me, logout, cadastro).
 * 2. Consultas e mutações do Dashboard (resumo financeiro, séries e grupos).
 * 3. Gestão de Colaboradores (listagem, consulta, inclusão, atualização).
 * 4. Localidades e CEP (estados, cidades e consulta no ViaCEP).
 * 5. Painel Master / Administrativo (empresas, seriais, renovação, bloqueio).
 * ============================================================================
 */

/**
 * [CONTRATO: UsuarioSessao]
 * Dados do usuário logado na sessão ativa.
 */
export type UsuarioSessao = {
  id: number;
  empresaId: number;
  empresaNome: string;
  login: string;
  nome: string;
  perfil: string;
};

/**
 * [FUNÇÃO AUXILIAR: readJson]
 * Desserialização tipada de respostas JSON da API.
 */
async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

/**
 * [AUTENTICAÇÃO: fetchMe]
 * Obtém os dados do usuário logado a partir do cookie HttpOnly da sessão.
 */
export async function fetchMe() {
  const response = await fetch("/api/auth/me", { credentials: "include" });
  if (!response.ok) return null;
  const data = await readJson<{ usuario: UsuarioSessao }>(response);
  return data.usuario;
}

/**
 * [AUTENTICAÇÃO: loginRequest]
 * Envia usuário/e-mail e senha para autenticação e abertura de sessão.
 */
export async function loginRequest(login: string, senha: string, lembrar = true) {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login, senha, lembrar }),
  });
  const data = await readJson<{ usuario?: UsuarioSessao; erro?: string }>(response);
  if (!response.ok || !data.usuario) {
    throw new Error(data.erro ?? "Não foi possível entrar.");
  }
  return data.usuario;
}

/**
 * [AUTENTICAÇÃO: logoutRequest]
 * Encerra a sessão ativa e limpa o cookie HttpOnly no servidor.
 */
export async function logoutRequest() {
  const response = await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
  });
  if (!response.ok) throw new Error("Não foi possível sair.");
}

/**
 * [CONTRATOS DO DASHBOARD]
 */
export type ResumoPeriodo = {
  valor: number;
  custo: number;
  pedidos: number;
  ticket: number;
  lucro: number;
  lucroPercent: number;
};

export type GrupoVenda = {
  id: number;
  nome: string;
  cor: string;
  valor: number;
  custo: number;
  pedidos: number;
  lucro: number;
  lucroPercent: number;
};

export type PontoSerie = {
  chave: string;
  label: string;
  valor: number;
};

export type DashboardResumo = {
  dia: ResumoPeriodo;
  mes: ResumoPeriodo;
  ano: ResumoPeriodo;
  variacao: {
    dia: number | null;
    mes: number | null;
    ano: number | null;
  };
  sparks: {
    dia: number[];
    mes: number[];
    ano: number[];
  };
  gruposAno: GrupoVenda[];
  serieMensal: PontoSerie[];
};

/**
 * [DASHBOARD: fetchDashboardResumo]
 * Busca os indicadores consolidados de faturamento, variações e gráficos.
 */
export async function fetchDashboardResumo() {
  const response = await fetch("/api/dashboard/resumo", { credentials: "include" });
  if (!response.ok) throw new Error("Não foi possível carregar o dashboard.");
  return readJson<DashboardResumo>(response);
}

/**
 * [DASHBOARD: fetchDashboardPeriodo]
 * Filtra dados de faturamento e vendas por grupo em um intervalo de datas personalizado.
 */
export async function fetchDashboardPeriodo(de: string, ate: string) {
  const response = await fetch(`/api/dashboard/periodo?de=${encodeURIComponent(de)}&ate=${encodeURIComponent(ate)}`, {
    credentials: "include",
  });
  if (!response.ok) throw new Error("Não foi possível carregar o período.");
  return readJson<{ resumo: ResumoPeriodo; grupos: GrupoVenda[] }>(response);
}

/**
 * [CONTRATO: Funcionario]
 */
export type Funcionario = {
  id: number;
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
  ufSigla: string;
  cidadeNome: string;
  dataCadastro: string;
  dataAdmissao: string;
  dataDemissao: string;
  salarioFixo: number;
  status: "ativo" | "inativo";
  temSenha: boolean;
};

export type FuncionarioPayload = {
  nome: string;
  cpf?: string;
  dataNascimento?: string;
  email?: string;
  telefone?: string;
  celular?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  ufId?: number | null;
  cidadeId?: number | null;
  dataCadastro?: string;
  dataAdmissao?: string;
  dataDemissao?: string;
  salarioFixo?: number;
  status?: "ativo" | "inativo";
  senha?: string;
  senhaConfirmacao?: string;
};

/**
 * [FUNCIONÁRIOS: fetchFuncionarios]
 * Lista todos os funcionários da empresa logada.
 */
export async function fetchFuncionarios() {
  const response = await fetch("/api/funcionarios", { credentials: "include" });
  if (!response.ok) throw new Error("Não foi possível carregar os funcionários.");
  return readJson<{ funcionarios: Funcionario[]; proximoCodigo: string }>(response);
}

/**
 * [FUNCIONÁRIOS: saveFuncionario]
 * Salva (criação via POST ou edição via PUT) os dados de um colaborador.
 */
export async function saveFuncionario(
  payloadOrId: (FuncionarioPayload & { id?: number; codigo?: string }) | number | null,
  maybePayload?: FuncionarioPayload,
) {
  let id: number | null = null;
  let body: FuncionarioPayload;
  if (typeof payloadOrId === "object" && payloadOrId !== null) {
    id = payloadOrId.id ?? null;
    body = payloadOrId;
  } else {
    id = payloadOrId;
    body = maybePayload ?? ({} as FuncionarioPayload);
  }
  const isNew = !id;
  const url = isNew ? "/api/funcionarios" : `/api/funcionarios/${id}`;
  const method = isNew ? "POST" : "PUT";
  const response = await fetch(url, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await readJson<{ funcionario?: Funcionario; erro?: string }>(response);
  if (!response.ok || !data.funcionario) {
    throw new Error(data.erro ?? "Não foi possível salvar o funcionário.");
  }
  return data.funcionario;
}

/**
 * [CONTRATOS GEOGRÁFICOS: Estado e Cidade]
 */
export type Estado = {
  id: number;
  sigla: string;
  nome: string;
};

export type Cidade = {
  id: number;
  nome: string;
};

export async function fetchEstados() {
  const response = await fetch("/api/estados", { credentials: "include" });
  if (!response.ok) throw new Error("Não foi possível carregar os estados.");
  return readJson<{ estados: Estado[] }>(response);
}

export async function fetchCidades(ufId: number) {
  const response = await fetch(`/api/cidades?ufId=${ufId}`, { credentials: "include" });
  if (!response.ok) throw new Error("Não foi possível carregar as cidades.");
  const data = await readJson<{ cidades: Cidade[] }>(response);
  return data.cidades;
}

export type CepResult = {
  ok: true;
  generico: boolean;
  cep: string;
  logradouro: string;
  bairro: string;
  complemento: string;
  ufId: number | null;
  ufSigla: string;
  cidadeId: number | null;
  cidadeNome: string;
  mensagem?: string;
};

export async function fetchCep(cep: string): Promise<CepResult> {
  const response = await fetch(`/api/cep/${encodeURIComponent(cep)}`, { credentials: "include" });
  const data = await readJson<CepResult | { erro: string }>(response);
  if (!response.ok || "erro" in data) {
    throw new Error("erro" in data ? data.erro : "Não foi possível consultar o CEP.");
  }
  return data;
}

export const lookupCep = fetchCep;

/**
 * [CONTRATO: Mensagens & Aniversariantes]
 */
export type Mensagem = {
  chave: string;
  titulo: string;
  texto: string;
};

export type Aniversariante = {
  id: number;
  nome: string;
  celular: string;
  dataNascimento: string;
  idade: number;
  origem: "funcionario";
};

export async function fetchMensagens() {
  const response = await fetch("/api/mensagens", { credentials: "include" });
  if (!response.ok) throw new Error("Não foi possível carregar as mensagens.");
  return readJson<{ mensagens: Mensagem[] }>(response);
}

export async function saveMensagem(chave: string, titulo: string, texto: string) {
  const response = await fetch(`/api/mensagens/${chave}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ titulo, texto }),
  });
  const data = await readJson<{ mensagem?: Mensagem; erro?: string }>(response);
  if (!response.ok || !data.mensagem) {
    throw new Error(data.erro ?? "Não foi possível salvar a mensagem.");
  }
  return data.mensagem;
}

export async function fetchDashboardHoje() {
  const response = await fetch("/api/dashboard/hoje", { credentials: "include" });
  if (!response.ok) throw new Error("Não foi possível carregar o dia.");
  return readJson<{
    aniversariantes: Aniversariante[];
    mensagemAniversario: Mensagem | null;
    empresaNome: string;
  }>(response);
}

export function iniciais(nome: string) {
  const parts = nome.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "DG";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/**
 * [CONTRATOS E MÉTODOS DO PAINEL MASTER / ADMINISTRAÇÃO]
 */
export type EmpresaAdminDto = {
  id: number;
  nome: string;
  email: string | null;
  telefone: string | null;
  documento: string | null;
  status: "ativa" | "bloqueada" | "trial" | "expirada";
  plano: string;
  serialKey: string | null;
  expiraEm: string | null;
  motivoBloqueio: string | null;
  slug: string | null;
  criadoEm: string;
  totalUsuarios: number;
  totalFuncionarios: number;
  totalVendas: number;
  diasRestantes: number | null;
  licencaValida: boolean;
};

export async function fetchAdminEmpresas() {
  const response = await fetch("/api/admin/empresas", { credentials: "include" });
  if (!response.ok) throw new Error("Não foi possível carregar as empresas.");
  const data = await readJson<{ empresas: EmpresaAdminDto[] }>(response);
  return data.empresas;
}

export async function criarEmpresaAdminApi(dados: {
  nome: string;
  email: string;
  telefone?: string;
  plano?: string;
  diasValidade?: number;
  senhaAdmin?: string;
}) {
  const response = await fetch("/api/admin/empresas", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  const data = await readJson<{ ok?: boolean; erro?: string; empresaId?: number; serial?: string }>(response);
  if (!response.ok || !data.ok) {
    throw new Error(data.erro ?? "Erro ao criar empresa.");
  }
  return data;
}

export async function alterarStatusEmpresaApi(
  id: number,
  status: "ativa" | "bloqueada" | "trial",
  motivo?: string,
  diasValidade?: number,
) {
  const response = await fetch(`/api/admin/empresas/${id}/status`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, motivo, diasValidade }),
  });
  const data = await readJson<{ ok?: boolean; erro?: string }>(response);
  if (!response.ok || !data.ok) {
    throw new Error(data.erro ?? "Erro ao atualizar status da empresa.");
  }
  return data;
}

export async function prorrogarLicencaEmpresaApi(id: number, dias: number, plano?: string) {
  const response = await fetch(`/api/admin/empresas/${id}/prorrogar`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dias, plano }),
  });
  const data = await readJson<{ ok?: boolean; erro?: string }>(response);
  if (!response.ok || !data.ok) {
    throw new Error(data.erro ?? "Erro ao prorrogar licença.");
  }
  return data;
}

export async function renovarSerialEmpresaApi(id: number, plano?: string) {
  const response = await fetch(`/api/admin/empresas/${id}/serial`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plano }),
  });
  const data = await readJson<{ ok?: boolean; serialKey?: string; erro?: string }>(response);
  if (!response.ok || !data.ok) {
    throw new Error(data.erro ?? "Erro ao renovar serial.");
  }
  return data;
}

export async function registrarConfeitariaApi(dados: {
  nomeAtelie: string;
  email: string;
  senha: string;
  telefone?: string;
}) {
  const response = await fetch("/api/auth/registrar", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  const data = await readJson<{ ok?: boolean; usuario?: UsuarioSessao; erro?: string }>(response);
  if (!response.ok || !data.ok) {
    throw new Error(data.erro ?? "Não foi possível concluir o cadastro.");
  }
  return data.usuario;
}

/**
 * ============================================================================
 * [FASE 1: TIPOS E CLIENTE HTTP DE INSUMOS & ENGENHARIA DE CUSTOS]
 * ============================================================================
 */

export type Insumo = {
  id: number;
  nome: string;
  categoria: "ingrediente" | "embalagem" | "decoracao" | "outro";
  unidadeMedida: "g" | "ml" | "un";
  unidadeCompra: "kg" | "g" | "l" | "ml" | "un";
  quantidadeEmbalagem: number;
  precoCompra: number;
  custoUnitario: number;
  estoqueAtual: number;
  estoqueMinimo: number;
  marca: string | null;
  criadoEm: string;
};

export type InsumoInput = {
  id?: number;
  nome: string;
  categoria?: "ingrediente" | "embalagem" | "decoracao" | "outro";
  unidadeMedida?: "g" | "ml" | "un";
  unidadeCompra?: "kg" | "g" | "l" | "ml" | "un";
  quantidadeEmbalagem: number;
  precoCompra: number;
  estoqueAtual?: number;
  estoqueMinimo?: number;
  marca?: string;
};

export type ReceitaItemDetalhado = {
  id?: number;
  insumoId: number;
  insumoNome: string;
  categoria: string;
  quantidade: number;
  unidade: string;
  precoCompraInsumo: number;
  quantidadeEmbalagemInsumo: number;
  unidadeCompraInsumo: string;
  custoUnitario: number;
  custoTotalItem: number;
};

export type MetricasPrecificacao = {
  custoInsumos: number;
  custoMaoDeObra: number;
  custoFixos: number;
  custoTotalProducao: number;
  custoPorUnidade: number;
  precoSugeridoTotal?: number;
  precoSugeridoPorUnidade: number;
  precoVendaTotal?: number;
  precoVendaPorUnidade?: number;
  lucroRealTotal?: number;
  lucroRealPorUnidade: number;
  margemRealPercentual: number;
};

export type Receita = MetricasPrecificacao & {
  id: number;
  nome: string;
  descricao: string | null;
  grupoId: number | null;
  grupoNome: string | null;
  rendimentoQuantidade: number;
  rendimentoUnidade: string;
  tempoPreparoMinutos: number;
  custoHoraTrabalho: number;
  percentualCustosFixos: number;
  margemLucroDesejada: number;
  precoSugerido: number;
  precoVenda: number;
  modoPreparo: string | null;
  status: "ativo" | "inativo";
  criadoEm: string;
  atualizadoEm: string;
  itens: ReceitaItemDetalhado[];
};

export type ReceitaInput = {
  id?: number;
  nome: string;
  descricao?: string;
  grupoId?: number | null;
  rendimentoQuantidade: number;
  rendimentoUnidade?: string;
  tempoPreparoMinutos: number;
  custoHoraTrabalho: number;
  percentualCustosFixos: number;
  margemLucroDesejada: number;
  precoVenda?: number;
  modoPreparo?: string;
  status?: "ativo" | "inativo";
  itens: {
    insumoId: number;
    quantidade: number;
    unidade?: string;
  }[];
};

export async function fetchInsumos(): Promise<Insumo[]> {
  const response = await fetch("/api/insumos", { credentials: "include" });
  if (!response.ok) throw new Error("Falha ao carregar insumos");
  const data = await readJson<{ insumos: Insumo[] }>(response);
  return data.insumos;
}

export async function saveInsumo(dados: InsumoInput): Promise<Insumo> {
  const response = await fetch("/api/insumos", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  const data = await readJson<{ insumo?: Insumo; erro?: string }>(response);
  if (!response.ok || !data.insumo) {
    throw new Error(data.erro || "Falha ao salvar insumo");
  }
  return data.insumo;
}

export async function deleteInsumo(id: number): Promise<void> {
  const response = await fetch(`/api/insumos/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  const data = await readJson<{ ok?: boolean; erro?: string }>(response);
  if (!response.ok || !data.ok) {
    throw new Error(data.erro || "Falha ao excluir insumo");
  }
}

export async function fetchReceitas(): Promise<Receita[]> {
  const response = await fetch("/api/receitas", { credentials: "include" });
  if (!response.ok) throw new Error("Falha ao carregar fichas técnicas");
  const data = await readJson<{ receitas: Receita[] }>(response);
  return data.receitas;
}

export async function fetchReceita(id: number): Promise<Receita> {
  const response = await fetch(`/api/receitas/${id}`, { credentials: "include" });
  if (!response.ok) throw new Error("Receita não encontrada");
  const data = await readJson<{ receita: Receita }>(response);
  return data.receita;
}

export async function saveReceita(dados: ReceitaInput): Promise<Receita> {
  const response = await fetch("/api/receitas", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  const data = await readJson<{ receita?: Receita; erro?: string }>(response);
  if (!response.ok || !data.receita) {
    throw new Error(data.erro || "Falha ao salvar receita");
  }
  return data.receita;
}

export async function deleteReceita(id: number): Promise<void> {
  const response = await fetch(`/api/receitas/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  const data = await readJson<{ ok?: boolean; erro?: string }>(response);
  if (!response.ok || !data.ok) {
    throw new Error(data.erro || "Falha ao excluir receita");
  }
}

export async function simularReceita(dados: any): Promise<MetricasPrecificacao> {
  const response = await fetch("/api/receitas/simular", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  const data = await readJson<{ metricas: MetricasPrecificacao }>(response);
  return data.metricas;
}

