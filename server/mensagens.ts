/**
 * ============================================================================
 * PROJETO: Doce Gestor - Sistema de Gestão para Confeitarias
 * REPOSITÓRIO: https://github.com/junin1737/confeitaria
 * ARQUIVO: server/mensagens.ts
 * DESCRIÇÃO: Gestão de templates de mensagens e aniversariantes do dia (WhatsApp).
 * ============================================================================
 * 
 * [FUNCIONALIDADES IMPLEMENTADAS]
 * 1. Templates customizáveis de mensagens de felicitação e pedidos.
 * 2. Suporte a variáveis dinâmicas ({nome}, {empresa}) para interpolação.
 * 3. Identificação em tempo real de aniversariantes do dia comparando MM-DD
 *    da data de nascimento dos colaboradores da confeitaria.
 * ============================================================================
 */

import { db } from "./db/client";

/**
 * [CONTRATO DE DADOS: Mensagem]
 * Estrutura de template com chave única por empresa, título e texto com placeholders.
 */
export type Mensagem = {
  chave: string;
  titulo: string;
  texto: string;
};

/**
 * [TEMPLATES PADRÃO INICIAIS]
 */
const DEFAULTS: Mensagem[] = [
  {
    chave: "aniversario",
    titulo: "Aniversário",
    texto:
      "Olá, {nome}! Feliz aniversário! Que o seu dia seja leve, doce e cheio de carinho. Com afeto, {empresa}.",
  },
];

/**
 * [FUNÇÃO AUXILIAR: mapRow]
 * Mapeia os dados da tabela tb_mensagem para a tipagem Mensagem.
 */
function mapRow(row: Record<string, unknown>): Mensagem {
  return {
    chave: String(row.chave ?? ""),
    titulo: String(row.titulo ?? ""),
    texto: String(row.texto ?? ""),
  };
}

/**
 * [FUNÇÃO: garantirMensagens]
 * Assegura que cada empresa recém-criada possua os templates de mensagem padrão cadastrados.
 */
export async function garantirMensagens(empresaId: number) {
  for (const item of DEFAULTS) {
    await db.execute({
      sql: `INSERT OR IGNORE INTO tb_mensagem (empresa_id, chave, titulo, texto)
            VALUES (?, ?, ?, ?)`,
      args: [empresaId, item.chave, item.titulo, item.texto],
    });
  }
}

/**
 * [FUNÇÃO: listarMensagens]
 * Retorna todos os templates de mensagem da confeitaria logada.
 */
export async function listarMensagens(empresaId: number) {
  await garantirMensagens(empresaId);
  const result = await db.execute({
    sql: `SELECT chave, titulo, texto FROM tb_mensagem WHERE empresa_id = ? ORDER BY titulo`,
    args: [empresaId],
  });
  return result.rows.map((row) => mapRow(row as Record<string, unknown>));
}

/**
 * [FUNÇÃO: obterMensagem]
 * Busca um template específico através da chave (ex: 'aniversario').
 */
export async function obterMensagem(empresaId: number, chave: string) {
  await garantirMensagens(empresaId);
  const result = await db.execute({
    sql: `SELECT chave, titulo, texto FROM tb_mensagem WHERE empresa_id = ? AND chave = ?`,
    args: [empresaId, chave],
  });
  const row = result.rows[0];
  return row ? mapRow(row as Record<string, unknown>) : null;
}

/**
 * [FUNÇÃO: salvarMensagem]
 * Atualiza o título e o texto de um template pré-existente.
 */
export async function salvarMensagem(empresaId: number, chave: string, titulo: string, texto: string) {
  const nome = titulo.trim();
  const corpo = texto.trim();
  if (!nome) return { erro: "Informe o nome da mensagem." };
  if (!corpo) return { erro: "Informe o texto da mensagem." };
  await garantirMensagens(empresaId);
  const existing = await obterMensagem(empresaId, chave);
  if (!existing) return { erro: "Mensagem não encontrada." };
  await db.execute({
    sql: `UPDATE tb_mensagem SET titulo = ?, texto = ? WHERE empresa_id = ? AND chave = ?`,
    args: [nome, corpo, empresaId, chave],
  });
  return obterMensagem(empresaId, chave);
}

/**
 * [CONTRATO DE DADOS: Aniversariante]
 * Dados do colaborador aniversariante para montagem do card de felicitação no Dashboard.
 */
export type Aniversariante = {
  id: number;
  nome: string;
  celular: string;
  dataNascimento: string;
  idade: number;
  origem: "funcionario";
};

/**
 * [FUNÇÃO: aniversariantesDoDia]
 * Filtra colaboradores ativos da empresa que fazem aniversário na data informada (mês e dia).
 */
export async function aniversariantesDoDia(empresaId: number, hoje: string): Promise<Aniversariante[]> {
  const mmdd = hoje.slice(5, 10);
  const result = await db.execute({
    sql: `SELECT id, nome, celular, data_nascimento
          FROM tb_funcionario
          WHERE empresa_id = ?
            AND status = 'ativo'
            AND data_nascimento IS NOT NULL
            AND data_nascimento != ''
            AND substr(data_nascimento, 6, 5) = ?
          ORDER BY nome`,
    args: [empresaId, mmdd],
  });
  const year = Number(hoje.slice(0, 4));
  return result.rows.map((row) => {
    const nascimento = String(row.data_nascimento ?? "");
    const nascimentoAno = Number(nascimento.slice(0, 4));
    return {
      id: Number(row.id),
      nome: String(row.nome ?? ""),
      celular: String(row.celular ?? ""),
      dataNascimento: nascimento,
      idade: nascimentoAno ? year - nascimentoAno : 0,
      origem: "funcionario" as const,
    };
  });
}
