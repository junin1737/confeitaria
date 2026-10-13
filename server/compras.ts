/**
 * ============================================================================
 * PROJETO: Gestão com Sabor - Sistema de Gestão para Confeitarias
 * REPOSITÓRIO: https://github.com/junin1737/confeitaria
 * ARQUIVO: server/compras.ts
 * DESCRIÇÃO: Módulo de Compras e Entrada de Estoque:
 *            - Entrada manual de Notas Fiscais com itens.
 *            - Importação de arquivo XML de NF-e (DANFE).
 *            - Atualização automática de estoque e custos de insumos/produtos.
 * ============================================================================
 */

import { db } from "./db/client";
import { gerarTitulosDeCompra, cancelarTitulosDeCompra } from "./financeiro";

const NOW = () => new Date().toISOString();

export type CompraItemInput = {
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
  numeroNota: string;
  serieNota: string | null;
  chaveAcesso: string | null;
  dataEmissao: string | null;
  dataEntrada: string;
  valorProdutos: number;
  valorFrete: number;
  valorTotal: number;
  observacoes: string | null;
  planoContasId?: number | null;
  centroCustoId?: number | null;
  status?: string;
  parcelas?: number;
  formaPagamento?: string;
  criadoEm: string;
  itens: {
    id: number;
    insumoId: number | null;
    produtoId: number | null;
    descricao: string;
    unidade: string;
    quantidade: number;
    valorUnitario: number;
    valorTotal: number;
  }[];
};

export async function listarCompras(empresaId: number): Promise<CompraNota[]> {
  const result = await db.execute({
    sql: `SELECT c.*, f.razao_social AS fornecedor_nome, f.nome_fantasia AS fornecedor_fantasia
          FROM tb_compra_nota c
          LEFT JOIN tb_fornecedor f ON f.id = c.fornecedor_id
          WHERE c.empresa_id = ?
          ORDER BY c.id DESC`,
    args: [empresaId],
  });

  const compras: CompraNota[] = [];
  for (const row of result.rows) {
    const cId = Number(row.id);
    const itensRes = await db.execute({
      sql: `SELECT * FROM tb_compra_item WHERE compra_id = ?`,
      args: [cId],
    });

    compras.push({
      id: cId,
      fornecedorId: row.fornecedor_id ? Number(row.fornecedor_id) : null,
      fornecedorNome: (row.fornecedor_fantasia || row.fornecedor_nome) ? String(row.fornecedor_fantasia || row.fornecedor_nome) : null,
      numeroNota: String(row.numero_nota),
      serieNota: row.serie_nota ? String(row.serie_nota) : null,
      chaveAcesso: row.chave_acesso ? String(row.chave_acesso) : null,
      dataEmissao: row.data_emissao ? String(row.data_emissao) : null,
      dataEntrada: String(row.data_entrada),
      valorProdutos: Number(row.valor_produtos),
      valorFrete: Number(row.valor_frete),
      valorTotal: Number(row.valor_total),
      observacoes: row.observacoes ? String(row.observacoes) : null,
      planoContasId: row.plano_contas_id ? Number(row.plano_contas_id) : null,
      centroCustoId: row.centro_custo_id ? Number(row.centro_custo_id) : null,
      status: row.status ? String(row.status) : "confirmada",
      parcelas: row.parcelas ? Number(row.parcelas) : 1,
      formaPagamento: row.forma_pagamento ? String(row.forma_pagamento) : "boleto",
      criadoEm: String(row.criado_em),
      itens: itensRes.rows.map((iRow) => ({
        id: Number(iRow.id),
        insumoId: iRow.insumo_id ? Number(iRow.insumo_id) : null,
        produtoId: iRow.produto_id ? Number(iRow.produto_id) : null,
        descricao: String(iRow.descricao),
        unidade: String(iRow.unidade),
        quantidade: Number(iRow.quantidade),
        valorUnitario: Number(iRow.valor_unitario),
        valorTotal: Number(iRow.valor_total),
      })),
    });
  }

  return compras;
}

