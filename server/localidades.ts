/**
 * ============================================================================
 * PROJETO: Doce Gestor - Sistema de Gestão para Confeitarias
 * REPOSITÓRIO: https://github.com/junin1737/confeitaria
 * ARQUIVO: server/localidades.ts
 * DESCRIÇÃO: Serviços geográficos, integração com IBGE e consulta de CEP (ViaCEP).
 * ============================================================================
 * 
 * [ARQUITETURA DE DADOS GEOGRÁFICOS]
 * 1. Estados (UF): 27 estados pré-cadastrados na tb_estado.
 * 2. Cidades (Municípios): Carregamento dinâmico 'lazy-load' via API oficial do IBGE.
 *    Quando o usuário seleciona um estado pela primeira vez, as cidades daquele estado
 *    são baixadas e cacheadas na tb_cidade via lote (batch).
 * 3. Consulta de CEP (ViaCEP): Busca automática de logradouro, bairro, cidade e UF.
 *    Distingue CEPs de logradouro de CEPs genéricos de município (com aviso ao usuário).
 * ============================================================================
 */

import { db } from "./db/client";

/**
 * [CONTRATO DE RESPOSTA: ViaCep]
 * Formato retornado pelo web service público ViaCEP.
 */
type ViaCep = {
  erro?: boolean | string;
  cep?: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
};

/**
 * [FUNÇÃO: listarEstados]
 * Retorna todos os 27 estados brasileiros ordenados alfabeticamente por nome.
 */
export async function listarEstados() {
  const result = await db.execute("SELECT id, sigla, nome FROM tb_estado ORDER BY nome");
  return result.rows.map((row) => ({
    id: Number(row.id),
    sigla: String(row.sigla),
    nome: String(row.nome),
  }));
}

/**
 * [FUNÇÃO: importarCidades]
 * Integração com a API de Localidades do IBGE.
 * Baixa todos os municípios da UF e insere em lote (batch write) na tb_cidade.
 */
async function importarCidades(estadoId: number, sigla: string) {
  const response = await fetch(
    `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${sigla}/municipios`,
  );
  if (!response.ok) {
    throw new Error("Não foi possível carregar as cidades desta UF.");
  }
  const municipios = (await response.json()) as { nome: string }[];
  const statements = municipios.map((municipio) => ({
    sql: "INSERT OR IGNORE INTO tb_cidade (estado_id, nome) VALUES (?, ?)",
    args: [estadoId, municipio.nome],
  }));
  if (statements.length > 0) {
    await db.batch(statements, "write");
  }
}

/**
 * [FUNÇÃO: listarCidades]
 * Consulta as cidades de uma UF no banco local.
 * Caso ainda não tenham sido importadas, realiza a sincronização com o IBGE sob demanda.
 */
export async function listarCidades(estadoId: number) {
  const estado = await db.execute({
    sql: "SELECT id, sigla FROM tb_estado WHERE id = ?",
    args: [estadoId],
  });
  const row = estado.rows[0];
  if (!row) return [];

  let cidades = await db.execute({
    sql: "SELECT id, nome FROM tb_cidade WHERE estado_id = ? ORDER BY nome",
    args: [estadoId],
  });

  // Lazy-load: importa do IBGE caso não haja registros locais
  if (cidades.rows.length === 0) {
    await importarCidades(estadoId, String(row.sigla));
    cidades = await db.execute({
      sql: "SELECT id, nome FROM tb_cidade WHERE estado_id = ? ORDER BY nome",
      args: [estadoId],
    });
  }

  return cidades.rows.map((cidade) => ({
    id: Number(cidade.id),
    nome: String(cidade.nome),
  }));
}

/**
 * [FUNÇÃO: encontrarCidade]
 * Localiza o registro interno da cidade a partir da sigla da UF e do nome do município.
 */
async function encontrarCidade(uf: string, nome: string) {
  const estado = await db.execute({
    sql: "SELECT id, sigla FROM tb_estado WHERE sigla = ?",
    args: [uf.toUpperCase()],
  });
  const row = estado.rows[0];
  if (!row) return null;
  const estadoId = Number(row.id);
  await listarCidades(estadoId);
  const cidade = await db.execute({
    sql: `SELECT id, nome FROM tb_cidade
          WHERE estado_id = ? AND lower(nome) = lower(?)
          LIMIT 1`,
    args: [estadoId, nome.trim()],
  });
  const found = cidade.rows[0];
  if (!found) {
    return { ufId: estadoId, ufSigla: String(row.sigla), cidadeId: null, cidadeNome: nome };
  }
  return {
    ufId: estadoId,
    ufSigla: String(row.sigla),
    cidadeId: Number(found.id),
    cidadeNome: String(found.nome),
  };
}

/**
 * [FUNÇÃO: consultarCep]
 * Realiza consulta externa no ViaCEP, valida os 8 dígitos e correlaciona
 * a resposta com os IDs internos de UF e Cidade para preenchimento de formulários.
 */
export async function consultarCep(cep: string) {
  const digits = cep.replace(/\D/g, "");
  if (digits.length !== 8) {
    return { ok: false as const, erro: "Informe um CEP com 8 dígitos." };
  }

  const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
  if (!response.ok) {
    return { ok: false as const, erro: "Não foi possível consultar o CEP agora." };
  }
  const data = (await response.json()) as ViaCep;
  if (data.erro === true || data.erro === "true") {
    return { ok: false as const, erro: "CEP inválido." };
  }

  const localidade = String(data.localidade ?? "").trim();
  const uf = String(data.uf ?? "").trim();
  if (!localidade || !uf) {
    return { ok: false as const, erro: "CEP inválido." };
  }

  const logradouro = String(data.logradouro ?? "").trim();
  const bairro = String(data.bairro ?? "").trim();
  const generico = !logradouro;
  const cidade = await encontrarCidade(uf, localidade);

  return {
    ok: true as const,
    generico,
    cep: digits,
    logradouro,
    bairro,
    complemento: String(data.complemento ?? "").trim(),
    ufId: cidade?.ufId ?? null,
    ufSigla: cidade?.ufSigla ?? uf,
    cidadeId: cidade?.cidadeId ?? null,
    cidadeNome: cidade?.cidadeNome ?? localidade,
    mensagem: generico
      ? "CEP genérico: preenchemos somente a cidade e a UF."
      : undefined,
  };
}
