/**
 * ============================================================================
 * PROJETO: Gestão com Sabor - Sistema de Gestão para Confeitarias
 * REPOSITÓRIO: https://github.com/junin1737/confeitaria
 * ARQUIVO: server/producao.ts
 * DESCRIÇÃO: Módulo de Ordens de Produção:
 *            Ao produzir o produto final, realiza a baixa proporcional de matérias-primas
 *            e embalagens da receita no estoque de insumos e adiciona no estoque do produto acabado.
 * ============================================================================
 */

import { db } from "./db/client";
import { obterProduto } from "./cadastros";

const NOW = () => new Date().toISOString();

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

export async function listarProducoes(empresaId: number): Promise<OrdemProducao[]> {
  const result = await db.execute({
    sql: `SELECT p.*, prod.nome AS produto_nome, prod.codigo AS produto_codigo
          FROM tb_producao p
          INNER JOIN tb_produto prod ON prod.id = p.produto_id
          WHERE p.empresa_id = ?
          ORDER BY p.id DESC`,
    args: [empresaId],
  });

  const producoes: OrdemProducao[] = [];
  for (const row of result.rows) {
    const pId = Number(row.id);
    const insumosRes = await db.execute({
      sql: `SELECT pi.*, i.nome AS insumo_nome
            FROM tb_producao_insumo pi
            INNER JOIN tb_insumo i ON i.id = pi.insumo_id
            WHERE pi.producao_id = ?`,
      args: [pId],
    });

    producoes.push({
      id: pId,
      produtoId: Number(row.produto_id),
      produtoNome: String(row.produto_nome),
      produtoCodigo: String(row.produto_codigo),
      quantidadeProduzida: Number(row.quantidade_produzida),
      custoTotal: Number(row.custo_total),
      observacoes: row.observacoes ? String(row.observacoes) : null,
      dataProducao: String(row.data_producao),
      criadoEm: String(row.criado_em),
      insumosBaixados: insumosRes.rows.map((iRow) => ({
        insumoId: Number(iRow.insumo_id),
        insumoNome: String(iRow.insumo_nome),
        quantidadeBaixada: Number(iRow.quantidade_baixada),
        unidade: String(iRow.unidade),
        custoTotal: Number(iRow.custo_total),
      })),
    });
  }

  return producoes;
}

export async function executarProducao(
  empresaId: number,
  dados: {
    produtoId: number;
    quantidade: number;
    observacoes?: string;
  }
) {
  const produto = await obterProduto(empresaId, dados.produtoId);
  if (!produto) {
    return { erro: "Produto não encontrado para produção." };
  }

  if (dados.quantidade <= 0) {
    return { erro: "A quantidade a produzir deve ser maior que zero." };
  }

  if (!produto.itensReceita || produto.itensReceita.length === 0) {
    return { erro: `O produto "${produto.nome}" não possui insumos na sua receita/ficha técnica cadastrada.` };
  }

  // Fator proporcional baseado no rendimento da receita
  const rendimentoReceita = Math.max(1, produto.rendimentoQuantidade || 1);
  const fatorMultiplicador = dados.quantidade / rendimentoReceita;

  // 1. Validação de estoque dos insumos antes de dar baixa
  const insumosBaixa: {
    insumoId: number;
    insumoNome: string;
    quantidadeBaixada: number;
    unidade: string;
    custoUnitario: number;
    custoTotal: number;
  }[] = [];

  for (const item of produto.itensReceita) {
    const qtdNecessaria = item.quantidade * fatorMultiplicador;
    const insumoRow = await db.execute({
      sql: "SELECT id, nome, estoque_atual, custo_unitario, unidade_medida FROM tb_insumo WHERE empresa_id = ? AND id = ?",
      args: [empresaId, item.insumoId],
    });

    if (!insumoRow.rows[0]) {
      return { erro: `Insumo ID ${item.insumoId} (${item.insumoNome}) não localizado no estoque.` };
    }

    const insumo = insumoRow.rows[0];
    const estoqueAtual = Number(insumo.estoque_atual ?? 0);
    const custoUnit = Number(insumo.custo_unitario ?? item.custoUnitario);

    // Permite produzir mesmo se ficar negativo, mas avisa / calcula
    insumosBaixa.push({
      insumoId: Number(insumo.id),
      insumoNome: String(insumo.nome),
      quantidadeBaixada: qtdNecessaria,
      unidade: String(insumo.unidade_medida || item.unidade),
      custoUnitario: custoUnit,
      custoTotal: Math.round(qtdNecessaria * custoUnit * 100) / 100,
    });
  }

  const custoTotalProducao = insumosBaixa.reduce((acc, it) => acc + it.custoTotal, 0);
  const dataHoje = new Date().toISOString().split("T")[0];

  // 2. Insere registro de Ordem de Produção
  const prodInsert = await db.execute({
    sql: `INSERT INTO tb_producao (empresa_id, produto_id, quantidade_produzida, custo_total, observacoes, data_producao, criado_em)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      empresaId,
      produto.id,
      dados.quantidade,
      custoTotalProducao,
      dados.observacoes?.trim() || null,
      dataHoje,
      NOW(),
    ],
  });

  const producaoId = Number(prodInsert.lastInsertRowid);

  // 3. Dá baixa nos insumos de estoque e registra os itens baixados
  for (const baixa of insumosBaixa) {
    await db.execute({
      sql: "UPDATE tb_insumo SET estoque_atual = estoque_atual - ? WHERE empresa_id = ? AND id = ?",
      args: [baixa.quantidadeBaixada, empresaId, baixa.insumoId],
    });

    await db.execute({
      sql: `INSERT INTO tb_producao_insumo (producao_id, insumo_id, quantidade_baixada, unidade, custo_unitario, custo_total)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        producaoId,
        baixa.insumoId,
        baixa.quantidadeBaixada,
        baixa.unidade,
        baixa.custoUnitario,
        baixa.custoTotal,
      ],
    });
  }

  // 4. Soma no estoque do produto acabado
  await db.execute({
    sql: "UPDATE tb_produto SET estoque_atual = estoque_atual + ? WHERE empresa_id = ? AND id = ?",
    args: [dados.quantidade, empresaId, produto.id],
  });

  return {
    ok: true,
    producaoId,
    produtoNome: produto.nome,
    quantidadeProduzida: dados.quantidade,
    custoTotal: custoTotalProducao,
    insumosBaixados: insumosBaixa,
  };
}
