/**
 * ============================================================================
 * PROJETO: Doce Gestor - Sistema de Gestão para Confeitarias
 * REPOSITÓRIO: https://github.com/junin1737/confeitaria
 * ARQUIVO: server/cadastros.ts
 * DESCRIÇÃO: FASE 1 — Cadastros Padrão: Produtos c/ Ficha Técnica, Clientes,
 *            Fornecedores, Grupos e Subgrupos de Produtos.
 * ============================================================================
 * 
 * [REGRAS DE NEGÓCIO IMPLEMENTADAS]
 * 1. Produto unificado com sua Ficha Técnica / Receita:
 *    - Os dados cadastrais (nome, código, grupo, subgrupo, unidade de venda, fotos)
 *      convivem diretamente com sua composição de insumos e mão de obra.
 * 2. Cálculo automatizado do custo de produção e margem no próprio produto.
 * 3. Cadastro completo de Clientes com histórico de contato, aniversário e busca de CEP.
 * 4. Cadastro de Fornecedores vinculado ao fornecimento de insumos e embalagens.
 * 5. Grupos e Subgrupos para categorização e organização do cardápio e relatórios.
 * ============================================================================
 */

import { db } from "./db/client";
import { calcularTotaisReceita } from "./precificacao";

const NOW = () => new Date().toISOString();

/**
 * ============================================================================
 * [MÓDULO: GRUPOS E SUBGRUPOS DE PRODUTO]
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

export async function listarGrupos(empresaId: number): Promise<GrupoProduto[]> {
  const result = await db.execute({
    sql: `SELECT g.id, g.nome, g.cor,
                 (SELECT COUNT(*) FROM tb_subgrupo_produto s WHERE s.grupo_id = g.id) AS total_subgrupos,
                 (SELECT COUNT(*) FROM tb_produto p WHERE p.grupo_id = g.id) AS total_produtos
          FROM tb_grupo_produto g
          WHERE g.empresa_id = ?
          ORDER BY g.nome ASC`,
    args: [empresaId],
  });

  return result.rows.map((row) => ({
    id: Number(row.id),
    nome: String(row.nome),
    cor: String(row.cor),
    totalSubgrupos: Number(row.total_subgrupos ?? 0),
    totalProdutos: Number(row.total_produtos ?? 0),
  }));
}

export async function salvarGrupo(
  empresaId: number,
  dados: { id?: number; nome: string; cor?: string }
) {
  const nome = dados.nome.trim();
  if (!nome) return { erro: "Informe o nome do grupo." };
  const cor = dados.cor?.trim() || "#c96852";

  if (dados.id) {
    await db.execute({
      sql: "UPDATE tb_grupo_produto SET nome = ?, cor = ? WHERE empresa_id = ? AND id = ?",
      args: [nome, cor, empresaId, dados.id],
    });
    return { id: dados.id, nome, cor };
  }

  const created = await db.execute({
    sql: "INSERT INTO tb_grupo_produto (empresa_id, nome, cor) VALUES (?, ?, ?)",
    args: [empresaId, nome, cor],
  });

  return { id: Number(created.lastInsertRowid), nome, cor };
}

export async function excluirGrupo(empresaId: number, id: number) {
  const vinculados = await db.execute({
    sql: "SELECT COUNT(*) AS total FROM tb_produto WHERE empresa_id = ? AND grupo_id = ?",
    args: [empresaId, id],
  });
  if (Number(vinculados.rows[0]?.total ?? 0) > 0) {
    return { erro: "Não é possível excluir este grupo pois existem produtos associados a ele." };
  }

  await db.execute({
    sql: "DELETE FROM tb_subgrupo_produto WHERE empresa_id = ? AND grupo_id = ?",
    args: [empresaId, id],
  });

  await db.execute({
    sql: "DELETE FROM tb_grupo_produto WHERE empresa_id = ? AND id = ?",
    args: [empresaId, id],
  });

  return { ok: true };
}

export async function listarSubgrupos(
  empresaId: number,
  grupoId?: number
): Promise<SubgrupoProduto[]> {
  const sql = grupoId
    ? `SELECT s.id, s.grupo_id, s.nome, g.nome AS grupo_nome
       FROM tb_subgrupo_produto s
       INNER JOIN tb_grupo_produto g ON g.id = s.grupo_id
       WHERE s.empresa_id = ? AND s.grupo_id = ?
       ORDER BY s.nome ASC`
    : `SELECT s.id, s.grupo_id, s.nome, g.nome AS grupo_nome
       FROM tb_subgrupo_produto s
       INNER JOIN tb_grupo_produto g ON g.id = s.grupo_id
       WHERE s.empresa_id = ?
       ORDER BY g.nome ASC, s.nome ASC`;

  const args = grupoId ? [empresaId, grupoId] : [empresaId];
  const result = await db.execute({ sql, args });

  return result.rows.map((row) => ({
    id: Number(row.id),
    grupoId: Number(row.grupo_id),
    grupoNome: String(row.grupo_nome),
    nome: String(row.nome),
  }));
}

export async function salvarSubgrupo(
  empresaId: number,
  dados: { id?: number; grupoId: number; nome: string }
) {
  const nome = dados.nome.trim();
  if (!nome) return { erro: "Informe o nome do subgrupo." };
  if (!dados.grupoId) return { erro: "Selecione o grupo pai." };

  if (dados.id) {
    await db.execute({
      sql: "UPDATE tb_subgrupo_produto SET grupo_id = ?, nome = ? WHERE empresa_id = ? AND id = ?",
      args: [dados.grupoId, nome, empresaId, dados.id],
    });
    return { id: dados.id, grupoId: dados.grupoId, nome };
  }

  const created = await db.execute({
    sql: "INSERT INTO tb_subgrupo_produto (empresa_id, grupo_id, nome) VALUES (?, ?, ?)",
    args: [empresaId, dados.grupoId, nome],
  });

  return { id: Number(created.lastInsertRowid), grupoId: dados.grupoId, nome };
}

export async function excluirSubgrupo(empresaId: number, id: number) {
  const vinculados = await db.execute({
    sql: "SELECT COUNT(*) AS total FROM tb_produto WHERE empresa_id = ? AND subgrupo_id = ?",
    args: [empresaId, id],
  });
  if (Number(vinculados.rows[0]?.total ?? 0) > 0) {
    return { erro: "Não é possível excluir este subgrupo pois existem produtos associados." };
  }

  await db.execute({
    sql: "DELETE FROM tb_subgrupo_produto WHERE empresa_id = ? AND id = ?",
    args: [empresaId, id],
  });

  return { ok: true };
}

/**
 * ============================================================================
 * [MÓDULO: TIPOS DE ITEM]
 * (Insumo, Embalagem, Produto Acabado, Mercadoria p/ Revenda, Semi-acabado)
 * ============================================================================
 */

