/**
 * ============================================================================
 * PROJETO: Gestão com Sabor - Sistema de Gestão para Confeitarias
 * REPOSITÓRIO: https://github.com/junin1737/confeitaria
 * ARQUIVO: server/vendas.ts
 * DESCRIÇÃO: Módulo de Vendas, PDV (Balcão) e Encomendas:
 *            - Criação e acompanhamento de pedidos/encomendas com múltiplos itens.
 *            - Baixa automática no estoque de produtos acabados.
 *            - Controle de pagamentos (sinal, restante, formas de pagamento).
 *            - Atualização das métricas de vendas e histórico financeiro.
 * ============================================================================
 */

import { db } from "./db/client";

const NOW = () => new Date().toISOString();

export type PedidoItemInput = {
  produtoId: number;
  quantidade: number;
  unidade?: string;
  precoUnitario: number;
  precoTotal?: number;
  observacoes?: string;
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
  formaPagamento?: "pix" | "cartao_credito" | "cartao_debito" | "dinheiro" | "a_prazo";
  statusPagamento?: "pendente" | "pago_parcial" | "pago";
  valorDesconto?: number;
  taxaEntrega?: number;
  valorSinal?: number;
  observacoes?: string | null;
  enderecoEntrega?: string | null;
  itens: PedidoItemInput[];
};

export type PedidoDetalhado = {
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
  itens: {
    id: number;
    produtoId: number;
    produtoNome: string;
    quantidade: number;
    unidade: string;
    precoUnitario: number;
    precoTotal: number;
    observacoes: string | null;
  }[];
};

/**
 * Gera o próximo código sequencial de pedido (ex: PED-0001, PED-0002)
 */
export async function proximoCodigoPedido(empresaId: number): Promise<string> {
  const result = await db.execute({
    sql: `SELECT codigo FROM tb_pedido WHERE empresa_id = ? ORDER BY id DESC LIMIT 1`,
    args: [empresaId],
  });

  if (result.rows.length === 0 || !result.rows[0].codigo) {
    return "PED-0001";
  }

  const atual = String(result.rows[0].codigo);
  const match = atual.match(/\d+$/);
  if (!match) return "PED-0001";

  const num = parseInt(match[0], 10) + 1;
  return `PED-${String(num).padStart(4, "0")}`;
}

/**
 * Lista todos os pedidos da empresa com dados do cliente e itens
 */
export async function listarPedidos(
  empresaId: number,
  filtros?: { status?: string; tipo?: string; dataInicio?: string; dataFim?: string }
): Promise<PedidoDetalhado[]> {
  let sql = `
    SELECT p.*, c.nome AS cliente_nome, COALESCE(c.celular, c.telefone) AS cliente_telefone
    FROM tb_pedido p
    LEFT JOIN tb_cliente c ON c.id = p.cliente_id
    WHERE p.empresa_id = ?
  `;
  const args: any[] = [empresaId];

  if (filtros?.status && filtros.status !== "todos") {
    sql += ` AND p.status = ?`;
    args.push(filtros.status);
  }
  if (filtros?.tipo && filtros.tipo !== "todos") {
    sql += ` AND p.tipo = ?`;
    args.push(filtros.tipo);
  }
  if (filtros?.dataInicio) {
    sql += ` AND p.data_pedido >= ?`;
    args.push(filtros.dataInicio);
  }
  if (filtros?.dataFim) {
    sql += ` AND p.data_pedido <= ?`;
    args.push(filtros.dataFim);
  }

  sql += ` ORDER BY p.id DESC`;

  const result = await db.execute({ sql, args });

  const pedidos: PedidoDetalhado[] = [];
  for (const row of result.rows) {
    const pedidoId = Number(row.id);
    const itensRes = await db.execute({
      sql: `SELECT i.*, pr.nome AS produto_nome
            FROM tb_pedido_item i
            INNER JOIN tb_produto pr ON pr.id = i.produto_id
            WHERE i.pedido_id = ?`,
      args: [pedidoId],
    });

    const valorTotal = Number(row.valor_total ?? 0);
    const valorSinal = Number(row.valor_sinal ?? 0);
    const valorRestante = Math.max(0, valorTotal - valorSinal);

    pedidos.push({
      id: pedidoId,
      codigo: String(row.codigo),
      clienteId: row.cliente_id ? Number(row.cliente_id) : null,
      clienteNome: row.cliente_nome ? String(row.cliente_nome) : null,
      clienteTelefone: row.cliente_telefone ? String(row.cliente_telefone) : null,
      dataPedido: String(row.data_pedido),
      dataEntrega: row.data_entrega ? String(row.data_entrega) : null,
      horaEntrega: row.hora_entrega ? String(row.hora_entrega) : null,
      tipo: (row.tipo as any) || "encomenda",
      status: (row.status as any) || "pendente",
      formaPagamento: String(row.forma_pagamento || "dinheiro"),
      statusPagamento: String(row.status_pagamento || "pendente"),
      valorProdutos: Number(row.valor_produtos ?? 0),
      valorDesconto: Number(row.valor_desconto ?? 0),
      taxaEntrega: Number(row.taxa_entrega ?? 0),
      valorSinal,
      valorTotal,
      valorRestante,
      observacoes: row.observacoes ? String(row.observacoes) : null,
      enderecoEntrega: row.endereco_entrega ? String(row.endereco_entrega) : null,
      criadoEm: String(row.criado_em),
      atualizadoEm: String(row.atualizado_em),
      itens: itensRes.rows.map((iRow) => ({
        id: Number(iRow.id),
        produtoId: Number(iRow.produto_id),
        produtoNome: String(iRow.produto_nome),
        quantidade: Number(iRow.quantidade),
        unidade: String(iRow.unidade || "UN"),
        precoUnitario: Number(iRow.preco_unitario),
        precoTotal: Number(iRow.preco_total),
        observacoes: iRow.observacoes ? String(iRow.observacoes) : null,
      })),
    });
  }

  return pedidos;
}

