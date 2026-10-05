/**
 * ============================================================================
 * PROJETO: Doce Gestor - Sistema de Gestão para Confeitarias
 * REPOSITÓRIO: https://github.com/junin1737/confeitaria
 * ARQUIVO: server/funcionarios.ts
 * DESCRIÇÃO: Cadastro, validações e regras de negócio de colaboradores.
 * ============================================================================
 * 
 * [REGRAS DE NEGÓCIO IMPLEMENTADAS]
 * 1. Geração sequencial de código interno por empresa (ex: FUNC-001, FUNC-002).
 * 2. Validação matemática de CPF (dígitos verificadores).
 * 3. Validação geográfica estrita: cidade deve obrigatoriamente pertencer à UF informada.
 * 4. Proteção de senha com hash bcrypt (nunca armazena texto puro).
 * 5. Unicidade de CPF restrita ao escopo da empresa (empresa_id).
 * 6. Preservação de colaboradores inativos (nunca exclui do histórico).
 * ============================================================================
 */

import bcrypt from "bcryptjs";
import { db } from "./db/client";

/**
 * [CONTRATO DE DADOS: Funcionario]
 * Modelo completo retornado pela API para visualização e edição.
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

/**
 * [TIPO DE ENTRADA: FuncionarioInput]
 * Campos aceitos no corpo da requisição de criação ou atualização.
 */
type FuncionarioInput = {
  nome?: string;
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
  dataAdmissao?: string;
  dataDemissao?: string;
  salarioFixo?: number | string;
  status?: string;
  senha?: string;
  senhaConfirmacao?: string;
};

/**
 * [FUNÇÕES AUXILIARES DE LIMPEZA E FORMATAÇÃO]
 */
function text(value: unknown) {
  return String(value ?? "").trim();
}

function digits(value: unknown) {
  return text(value).replace(/\D/g, "");
}

function todayISO() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * [FUNÇÃO: validarCpf]
 * Validação algorítmica oficial dos 11 dígitos do CPF brasileiro com verificação
 * de restos mod 11 e rejeição de sequências com dígitos repetidos.
 */