export type TipoItem = {
  id: number;
  nome: string;
  codigo: string | null;
  descricao: string | null;
  padrao: boolean;
  totalProdutos?: number;
};

export async function listarTiposItem(empresaId: number): Promise<TipoItem[]> {
  const result = await db.execute({
    sql: `SELECT t.id, t.nome, t.codigo, t.descricao, t.padrao,
                 (SELECT COUNT(*) FROM tb_produto p WHERE p.tipo_item_id = t.id) AS total_produtos
          FROM tb_tipo_item t
          WHERE t.empresa_id = ?
          ORDER BY t.padrao DESC, t.nome ASC`,
    args: [empresaId],
  });

  return result.rows.map((row) => ({
    id: Number(row.id),
    nome: String(row.nome),
    codigo: row.codigo ? String(row.codigo) : null,
    descricao: row.descricao ? String(row.descricao) : null,
    padrao: Boolean(row.padrao),
    totalProdutos: Number(row.total_produtos ?? 0),
  }));
}

export async function salvarTipoItem(
  empresaId: number,
  dados: { id?: number; nome: string; codigo?: string; descricao?: string; padrao?: boolean }
) {
  const nome = dados.nome.trim();
  if (!nome) return { erro: "Informe o nome do tipo de item." };

  if (dados.id) {
    await db.execute({
      sql: `UPDATE tb_tipo_item SET nome = ?, codigo = ?, descricao = ?, padrao = ?
            WHERE empresa_id = ? AND id = ?`,
      args: [nome, dados.codigo?.trim() || null, dados.descricao?.trim() || null, dados.padrao ? 1 : 0, empresaId, dados.id],
    });
    return { id: dados.id, nome, codigo: dados.codigo || null, descricao: dados.descricao || null, padrao: Boolean(dados.padrao) };
  }

  const created = await db.execute({
    sql: `INSERT INTO tb_tipo_item (empresa_id, nome, codigo, descricao, padrao, criado_em)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [empresaId, nome, dados.codigo?.trim() || null, dados.descricao?.trim() || null, dados.padrao ? 1 : 0, NOW()],
  });

  return { id: Number(created.lastInsertRowid), nome, codigo: dados.codigo || null, descricao: dados.descricao || null, padrao: Boolean(dados.padrao) };
}

export async function excluirTipoItem(empresaId: number, id: number) {
  const vinculados = await db.execute({
    sql: "SELECT COUNT(*) AS total FROM tb_produto WHERE empresa_id = ? AND tipo_item_id = ?",
    args: [empresaId, id],
  });
  if (Number(vinculados.rows[0]?.total ?? 0) > 0) {
    return { erro: "Não é possível excluir este tipo de item pois existem produtos vinculados a ele." };
  }

  await db.execute({
    sql: "DELETE FROM tb_tipo_item WHERE empresa_id = ? AND id = ?",
    args: [empresaId, id],
  });
  return { ok: true };
}

/**
 * ============================================================================
 * [MÓDULO: FORNECEDORES]
 * ============================================================================
 */

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

export async function proximoCodigoFornecedor(empresaId: number): Promise<string> {
  const result = await db.execute({
    sql: `SELECT codigo FROM tb_fornecedor
          WHERE empresa_id = ? AND codigo LIKE 'FOR-%'
          ORDER BY id DESC LIMIT 1`,
    args: [empresaId],
  });

  if (!result.rows[0]) return "FOR-001";
  const num = parseInt(String(result.rows[0].codigo).replace("FOR-", ""), 10);
  return `FOR-${String((isNaN(num) ? 0 : num) + 1).padStart(3, "0")}`;
}

export async function listarFornecedores(empresaId: number): Promise<Fornecedor[]> {
  const result = await db.execute({
    sql: `SELECT f.*, c.nome AS cidade_nome, e.sigla AS uf_sigla
          FROM tb_fornecedor f
          LEFT JOIN tb_cidade c ON c.id = f.cidade_id
          LEFT JOIN tb_estado e ON e.id = c.estado_id
          WHERE f.empresa_id = ?
          ORDER BY f.razao_social ASC`,
    args: [empresaId],
  });

  return result.rows.map((row) => ({
    id: Number(row.id),
    codigo: String(row.codigo),
    razaoSocial: String(row.razao_social),
    nomeFantasia: row.nome_fantasia ? String(row.nome_fantasia) : null,
    cnpjCpf: row.cnpj_cpf ? String(row.cnpj_cpf) : null,
    telefone: row.telefone ? String(row.telefone) : null,
    celular: row.celular ? String(row.celular) : null,
    email: row.email ? String(row.email) : null,
    contato: row.contato ? String(row.contato) : null,
    cep: row.cep ? String(row.cep) : null,
    logradouro: row.logradouro ? String(row.logradouro) : null,
    numero: row.numero ? String(row.numero) : null,
    complemento: row.complemento ? String(row.complemento) : null,
    bairro: row.bairro ? String(row.bairro) : null,
    cidadeId: row.cidade_id ? Number(row.cidade_id) : null,
    cidadeNome: row.cidade_nome ? String(row.cidade_nome) : null,
    ufSigla: row.uf_sigla ? String(row.uf_sigla) : null,
    status: (row.status ?? "ativo") as "ativo" | "inativo",
    observacoes: row.observacoes ? String(row.observacoes) : null,
    criadoEm: String(row.criado_em),
  }));
}

export async function obterFornecedor(empresaId: number, id: number): Promise<Fornecedor | null> {
  const lista = await listarFornecedores(empresaId);
  return lista.find((f) => f.id === id) ?? null;
}

export async function salvarFornecedor(
  empresaId: number,
  dados: {
    id?: number;
    codigo?: string;
    razaoSocial: string;
    nomeFantasia?: string;
    cnpjCpf?: string;
    telefone?: string;
    celular?: string;
    email?: string;
    contato?: string;
    cep?: string;
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidadeId?: number | null;
    status?: "ativo" | "inativo";
    observacoes?: string;
  }
) {
  const razao = dados.razaoSocial.trim();
  if (!razao) return { erro: "Informe a Razão Social ou Nome do fornecedor." };

  const codigo = dados.codigo?.trim() || (await proximoCodigoFornecedor(empresaId));
  const status = dados.status || "ativo";
  const agora = NOW();

  if (dados.id) {
    await db.execute({
      sql: `UPDATE tb_fornecedor SET
              codigo = ?, razao_social = ?, nome_fantasia = ?, cnpj_cpf = ?,
              telefone = ?, celular = ?, email = ?, contato = ?, cep = ?,
              logradouro = ?, numero = ?, complemento = ?, bairro = ?,
              cidade_id = ?, status = ?, observacoes = ?
            WHERE empresa_id = ? AND id = ?`,
      args: [
        codigo,
        razao,
        dados.nomeFantasia?.trim() || null,
        dados.cnpjCpf?.trim() || null,
        dados.telefone?.trim() || null,
        dados.celular?.trim() || null,
        dados.email?.trim() || null,
        dados.contato?.trim() || null,
        dados.cep?.trim() || null,
        dados.logradouro?.trim() || null,
        dados.numero?.trim() || null,
        dados.complemento?.trim() || null,
        dados.bairro?.trim() || null,
        dados.cidadeId || null,
        status,
        dados.observacoes?.trim() || null,
        empresaId,
        dados.id,
      ],
    });
    return obterFornecedor(empresaId, dados.id);
  }

  const created = await db.execute({
    sql: `INSERT INTO tb_fornecedor (
            empresa_id, codigo, razao_social, nome_fantasia, cnpj_cpf,
            telefone, celular, email, contato, cep, logradouro, numero,
            complemento, bairro, cidade_id, status, observacoes, criado_em
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      empresaId,
      codigo,
      razao,
      dados.nomeFantasia?.trim() || null,
      dados.cnpjCpf?.trim() || null,
      dados.telefone?.trim() || null,
      dados.celular?.trim() || null,
      dados.email?.trim() || null,
      dados.contato?.trim() || null,
      dados.cep?.trim() || null,
      dados.logradouro?.trim() || null,
      dados.numero?.trim() || null,
      dados.complemento?.trim() || null,
      dados.bairro?.trim() || null,
      dados.cidadeId || null,
      status,
      dados.observacoes?.trim() || null,
      agora,
    ],
  });

  return obterFornecedor(empresaId, Number(created.lastInsertRowid));
}

