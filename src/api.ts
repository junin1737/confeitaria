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

  // Ficha Cadastral Completa
  razaoSocial?: string | null;
  nomeFantasia?: string | null;
  responsavel?: string | null;
  cnpj?: string | null;
  inscricaoEstadual?: string | null;
  inscricaoMunicipal?: string | null;
  cep?: string | null;
  tipoLogradouro?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  uf?: string | null;
  municipio?: string | null;
  dddTelefone?: string | null;
  fax?: string | null;
  dddCelular?: string | null;
  celular?: string | null;
  site?: string | null;
  ramoAtividade?: string | null;
  cnae?: string | null;
  suframa?: string | null;
  dataCompraSistema?: string | null;
  optanteSimples?: string | null;
  regimeTributario?: string | null;
  logomarcaUrl?: string | null;
};

export type CnpjConsultaDto = {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  responsavel: string;
  cep: string;
  tipoLogradouro: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  uf: string;
  municipio: string;
  dddTelefone: string;
  telefone: string;
  dddCelular: string;
  celular: string;
  email: string;
  ramoAtividade: string;
  cnae: string;
  inscricaoEstadual: string;
  optanteSimples: "Sim" | "Não";
  regimeTributario: "Normal" | "Microempreendedor Individual - MEI" | "Excedido o sublimite do estado";
};

export async function fetchAdminEmpresas() {
  const response = await fetch("/api/admin/empresas", { credentials: "include" });
  if (!response.ok) throw new Error("Não foi possível carregar as empresas.");
  const data = await readJson<{ empresas: EmpresaAdminDto[] }>(response);
  return data.empresas;
}

export async function fetchDadosEmpresa(): Promise<EmpresaAdminDto> {
  const response = await fetch("/api/empresa/dados", { credentials: "include" });
  if (!response.ok) throw new Error("Não foi possível carregar os dados cadastrais da empresa.");
  const data = await readJson<{ empresa: EmpresaAdminDto }>(response);
  return data.empresa;
}