/**
 * Cria ou atualiza um pedido, calculando totais e movimentando estoque
 */
export async function salvarPedido(empresaId: number, dados: PedidoInput) {
  if (!dados.itens || dados.itens.length === 0) {
    return { erro: "O pedido deve conter ao menos um produto." };
  }

  // Calcula total dos produtos
  let valorProdutos = 0;
  const itensCalculados = dados.itens.map((item) => {
    const qtd = Math.max(0.001, Number(item.quantidade || 1));
    const precoUnit = Math.max(0, Number(item.precoUnitario || 0));
    const totalItem = Math.round(qtd * precoUnit * 100) / 100;
    valorProdutos += totalItem;
    return {
      ...item,
      quantidade: qtd,
      precoUnitario: precoUnit,
      precoTotal: totalItem,
    };
  });

  const desconto = Math.max(0, Number(dados.valorDesconto || 0));
  const taxaEntrega = Math.max(0, Number(dados.taxaEntrega || 0));
  const sinal = Math.max(0, Number(dados.valorSinal || 0));
  const valorTotal = Math.max(0, Math.round((valorProdutos - desconto + taxaEntrega) * 100) / 100);

  const statusPagamento = dados.statusPagamento || (sinal >= valorTotal ? "pago" : sinal > 0 ? "pago_parcial" : "pendente");
  const agora = NOW();

  let pedidoId = dados.id;

  if (pedidoId) {
    // Atualização de pedido existente
    await db.execute({
      sql: `UPDATE tb_pedido
            SET cliente_id = ?, data_pedido = ?, data_entrega = ?, hora_entrega = ?,
                tipo = ?, status = ?, forma_pagamento = ?, status_pagamento = ?,
                valor_produtos = ?, valor_desconto = ?, taxa_entrega = ?,
                valor_sinal = ?, valor_total = ?, observacoes = ?,
                endereco_entrega = ?, atualizado_em = ?
            WHERE empresa_id = ? AND id = ?`,
      args: [
        dados.clienteId || null,
        dados.dataPedido || agora.split("T")[0],
        dados.dataEntrega || null,
        dados.horaEntrega || null,
        dados.tipo || "encomenda",
        dados.status || "pendente",
        dados.formaPagamento || "dinheiro",
        statusPagamento,
        valorProdutos,
        desconto,
        taxaEntrega,
        sinal,
        valorTotal,
        dados.observacoes?.trim() || null,
        dados.enderecoEntrega?.trim() || null,
        agora,
        empresaId,
        pedidoId,
      ],
    });

    // Remove itens antigos para reinserir
    await db.execute({
      sql: "DELETE FROM tb_pedido_item WHERE pedido_id = ?",
      args: [pedidoId],
    });
  } else {
    // Novo pedido
    const codigo = dados.codigo || (await proximoCodigoPedido(empresaId));
    const insertRes = await db.execute({
      sql: `INSERT INTO tb_pedido (
              empresa_id, codigo, cliente_id, data_pedido, data_entrega, hora_entrega,
              tipo, status, forma_pagamento, status_pagamento, valor_produtos,
              valor_desconto, taxa_entrega, valor_sinal, valor_total, observacoes,
              endereco_entrega, criado_em, atualizado_em
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        empresaId,
        codigo,
        dados.clienteId || null,
        dados.dataPedido || agora.split("T")[0],
        dados.dataEntrega || null,
        dados.horaEntrega || null,
        dados.tipo || "encomenda",
        dados.status || "pendente",
        dados.formaPagamento || "dinheiro",
        statusPagamento,
        valorProdutos,
        desconto,
        taxaEntrega,
        sinal,
        valorTotal,
        dados.observacoes?.trim() || null,
        dados.enderecoEntrega?.trim() || null,
        agora,
        agora,
      ],
    });
    pedidoId = Number(insertRes.lastInsertRowid);
  }

  // Insere itens e dá baixa no estoque do produto acabado
  for (const item of itensCalculados) {
    await db.execute({
      sql: `INSERT INTO tb_pedido_item (
              pedido_id, produto_id, quantidade, unidade, preco_unitario, preco_total, observacoes
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        pedidoId,
        item.produtoId,
        item.quantidade,
        item.unidade || "UN",
        item.precoUnitario,
        item.precoTotal,
        item.observacoes?.trim() || null,
      ],
    });

    // Baixa imediata de estoque caso não seja pedido cancelado
    if (dados.status !== "cancelado") {
      await db.execute({
        sql: `UPDATE tb_produto SET estoque_atual = MAX(0, estoque_atual - ?) WHERE empresa_id = ? AND id = ?`,
        args: [item.quantidade, empresaId, item.produtoId],
      });
    }
  }

  return { id: pedidoId, ok: true };
}