export async function excluirFornecedor(empresaId: number, id: number) {
  await db.execute({
    sql: "DELETE FROM tb_fornecedor WHERE empresa_id = ? AND id = ?",
    args: [empresaId, id],
  });
  return { ok: true };
}

/**
 * ============================================================================
 * [MÓDULO: CLIENTES]
 * ============================================================================
 */

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

export async function proximoCodigoCliente(empresaId: number): Promise<string> {
  const result = await db.execute({
    sql: `SELECT codigo FROM tb_cliente
          WHERE empresa_id = ? AND codigo LIKE 'CLI-%'
          ORDER BY id DESC LIMIT 1`,
    args: [empresaId],
  });

  if (!result.rows[0]) return "CLI-001";
  const num = parseInt(String(result.rows[0].codigo).replace("CLI-", ""), 10);
  return `CLI-${String((isNaN(num) ? 0 : num) + 1).padStart(3, "0")}`;
}

export async function listarClientes(empresaId: number): Promise<Cliente[]> {
  const result = await db.execute({
    sql: `SELECT cl.*, c.nome AS cidade_nome, e.sigla AS uf_sigla
          FROM tb_cliente cl
          LEFT JOIN tb_cidade c ON c.id = cl.cidade_id
          LEFT JOIN tb_estado e ON e.id = c.estado_id
          WHERE cl.empresa_id = ?
          ORDER BY cl.nome ASC`,
    args: [empresaId],
  });

  return result.rows.map((row) => ({
    id: Number(row.id),
    codigo: String(row.codigo),
    nome: String(row.nome),
    cpfCnpj: row.cpf_cnpj ? String(row.cpf_cnpj) : null,
    telefone: row.telefone ? String(row.telefone) : null,
    celular: row.celular ? String(row.celular) : null,
    email: row.email ? String(row.email) : null,
    dataNascimento: row.data_nascimento ? String(row.data_nascimento) : null,
    cep: row.cep ? String(row.cep) : null,
    logradouro: row.logradouro ? String(row.logradouro) : null,
    numero: row.numero ? String(row.numero) : null,
    complemento: row.complemento ? String(row.complemento) : null,
    bairro: row.bairro ? String(row.bairro) : null,
    cidadeId: row.cidade_id ? Number(row.cidade_id) : null,
    cidadeNome: row.cidade_nome ? String(row.cidade_nome) : null,
    ufSigla: row.uf_sigla ? String(row.uf_sigla) : null,
    status: (row.status ?? "ativo") as "ativo" | "inativo",
    observacoes: row.observacoes ? String(row.observacoes) : null,
    criadoEm: String(row.criado_em),
  }));
}

