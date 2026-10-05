/**
 * ============================================================================
 * PROJETO: Doce Gestor - Sistema de Gestão para Confeitarias
 * REPOSITÓRIO: https://github.com/junin1737/confeitaria
 * ARQUIVO: server/admin.ts
 * DESCRIÇÃO: Gestão administrativa multi-tenant, controle de licenças e seriais.
 * ============================================================================
 * 
 * [REGRAS DE NEGÓCIO DE LICENCIAMENTO]
 * 1. Cada confeitaria possui status (ativa, bloqueada, trial, expirada) e plano.
 * 2. Confeitarias em 'trial' recebem 15 dias de teste grátis por padrão.
 * 3. O administrador Master pode bloquear ou desbloquear empresas a qualquer momento.
 * 4. A verificação de licença ocorre em tempo real no backend através da função
 *    `verificarAcessoEmpresa(id)`, impedindo acessos não autorizados.
 * 5. Expõe dados estruturados para integração remota com sistemas externos.
 * ============================================================================
 */

import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "./db/client";
import { garantirMensagens } from "./mensagens";

/**
 * [CONTRATO DE DADOS: EmpresaAdmin]
 * Representação completa de uma confeitaria no Painel Master e APIs externas.
 */
export type EmpresaAdmin = {
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

/**
 * [FUNÇÃO: gerarSerial]
 * Gera uma chave serial criptograficamente segura no formato:
 * DG-XXXX-YYYY-ANO (Exemplo: DG-4F9A-B23C-2026).
 */
export function gerarSerial(prefixo = "DG"): string {
  const bloco1 = randomBytes(2).toString("hex").toUpperCase();
  const bloco2 = randomBytes(2).toString("hex").toUpperCase();
  const ano = new Date().getFullYear();
  return `${prefixo}-${bloco1}-${bloco2}-${ano}`;
}

/**
 * [FUNÇÃO: gerarSlug]
 * Normaliza o nome do ateliê para uso em URLs amigáveis do futuro cardápio público
 * (Ex: "Ateliê Açúcar & Afeto" -> "atelie-acucar-afeto").
 */
export function gerarSlug(nome: string): string {
  return nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

/**
 * [FUNÇÃO AUXILIAR: calcularDiasRestantes]
 * Calcula o saldo de dias até a data de expiração da licença da confeitaria.
 */
function calcularDiasRestantes(expiraEm: string | null): number | null {
  if (!expiraEm) return null;
  const diffMs = new Date(expiraEm).getTime() - Date.now();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * [FUNÇÃO: listarEmpresasAdmin]
 * Retorna a listagem consolidada de todas as confeitarias cadastradas no sistema,
 * acompanhadas de contagem de funcionários, usuários vinculados e total faturado.
 */
export async function listarEmpresasAdmin(): Promise<EmpresaAdmin[]> {
  const result = await db.execute(`
    SELECT 
      e.id, e.nome, e.email, e.telefone, e.documento, e.status, 
      COALESCE(e.plano, 'trial') AS plano, 
      e.serial_key, e.expira_em, e.motivo_bloqueio, e.slug, e.criado_em,
      (SELECT COUNT(*) FROM tb_usuario u WHERE u.empresa_id = e.id) AS total_usuarios,
      (SELECT COUNT(*) FROM tb_funcionario f WHERE f.empresa_id = e.id) AS total_funcionarios,
      (SELECT COALESCE(SUM(v.valor), 0) FROM tb_venda_grupo v WHERE v.empresa_id = e.id) AS total_vendas
    FROM tb_empresa e
    ORDER BY e.id DESC
  `);

  return result.rows.map((row) => {
    const expiraEm = row.expira_em ? String(row.expira_em) : null;
    const plano = String(row.plano);
    let status = String(row.status) as EmpresaAdmin["status"];
    const dias = calcularDiasRestantes(expiraEm);

    // Ajusta o status visual caso o prazo tenha expirado e não seja vitalício
    if (plano !== "vitalicio" && dias !== null && dias < 0 && status !== "bloqueada") {
      status = "expirada";
    }

    const licencaValida = status === "ativa" || (status === "trial" && (dias === null || dias >= 0));

    return {
      id: Number(row.id),
      nome: String(row.nome),
      email: row.email ? String(row.email) : null,
      telefone: row.telefone ? String(row.telefone) : null,
      documento: row.documento ? String(row.documento) : null,
      status,
      plano,
      serialKey: row.serial_key ? String(row.serial_key) : null,
      expiraEm,
      motivoBloqueio: row.motivo_bloqueio ? String(row.motivo_bloqueio) : null,
      slug: row.slug ? String(row.slug) : null,
      criadoEm: String(row.criado_em),
      totalUsuarios: Number(row.total_usuarios),
      totalFuncionarios: Number(row.total_funcionarios),
      totalVendas: Number(row.total_vendas),
      diasRestantes: dias,
      licencaValida,
    };
  });
}

/**
 * [FUNÇÃO: obterEmpresaAdmin]
 * Busca uma empresa específica pelo seu ID para detalhamento.
 */
export async function obterEmpresaAdmin(id: number): Promise<EmpresaAdmin | null> {
  const empresas = await listarEmpresasAdmin();
  return empresas.find((e) => e.id === id) ?? null;
}

/**
 * [FUNÇÃO: criarEmpresaAdmin]
 * Provisiona uma nova empresa (tenant) completa no sistema:
 * 1. Insere o registro na tb_empresa com status 'ativa', plano e serial.
 * 2. Cria o usuário administrador vinculado com credenciais criptografadas.
 * 3. Inicializa os templates padrão de mensagens e configurações.
 */
export async function criarEmpresaAdmin(dados: {
  nome: string;
  email: string;
  telefone?: string;
  documento?: string;
  plano?: string;
  diasValidade?: number;
  senhaAdmin?: string;
}) {
  const nome = dados.nome.trim();
  const email = dados.email.trim().toLowerCase();
  if (!nome || !email) {
    return { erro: "Nome da empresa e e-mail são obrigatórios." };
  }

  // Impede duplicidade de e-mail no sistema
  const check = await db.execute({
    sql: "SELECT id FROM tb_usuario WHERE login = ? OR email = ?",
    args: [email, email],
  });
  if (check.rows.length > 0) {
    return { erro: "Já existe uma empresa cadastrada com este e-mail." };
  }

  const plano = dados.plano || "trial";
  const dias = dados.diasValidade ?? (plano === "trial" ? 15 : 30);
  const dataExpira = new Date(Date.now() + dias * 24 * 60 * 60 * 1000).toISOString();
  const serial = gerarSerial();
  const slug = gerarSlug(nome);
  const agora = new Date().toISOString();

  // Insere a empresa
  const insertEmpresa = await db.execute({
    sql: `INSERT INTO tb_empresa (nome, email, telefone, documento, status, plano, serial_key, expira_em, slug, criado_em)
          VALUES (?, ?, ?, ?, 'ativa', ?, ?, ?, ?, ?)`,
    args: [
      nome,
      email,
      dados.telefone?.trim() ?? null,
      dados.documento?.trim() ?? null,
      plano,
      serial,
      dataExpira,
      slug,
      agora,
    ],
  });

  const empresaId = Number(insertEmpresa.lastInsertRowid);
  const senhaPura = dados.senhaAdmin?.trim() || "123456";
  const senhaHash = bcrypt.hashSync(senhaPura, 10);

  // Cria usuário administrador do ateliê
  await db.execute({
    sql: `INSERT INTO tb_usuario (empresa_id, login, email, nome, senha_hash, perfil, status, criado_em)
          VALUES (?, ?, ?, ?, ?, 'admin', 'ativo', ?)`,
    args: [empresaId, email, email, `Admin ${nome}`, senhaHash, agora],
  });

  // Provisiona mensagens e dados iniciais
  await garantirMensagens(empresaId);

  return {
    ok: true,
    empresaId,
    nome,
    email,
    serial,
    expiraEm: dataExpira,
    senhaInicial: senhaPura,
  };
}

/**
 * [FUNÇÃO: alterarStatusEmpresa]
 * Altera o status de acesso da confeitaria para 'ativa', 'bloqueada' ou 'trial'.
 * Permite registrar um motivo de bloqueio e atualizar a data de expiração.
 */
export async function alterarStatusEmpresa(
  id: number,
  status: "ativa" | "bloqueada" | "trial",
  motivo?: string,
  diasValidade?: number,
) {
  let expiraEmNova: string | null = null;
  if (diasValidade && diasValidade > 0) {
    expiraEmNova = new Date(Date.now() + diasValidade * 24 * 60 * 60 * 1000).toISOString();
  }

  if (expiraEmNova) {
    await db.execute({
      sql: `UPDATE tb_empresa 
            SET status = ?, motivo_bloqueio = ?, expira_em = ?
            WHERE id = ?`,
      args: [status, motivo ?? null, expiraEmNova, id],
    });
  } else {
    await db.execute({
      sql: `UPDATE tb_empresa 
            SET status = ?, motivo_bloqueio = ?
            WHERE id = ?`,
      args: [status, motivo ?? null, id],
    });
  }

  return { ok: true, id, status, motivo: motivo ?? null, expiraEm: expiraEmNova };
}

/**
 * [FUNÇÃO: prorrogarLicencaEmpresa]
 * Adiciona dias de validade à licença da confeitaria (ex: +30 dias, +365 dias)
 * e reativa o status para 'ativa', limpando motivos de bloqueio prévios.
 */
export async function prorrogarLicencaEmpresa(id: number, dias: number, novoPlano?: string) {
  const result = await db.execute({
    sql: "SELECT expira_em, plano FROM tb_empresa WHERE id = ?",
    args: [id],
  });
  if (!result.rows[0]) return { erro: "Empresa não encontrada." };

  const atual = result.rows[0].expira_em ? new Date(String(result.rows[0].expira_em)).getTime() : Date.now();
  const baseDate = atual > Date.now() ? atual : Date.now();
  const novaData = new Date(baseDate + dias * 24 * 60 * 60 * 1000).toISOString();
  const plano = novoPlano || String(result.rows[0].plano || "mensal");

  await db.execute({
    sql: `UPDATE tb_empresa 
          SET status = 'ativa', expira_em = ?, plano = ?, motivo_bloqueio = NULL 
          WHERE id = ?`,
    args: [novaData, plano, id],
  });

  return { ok: true, id, expiraEm: novaData, plano, status: "ativa" };
}

/**
 * [FUNÇÃO: renovarSerialEmpresa]
 * Gera e atribui uma nova chave serial para a confeitaria selecionada.
 */
export async function renovarSerialEmpresa(id: number, plano?: string) {
  const novoSerial = gerarSerial();
  await db.execute({
    sql: `UPDATE tb_empresa 
          SET serial_key = ?, plano = COALESCE(?, plano)
          WHERE id = ?`,
    args: [novoSerial, plano ?? null, id],
  });
  return { ok: true, id, serialKey: novoSerial };
}

/**
 * [FUNÇÃO: verificarAcessoEmpresa]
 * Avalia em tempo real se a empresa possui permissão para transacionar no sistema.
 * Retorna se o acesso está permitido, o status atual e o motivo de eventual bloqueio.
 */
export async function verificarAcessoEmpresa(empresaId: number): Promise<{
  permitido: boolean;
  motivo?: string;
  status: string;
}> {
  const result = await db.execute({
    sql: "SELECT status, plano, expira_em, motivo_bloqueio FROM tb_empresa WHERE id = ?",
    args: [empresaId],
  });
  const row = result.rows[0];
  if (!row) {
    return { permitido: false, status: "inexistente", motivo: "Empresa não cadastrada." };
  }

  const status = String(row.status);
  const plano = String(row.plano || "trial");
  const expiraEm = row.expira_em ? String(row.expira_em) : null;
  const motivoBloqueio = row.motivo_bloqueio ? String(row.motivo_bloqueio) : undefined;

  // Bloqueio explícito administrativo
  if (status === "bloqueada") {
    return {
      permitido: false,
      status: "bloqueada",
      motivo: motivoBloqueio || "Acesso suspenso pelo administrador.",
    };
  }

  // Verificação de expiração temporal
  if (plano !== "vitalicio" && expiraEm) {
    const vencido = new Date(expiraEm).getTime() < Date.now();
    if (vencido) {
      return {
        permitido: false,
        status: "expirada",
        motivo: "O período de licença da sua empresa expirou. Entre em contato para renovar.",
      };
    }
  }

  return { permitido: true, status };
}