export async function saveDadosEmpresa(dados: Partial<EmpresaAdminDto>): Promise<EmpresaAdminDto> {
  const response = await fetch("/api/empresa/dados", {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  const data = await readJson<{ ok?: boolean; empresa?: EmpresaAdminDto; erro?: string }>(response);
  if (!response.ok || !data.empresa) {
    throw new Error(data.erro || "Não foi possível salvar os dados da empresa.");
  }
  return data.empresa;
}

export async function lookupCnpj(cnpj: string): Promise<CnpjConsultaDto> {
  const digits = cnpj.replace(/\D/g, "");
  const response = await fetch(`/api/cnpj/${digits}`, { credentials: "include" });
  const data = await readJson<CnpjConsultaDto & { erro?: string }>(response);
  if (!response.ok || (data as any).erro) {
    throw new Error((data as any).erro || "Erro ao consultar CNPJ na base da Receita.");
  }
  return data;
}

export async function criarEmpresaAdminApi(dados: {
  nome: string;
  email: string;
  telefone: string;
  nomeCompletoUsuario?: string;
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
  nomeCompleto: string;
  nomeAtelie: string;
  email: string;
  telefone: string;
  senha: string;
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
  fornecedorId?: number | null;
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
  fornecedorId?: number | null;
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

/**
 * ============================================================================
 * [FASE 1: CADASTROS PADRÃO (GRUPOS, SUBGRUPOS, FORNECEDORES, CLIENTES, PRODUTOS)]
 * ============================================================================
 */

export type GrupoProduto = {
  id: number;
  nome: string;
  cor: string;
  totalSubgrupos?: number;
  totalProdutos?: number;
};

export type SubgrupoProduto = {
  id: number;
  grupoId: number;
  grupoNome?: string;
  nome: string;
};

export async function fetchGrupos(): Promise<GrupoProduto[]> {
  const res = await fetch("/api/grupos", { credentials: "include" });
  if (!res.ok) throw new Error("Erro ao carregar grupos");
  const data = await readJson<{ grupos: GrupoProduto[] }>(res);
  return data.grupos;
}

export async function saveGrupo(dados: { id?: number; nome: string; cor?: string }): Promise<GrupoProduto> {
  const res = await fetch("/api/grupos", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  const data = await readJson<{ grupo?: GrupoProduto; erro?: string }>(res);
  if (!res.ok || !data.grupo) throw new Error(data.erro || "Erro ao salvar grupo");
  return data.grupo;
}

export async function deleteGrupo(id: number): Promise<void> {
  const res = await fetch(`/api/grupos/${id}`, { method: "DELETE", credentials: "include" });
  const data = await readJson<{ ok?: boolean; erro?: string }>(res);
  if (!res.ok || !data.ok) throw new Error(data.erro || "Erro ao excluir grupo");
}

export async function fetchSubgrupos(grupoId?: number): Promise<SubgrupoProduto[]> {
  const url = grupoId ? `/api/subgrupos?grupoId=${grupoId}` : "/api/subgrupos";
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error("Erro ao carregar subgrupos");
  const data = await readJson<{ subgrupos: SubgrupoProduto[] }>(res);
  return data.subgrupos;
}

export async function saveSubgrupo(dados: { id?: number; grupoId: number; nome: string }): Promise<SubgrupoProduto> {
  const res = await fetch("/api/subgrupos", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  const data = await readJson<{ subgrupo?: SubgrupoProduto; erro?: string }>(res);
  if (!res.ok || !data.subgrupo) throw new Error(data.erro || "Erro ao salvar subgrupo");
  return data.subgrupo;
}

export async function deleteSubgrupo(id: number): Promise<void> {
  const res = await fetch(`/api/subgrupos/${id}`, { method: "DELETE", credentials: "include" });
  const data = await readJson<{ ok?: boolean; erro?: string }>(res);
  if (!res.ok || !data.ok) throw new Error(data.erro || "Erro ao excluir subgrupo");
}

// --- FORNECEDORES ---
export type Fornecedor = {
  id: number;
  codigo: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  cnpjCpf: string | null;
  telefone: string | null;
  celular: string | null;
  email: string | null;
  contato: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidadeId: number | null;
  cidadeNome?: string | null;
  ufSigla?: string | null;
  status: "ativo" | "inativo";
  observacoes: string | null;
  criadoEm: string;
};

export async function fetchProximoCodigoFornecedor(): Promise<string> {
  const res = await fetch("/api/fornecedores/proximo-codigo", { credentials: "include" });
  const data = await readJson<{ proximoCodigo: string }>(res);
  return data.proximoCodigo;
}

export async function fetchFornecedores(): Promise<Fornecedor[]> {
  const res = await fetch("/api/fornecedores", { credentials: "include" });
  if (!res.ok) throw new Error("Erro ao carregar fornecedores");
  const data = await readJson<{ fornecedores: Fornecedor[] }>(res);
  return data.fornecedores;
}

export async function saveFornecedor(dados: Partial<Fornecedor>): Promise<Fornecedor> {
  const res = await fetch("/api/fornecedores", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  const data = await readJson<{ fornecedor?: Fornecedor; erro?: string }>(res);
  if (!res.ok || !data.fornecedor) throw new Error(data.erro || "Erro ao salvar fornecedor");
  return data.fornecedor;
}

export async function deleteFornecedor(id: number): Promise<void> {
  const res = await fetch(`/api/fornecedores/${id}`, { method: "DELETE", credentials: "include" });
  const data = await readJson<{ ok?: boolean; erro?: string }>(res);
  if (!res.ok || !data.ok) throw new Error(data.erro || "Erro ao excluir fornecedor");
}

// --- CLIENTES ---
export type Cliente = {
  id: number;
  codigo: string;
  nome: string;
  cpfCnpj: string | null;
  telefone: string | null;
  celular: string | null;
  email: string | null;
  dataNascimento: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidadeId: number | null;
  cidadeNome?: string | null;
  ufSigla?: string | null;
  status: "ativo" | "inativo";
  observacoes: string | null;
  criadoEm: string;
};

export async function fetchProximoCodigoCliente(): Promise<string> {
  const res = await fetch("/api/clientes/proximo-codigo", { credentials: "include" });
  const data = await readJson<{ proximoCodigo: string }>(res);
  return data.proximoCodigo;
}

export async function fetchClientes(): Promise<Cliente[]> {
  const res = await fetch("/api/clientes", { credentials: "include" });
  if (!res.ok) throw new Error("Erro ao carregar clientes");
  const data = await readJson<{ clientes: Cliente[] }>(res);
  return data.clientes;
}

export async function saveCliente(dados: Partial<Cliente>): Promise<Cliente> {
  const res = await fetch("/api/clientes", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  const data = await readJson<{ cliente?: Cliente; erro?: string }>(res);
  if (!res.ok || !data.cliente) throw new Error(data.erro || "Erro ao salvar cliente");
  return data.cliente;
}

export async function deleteCliente(id: number): Promise<void> {
  const res = await fetch(`/api/clientes/${id}`, { method: "DELETE", credentials: "include" });
  const data = await readJson<{ ok?: boolean; erro?: string }>(res);
  if (!res.ok || !data.ok) throw new Error(data.erro || "Erro ao excluir cliente");
}

// --- PRODUTOS (COM FICHA TÉCNICA EMBUTIDA) ---
export type ProdutoItemReceita = {
  id?: number;
  insumoId: number;
  insumoNome: string;
  categoria: string;
  quantidade: number;
  unidade: string;
  custoUnitario: number;
  custoTotalItem: number;
};

export type TipoItem = {
  id: number;
  nome: string;
  codigo: string | null;
  descricao: string | null;
  padrao: boolean;
  totalProdutos?: number;
};

export type ProdutoCustoHistorico = {
  id: number;
  produtoId: number;
  dataHora: string;
  custoProducao: number;
  custoInsumos: number;
  custoMaoDeObra: number;
  custoFixos: number;
  precoVenda: number;
  margemLucroReal: number;
  motivo?: string | null;
};

export type Produto = {
  id: number;
  codigo: string;
  nome: string;
  descricao: string | null;
  tipoItemId: number | null;
  tipoItemNome?: string | null;
  grupoId: number | null;
  grupoNome?: string | null;
  subgrupoId: number | null;
  subgrupoNome?: string | null;
  unidadeVenda: string;
  precoCusto: number;
  custoMedio: number;
  precoVenda: number;
  margemLucroRealPercent: number;
  estoqueAtual: number;
  estoqueMinimo: number;
  status: "ativo" | "inativo";
  fotoUrl: string | null;
  criadoEm: string;
  atualizadoEm: string;

  // Ficha Técnica / Receita
  temReceita: boolean;
  rendimentoQuantidade: number;
  rendimentoUnidade: string;
  tempoPreparoMinutos: number;
  custoHoraTrabalho: number;
  percentualCustosFixos: number;
  margemLucroDesejada: number;
  precoSugerido: number;
  modoPreparo: string | null;
  itensReceita: ProdutoItemReceita[];

  // Métricas de Custo
  custoInsumos: number;
  custoMaoDeObra: number;
  custoFixos: number;
  custoTotalProducao: number;
  custoPorUnidade: number;
  lucroRealPorUnidade: number;
  lucroRealTotal: number;
};

export type ProdutoInput = {
  id?: number;
  codigo?: string;
  nome: string;
  descricao?: string;
  tipoItemId?: number | null;
  grupoId?: number | null;
  subgrupoId?: number | null;
  unidadeVenda?: string;
  precoVenda?: number;
  estoqueAtual?: number;
  estoqueMinimo?: number;
  temReceita?: boolean;
  rendimentoQuantidade?: number;
  rendimentoUnidade?: string;
  tempoPreparoMinutos?: number;
  custoHoraTrabalho?: number;
  percentualCustosFixos?: number;
  margemLucroDesejada?: number;
  modoPreparo?: string;
  status?: "ativo" | "inativo";
  fotoUrl?: string;
  itensReceita?: {
    insumoId: number;
    quantidade: number;
    unidade?: string;
  }[];
};

export async function fetchProximoCodigoProduto(): Promise<string> {
  const res = await fetch("/api/produtos/proximo-codigo", { credentials: "include" });
  const data = await readJson<{ proximoCodigo: string }>(res);
  return data.proximoCodigo;
}

export async function fetchProdutos(): Promise<Produto[]> {
  const res = await fetch("/api/produtos", { credentials: "include" });
  if (!res.ok) throw new Error("Erro ao carregar produtos");
  const data = await readJson<{ produtos: Produto[] }>(res);
  return data.produtos;
}

export async function saveProduto(dados: ProdutoInput): Promise<Produto> {
  const res = await fetch("/api/produtos", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  const data = await readJson<{ produto?: Produto; erro?: string }>(res);
  if (!res.ok || !data.produto) throw new Error(data.erro || "Erro ao salvar produto");
  return data.produto;
}

export async function deleteProduto(id: number): Promise<void> {
  const res = await fetch(`/api/produtos/${id}`, { method: "DELETE", credentials: "include" });
  const data = await readJson<{ ok?: boolean; erro?: string }>(res);
  if (!res.ok || !data.ok) throw new Error(data.erro || "Erro ao excluir produto");
}

export async function fetchHistoricoCustoProduto(
  produtoId: number,
  de?: string,
  ate?: string
): Promise<ProdutoCustoHistorico[]> {
  const params = new URLSearchParams();
  if (de) params.append("de", de);
  if (ate) params.append("ate", ate);
  const queryStr = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`/api/produtos/${produtoId}/historico-custo${queryStr}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Erro ao carregar histórico de custo");
  const data = await readJson<{ historico: ProdutoCustoHistorico[] }>(res);
  return data.historico;
}

export async function fetchTiposItem(): Promise<TipoItem[]> {
  const res = await fetch("/api/tipos-item", { credentials: "include" });
  if (!res.ok) throw new Error("Erro ao carregar tipos de item");
  const data = await readJson<{ tiposItem: TipoItem[] }>(res);
  return data.tiposItem;
}

export async function saveTipoItem(dados: {
  id?: number;
  nome: string;
  codigo?: string;
  descricao?: string;
  padrao?: boolean;
}): Promise<TipoItem> {
  const res = await fetch("/api/tipos-item", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  const data = await readJson<{ tipoItem?: TipoItem; erro?: string }>(res);
  if (!res.ok || !data.tipoItem) throw new Error(data.erro || "Erro ao salvar tipo de item");
  return data.tipoItem;
}

export async function deleteTipoItem(id: number): Promise<void> {
  const res = await fetch(`/api/tipos-item/${id}`, { method: "DELETE", credentials: "include" });
  const data = await readJson<{ ok?: boolean; erro?: string }>(res);
  if (!res.ok || !data.ok) throw new Error(data.erro || "Erro ao excluir tipo de item");
}

/**
 * ============================================================================
 * [MÓDULO: UNIDADES DE MEDIDA]
 * ============================================================================
 */

export type UnidadeMedida = {
  id: number;
  sigla: string;
  nome: string;
  permiteDecimal: boolean;
  padrao: boolean;
  totalProdutos?: number;
};

export async function fetchUnidadesMedida(): Promise<UnidadeMedida[]> {
  const res = await fetch("/api/unidades-medida", { credentials: "include" });
  if (!res.ok) throw new Error("Erro ao carregar unidades de medida");
  const data = await readJson<{ unidades: UnidadeMedida[] }>(res);
  return data.unidades;
}

export async function saveUnidadeMedida(dados: {
  id?: number;
  sigla: string;
  nome: string;
  permiteDecimal?: boolean;
  padrao?: boolean;
}): Promise<UnidadeMedida> {
  const res = await fetch("/api/unidades-medida", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  const data = await readJson<{ unidade?: UnidadeMedida; erro?: string }>(res);
  if (!res.ok || !data.unidade) throw new Error(data.erro || "Erro ao salvar unidade de medida");
  return data.unidade;
}

export async function deleteUnidadeMedida(id: number): Promise<void> {
  const res = await fetch(`/api/unidades-medida/${id}`, { method: "DELETE", credentials: "include" });
  const data = await readJson<{ ok?: boolean; erro?: string }>(res);
  if (!res.ok || !data.ok) throw new Error(data.erro || "Erro ao excluir unidade de medida");
}

/**
 * ============================================================================
 * [MÓDULO: ORDENS DE PRODUÇÃO]
 * ============================================================================
 */

export type OrdemProducao = {
  id: number;
  produtoId: number;
  produtoNome: string;
  produtoCodigo: string;
  quantidadeProduzida: number;
  custoTotal: number;
  observacoes: string | null;
  dataProducao: string;
  criadoEm: string;
  insumosBaixados: {
    insumoId: number;
    insumoNome: string;
    quantidadeBaixada: number;
    unidade: string;
    custoTotal: number;
  }[];
};

export async function fetchProducoes(): Promise<OrdemProducao[]> {
  const res = await fetch("/api/producao", { credentials: "include" });
  if (!res.ok) throw new Error("Erro ao carregar histórico de produção");
  const data = await readJson<{ producoes: OrdemProducao[] }>(res);
  return data.producoes;
}

export async function executarProducao(
  produtoId: number,
  quantidade: number,
  observacoes?: string
): Promise<{ ok: boolean; producaoId?: number; erro?: string }> {
  const res = await fetch("/api/producao/executar", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ produtoId, quantidade, observacoes }),
  });
  const data = await readJson<{ ok?: boolean; producaoId?: number; erro?: string }>(res);
  if (!res.ok || !data.ok) throw new Error(data.erro || "Erro ao executar ordem de produção");
  return { ok: true, producaoId: data.producaoId };
}

/**
 * ============================================================================
 * [MÓDULO: COMPRAS E ENTRADA DE NOTA FISCAL / XML]
 * ============================================================================
 */

export type CompraItem = {
  id?: number;
  insumoId?: number | null;
  produtoId?: number | null;
  descricao: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
};

export type CompraNota = {
  id: number;
  fornecedorId: number | null;
  fornecedorNome?: string | null;
  fornecedorFantasia?: string | null;
  numeroNota: string;
  serieNota: string | null;
  chaveAcesso: string | null;
  dataEmissao: string | null;
  dataEntrada: string;
  valorProdutos: number;
  valorFrete: number;
  valorTotal: number;
  observacoes: string | null;
  criadoEm: string;
  itens: CompraItem[];
};

export type CompraNotaInput = {
  fornecedorId?: number | null;
  numeroNota: string;
  serieNota?: string | null;
  chaveAcesso?: string | null;
  dataEmissao?: string | null;
  dataEntrada?: string | null;
  valorProdutos: number;
  valorFrete?: number;
  valorTotal: number;
  observacoes?: string | null;
  arquivoXml?: string | null;
  itens: CompraItem[];
};

export type XmlNfeParsed = {
  sucesso: boolean;
  chaveAcesso?: string;
  numeroNota?: string;
  serieNota?: string;
  dataEmissao?: string;
  fornecedor?: {
    cnpjCpf: string;
    razaoSocial: string;
    nomeFantasia: string;
  };
  valorProdutos?: number;
  valorFrete?: number;
  valorTotal?: number;
  itens?: CompraItem[];
  erro?: string;
};

export async function fetchCompras(): Promise<CompraNota[]> {
  const res = await fetch("/api/compras", { credentials: "include" });
  if (!res.ok) throw new Error("Erro ao carregar notas fiscais de compra");
  const data = await readJson<{ compras: CompraNota[] }>(res);
  return data.compras;
}

export async function saveCompraNota(dados: CompraNotaInput): Promise<{ ok: boolean; compraId?: number }> {
  const res = await fetch("/api/compras", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  const data = await readJson<{ ok?: boolean; compraId?: number; erro?: string }>(res);
  if (!res.ok || !data.ok) throw new Error(data.erro || "Erro ao registrar entrada de nota fiscal");
  return { ok: true, compraId: data.compraId };
}

export async function parseNfeXmlApi(xmlString: string): Promise<XmlNfeParsed> {
  const res = await fetch("/api/compras/parse-xml", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ xml: xmlString }),
  });
  const data = await readJson<XmlNfeParsed>(res);
  if (!res.ok || !data.sucesso) throw new Error(data.erro || "Erro ao processar arquivo XML da NF-e");
  return data;
}

/**
 * ============================================================================
 * [MÓDULO: VENDAS & PEDIDOS]
 * ============================================================================
 */

export type PedidoItem = {
  id?: number;
  produtoId: number;
  produtoNome?: string;
  quantidade: number;
  unidade?: string;
  precoUnitario: number;
  precoTotal?: number;
  observacoes?: string | null;
};

export type Pedido = {
  id: number;
  codigo: string;
  clienteId: number | null;
  clienteNome: string | null;
  clienteTelefone: string | null;
  dataPedido: string;
  dataEntrega: string | null;
  horaEntrega: string | null;
  tipo: "balcao" | "encomenda" | "delivery";
  status: "pendente" | "em_producao" | "pronto" | "entregue" | "cancelado";
  formaPagamento: string;
  statusPagamento: string;
  valorProdutos: number;
  valorDesconto: number;
  taxaEntrega: number;
  valorSinal: number;
  valorTotal: number;
  valorRestante: number;
  observacoes: string | null;
  enderecoEntrega: string | null;
  criadoEm: string;
  atualizadoEm: string;
  itens: PedidoItem[];
};

export type PedidoInput = {
  id?: number;
  codigo?: string;
  clienteId?: number | null;
  dataPedido?: string;
  dataEntrega?: string | null;
  horaEntrega?: string | null;
  tipo?: "balcao" | "encomenda" | "delivery";
  status?: "pendente" | "em_producao" | "pronto" | "entregue" | "cancelado";
  formaPagamento?: string;
  statusPagamento?: string;
  valorDesconto?: number;
  taxaEntrega?: number;
  valorSinal?: number;
  observacoes?: string | null;
  enderecoEntrega?: string | null;
  itens: {
    produtoId: number;
    quantidade: number;
    unidade?: string;
    precoUnitario: number;
    observacoes?: string;
  }[];
};

export async function fetchPedidos(filtros?: {
  status?: string;
  tipo?: string;
  dataInicio?: string;
  dataFim?: string;
}): Promise<{ pedidos: Pedido[]; proximoCodigo: string }> {
  const query = new URLSearchParams();
  if (filtros?.status) query.set("status", filtros.status);
  if (filtros?.tipo) query.set("tipo", filtros.tipo);
  if (filtros?.dataInicio) query.set("dataInicio", filtros.dataInicio);
  if (filtros?.dataFim) query.set("dataFim", filtros.dataFim);

  const res = await fetch(`/api/pedidos?${query.toString()}`, { credentials: "include" });
  if (!res.ok) throw new Error("Erro ao carregar lista de pedidos");
  return readJson<{ pedidos: Pedido[]; proximoCodigo: string }>(res);
}

export async function savePedido(dados: PedidoInput): Promise<{ id: number; ok: boolean }> {
  const res = await fetch("/api/pedidos", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  const data = await readJson<{ id?: number; ok?: boolean; erro?: string }>(res);
  if (!res.ok || !data.ok) throw new Error(data.erro || "Erro ao salvar pedido");
  return { id: data.id!, ok: true };
}

export async function updatePedidoStatus(
  id: number,
  novoStatus: "pendente" | "em_producao" | "pronto" | "entregue" | "cancelado"
): Promise<void> {
  const res = await fetch(`/api/pedidos/${id}/status`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: novoStatus }),
  });
  const data = await readJson<{ ok?: boolean; erro?: string }>(res);
  if (!res.ok || !data.ok) throw new Error(data.erro || "Erro ao atualizar status do pedido");
}

export async function registrarPagamentoPedidoApi(
  id: number,
  valorRecebido: number,
  formaPagamento: string
): Promise<{ ok: boolean; statusPagamento: string; novoSinal: number }> {
  const res = await fetch(`/api/pedidos/${id}/pagamento`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ valorRecebido, formaPagamento }),
  });
  const data = await readJson<{ ok?: boolean; statusPagamento?: string; novoSinal?: number; erro?: string }>(res);
  if (!res.ok || !data.ok) throw new Error(data.erro || "Erro ao registrar pagamento");
  return { ok: true, statusPagamento: data.statusPagamento!, novoSinal: data.novoSinal! };
}

export async function deletePedido(id: number): Promise<void> {
  const res = await fetch(`/api/pedidos/${id}`, { method: "DELETE", credentials: "include" });
  const data = await readJson<{ ok?: boolean; erro?: string }>(res);
  if (!res.ok || !data.ok) throw new Error(data.erro || "Erro ao excluir pedido");
}