export async function obterCliente(empresaId: number, id: number): Promise<Cliente | null> {
  const lista = await listarClientes(empresaId);
  return lista.find((c) => c.id === id) ?? null;
}

export async function salvarCliente(
  empresaId: number,
  dados: {
    id?: number;
    codigo?: string;
    nome: string;
    cpfCnpj?: string;
    telefone?: string;
    celular?: string;
    email?: string;
    dataNascimento?: string;
    cep?: string;
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidadeId?: number | null;
    status?: "ativo" | "inativo";
    observacoes?: string;
  }
) {
  const nome = dados.nome.trim();
  if (!nome) return { erro: "Informe o nome do cliente." };

  const codigo = dados.codigo?.trim() || (await proximoCodigoCliente(empresaId));
  const status = dados.status || "ativo";
  const agora = NOW();

  if (dados.id) {
    await db.execute({
      sql: `UPDATE tb_cliente SET
              codigo = ?, nome = ?, cpf_cnpj = ?, telefone = ?, celular = ?,
              email = ?, data_nascimento = ?, cep = ?, logradouro = ?,
              numero = ?, complemento = ?, bairro = ?, cidade_id = ?,
              status = ?, observacoes = ?
            WHERE empresa_id = ? AND id = ?`,
      args: [
        codigo,
        nome,
        dados.cpfCnpj?.trim() || null,
        dados.telefone?.trim() || null,
        dados.celular?.trim() || null,
        dados.email?.trim() || null,
        dados.dataNascimento?.trim() || null,
        dados.cep?.trim() || null,
        dados.logradouro?.trim() || null,
        dados.numero?.trim() || null,
        dados.complemento?.trim() || null,
        dados.bairro?.trim() || null,
        dados.cidadeId || null,
        status,
        dados.observacoes?.trim() || null,
        empresaId,
        dados.id,
      ],
    });
    return obterCliente(empresaId, dados.id);
  }

  const created = await db.execute({
    sql: `INSERT INTO tb_cliente (
            empresa_id, codigo, nome, cpf_cnpj, telefone, celular, email,
            data_nascimento, cep, logradouro, numero, complemento, bairro,
            cidade_id, status, observacoes, criado_em
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      empresaId,
      codigo,
      nome,
      dados.cpfCnpj?.trim() || null,
      dados.telefone?.trim() || null,
      dados.celular?.trim() || null,
      dados.email?.trim() || null,
      dados.dataNascimento?.trim() || null,
      dados.cep?.trim() || null,
      dados.logradouro?.trim() || null,
      dados.numero?.trim() || null,
      dados.complemento?.trim() || null,
      dados.bairro?.trim() || null,
      dados.cidadeId || null,
      status,
      dados.observacoes?.trim() || null,
      agora,
    ],
  });

  return obterCliente(empresaId, Number(created.lastInsertRowid));
}

export async function excluirCliente(empresaId: number, id: number) {
  await db.execute({
    sql: "DELETE FROM tb_cliente WHERE empresa_id = ? AND id = ?",
    args: [empresaId, id],
  });
  return { ok: true };
}

/**
 * ============================================================================
 * [MÓDULO: PRODUTOS COM FICHA TÉCNICA & RECEITA EMBUTIDA]
 * ============================================================================
 */

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

  // Propriedades da Ficha Técnica / Receita
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

  // Métricas calculadas
  custoInsumos: number;
  custoMaoDeObra: number;
  custoFixos: number;
  custoTotalProducao: number;
  custoPorUnidade: number;
  lucroRealPorUnidade: number;
  lucroRealTotal: number;
};

export async function proximoCodigoProduto(empresaId: number): Promise<string> {
  const result = await db.execute({
    sql: `SELECT codigo FROM tb_produto
          WHERE empresa_id = ? AND codigo LIKE 'PRD-%'
          ORDER BY id DESC LIMIT 1`,
    args: [empresaId],
  });

  if (!result.rows[0]) return "PRD-001";
  const num = parseInt(String(result.rows[0].codigo).replace("PRD-", ""), 10);
  return `PRD-${String((isNaN(num) ? 0 : num) + 1).padStart(3, "0")}`;
}

export async function listarProdutos(empresaId: number): Promise<Produto[]> {
  const result = await db.execute({
    sql: `SELECT p.*, g.nome AS grupo_nome, s.nome AS subgrupo_nome, t.nome AS tipo_item_nome
          FROM tb_produto p
          LEFT JOIN tb_grupo_produto g ON g.id = p.grupo_id
          LEFT JOIN tb_subgrupo_produto s ON s.id = p.subgrupo_id
          LEFT JOIN tb_tipo_item t ON t.id = p.tipo_item_id
          WHERE p.empresa_id = ?
          ORDER BY p.nome ASC`,
    args: [empresaId],
  });

  const produtos: Produto[] = [];

  for (const row of result.rows) {
    const produtoId = Number(row.id);

    // Busca itens da receita vinculados
    const itensResult = await db.execute({
      sql: `SELECT pi.id, pi.insumo_id, pi.quantidade, pi.unidade,
                   i.nome AS insumo_nome, i.categoria, i.custo_unitario
            FROM tb_produto_insumo pi
            INNER JOIN tb_insumo i ON i.id = pi.insumo_id
            WHERE pi.produto_id = ?
            ORDER BY pi.id ASC`,
      args: [produtoId],
    });

    const itensReceita: ProdutoItemReceita[] = itensResult.rows.map((iRow) => {
      const qtd = Number(iRow.quantidade ?? 0);
      const custoUnit = Number(iRow.custo_unitario ?? 0);
      return {
        id: Number(iRow.id),
        insumoId: Number(iRow.insumo_id),
        insumoNome: String(iRow.insumo_nome),
        categoria: String(iRow.categoria ?? "ingrediente"),
        quantidade: qtd,
        unidade: String(iRow.unidade ?? "g"),
        custoUnitario: custoUnit,
        custoTotalItem: Math.round(qtd * custoUnit * 100) / 100,
      };
    });

    const rendimentoQtd = Number(row.rendimento_quantidade ?? 1);
    const precoVenda = Number(row.preco_venda ?? 0);

    const metricas = calcularTotaisReceita(
      itensReceita.map((it) => ({ quantidade: it.quantidade, custoUnitario: it.custoUnitario })),
      Number(row.tempo_preparo_minutos ?? 60),
      Number(row.custo_hora_trabalho ?? 20),
      Number(row.percentual_custos_fixos ?? 15),
      Number(row.margem_lucro_desejada ?? 100),
      rendimentoQtd,
      precoVenda
    );

    // Custo médio histórico dos últimos 12 meses
    const mediaResult = await db.execute({
      sql: `SELECT AVG(custo_producao) AS media_custo
            FROM tb_produto_custo_historico
            WHERE produto_id = ? AND data_hora >= datetime('now', '-12 months')`,
      args: [produtoId],
    });
    const mediaVal = Number(mediaResult.rows[0]?.media_custo ?? 0);
    const custoMedio = mediaVal > 0 ? Math.round(mediaVal * 100) / 100 : metricas.custoPorUnidade;

    produtos.push({
      id: produtoId,
      codigo: String(row.codigo),
      nome: String(row.nome),
      descricao: row.descricao ? String(row.descricao) : null,
      tipoItemId: row.tipo_item_id ? Number(row.tipo_item_id) : null,
      tipoItemNome: row.tipo_item_nome ? String(row.tipo_item_nome) : null,
      grupoId: row.grupo_id ? Number(row.grupo_id) : null,
      grupoNome: row.grupo_nome ? String(row.grupo_nome) : null,
      subgrupoId: row.subgrupo_id ? Number(row.subgrupo_id) : null,
      subgrupoNome: row.subgrupo_nome ? String(row.subgrupo_nome) : null,
      unidadeVenda: String(row.unidade_venda ?? "unidade"),
      precoCusto: metricas.custoPorUnidade,
      custoMedio,
      precoVenda: precoVenda || metricas.precoSugeridoPorUnidade,
      margemLucroRealPercent: metricas.margemRealPercentual,
      estoqueAtual: Number(row.estoque_atual ?? 0),
      estoqueMinimo: Number(row.estoque_minimo ?? 0),
      status: (row.status ?? "ativo") as "ativo" | "inativo",
      fotoUrl: row.foto_url ? String(row.foto_url) : null,
      criadoEm: String(row.criado_em),
      atualizadoEm: String(row.atualizado_em),

      temReceita: Boolean(row.tem_receita ?? 1),
      rendimentoQuantidade: rendimentoQtd,
      rendimentoUnidade: String(row.rendimento_unidade ?? "unidade"),
      tempoPreparoMinutos: Number(row.tempo_preparo_minutos ?? 60),
      custoHoraTrabalho: Number(row.custo_hora_trabalho ?? 20),
      percentualCustosFixos: Number(row.percentual_custos_fixos ?? 15),
      margemLucroDesejada: Number(row.margem_lucro_desejada ?? 100),
      precoSugerido: metricas.precoSugeridoPorUnidade,
      modoPreparo: row.modo_preparo ? String(row.modo_preparo) : null,
      itensReceita,

      custoInsumos: metricas.custoInsumos,
      custoMaoDeObra: metricas.custoMaoDeObra,
      custoFixos: metricas.custoFixos,
      custoTotalProducao: metricas.custoTotalProducao,
      custoPorUnidade: metricas.custoPorUnidade,
      lucroRealPorUnidade: metricas.lucroRealPorUnidade,
      lucroRealTotal: metricas.lucroRealTotal,
    });
  }

  return produtos;
}

export async function obterProduto(empresaId: number, id: number): Promise<Produto | null> {
  const produtos = await listarProdutos(empresaId);
  return produtos.find((p) => p.id === id) ?? null;
}

export async function salvarProduto(
  empresaId: number,
  dados: {
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
  }
) {
  const nome = dados.nome.trim();
  if (!nome) return { erro: "Informe o nome do produto." };

  const codigo = dados.codigo?.trim() || (await proximoCodigoProduto(empresaId));
  const rendimentoQtd = Math.max(1, Number(dados.rendimentoQuantidade || 1));
  const rendimentoUnidade = dados.rendimentoUnidade || dados.unidadeVenda || "unidade";
  const tempoMinutos = Math.max(0, Number(dados.tempoPreparoMinutos || 60));
  const custoHora = Math.max(0, Number(dados.custoHoraTrabalho ?? 20));
  const custosFixos = Math.max(0, Number(dados.percentualCustosFixos ?? 15));
  const margemLucro = Math.max(0, Number(dados.margemLucroDesejada ?? 100));
  const precoVenda = Number(dados.precoVenda ?? 0);
  const status = dados.status || "ativo";
  const agora = NOW();

  let produtoId = dados.id;

  if (produtoId) {
    await db.execute({
      sql: `UPDATE tb_produto SET
              codigo = ?, nome = ?, descricao = ?, tipo_item_id = ?, grupo_id = ?, subgrupo_id = ?,
              unidade_venda = ?, preco_venda = ?, estoque_atual = ?, estoque_minimo = ?,
              tem_receita = ?, rendimento_quantidade = ?, rendimento_unidade = ?,
              tempo_preparo_minutos = ?, custo_hora_trabalho = ?, percentual_custos_fixos = ?,
              margem_lucro_desejada = ?, modo_preparo = ?, status = ?, foto_url = ?,
              atualizado_em = ?
            WHERE empresa_id = ? AND id = ?`,
      args: [
        codigo,
        nome,
        dados.descricao?.trim() || null,
        dados.tipoItemId || null,
        dados.grupoId || null,
        dados.subgrupoId || null,
        dados.unidadeVenda || "unidade",
        precoVenda,
        dados.estoqueAtual ?? 0,
        dados.estoqueMinimo ?? 0,
        dados.temReceita ? 1 : 0,
        rendimentoQtd,
        rendimentoUnidade,
        tempoMinutos,
        custoHora,
        custosFixos,
        margemLucro,
        dados.modoPreparo?.trim() || null,
        status,
        dados.fotoUrl || null,
        agora,
        empresaId,
        produtoId,
      ],
    });

    // Remove itens anteriores para recriar
    await db.execute({
      sql: "DELETE FROM tb_produto_insumo WHERE produto_id = ?",
      args: [produtoId],
    });
  } else {
    const created = await db.execute({
      sql: `INSERT INTO tb_produto (
              empresa_id, codigo, nome, descricao, tipo_item_id, grupo_id, subgrupo_id,
              unidade_venda, preco_custo, preco_venda, estoque_atual, estoque_minimo,
              tem_receita, rendimento_quantidade, rendimento_unidade,
              tempo_preparo_minutos, custo_hora_trabalho, percentual_custos_fixos,
              margem_lucro_desejada, preco_sugerido, modo_preparo, status,
              foto_url, criado_em, atualizado_em
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)`,
      args: [
        empresaId,
        codigo,
        nome,
        dados.descricao?.trim() || null,
        dados.tipoItemId || null,
        dados.grupoId || null,
        dados.subgrupoId || null,
        dados.unidadeVenda || "unidade",
        precoVenda,
        dados.estoqueAtual ?? 0,
        dados.estoqueMinimo ?? 0,
        dados.temReceita ? 1 : 0,
        rendimentoQtd,
        rendimentoUnidade,
        tempoMinutos,
        custoHora,
        custosFixos,
        margemLucro,
        dados.modoPreparo?.trim() || null,
        status,
        dados.fotoUrl || null,
        agora,
        agora,
      ],
    });
    produtoId = Number(created.lastInsertRowid);
  }

  // Insere itens da receita vinculados ao produto
  if (dados.itensReceita && dados.itensReceita.length > 0) {
    for (const it of dados.itensReceita) {
      if (it.insumoId && it.quantidade > 0) {
        await db.execute({
          sql: `INSERT INTO tb_produto_insumo (produto_id, insumo_id, quantidade, unidade)
                VALUES (?, ?, ?, ?)`,
          args: [produtoId, it.insumoId, it.quantidade, it.unidade || "g"],
        });
      }
    }
  }

  // Recarrega o produto com as métricas recalculadas
  const produtoAtualizado = await obterProduto(empresaId, produtoId);
  if (produtoAtualizado) {
    // Registra entrada de auditoria na evolução de custos
    await db.execute({
      sql: `INSERT INTO tb_produto_custo_historico (
              empresa_id, produto_id, data_hora, custo_producao, custo_insumos,
              custo_mao_de_obra, custo_fixos, preco_venda, margem_lucro_real, motivo
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        empresaId,
        produtoId,
        agora,
        produtoAtualizado.precoCusto,
        produtoAtualizado.custoInsumos,
        produtoAtualizado.custoMaoDeObra,
        produtoAtualizado.custoFixos,
        produtoAtualizado.precoVenda,
        produtoAtualizado.margemLucroRealPercent,
        dados.id ? "Atualização de ficha técnica / cadastro" : "Cadastro inicial do produto",
      ],
    });
  }

  return produtoAtualizado;
}