/**
 * Atualiza rapidamente o status de produção/entrega de um pedido
 */
export async function alterarStatusPedido(
  empresaId: number,
  pedidoId: number,
  novoStatus: "pendente" | "em_producao" | "pronto" | "entregue" | "cancelado"
) {
  await db.execute({
    sql: `UPDATE tb_pedido SET status = ?, atualizado_em = ? WHERE empresa_id = ? AND id = ?`,
    args: [novoStatus, NOW(), empresaId, pedidoId],
  });
  return { ok: true };
}

/**
 * Atualiza o status de pagamento (ex: recebeu sinal ou quitou restante)
 */
export async function registrarPagamentoPedido(
  empresaId: number,
  pedidoId: number,
  valorRecebido: number,
  formaPagamento: string
) {
  const pedRes = await db.execute({
    sql: `SELECT valor_total, valor_sinal FROM tb_pedido WHERE empresa_id = ? AND id = ?`,
    args: [empresaId, pedidoId],
  });
  if (!pedRes.rows[0]) return { erro: "Pedido não encontrado." };

  const total = Number(pedRes.rows[0].valor_total);
  const sinalAtual = Number(pedRes.rows[0].valor_sinal);
  const novoSinal = sinalAtual + valorRecebido;
  const statusPag = novoSinal >= total ? "pago" : "pago_parcial";

  await db.execute({
    sql: `UPDATE tb_pedido 
          SET valor_sinal = ?, status_pagamento = ?, forma_pagamento = ?, atualizado_em = ?
          WHERE empresa_id = ? AND id = ?`,
    args: [novoSinal, statusPag, formaPagamento, NOW(), empresaId, pedidoId],
  });

  return { ok: true, statusPagamento: statusPag, novoSinal };
}

/**
 * Exclui um pedido
 */
export async function excluirPedido(empresaId: number, id: number) {
  await db.execute({
    sql: "DELETE FROM tb_pedido WHERE empresa_id = ? AND id = ?",
    args: [empresaId, id],
  });
  return { ok: true };
}