export async function registrarEntradaNota(
  empresaId: number,
  dados: {
    fornecedorId?: number | null;
    numeroNota: string;
    serieNota?: string;
    chaveAcesso?: string;
    dataEmissao?: string;
    dataEntrada?: string;
    valorProdutos: number;
    valorFrete?: number;
    valorTotal: number;
    observacoes?: string;
    arquivoXml?: string;
    planoContasId?: number | null;
    centroCustoId?: number | null;
    parcelas?: number;
    diasVencimento?: number;
    formaPagamento?: string;
    itens: CompraItemInput[];
  }
) {
  if (!dados.numeroNota.trim()) {
    return { erro: "Informe o número da nota fiscal." };
  }
  if (!dados.itens || dados.itens.length === 0) {
    return { erro: "A nota fiscal deve possuir ao menos um item de mercadoria/insumo." };
  }

  const dataEntrada = dados.dataEntrada || new Date().toISOString().split("T")[0];
  const parcelas = Math.max(1, Number(dados.parcelas || 1));
  const diasVencimento = Math.max(1, Number(dados.diasVencimento || 30));
  const formaPagamento = dados.formaPagamento || "boleto";

  // 1. Grava cabeçalho da nota
  const insertNota = await db.execute({
    sql: `INSERT INTO tb_compra_nota (
            empresa_id, fornecedor_id, numero_nota, serie_nota, chave_acesso,
            data_emissao, data_entrada, valor_produtos, valor_frete, valor_total,
            observacoes, arquivo_xml, plano_contas_id, centro_custo_id,
            status, parcelas, dias_vencimento, forma_pagamento, criado_em
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmada', ?, ?, ?, ?)`,
    args: [
      empresaId,
      dados.fornecedorId || null,
      dados.numeroNota.trim(),
      dados.serieNota?.trim() || null,
      dados.chaveAcesso?.trim() || null,
      dados.dataEmissao || null,
      dataEntrada,
      dados.valorProdutos,
      dados.valorFrete || 0,
      dados.valorTotal,
      dados.observacoes?.trim() || null,
      dados.arquivoXml || null,
      dados.planoContasId || null,
      dados.centroCustoId || null,
      parcelas,
      diasVencimento,
      formaPagamento,
      NOW(),
    ],
  });

  const compraId = Number(insertNota.lastInsertRowid);

  // 2. Grava itens e dá entrada no estoque
  for (const item of dados.itens) {
    await db.execute({
      sql: `INSERT INTO tb_compra_item (
              compra_id, insumo_id, produto_id, descricao, unidade, quantidade, valor_unitario, valor_total
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        compraId,
        item.insumoId || null,
        item.produtoId || null,
        item.descricao.trim(),
        item.unidade || "un",
        item.quantidade,
        item.valorUnitario,
        item.valorTotal,
      ],
    });

    // Se for associado a um Insumo cadastrado: soma estoque e atualiza custo de compra
    if (item.insumoId) {
      await db.execute({
        sql: `UPDATE tb_insumo
              SET estoque_atual = estoque_atual + ?,
                  preco_compra = ?,
                  custo_unitario = (? / CASE WHEN quantidade_embalagem > 0 THEN quantidade_embalagem ELSE 1 END)
              WHERE empresa_id = ? AND id = ?`,
        args: [item.quantidade, item.valorUnitario, item.valorUnitario, empresaId, item.insumoId],
      });
    }

    // Se for associado a um Produto acabado (ex: mercadoria p/ revenda): soma estoque
    if (item.produtoId) {
      await db.execute({
        sql: `UPDATE tb_produto
              SET estoque_atual = estoque_atual + ?,
                  preco_custo = ?
              WHERE empresa_id = ? AND id = ?`,
        args: [item.quantidade, item.valorUnitario, empresaId, item.produtoId],
      });
    }
  }

  // 3. Integração Financeira: Gera automaticamente o(s) título(s) a pagar
  await gerarTitulosDeCompra(empresaId, compraId, {
    fornecedorId: dados.fornecedorId || null,
    numeroNota: dados.numeroNota.trim(),
    valorTotal: dados.valorTotal,
    dataEntrada,
    planoContasId: dados.planoContasId || null,
    centroCustoId: dados.centroCustoId || null,
    parcelas,
    intervaloDias: diasVencimento,
    formaPagamento,
  });

  return { ok: true, compraId, numeroNota: dados.numeroNota };
}

/**
 * Cancelamento/Estorno de Compra: cancela títulos em aberto
 */
export async function cancelarCompraNota(empresaId: number, compraId: number) {
  const notaRes = await db.execute({
    sql: `SELECT * FROM tb_compra_nota WHERE empresa_id = ? AND id = ?`,
    args: [empresaId, compraId],
  });
  if (!notaRes.rows[0]) return { erro: "Nota fiscal de compra não encontrada." };

  // Atualiza status da nota
  await db.execute({
    sql: `UPDATE tb_compra_nota SET status = 'cancelada' WHERE empresa_id = ? AND id = ?`,
    args: [empresaId, compraId],
  });

  // Cancela títulos ainda em aberto
  await cancelarTitulosDeCompra(empresaId, compraId);

  return { ok: true };
}

/**
 * Utilitário: Parser simplificado para extrair dados chave de XML de NF-e (Modelo 55 ou 65)
 */
export function parseNfeXml(xmlString: string) {
  try {
    const getTag = (tag: string, content = xmlString) => {
      const match = content.match(new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, "s"));
      return match ? match[1].trim() : "";
    };

    const chaveMatch = xmlString.match(/Id="NFe(\d{44})"/);
    const chaveAcesso = chaveMatch ? chaveMatch[1] : "";

    const nNF = getTag("nNF");
    const serie = getTag("serie");
    const dhEmi = getTag("dhEmi") || getTag("dEmi");
    const dataEmissao = dhEmi ? dhEmi.slice(0, 10) : "";

    // Emitente / Fornecedor
    const emit = getTag("emit");
    const emitCnpj = getTag("CNPJ", emit) || getTag("CPF", emit);
    const emitNome = getTag("xNome", emit);
    const emitFantasia = getTag("xFant", emit);

    // Totais
    const total = getTag("total");
    const icmsTot = getTag("ICMSTot", total);
    const vProd = parseFloat(getTag("vProd", icmsTot) || "0");
    const vFrete = parseFloat(getTag("vFrete", icmsTot) || "0");
    const vNF = parseFloat(getTag("vNF", icmsTot) || "0");

    // Itens / Produtos (tags <det>)
    const itens: CompraItemInput[] = [];
    const detMatches = xmlString.matchAll(/<det\b[^>]*>(.*?)<\/det>/gs);
    for (const match of detMatches) {
      const detContent = match[1];
      const prod = getTag("prod", detContent);
      const xProd = getTag("xProd", prod);
      const uCom = getTag("uCom", prod);
      const qCom = parseFloat(getTag("qCom", prod) || "1");
      const vUnCom = parseFloat(getTag("vUnCom", prod) || "0");
      const vProdItem = parseFloat(getTag("vProd", prod) || String(qCom * vUnCom));

      if (xProd) {
        itens.push({
          descricao: xProd,
          unidade: uCom || "un",
          quantidade: qCom,
          valorUnitario: vUnCom,
          valorTotal: vProdItem,
        });
      }
    }

    return {
      sucesso: true,
      chaveAcesso,
      numeroNota: nNF || "0",
      serieNota: serie || "1",
      dataEmissao,
      fornecedor: {
        cnpjCpf: emitCnpj,
        razaoSocial: emitNome,
        nomeFantasia: emitFantasia,
      },
      valorProdutos: vProd || vNF,
      valorFrete: vFrete,
      valorTotal: vNF,
      itens,
    };
  } catch (err: any) {
    return { sucesso: false, erro: "Não foi possível interpretar o arquivo XML: " + err.message };
  }
}