/**
 * [HISTÓRICO: listarHistoricoCustoProduto]
 * Busca o histórico de evolução do custo de um produto por intervalo de datas (padrão: últimos 12 meses).
 */
export async function listarHistoricoCustoProduto(
  empresaId: number,
  produtoId: number,
  dataInicio?: string,
  dataFim?: string
): Promise<ProdutoCustoHistorico[]> {
  const de = dataInicio || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
  const ate = dataFim || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const result = await db.execute({
    sql: `SELECT id, produto_id, data_hora, custo_producao, custo_insumos,
                 custo_mao_de_obra, custo_fixos, preco_venda, margem_lucro_real, motivo
          FROM tb_produto_custo_historico
          WHERE empresa_id = ? AND produto_id = ? AND data_hora >= ? AND data_hora <= ?
          ORDER BY data_hora DESC`,
    args: [empresaId, produtoId, de, ate],
  });

  return result.rows.map((row) => ({
    id: Number(row.id),
    produtoId: Number(row.produto_id),
    dataHora: String(row.data_hora),
    custoProducao: Number(row.custo_producao ?? 0),
    custoInsumos: Number(row.custo_insumos ?? 0),
    custoMaoDeObra: Number(row.custo_mao_de_obra ?? 0),
    custoFixos: Number(row.custo_fixos ?? 0),
    precoVenda: Number(row.preco_venda ?? 0),
    margemLucroReal: Number(row.margem_lucro_real ?? 0),
    motivo: row.motivo ? String(row.motivo) : null,
  }));
}

export async function excluirProduto(empresaId: number, id: number) {
  await db.execute({
    sql: "DELETE FROM tb_produto WHERE empresa_id = ? AND id = ?",
    args: [empresaId, id],
  });
  return { ok: true };
}
