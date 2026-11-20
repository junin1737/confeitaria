/**
 * ============================================================================
 * PROJETO: Doce Gestor - Sistema de Gestão para Confeitarias
 * REPOSITÓRIO: https://github.com/junin1737/confeitaria
 * ARQUIVO: server/precificacao.ts
 * DESCRIÇÃO: FASE 1 — Gestão de Insumos, Fichas Técnicas e Formação de Preço.
 * ============================================================================
 * 
 * [REGRAS DE ENGENHARIA DE CUSTOS & PRECIFICAÇÃO DE CONFEITARIA]
 * 1. Conversão Universal de Unidades:
 *    - Compras em Quilos (kg) são convertidas para gramas (g) na base.
 *    - Compras em Litros (l) são convertidas para mililitros (ml) na base.
 *    - Embalagens fracionadas (ex: lata de 395g) calculam o custo exato por grama.
 * 2. Custos Invisíveis / Fixos:
 *    - Adiciona percentual parametrizável (padrão 15%) sobre os insumos e mão de obra
 *      para cobrir gás de cozinha, energia elétrica, água e perdas na panela.
 * 3. Valorização da Mão de Obra da Confeiteira:
 *    - Calcula o tempo de preparo (horas ou minutos) multiplicado pelo valor da hora
 *      desejada pela confeiteira (ex: R$ 20,00/h).
 * 4. Efeito Cascata:
 *    - Se o leite condensado ou o chocolate subir no mercado, a alteração no insumo
 *      recalcula automaticamente o custo de todas as receitas que o utilizam.
 * ============================================================================
 */

import { db } from "./db/client";

/**
 * [CONTRATO: Insumo]
 */
export type Insumo = {
  id: number;
  codigo: string;
  nome: string;
  categoria: "ingrediente" | "embalagem" | "decoracao" | "outro";
  unidadeMedida: "g" | "ml" | "un" | "kg" | "l";
  unidadeCompra: "kg" | "g" | "l" | "ml" | "un";
  quantidadeEmbalagem: number;
  precoCompra: number;
  custoUnitario: number; // Preço por grama, por ml ou por unidade
  estoqueAtual: number;
  estoqueMinimo: number;
  marca: string | null;
  fornecedorId: number | null;
  fornecedorNome: string | null;
  localArmazenamento: string | null;
  observacoes: string | null;
  status: "ativo" | "inativo";
  criadoEm: string;
  atualizadoEm: string | null;
  produtosVinculados?: {
    id: number;
    codigo: string;
    nome: string;
    quantidade: number;
    unidade: string;
  }[];
};

export type InsumoInput = {
  id?: number;
  codigo?: string;
  nome: string;
  categoria?: "ingrediente" | "embalagem" | "decoracao" | "outro";
  unidadeMedida?: "g" | "ml" | "un" | "kg" | "l";
  unidadeCompra?: "kg" | "g" | "l" | "ml" | "un";
  quantidadeEmbalagem: number;
  precoCompra: number;
  estoqueAtual?: number;
  estoqueMinimo?: number;
  marca?: string;
  fornecedorId?: number | null;
  localArmazenamento?: string;
  observacoes?: string;
  status?: "ativo" | "inativo";
};

/**
 * [FUNÇÃO: proximoCodigoInsumo]
 * Gera o próximo código sequencial do insumo (INS-001, INS-002, ...).
 */
export async function proximoCodigoInsumo(empresaId: number): Promise<string> {
  const result = await db.execute({
    sql: "SELECT codigo FROM tb_insumo WHERE empresa_id = ?",
    args: [empresaId],
  });

  let maxNum = 0;
  for (const row of result.rows) {
    const raw = String(row.codigo || "");
    const match = raw.match(/\d+/);
    if (match) {
      const val = parseInt(match[0], 10);
      if (!isNaN(val) && val > maxNum) maxNum = val;
    }
  }

  return `INS-${String(maxNum + 1).padStart(3, "0")}`;
}

/**
 * [FUNÇÃO AUXILIAR: normalizarUnidadeECusto]
 * Converte a embalagem comprada para a unidade base de uso na receita (g, ml, un, kg, l)
 * e calcula o custo unitário por grama, mililitro ou unidade.
 */
export function normalizarUnidadeECusto(
  unidadeCompra: string,
  unidadeMedida: string,
  quantidadeEmbalagem: number,
  precoCompra: number,
) {
  let fator = 1;

  // Se comprou em kg e mede em g: 1kg = 1000g
  if (unidadeCompra === "kg" && unidadeMedida === "g") {
    fator = 1000;
  }
  // Se comprou em g e mede em kg: 1000g = 1kg
  else if (unidadeCompra === "g" && unidadeMedida === "kg") {
    fator = 0.001;
  }
  // Se comprou em L e mede em ml: 1L = 1000ml
  else if (unidadeCompra === "l" && unidadeMedida === "ml") {
    fator = 1000;
  }
  // Se comprou em ml e mede em L: 1000ml = 1L
  else if (unidadeCompra === "ml" && unidadeMedida === "l") {
    fator = 0.001;
  }

  const quantidadeTotalBase = Math.max(0.0001, quantidadeEmbalagem * fator);
  const custoUnitario = Math.max(0, precoCompra / quantidadeTotalBase);

  return {
    custoUnitario: Math.round(custoUnitario * 100000) / 100000, // 5 casas decimais para precisão de centavos
    quantidadeTotalBase,
  };
}

/**
 * [FUNÇÃO AUXILIAR: normalizarTexto]
 * Remove acentos e converte para minúsculas para comparações consistentes.
 */