function validarCpf(value: string) {
  if (!value) return true; // CPF não é obrigatório no primeiro instante
  if (value.length !== 11 || /^(\d)\1+$/.test(value)) return false;
  const calc = (size: number) => {
    let sum = 0;
    for (let index = 0; index < size; index += 1) {
      sum += Number(value[index]) * (size + 1 - index);
    }
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return calc(9) === Number(value[9]) && calc(10) === Number(value[10]);
}

/**
 * [FUNÇÃO: mapRow]
 * Mapeia os dados brutos vindos do banco para o tipo tipado Funcionario.
 */
function mapRow(row: Record<string, unknown>): Funcionario {
  return {
    id: Number(row.id),
    codigo: text(row.codigo),
    nome: text(row.nome),
    cpf: text(row.cpf),
    dataNascimento: text(row.data_nascimento),
    email: text(row.email),
    telefone: text(row.telefone),
    celular: text(row.celular),
    cep: text(row.cep),
    logradouro: text(row.logradouro),
    numero: text(row.numero),
    complemento: text(row.complemento),
    bairro: text(row.bairro),
    ufId: row.uf_id == null || row.uf_id === "" ? null : Number(row.uf_id),
    cidadeId: row.cidade_id == null || row.cidade_id === "" ? null : Number(row.cidade_id),
    ufSigla: text(row.uf_sigla),
    cidadeNome: text(row.cidade_nome),
    dataCadastro: text(row.data_cadastro),
    dataAdmissao: text(row.data_admissao),
    dataDemissao: text(row.data_demissao),
    salarioFixo: Number(row.salario_fixo ?? 0),
    status: text(row.status) === "inativo" ? "inativo" : "ativo",
    temSenha: Boolean(text(row.senha_hash)),
  };
}

/**
 * [QUERY BASE: SELECT]
 * Join otimizado com tb_estado e tb_cidade para resolução dos nomes de UF e Município.
 */
const SELECT = `SELECT f.*, e.sigla AS uf_sigla, c.nome AS cidade_nome
  FROM tb_funcionario f
  LEFT JOIN tb_estado e ON e.id = f.uf_id
  LEFT JOIN tb_cidade c ON c.id = f.cidade_id`;

/**
 * [FUNÇÃO: listarFuncionarios]
 * Retorna todos os funcionários da empresa logada, ordenados por status e nome.
 */
export async function listarFuncionarios(empresaId: number) {
  const result = await db.execute({
    sql: `${SELECT} WHERE f.empresa_id = ? ORDER BY f.status ASC, f.nome`,
    args: [empresaId],
  });
  return result.rows.map((row) => mapRow(row as Record<string, unknown>));
}

/**
 * [FUNÇÃO: obterFuncionario]
 * Busca um colaborador específico filtrando por empresa_id e id.
 */
export async function obterFuncionario(empresaId: number, id: number) {
  const result = await db.execute({
    sql: `${SELECT} WHERE f.empresa_id = ? AND f.id = ?`,
    args: [empresaId, id],
  });
  const row = result.rows[0];
  return row ? mapRow(row as Record<string, unknown>) : null;
}

/**
 * [FUNÇÃO: proximoCodigo]
 * Gera o próximo código de identificação interno sequencial da empresa (ex: FUNC-003).
 */
export async function proximoCodigo(empresaId: number) {
  const result = await db.execute({
    sql: "SELECT codigo FROM tb_funcionario WHERE empresa_id = ?",
    args: [empresaId],
  });
  let max = 0;
  for (const row of result.rows) {
    const match = String(row.codigo ?? "").match(/(\d+)\s*$/);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `FUNC-${String(max + 1).padStart(3, "0")}`;
}

/**
 * [FUNÇÃO: cidadePertenceUf]
 * Validação de integridade territorial: garante que a cidade informada pertence ao estado.
 */
async function cidadePertenceUf(cidadeId: number | null, ufId: number | null) {
  if (!cidadeId || !ufId) return !cidadeId;
  const result = await db.execute({
    sql: "SELECT estado_id FROM tb_cidade WHERE id = ?",
    args: [cidadeId],
  });
  return Number(result.rows[0]?.estado_id) === ufId;
}

/**
 * [FUNÇÃO: cpfEmUso]
 * Verifica a duplicidade de CPF dentro da mesma empresa.
 */
async function cpfEmUso(empresaId: number, cpf: string, ignoreId?: number) {
  if (!cpf) return false;
  const result = await db.execute({
    sql: `SELECT id FROM tb_funcionario
          WHERE empresa_id = ? AND cpf = ? AND id != ?`,
    args: [empresaId, cpf, ignoreId ?? 0],
  });
  return Boolean(result.rows[0]);
}

/**
 * [FUNÇÃO: validarPayload]
 * Valida todos os campos submetidos no formulário (nome, CPF, senha, valores).
 */
function validarPayload(body: FuncionarioInput, { criar }: { criar: boolean }) {
  const nome = text(body.nome);
  const cpf = digits(body.cpf);
  const senha = String(body.senha ?? "");
  const senhaConfirmacao = String(body.senhaConfirmacao ?? "");
  const status = text(body.status) === "inativo" ? "inativo" : "ativo";
  const ufId = body.ufId ? Number(body.ufId) : null;
  const cidadeId = body.cidadeId ? Number(body.cidadeId) : null;
  const salarioFixo = Number(String(body.salarioFixo ?? 0).replace(",", "."));

  if (!nome) return { erro: "Informe o nome completo." };
  if (cpf && !validarCpf(cpf)) return { erro: "CPF inválido." };
  if (Number.isNaN(salarioFixo) || salarioFixo < 0) return { erro: "Informe um salário fixo válido." };
  if (senha || senhaConfirmacao || criar) {
    if (criar && !senha) return { erro: "Informe a senha do funcionário." };
    if (senha || senhaConfirmacao) {
      if (senha !== senhaConfirmacao) return { erro: "A senha e a confirmação não conferem." };
      if (senha.length < 4) return { erro: "A senha deve ter pelo menos 4 caracteres." };
    }
  }

  return {
    nome,
    cpf,
    dataNascimento: text(body.dataNascimento),
    email: text(body.email).toLowerCase(),
    telefone: digits(body.telefone),
    celular: digits(body.celular),
    cep: digits(body.cep).slice(0, 8),
    logradouro: text(body.logradouro),
    numero: text(body.numero),
    complemento: text(body.complemento),
    bairro: text(body.bairro),
    ufId,
    cidadeId,
    dataAdmissao: text(body.dataAdmissao),
    dataDemissao: text(body.dataDemissao),
    salarioFixo,
    status,
    senha: senha || "",
  };
}

/**
 * [FUNÇÃO: criarFuncionario]
 * Insere um novo colaborador com validação de cidade/UF, duplicidade de CPF e hash de senha.
 */
export async function criarFuncionario(empresaId: number, body: FuncionarioInput) {
  const parsed = validarPayload(body, { criar: true });
  if ("erro" in parsed) return parsed;
  if (!(await cidadePertenceUf(parsed.cidadeId, parsed.ufId))) {
    return { erro: "A cidade selecionada não pertence à UF informada." };
  }
  if (await cpfEmUso(empresaId, parsed.cpf)) {
    return { erro: "Já existe um funcionário com este CPF." };
  }

  const codigo = await proximoCodigo(empresaId);
  const senhaHash = bcrypt.hashSync(parsed.senha, 10);
  const created = await db.execute({
    sql: `INSERT INTO tb_funcionario (
            empresa_id, codigo, nome, cpf, data_nascimento, data_cadastro, email, telefone, celular,
            cep, logradouro, numero, complemento, bairro, uf_id, cidade_id,
            data_admissao, data_demissao, salario_fixo, status, senha_hash
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      empresaId,
      codigo,
      parsed.nome,
      parsed.cpf || null,
      parsed.dataNascimento || null,
      todayISO(),
      parsed.email || null,
      parsed.telefone || null,
      parsed.celular || null,
      parsed.cep || null,
      parsed.logradouro || null,
      parsed.numero || null,
      parsed.complemento || null,
      parsed.bairro || null,
      parsed.ufId,
      parsed.cidadeId,
      parsed.dataAdmissao || null,
      parsed.dataDemissao || null,
      parsed.salarioFixo,
      parsed.status,
      senhaHash,
    ],
  });
  return obterFuncionario(empresaId, Number(created.lastInsertRowid));
}

/**
 * [FUNÇÃO: atualizarFuncionario]
 * Atualiza os dados cadastrais do colaborador, preservando o código interno e histórico.
 */
export async function atualizarFuncionario(empresaId: number, id: number, body: FuncionarioInput) {
  const atual = await obterFuncionario(empresaId, id);
  if (!atual) return { erro: "Funcionário não encontrado." };

  const parsed = validarPayload(body, { criar: false });
  if ("erro" in parsed) return parsed;
  if (!(await cidadePertenceUf(parsed.cidadeId, parsed.ufId))) {
    return { erro: "A cidade selecionada não pertence à UF informada." };
  }
  if (await cpfEmUso(empresaId, parsed.cpf, id)) {
    return { erro: "Já existe um funcionário com este CPF." };
  }

  const senhaHash = parsed.senha ? bcrypt.hashSync(parsed.senha, 10) : undefined;
  await db.execute({
    sql: `UPDATE tb_funcionario SET
            nome = ?, cpf = ?, data_nascimento = ?, email = ?, telefone = ?, celular = ?,
            cep = ?, logradouro = ?, numero = ?, complemento = ?, bairro = ?, uf_id = ?, cidade_id = ?,
            data_admissao = ?, data_demissao = ?, salario_fixo = ?, status = ?
            ${senhaHash ? ", senha_hash = ?" : ""}
          WHERE empresa_id = ? AND id = ?`,
    args: [
      parsed.nome,
      parsed.cpf || null,
      parsed.dataNascimento || null,
      parsed.email || null,
      parsed.telefone || null,
      parsed.celular || null,
      parsed.cep || null,
      parsed.logradouro || null,
      parsed.numero || null,
      parsed.complemento || null,
      parsed.bairro || null,
      parsed.ufId,
      parsed.cidadeId,
      parsed.dataAdmissao || null,
      parsed.dataDemissao || null,
      parsed.salarioFixo,
      parsed.status,
      ...(senhaHash ? [senhaHash] : []),
      empresaId,
      id,
    ],
  });
  return obterFuncionario(empresaId, id);
}
