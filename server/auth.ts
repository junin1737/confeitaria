/**
 * ============================================================================
 * PROJETO: Doce Gestor - Sistema de Gestão para Confeitarias
 * REPOSITÓRIO: https://github.com/junin1737/confeitaria
 * ARQUIVO: server/auth.ts
 * DESCRIÇÃO: Autenticação, controle de sessões e resolução de dados de usuário.
 * ============================================================================
 * 
 * [MECANISMO DE AUTENTICAÇÃO]
 * 1. Suporte duplo a login por nome de usuário ou e-mail corporativo.
 * 2. Criptografia de senhas utilizando bcrypt com salt rounds = 10.
 * 3. Sessões baseadas em tokens randômicos criptográficos (randomBytes(32))
 *    armazenadas em cookies HttpOnly e validadas contra a tabela tb_sessao.
 * 4. Carrega metadados da licença (status, plano, serial e data de expiração)
 *    diretamente no contexto do usuário autenticado.
 * ============================================================================
 */

import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "./db/client";

/**
 * [TIPO: UsuarioSessao]
 * Contrato de dados retornado após autenticação bem-sucedida.
 * Carrega a identificação do usuário e os dados da confeitaria a que ele pertence.
 */
export type UsuarioSessao = {
  id: number;
  empresaId: number;
  empresaNome: string;
  empresaStatus: string;
  empresaPlano: string;
  empresaExpiraEm: string | null;
  empresaSerial: string | null;
  login: string;
  email: string | null;
  nome: string;
  perfil: string;
};

/**
 * [FUNÇÃO AUXILIAR: addDays]
 * Calcula a data de expiração da sessão somando N dias à data atual.
 */
function addDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

/**
 * [FUNÇÃO: autenticar]
 * Valida as credenciais enviadas (usuário/e-mail e senha).
 * Verifica se o usuário e a empresa estão ativos e valida o hash da senha via bcrypt.
 */
export async function autenticar(loginOrEmail: string, senha: string): Promise<UsuarioSessao | null> {
  const cleanLogin = loginOrEmail.trim().toLowerCase();

  // Consulta o usuário pelo login OU pelo e-mail com junção na empresa
  const result = await db.execute({
    sql: `SELECT u.id, u.empresa_id, u.login, u.email, u.nome, u.senha_hash, u.perfil, u.status, 
                 e.nome AS empresa_nome, e.status AS empresa_status, COALESCE(e.plano, 'trial') AS empresa_plano,
                 e.expira_em AS empresa_expira_em, e.serial_key AS empresa_serial
          FROM tb_usuario u
          INNER JOIN tb_empresa e ON e.id = u.empresa_id
          WHERE LOWER(u.login) = ? OR LOWER(COALESCE(u.email, '')) = ?`,
    args: [cleanLogin, cleanLogin],
  });

  const row = result.rows[0];
  if (!row || String(row.status) !== "ativo") return null;

  // Compara a senha fornecida com o hash bcrypt armazenado
  const ok = bcrypt.compareSync(senha, String(row.senha_hash));
  if (!ok) return null;

  return {
    id: Number(row.id),
    empresaId: Number(row.empresa_id),
    empresaNome: String(row.empresa_nome),
    empresaStatus: String(row.empresa_status || "ativa"),
    empresaPlano: String(row.empresa_plano || "trial"),
    empresaExpiraEm: row.empresa_expira_em ? String(row.empresa_expira_em) : null,
    empresaSerial: row.empresa_serial ? String(row.empresa_serial) : null,
    login: String(row.login),
    email: row.email ? String(row.email) : null,
    nome: String(row.nome),
    perfil: String(row.perfil),
  };
}

/**
 * [FUNÇÃO: criarSessao]
 * Gera um token hexadecimal criptograficamente seguro e persiste o registro na tb_sessao.
 */
export async function criarSessao(usuarioId: number, dias = 7) {
  const id = randomBytes(32).toString("hex");
  await db.execute({
    sql: "INSERT INTO tb_sessao (id, usuario_id, criado_em, expira_em) VALUES (?, ?, ?, ?)",
    args: [id, usuarioId, new Date().toISOString(), addDays(dias)],
  });
  return id;
}

/**
 * [FUNÇÃO: obterUsuarioPorSessao]
 * Recupera e valida o usuário a partir do token de sessão armazenado no cookie.
 * Caso a sessão tenha expirado, remove o registro do banco e retorna null.
 */
export async function obterUsuarioPorSessao(sessaoId: string | undefined): Promise<UsuarioSessao | null> {
  if (!sessaoId) return null;

  const result = await db.execute({
    sql: `SELECT u.id, u.empresa_id, u.login, u.email, u.nome, u.perfil, u.status, 
                 e.nome AS empresa_nome, e.status AS empresa_status, COALESCE(e.plano, 'trial') AS empresa_plano,
                 e.expira_em AS empresa_expira_em, e.serial_key AS empresa_serial,
                 s.expira_em
          FROM tb_sessao s
          INNER JOIN tb_usuario u ON u.id = s.usuario_id
          INNER JOIN tb_empresa e ON e.id = u.empresa_id
          WHERE s.id = ?`,
    args: [sessaoId],
  });

  const row = result.rows[0];
  if (!row) return null;
  if (String(row.status) !== "ativo") return null;

  // Expiração temporal da sessão
  if (new Date(String(row.expira_em)).getTime() < Date.now()) {
    await db.execute({ sql: "DELETE FROM tb_sessao WHERE id = ?", args: [sessaoId] });
    return null;
  }

  return {
    id: Number(row.id),
    empresaId: Number(row.empresa_id),
    empresaNome: String(row.empresa_nome),
    empresaStatus: String(row.empresa_status || "ativa"),
    empresaPlano: String(row.empresa_plano || "trial"),
    empresaExpiraEm: row.empresa_expira_em ? String(row.empresa_expira_em) : null,
    empresaSerial: row.empresa_serial ? String(row.empresa_serial) : null,
    login: String(row.login),
    email: row.email ? String(row.email) : null,
    nome: String(row.nome),
    perfil: String(row.perfil),
  };
}

/**
 * [FUNÇÃO: encerrarSessao]
 * Invalida a sessão ativa removendo o registro correspondente da tb_sessao.
 */
export async function encerrarSessao(sessaoId: string | undefined) {
  if (!sessaoId) return;
  await db.execute({ sql: "DELETE FROM tb_sessao WHERE id = ?", args: [sessaoId] });
}