function normalizarTexto(texto?: string | null): string {
  return String(texto ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * [FUNÇÃO AUXILIAR: ehTipoOuGrupoInsumo]
 * Identifica se um registro de tb_produto representa um insumo / matéria-prima / embalagem
 * que deve ficar disponível nas fichas técnicas e no módulo Estoque e Insumos.
 */
export function ehTipoOuGrupoInsumo(
  tipoCodigo?: string | null,
  tipoNome?: string | null,
  grupoNome?: string | null,
): boolean {
  const cod = String(tipoCodigo ?? "").trim();
  const tNome = normalizarTexto(tipoNome);
  const gNome = normalizarTexto(grupoNome);

  // Produto Acabado nunca é tratado automaticamente como insumo
  if (cod === "4" || tNome.includes("acabado")) return false;

  if (["1", "2", "6", "10"].includes(cod)) return true;

  if (
    tNome.includes("materia-prima") ||
    tNome.includes("materia prima") ||
    tNome.includes("insumo") ||
    tNome.includes("embalagem") ||
    tNome.includes("intermediario") ||
    tNome.includes("decoracao")
  ) {
    return true;
  }

  if (
    gNome.includes("insumo") ||
    gNome.includes("materia-prima") ||
    gNome.includes("materia prima") ||
    gNome.includes("embalagem")
  ) {
    return true;
  }

  return false;
}

function mapearCategoriaInsumo(
  tipoCodigo?: string | null,
  tipoNome?: string | null,
  grupoNome?: string | null,
): Insumo["categoria"] {
  const cod = String(tipoCodigo ?? "").trim();
  const combinado = `${normalizarTexto(tipoNome)} ${normalizarTexto(grupoNome)}`;
  if (cod === "2" || combinado.includes("embalagem")) return "embalagem";
  if (combinado.includes("decoracao")) return "decoracao";
  return "ingrediente";
}

function mapearUnidadeProdutoParaInsumo(unidadeVenda?: string | null): {
  unidadeCompra: Insumo["unidadeCompra"];
  unidadeMedida: Insumo["unidadeMedida"];
  quantidadeEmbalagem: number;
  fatorEstoque: number;
} {
  const u = String(unidadeVenda ?? "").trim().toUpperCase();
  if (u === "KG") {
    return { unidadeCompra: "kg", unidadeMedida: "g", quantidadeEmbalagem: 1, fatorEstoque: 1000 };
  }
  if (u === "G") {
    return { unidadeCompra: "g", unidadeMedida: "g", quantidadeEmbalagem: 1, fatorEstoque: 1 };
  }
  if (u === "L") {
    return { unidadeCompra: "l", unidadeMedida: "ml", quantidadeEmbalagem: 1, fatorEstoque: 1000 };
  }
  if (u === "ML") {
    return { unidadeCompra: "ml", unidadeMedida: "ml", quantidadeEmbalagem: 1, fatorEstoque: 1 };
  }
  return { unidadeCompra: "un", unidadeMedida: "un", quantidadeEmbalagem: 1, fatorEstoque: 1 };
}

/**
 * [SYNC: sincronizarProdutoInsumoUnico]
 * Garante que um produto classificado como insumo/matéria-prima/embalagem exista em tb_insumo
 * para uso imediato em Fichas Técnicas e Estoque e Insumos.
 */
export async function sincronizarProdutoInsumoUnico(
  empresaId: number,
  produto: {
    nome: string;
    nomeAnterior?: string | null;
    descricao?: string | null;
    tipoItemId?: number | null;
    grupoId?: number | null;
    unidadeVenda?: string | null;
    precoCusto?: number;
    precoVenda?: number;
    estoqueAtual?: number;
    estoqueMinimo?: number;
  },
) {
  let tipoCodigo: string | null = null;
  let tipoNome: string | null = null;
  let grupoNome: string | null = null;

  if (produto.tipoItemId) {
    const tRes = await db.execute({
      sql: "SELECT codigo, nome FROM tb_tipo_item WHERE id = ? AND empresa_id = ? LIMIT 1",
      args: [produto.tipoItemId, empresaId],
    });
    if (tRes.rows[0]) {
      tipoCodigo = tRes.rows[0].codigo ? String(tRes.rows[0].codigo) : null;
      tipoNome = tRes.rows[0].nome ? String(tRes.rows[0].nome) : null;
    }
  }

  if (produto.grupoId) {
    const gRes = await db.execute({
      sql: "SELECT nome FROM tb_grupo_produto WHERE id = ? AND empresa_id = ? LIMIT 1",
      args: [produto.grupoId, empresaId],
    });
    if (gRes.rows[0]) {
      grupoNome = gRes.rows[0].nome ? String(gRes.rows[0].nome) : null;
    }
  }

  if (!ehTipoOuGrupoInsumo(tipoCodigo, tipoNome, grupoNome)) return;

  const nome = produto.nome.trim();
  if (!nome) return;

  const precoBase = Math.max(0, Number(produto.precoCusto) || Number(produto.precoVenda) || 0);
  const categoria = mapearCategoriaInsumo(tipoCodigo, tipoNome, grupoNome);
  const { unidadeCompra, unidadeMedida, quantidadeEmbalagem, fatorEstoque } =
    mapearUnidadeProdutoParaInsumo(produto.unidadeVenda);

  const buscaNome = (produto.nomeAnterior?.trim() || nome).toLowerCase();
  const existente = await db.execute({
    sql: `SELECT id, unidade_compra, unidade_medida, quantidade_embalagem, preco_compra
          FROM tb_insumo
          WHERE empresa_id = ? AND (LOWER(TRIM(nome)) = ? OR LOWER(TRIM(nome)) = ?)
          LIMIT 1`,
    args: [empresaId, nome.toLowerCase(), buscaNome],
  });

  const agora = new Date().toISOString();

  if (existente.rows[0]) {
    const insId = Number(existente.rows[0].id);
    const uCompraAtual = String(existente.rows[0].unidade_compra || unidadeCompra);
    const uMedidaAtual = String(existente.rows[0].unidade_medida || unidadeMedida);
    const qtdEmbAtual = Math.max(0.0001, Number(existente.rows[0].quantidade_embalagem || 1));
    const precoAtual = precoBase > 0 ? precoBase : Number(existente.rows[0].preco_compra || 0);
    const { custoUnitario } = normalizarUnidadeECusto(uCompraAtual, uMedidaAtual, qtdEmbAtual, precoAtual);

    await db.execute({
      sql: `UPDATE tb_insumo
            SET nome = ?, categoria = ?, preco_compra = ?, custo_unitario = ?, atualizado_em = ?
            WHERE empresa_id = ? AND id = ?`,
      args: [nome, categoria, precoAtual, custoUnitario, agora, empresaId, insId],
    });
    await recalcularReceitasPorInsumo(empresaId, insId);
    return;
  }

  const codigo = await proximoCodigoInsumo(empresaId);
  const { custoUnitario } = normalizarUnidadeECusto(
    unidadeCompra,
    unidadeMedida,
    quantidadeEmbalagem,
    precoBase,
  );

  await db.execute({
    sql: `INSERT INTO tb_insumo (
            empresa_id, codigo, nome, categoria, unidade_medida, unidade_compra,
            quantidade_embalagem, preco_compra, custo_unitario, estoque_atual,
            estoque_minimo, observacoes, status, criado_em, atualizado_em
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ativo', ?, ?)`,
    args: [
      empresaId,
      codigo,
      nome,
      categoria,
      unidadeMedida,
      unidadeCompra,
      quantidadeEmbalagem,
      precoBase,
      custoUnitario,
      Math.max(0, Number(produto.estoqueAtual ?? 0)) * fatorEstoque,
      Math.max(0, Number(produto.estoqueMinimo ?? 0)) * fatorEstoque,
      produto.descricao?.trim() || "Sincronizado automaticamente do cadastro de Produtos",
      agora,
      agora,
    ],
  });
}

/**
 * [SYNC: sincronizarProdutosInsumo]
 * Sincroniza automaticamente quaisquer produtos cadastrados como Insumo / Matéria-Prima / Embalagem
 * em tb_produto que ainda não existam em tb_insumo.
 */
export async function sincronizarProdutosInsumo(empresaId: number) {
  const prodRes = await db.execute({
    sql: `SELECT p.id, p.nome, p.descricao, p.unidade_venda, p.preco_custo, p.preco_venda,
                 p.estoque_atual, p.estoque_minimo,
                 t.codigo AS tipo_codigo, t.nome AS tipo_nome,
                 g.nome AS grupo_nome
          FROM tb_produto p
          LEFT JOIN tb_tipo_item t ON t.id = p.tipo_item_id
          LEFT JOIN tb_grupo_produto g ON g.id = p.grupo_id
          WHERE p.empresa_id = ?`,
    args: [empresaId],
  });

  if (prodRes.rows.length === 0) return;

  const insRes = await db.execute({
    sql: "SELECT LOWER(TRIM(nome)) AS nome_norm FROM tb_insumo WHERE empresa_id = ?",
    args: [empresaId],
  });
  const existentes = new Set(insRes.rows.map((r) => String(r.nome_norm ?? "")));

  const agora = new Date().toISOString();

  for (const row of prodRes.rows) {
    const tipoCodigo = row.tipo_codigo ? String(row.tipo_codigo) : null;
    const tipoNome = row.tipo_nome ? String(row.tipo_nome) : null;
    const grupoNome = row.grupo_nome ? String(row.grupo_nome) : null;

    if (!ehTipoOuGrupoInsumo(tipoCodigo, tipoNome, grupoNome)) continue;

    const nome = String(row.nome ?? "").trim();
    if (!nome) continue;
    const chave = nome.toLowerCase();
    if (existentes.has(chave)) continue;

    const categoria = mapearCategoriaInsumo(tipoCodigo, tipoNome, grupoNome);
    const { unidadeCompra, unidadeMedida, quantidadeEmbalagem, fatorEstoque } =
      mapearUnidadeProdutoParaInsumo(row.unidade_venda ? String(row.unidade_venda) : null);
    const precoBase = Math.max(0, Number(row.preco_custo ?? 0) || Number(row.preco_venda ?? 0));
    const { custoUnitario } = normalizarUnidadeECusto(
      unidadeCompra,
      unidadeMedida,
      quantidadeEmbalagem,
      precoBase,
    );
    const codigo = await proximoCodigoInsumo(empresaId);

    await db.execute({
      sql: `INSERT INTO tb_insumo (
              empresa_id, codigo, nome, categoria, unidade_medida, unidade_compra,
              quantidade_embalagem, preco_compra, custo_unitario, estoque_atual,
              estoque_minimo, observacoes, status, criado_em, atualizado_em
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ativo', ?, ?)`,
      args: [
        empresaId,
        codigo,
        nome,
        categoria,
        unidadeMedida,
        unidadeCompra,
        quantidadeEmbalagem,
        precoBase,
        custoUnitario,
        Math.max(0, Number(row.estoque_atual ?? 0)) * fatorEstoque,
        Math.max(0, Number(row.estoque_minimo ?? 0)) * fatorEstoque,
        row.descricao ? String(row.descricao) : "Sincronizado automaticamente do cadastro de Produtos",
        agora,
        agora,
      ],
    });
    existentes.add(chave);
  }
}

/**
 * [INSUMOS: listarInsumos]
 * Retorna todos os insumos cadastrados para a empresa, com fornecedor e produtos vinculados.
 */
export async function listarInsumos(empresaId: number): Promise<Insumo[]> {
  await sincronizarProdutosInsumo(empresaId);

  const result = await db.execute({
    sql: `SELECT i.id, i.codigo, i.nome, i.categoria, i.unidade_medida, i.unidade_compra,
                 i.quantidade_embalagem, i.preco_compra, i.custo_unitario, i.estoque_atual,
                 i.estoque_minimo, i.marca, i.fornecedor_id, i.local_armazenamento,
                 i.observacoes, i.status, i.criado_em, i.atualizado_em,
                 COALESCE(f.nome_fantasia, f.razao_social) AS fornecedor_nome
          FROM tb_insumo i
          LEFT JOIN tb_fornecedor f ON f.id = i.fornecedor_id
          WHERE i.empresa_id = ?
          ORDER BY i.nome ASC`,
    args: [empresaId],
  });

  // Backfill de código interno caso algum insumo antigo ainda não tenha
  let maxNum = 0;
  for (const row of result.rows) {
    const raw = String(row.codigo || "");
    const m = raw.match(/\d+/);
    if (m) {
      const val = parseInt(m[0], 10);
      if (!isNaN(val) && val > maxNum) maxNum = val;
    }
  }

  const codigosMap = new Map<number, string>();
  for (const row of result.rows) {
    const id = Number(row.id);
    const codAtual = row.codigo ? String(row.codigo).trim() : "";
    if (!codAtual) {
      maxNum += 1;
      const novoCod = `INS-${String(maxNum).padStart(3, "0")}`;
      codigosMap.set(id, novoCod);
      await db.execute({
        sql: "UPDATE tb_insumo SET codigo = ? WHERE id = ? AND empresa_id = ?",
        args: [novoCod, id, empresaId],
      });
    } else {
      codigosMap.set(id, codAtual);
    }
  }

  // Busca vínculos com produtos (fichas técnicas) da empresa
  const vinculosRes = await db.execute({
    sql: `SELECT pi.insumo_id, pi.quantidade, pi.unidade,
                 p.id AS produto_id, p.codigo AS produto_codigo, p.nome AS produto_nome
          FROM tb_produto_insumo pi
          INNER JOIN tb_produto p ON p.id = pi.produto_id
          WHERE p.empresa_id = ?
          ORDER BY p.nome ASC`,
    args: [empresaId],
  });

  const vinculosPorInsumo = new Map<
    number,
    { id: number; codigo: string; nome: string; quantidade: number; unidade: string }[]
  >();
  for (const vRow of vinculosRes.rows) {
    const insId = Number(vRow.insumo_id);
    const lista = vinculosPorInsumo.get(insId) ?? [];
    lista.push({
      id: Number(vRow.produto_id),
      codigo: String(vRow.produto_codigo || ""),
      nome: String(vRow.produto_nome || ""),
      quantidade: Number(vRow.quantidade ?? 0),
      unidade: String(vRow.unidade || "g"),
    });
    vinculosPorInsumo.set(insId, lista);
  }

  return result.rows.map((row) => {
    const id = Number(row.id);
    return {
      id,
      codigo: codigosMap.get(id) || `INS-${String(id).padStart(3, "0")}`,
      nome: String(row.nome),
      categoria: (row.categoria ?? "ingrediente") as Insumo["categoria"],
      unidadeMedida: (row.unidade_medida ?? "g") as Insumo["unidadeMedida"],
      unidadeCompra: (row.unidade_compra ?? "g") as Insumo["unidadeCompra"],
      quantidadeEmbalagem: Number(row.quantidade_embalagem ?? 1),
      precoCompra: Number(row.preco_compra ?? 0),
      custoUnitario: Number(row.custo_unitario ?? 0),
      estoqueAtual: Number(row.estoque_atual ?? 0),
      estoqueMinimo: Number(row.estoque_minimo ?? 0),
      marca: row.marca ? String(row.marca) : null,
      fornecedorId: row.fornecedor_id ? Number(row.fornecedor_id) : null,
      fornecedorNome: row.fornecedor_nome ? String(row.fornecedor_nome) : null,
      localArmazenamento: row.local_armazenamento ? String(row.local_armazenamento) : null,
      observacoes: row.observacoes ? String(row.observacoes) : null,
      status: String(row.status || "ativo") === "inativo" ? "inativo" : "ativo",
      criadoEm: String(row.criado_em),
      atualizadoEm: row.atualizado_em ? String(row.atualizado_em) : null,
      produtosVinculados: vinculosPorInsumo.get(id) ?? [],
    };
  });
}

/**
 * [INSUMOS: obterInsumo]
 */
export async function obterInsumo(empresaId: number, id: number): Promise<Insumo | null> {
  const insumos = await listarInsumos(empresaId);
  return insumos.find((i) => i.id === id) ?? null;
}

/**
 * [INSUMOS: salvarInsumo]
 * Cria ou atualiza um insumo, valida duplicidade de nome, persiste fornecedor e recalcula custos.
 */
export async function salvarInsumo(empresaId: number, dados: InsumoInput) {
  const nome = String(dados.nome ?? "").trim();
  if (!nome) return { erro: "Informe o nome do insumo/ingrediente." };

  const quantidadeEmbalagem = Number(dados.quantidadeEmbalagem ?? 0);
  if (isNaN(quantidadeEmbalagem) || quantidadeEmbalagem <= 0) {
    return { erro: "A quantidade na embalagem deve ser maior que zero." };
  }

  const precoCompra = Number(dados.precoCompra ?? 0);
  if (isNaN(precoCompra) || precoCompra <= 0) {
    return { erro: "O preço pago na embalagem deve ser maior que zero." };
  }

  // Verifica duplicidade de nome na mesma empresa
  const checkNome = await db.execute({
    sql: `SELECT id, nome FROM tb_insumo
          WHERE empresa_id = ? AND LOWER(TRIM(nome)) = ? AND id != ?
          LIMIT 1`,
    args: [empresaId, nome.toLowerCase(), dados.id ?? 0],
  });
  if (checkNome.rows.length > 0) {
    return { erro: `Já existe um insumo cadastrado com o nome "${checkNome.rows[0].nome}".` };
  }

  const categoria = dados.categoria || "ingrediente";
  const unidadeCompra = dados.unidadeCompra || (categoria === "embalagem" ? "un" : "g");
  const unidadeMedida =
    dados.unidadeMedida ||
    (unidadeCompra === "kg" ? "g" : unidadeCompra === "l" ? "ml" : unidadeCompra);
  const estoqueAtual = Number(dados.estoqueAtual ?? 0);
  const estoqueMinimo = Math.max(0, Number(dados.estoqueMinimo ?? 0));
  const fornecedorId = dados.fornecedorId ? Number(dados.fornecedorId) : null;
  const localArmazenamento = dados.localArmazenamento?.trim() || null;
  const observacoes = dados.observacoes?.trim() || null;
  const status = dados.status === "inativo" ? "inativo" : "ativo";

  const { custoUnitario } = normalizarUnidadeECusto(
    unidadeCompra,
    unidadeMedida,
    quantidadeEmbalagem,
    precoCompra,
  );

  const agora = new Date().toISOString();

  if (dados.id) {
    const codigo = dados.codigo?.trim() || (await proximoCodigoInsumo(empresaId));
    // Atualização completa
    await db.execute({
      sql: `UPDATE tb_insumo SET
              codigo = ?, nome = ?, categoria = ?, unidade_medida = ?, unidade_compra = ?,
              quantidade_embalagem = ?, preco_compra = ?, custo_unitario = ?,
              estoque_atual = ?, estoque_minimo = ?, marca = ?, fornecedor_id = ?,
              local_armazenamento = ?, observacoes = ?, status = ?, atualizado_em = ?
            WHERE empresa_id = ? AND id = ?`,
      args: [
        codigo,
        nome,
        categoria,
        unidadeMedida,
        unidadeCompra,
        quantidadeEmbalagem,
        precoCompra,
        custoUnitario,
        estoqueAtual,
        estoqueMinimo,
        dados.marca?.trim() || null,
        fornecedorId,
        localArmazenamento,
        observacoes,
        status,
        agora,
        empresaId,
        dados.id,
      ],
    });

    // Efeito cascata: atualiza preços sugeridos e custos de receitas e produtos dependentes
    await recalcularReceitasPorInsumo(empresaId, dados.id);

    const atualizado = await obterInsumo(empresaId, dados.id);
    return atualizado ?? { erro: "Insumo não encontrado após atualização." };
  }

  const codigo = dados.codigo?.trim() || (await proximoCodigoInsumo(empresaId));

  // Inserção
  const created = await db.execute({
    sql: `INSERT INTO tb_insumo (
            empresa_id, codigo, nome, categoria, unidade_medida, unidade_compra,
            quantidade_embalagem, preco_compra, custo_unitario, estoque_atual,
            estoque_minimo, marca, fornecedor_id, local_armazenamento, observacoes,
            status, criado_em, atualizado_em
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      empresaId,
      codigo,
      nome,
      categoria,
      unidadeMedida,
      unidadeCompra,
      quantidadeEmbalagem,
      precoCompra,
      custoUnitario,
      estoqueAtual,
      estoqueMinimo,
      dados.marca?.trim() || null,
      fornecedorId,
      localArmazenamento,
      observacoes,
      status,
      agora,
      agora,
    ],
  });

  const novo = await obterInsumo(empresaId, Number(created.lastInsertRowid));
  return novo ?? { erro: "Falha ao carregar insumo recém-cadastrado." };
}

/**
 * [INSUMOS: ajustarEstoqueInsumo]
 * Realiza entrada rápida (compra avulsa), saída (baixa/perda/consumo) ou ajuste de inventário
 * diretamente na tela de Estoque, permitindo informar em unidades base (g/ml/un) ou em embalagens.
 */
export async function ajustarEstoqueInsumo(
  empresaId: number,
  id: number,
  dados: {
    tipo: "entrada" | "saida" | "ajuste";
    quantidade: number;
    modoUnidade?: "base" | "embalagem";
    novoPrecoCompra?: number;
    motivo?: string;
  },
) {
  const insumo = await obterInsumo(empresaId, id);
  if (!insumo) {
    return { erro: "Insumo não encontrado no estoque." };
  }

  const qtdInformada = Number(dados.quantidade ?? 0);
  if (isNaN(qtdInformada) || (dados.tipo !== "ajuste" && qtdInformada <= 0) || (dados.tipo === "ajuste" && qtdInformada < 0)) {
    return { erro: "Informe uma quantidade válida para movimentação de estoque." };
  }

  const { quantidadeTotalBase } = normalizarUnidadeECusto(
    insumo.unidadeCompra,
    insumo.unidadeMedida,
    insumo.quantidadeEmbalagem,
    insumo.precoCompra,
  );

  // Se o dono informou em "embalagem" (ex: +2 latas de 395g ou +3 pacotes de 1kg), converte para a base
  const deltaBase =
    dados.modoUnidade === "embalagem"
      ? Math.round(qtdInformada * quantidadeTotalBase * 1000) / 1000
      : qtdInformada;

  let novoEstoque = insumo.estoqueAtual;
  if (dados.tipo === "entrada") {
    novoEstoque = Math.round((insumo.estoqueAtual + deltaBase) * 1000) / 1000;
  } else if (dados.tipo === "saida") {
    novoEstoque = Math.round((insumo.estoqueAtual - deltaBase) * 1000) / 1000;
  } else {
    novoEstoque = Math.round(deltaBase * 1000) / 1000;
  }

  let novoPrecoCompra = insumo.precoCompra;
  let novoCustoUnitario = insumo.custoUnitario;
  if (dados.novoPrecoCompra !== undefined && Number(dados.novoPrecoCompra) > 0) {
    novoPrecoCompra = Number(dados.novoPrecoCompra);
    novoCustoUnitario = normalizarUnidadeECusto(
      insumo.unidadeCompra,
      insumo.unidadeMedida,
      insumo.quantidadeEmbalagem,
      novoPrecoCompra,
    ).custoUnitario;
  }

  const agora = new Date().toISOString();
  await db.execute({
    sql: `UPDATE tb_insumo
          SET estoque_atual = ?, preco_compra = ?, custo_unitario = ?, atualizado_em = ?
          WHERE empresa_id = ? AND id = ?`,
    args: [novoEstoque, novoPrecoCompra, novoCustoUnitario, agora, empresaId, id],
  });

  if (novoPrecoCompra !== insumo.precoCompra) {
    await recalcularReceitasPorInsumo(empresaId, id);
  }

  const atualizado = await obterInsumo(empresaId, id);
  return atualizado ?? { erro: "Erro ao atualizar saldo do insumo." };
}

/**
 * [INSUMOS: excluirInsumo]
 * Remove o insumo caso ele não esteja vinculado a fichas técnicas de produtos, receitas, produções ou compras.
 */
export async function excluirInsumo(empresaId: number, id: number) {
  const [checkProduto, checkReceita, checkProducao, checkCompra] = await Promise.all([
    db.execute({
      sql: `SELECT p.nome FROM tb_produto_insumo pi
            INNER JOIN tb_produto p ON p.id = pi.produto_id
            WHERE p.empresa_id = ? AND pi.insumo_id = ?
            LIMIT 1`,
      args: [empresaId, id],
    }),
    db.execute({
      sql: `SELECT r.nome FROM tb_receita_item ri
            INNER JOIN tb_receita r ON r.id = ri.receita_id
            WHERE r.empresa_id = ? AND ri.insumo_id = ?
            LIMIT 1`,
      args: [empresaId, id],
    }),
    db.execute({
      sql: `SELECT p.id FROM tb_producao_insumo pi
            INNER JOIN tb_producao p ON p.id = pi.producao_id
            WHERE p.empresa_id = ? AND pi.insumo_id = ?
            LIMIT 1`,
      args: [empresaId, id],
    }),
    db.execute({
      sql: `SELECT c.numero_nota FROM tb_compra_item ci
            INNER JOIN tb_compra_nota c ON c.id = ci.compra_id
            WHERE c.empresa_id = ? AND ci.insumo_id = ?
            LIMIT 1`,
      args: [empresaId, id],
    }),
  ]);

  if (checkProduto.rows.length > 0) {
    return {
      erro: `Este insumo não pode ser excluído pois faz parte da ficha técnica do produto "${checkProduto.rows[0].nome}".`,
    };
  }

  if (checkReceita.rows.length > 0) {
    return {
      erro: `Este insumo não pode ser excluído pois está em uso na receita "${checkReceita.rows[0].nome}".`,
    };
  }

  if (checkProducao.rows.length > 0) {
    return {
      erro: "Este insumo possui histórico de ordens de produção realizadas e não pode ser excluído. Você pode inativá-lo.",
    };
  }

  if (checkCompra.rows.length > 0) {
    return {
      erro: `Este insumo está vinculado à nota de compra nº ${checkCompra.rows[0].numero_nota} e não pode ser excluído. Você pode inativá-lo.`,
    };
  }

  await db.execute({
    sql: "DELETE FROM tb_insumo WHERE empresa_id = ? AND id = ?",
    args: [empresaId, id],
  });

  return { ok: true };
}

/**
 * ============================================================================
 * [RECEITAS E FICHAS TÉCNICAS]
 * ============================================================================
 */

export type ReceitaItemDetalhado = {
  id: number;
  insumoId: number;
  insumoNome: string;
  categoria: string;
  quantidade: number;
  unidade: string;
  precoCompraInsumo: number;
  quantidadeEmbalagemInsumo: number;
  unidadeCompraInsumo: string;
  custoUnitario: number;
  custoTotalItem: number; // quantidade * custoUnitario
};

export type Receita = {
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
  // Métricas calculadas
  custoInsumos: number;
  custoMaoDeObra: number;
  custoFixos: number;
  custoTotalProducao: number;
  custoPorUnidade: number;
  precoSugeridoPorUnidade: number;
  lucroRealPorUnidade: number;
  margemRealPercentual: number;
};

export type ReceitaInput = {
  id?: number;
  nome: string;
  descricao?: string;
  grupoId?: number | null;
  rendimentoQuantidade: number;
  rendimentoUnidade?: string;
  tempoPreparoMinutos: number;
  custoHoraTrabalho?: number;
  percentualCustosFixos?: number;
  margemLucroDesejada?: number;
  precoVenda?: number;
  modoPreparo?: string;
  status?: "ativo" | "inativo";
  itens: {
    insumoId: number;
    quantidade: number;
    unidade?: string;
  }[];
};

/**
 * [FUNÇÃO: calcularTotaisReceita]
 * Realiza todos os cálculos financeiros da ficha técnica.
 */
export function calcularTotaisReceita(
  itens: { quantidade: number; custoUnitario: number }[],
  tempoPreparoMinutos: number,
  custoHoraTrabalho: number,
  percentualCustosFixos: number,
  margemLucroDesejada: number,
  rendimentoQuantidade: number,
  precoVendaPraticado: number,
) {
  const rendimento = Math.max(1, rendimentoQuantidade);

  // 1. Custo direto dos insumos
  const custoInsumos = itens.reduce((acc, item) => acc + item.quantidade * item.custoUnitario, 0);

  // 2. Mão de obra da confeiteira
  const horas = Math.max(0, tempoPreparoMinutos) / 60;
  const custoMaoDeObra = horas * Math.max(0, custoHoraTrabalho);

  // 3. Custos Fixos (gás, energia, água, produtos de limpeza - padrão 15%)
  const baseFixos = custoInsumos + custoMaoDeObra;
  const custoFixos = baseFixos * (Math.max(0, percentualCustosFixos) / 100);

  // 4. Custo Total de Produção
  const custoTotalProducao = custoInsumos + custoMaoDeObra + custoFixos;
  const custoPorUnidade = custoTotalProducao / rendimento;

  // 5. Preço Sugerido com Margem Desejada
  const lucroSugerido = custoTotalProducao * (Math.max(0, margemLucroDesejada) / 100);
  const precoSugeridoTotal = custoTotalProducao + lucroSugerido;
  const precoSugeridoPorUnidade = precoSugeridoTotal / rendimento;

  // 6. Preço Venda Praticado e Margem Real
  // Suporta tanto o valor total do lote (ex: R$ 160 no cento) quanto o valor unitário (ex: R$ 1,60 cada)
  let precoVendaTotal: number;
  if (!precoVendaPraticado || precoVendaPraticado <= 0) {
    precoVendaTotal = precoSugeridoTotal;
  } else if (rendimento > 1 && precoVendaPraticado < custoTotalProducao * 0.5) {
    // Digitou o preço por unidade individual
    precoVendaTotal = precoVendaPraticado * rendimento;
  } else {
    // Digitou o preço do lote/receita completa
    precoVendaTotal = precoVendaPraticado;
  }

  const precoVendaPorUnidade = precoVendaTotal / rendimento;
  const lucroRealTotal = precoVendaTotal - custoTotalProducao;
  const lucroRealPorUnidade = lucroRealTotal / rendimento;
  const margemRealPercentual = custoTotalProducao > 0 ? (lucroRealTotal / custoTotalProducao) * 100 : 0;

  return {
    custoInsumos: Math.round(custoInsumos * 100) / 100,
    custoMaoDeObra: Math.round(custoMaoDeObra * 100) / 100,
    custoFixos: Math.round(custoFixos * 100) / 100,
    custoTotalProducao: Math.round(custoTotalProducao * 100) / 100,
    custoPorUnidade: Math.round(custoPorUnidade * 100) / 100,
    precoSugeridoTotal: Math.round(precoSugeridoTotal * 100) / 100,
    precoSugeridoPorUnidade: Math.round(precoSugeridoPorUnidade * 100) / 100,
    precoVendaTotal: Math.round(precoVendaTotal * 100) / 100,
    precoVendaPorUnidade: Math.round(precoVendaPorUnidade * 100) / 100,
    lucroRealTotal: Math.round(lucroRealTotal * 100) / 100,
    lucroRealPorUnidade: Math.round(lucroRealPorUnidade * 100) / 100,
    margemRealPercentual: Math.round(margemRealPercentual * 10) / 10,
  };
}

/**
 * [RECEITAS: listarReceitas]
 * Retorna todas as receitas com seus indicadores e custos consolidados.
 */
export async function listarReceitas(empresaId: number): Promise<Receita[]> {
  const result = await db.execute({
    sql: `SELECT r.*, g.nome AS grupo_nome
          FROM tb_receita r
          LEFT JOIN tb_grupo_produto g ON g.id = r.grupo_id
          WHERE r.empresa_id = ?
          ORDER BY r.status ASC, r.nome`,
    args: [empresaId],
  });

  const receitas: Receita[] = [];

  for (const row of result.rows) {
    const receitaId = Number(row.id);

    // Busca os itens desta receita
    const itensResult = await db.execute({
      sql: `SELECT ri.id, ri.insumo_id, ri.quantidade, ri.unidade,
                   i.nome AS insumo_nome, i.categoria, i.custo_unitario,
                   i.preco_compra, i.quantidade_embalagem, i.unidade_compra
            FROM tb_receita_item ri
            INNER JOIN tb_insumo i ON i.id = ri.insumo_id
            WHERE ri.receita_id = ?
            ORDER BY ri.id`,
      args: [receitaId],
    });

    const itens: ReceitaItemDetalhado[] = itensResult.rows.map((iRow) => {
      const qtd = Number(iRow.quantidade ?? 0);
      const custoUnit = Number(iRow.custo_unitario ?? 0);
      return {
        id: Number(iRow.id),
        insumoId: Number(iRow.insumo_id),
        insumoNome: String(iRow.insumo_nome),
        categoria: String(iRow.categoria ?? "ingrediente"),
        quantidade: qtd,
        unidade: String(iRow.unidade ?? "g"),
        precoCompraInsumo: Number(iRow.preco_compra ?? 0),
        quantidadeEmbalagemInsumo: Number(iRow.quantidade_embalagem ?? 1),
        unidadeCompraInsumo: String(iRow.unidade_compra ?? "g"),
        custoUnitario: custoUnit,
        custoTotalItem: Math.round(qtd * custoUnit * 100) / 100,
      };
    });

    const rendimentoQtd = Number(row.rendimento_quantidade ?? 1);
    const precoVenda = Number(row.preco_venda ?? 0);

    const metricas = calcularTotaisReceita(
      itens.map((it) => ({ quantidade: it.quantidade, custoUnitario: it.custoUnitario })),
      Number(row.tempo_preparo_minutos ?? 60),
      Number(row.custo_hora_trabalho ?? 20),
      Number(row.percentual_custos_fixos ?? 15),
      Number(row.margem_lucro_desejada ?? 100),
      rendimentoQtd,
      precoVenda,
    );

    receitas.push({
      id: receitaId,
      nome: String(row.nome),
      descricao: row.descricao ? String(row.descricao) : null,
      grupoId: row.grupo_id ? Number(row.grupo_id) : null,
      grupoNome: row.grupo_nome ? String(row.grupo_nome) : null,
      rendimentoQuantidade: rendimentoQtd,
      rendimentoUnidade: String(row.rendimento_unidade ?? "unidade"),
      tempoPreparoMinutos: Number(row.tempo_preparo_minutos ?? 60),
      custoHoraTrabalho: Number(row.custo_hora_trabalho ?? 20),
      percentualCustosFixos: Number(row.percentual_custos_fixos ?? 15),
      margemLucroDesejada: Number(row.margem_lucro_desejada ?? 100),
      precoSugerido: metricas.precoSugeridoPorUnidade,
      precoVenda: precoVenda || metricas.precoSugeridoPorUnidade,
      modoPreparo: row.modo_preparo ? String(row.modo_preparo) : null,
      status: (row.status ?? "ativo") as Receita["status"],
      criadoEm: String(row.criado_em),
      atualizadoEm: String(row.atualizado_em),
      itens,
      ...metricas,
    });
  }

  return receitas;
}

/**
 * [RECEITAS: obterReceita]
 */
export async function obterReceita(empresaId: number, id: number): Promise<Receita | null> {
  const receitas = await listarReceitas(empresaId);
  return receitas.find((r) => r.id === id) ?? null;
}

/**
 * [RECEITAS: salvarReceita]
 * Salva a receita e seus ingredientes associados em transação.
 */
export async function salvarReceita(empresaId: number, dados: ReceitaInput) {
  const nome = dados.nome.trim();
  if (!nome) return { erro: "Informe o nome da receita." };

  const rendimentoQtd = Math.max(1, Number(dados.rendimentoQuantidade || 1));
  const rendimentoUnidade = dados.rendimentoUnidade || "unidade";
  const tempoMinutos = Math.max(0, Number(dados.tempoPreparoMinutos || 60));
  const custoHora = Math.max(0, Number(dados.custoHoraTrabalho ?? 20));
  const custosFixos = Math.max(0, Number(dados.percentualCustosFixos ?? 15));
  const margemLucro = Math.max(0, Number(dados.margemLucroDesejada ?? 100));
  const precoVenda = Number(dados.precoVenda ?? 0);
  const status = dados.status || "ativo";
  const agora = new Date().toISOString();

  let receitaId = dados.id;

  if (receitaId) {
    // Atualiza cabeçalho da receita
    await db.execute({
      sql: `UPDATE tb_receita SET
              nome = ?, descricao = ?, grupo_id = ?, rendimento_quantidade = ?,
              rendimento_unidade = ?, tempo_preparo_minutos = ?, custo_hora_trabalho = ?,
              percentual_custos_fixos = ?, margem_lucro_desejada = ?, preco_venda = ?,
              modo_preparo = ?, status = ?, atualizado_em = ?
            WHERE empresa_id = ? AND id = ?`,
      args: [
        nome,
        dados.descricao?.trim() || null,
        dados.grupoId || null,
        rendimentoQtd,
        rendimentoUnidade,
        tempoMinutos,
        custoHora,
        custosFixos,
        margemLucro,
        precoVenda,
        dados.modoPreparo?.trim() || null,
        status,
        agora,
        empresaId,
        receitaId,
      ],
    });

    // Remove itens antigos para reinserção limpa
    await db.execute({
      sql: "DELETE FROM tb_receita_item WHERE receita_id = ?",
      args: [receitaId],
    });
  } else {
    // Cria nova receita
    const created = await db.execute({
      sql: `INSERT INTO tb_receita (
              empresa_id, nome, descricao, grupo_id, rendimento_quantidade,
              rendimento_unidade, tempo_preparo_minutos, custo_hora_trabalho,
              percentual_custos_fixos, margem_lucro_desejada, preco_venda,
              modo_preparo, status, criado_em, atualizado_em
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        empresaId,
        nome,
        dados.descricao?.trim() || null,
        dados.grupoId || null,
        rendimentoQtd,
        rendimentoUnidade,
        tempoMinutos,
        custoHora,
        custosFixos,
        margemLucro,
        precoVenda,
        dados.modoPreparo?.trim() || null,
        status,
        agora,
        agora,
      ],
    });
    receitaId = Number(created.lastInsertRowid);
  }

  // Insere itens da receita
  if (dados.itens && dados.itens.length > 0) {
    for (const item of dados.itens) {
      if (item.insumoId && item.quantidade > 0) {
        await db.execute({
          sql: `INSERT INTO tb_receita_item (receita_id, insumo_id, quantidade, unidade)
                VALUES (?, ?, ?, ?)`,
          args: [receitaId, item.insumoId, item.quantidade, item.unidade || "g"],
        });
      }
    }
  }

  return obterReceita(empresaId, receitaId);
}

/**
 * [RECEITAS: excluirReceita]
 */
export async function excluirReceita(empresaId: number, id: number) {
  await db.execute({
    sql: "DELETE FROM tb_receita WHERE empresa_id = ? AND id = ?",
    args: [empresaId, id],
  });
  return { ok: true };
}

/**
 * [EFEITO CASCATA: recalcularReceitasPorInsumo]
 * Atualiza o 'atualizado_em' das receitas e recalcula o custo dos produtos (tb_produto)
 * que utilizam este insumo em sua ficha técnica, registrando no histórico de evolução de custos.
 */
export async function recalcularReceitasPorInsumo(empresaId: number, insumoId: number) {
  const agora = new Date().toISOString();
  await db.execute({
    sql: `UPDATE tb_receita SET atualizado_em = ?
          WHERE empresa_id = ? AND id IN (
            SELECT receita_id FROM tb_receita_item WHERE insumo_id = ?
          )`,
    args: [agora, empresaId, insumoId],
  });

  // Busca produtos vinculados a este insumo
  const prodsAfetados = await db.execute({
    sql: `SELECT DISTINCT p.id, p.rendimento_quantidade, p.tempo_preparo_minutos,
                          p.custo_hora_trabalho, p.percentual_custos_fixos,
                          p.margem_lucro_desejada, p.preco_venda
          FROM tb_produto p
          INNER JOIN tb_produto_insumo pi ON pi.produto_id = p.id
          WHERE p.empresa_id = ? AND pi.insumo_id = ?`,
    args: [empresaId, insumoId],
  });

  for (const prod of prodsAfetados.rows) {
    const prodId = Number(prod.id);
    const itensRes = await db.execute({
      sql: `SELECT pi.quantidade, i.custo_unitario
            FROM tb_produto_insumo pi
            INNER JOIN tb_insumo i ON i.id = pi.insumo_id
            WHERE pi.produto_id = ?`,
      args: [prodId],
    });

    const itens = itensRes.rows.map((r) => ({
      quantidade: Number(r.quantidade ?? 0),
      custoUnitario: Number(r.custo_unitario ?? 0),
    }));

    const metricas = calcularTotaisReceita(
      itens,
      Number(prod.tempo_preparo_minutos ?? 60),
      Number(prod.custo_hora_trabalho ?? 20),
      Number(prod.percentual_custos_fixos ?? 15),
      Number(prod.margem_lucro_desejada ?? 100),
      Number(prod.rendimento_quantidade ?? 1),
      Number(prod.preco_venda ?? 0),
    );

    await db.execute({
      sql: `UPDATE tb_produto
            SET preco_custo = ?, preco_sugerido = ?, atualizado_em = ?
            WHERE empresa_id = ? AND id = ?`,
      args: [
        metricas.custoPorUnidade,
        metricas.precoSugeridoPorUnidade,
        agora,
        empresaId,
        prodId,
      ],
    });

    await db.execute({
      sql: `INSERT INTO tb_produto_custo_historico (
              empresa_id, produto_id, data_hora, custo_producao, custo_insumos,
              custo_mao_de_obra, custo_fixos, preco_venda, margem_lucro_real, motivo
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        empresaId,
        prodId,
        agora,
        metricas.custoPorUnidade,
        metricas.custoInsumos,
        metricas.custoMaoDeObra,
        metricas.custoFixos,
        Number(prod.preco_venda ?? 0) || metricas.precoSugeridoPorUnidade,
        metricas.margemRealPercentual,
        "Recálculo automático por alteração de custo de insumo no estoque",
      ],
    });
  }
}
