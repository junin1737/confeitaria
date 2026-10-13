/**
 * ============================================================================
 * PROJETO: Gestão com Sabor - Sistema de Gestão para Confeitarias
 * REPOSITÓRIO: https://github.com/junin1737/confeitaria
 * ARQUIVO: server/financeiro.ts
 * DESCRIÇÃO: Módulo Financeiro Completo:
 *            - Plano de Contas Hierárquico (Sintéticas / Analíticas)
 *            - Centros de Custo (Departamentalização)
 *            - Contas a Pagar (Integração c/ Compras & Baixa Parcial/Total)
 *            - Contas a Receber (Integração c/ Pedidos & Baixa Parcial/Total)
 *            - Controle de Caixa (Abertura, Sangria, Suprimento e Fechamento)
 *            - Controle Bancário (Contas, Extratos e Transferências)
 * ============================================================================
 */

import { db } from "./db/client";

const NOW = () => new Date().toISOString();

/**
 * Utilitário: formata/arredonda valor monetário com precisão decimal (2 casas)
 */
export function arredondarMoeda(valor: number): number {
  return Math.round((Number(valor) || 0) * 100) / 100;
}

// ============================================================================
// 1. PLANO DE CONTAS
// ============================================================================

export type PlanoConta = {
  id: number;
  codigo: string;
  nome: string;
  tipo: "receita" | "despesa";
  contaPaiId: number | null;
  contaPaiNome?: string | null;
  tipoConta: "sintetica" | "analitica";
  ativo: boolean;
  criadoEm: string;
  nivel?: number;
};

export async function listarPlanoContas(
  empresaId: number,
  filtros?: { tipo?: "receita" | "despesa"; apenasAnaliticas?: boolean; apenasAtivos?: boolean }
): Promise<PlanoConta[]> {
  let sql = `
    SELECT c.*, p.nome AS conta_pai_nome
    FROM tb_plano_contas c
    LEFT JOIN tb_plano_contas p ON p.id = c.conta_pai_id
    WHERE c.empresa_id = ?
  `;
  const args: any[] = [empresaId];

  if (filtros?.tipo) {
    sql += ` AND c.tipo = ?`;
    args.push(filtros.tipo);
  }
  if (filtros?.apenasAnaliticas) {
    sql += ` AND c.tipo_conta = 'analitica'`;
  }
  if (filtros?.apenasAtivos) {
    sql += ` AND c.ativo = 1`;
  }

  // Ordenação hierárquica por código
  sql += ` ORDER BY c.codigo ASC`;

  const result = await db.execute({ sql, args });

  return result.rows.map((row) => {
    const cod = String(row.codigo || "");
    const nivel = cod.split(".").length;
    return {
      id: Number(row.id),
      codigo: cod,
      nome: String(row.nome),
      tipo: row.tipo as "receita" | "despesa",
      contaPaiId: row.conta_pai_id ? Number(row.conta_pai_id) : null,
      contaPaiNome: row.conta_pai_nome ? String(row.conta_pai_nome) : null,
      tipoConta: (row.tipo_conta ?? "analitica") as "sintetica" | "analitica",
      ativo: Number(row.ativo ?? 1) === 1,
      criadoEm: String(row.criado_em),
      nivel,
    };
  });
}

export async function obterPlanoConta(empresaId: number, id: number): Promise<PlanoConta | null> {
  const lista = await listarPlanoContas(empresaId);
  return lista.find((c) => c.id === id) ?? null;
}

export async function salvarPlanoConta(
  empresaId: number,
  dados: {
    id?: number;
    codigo: string;
    nome: string;
    tipo: "receita" | "despesa";
    contaPaiId?: number | null;
    tipoConta?: "sintetica" | "analitica";
    ativo?: boolean;
  }
) {
  const codigo = dados.codigo.trim();
  const nome = dados.nome.trim();
  if (!codigo) return { erro: "Informe o código da conta (ex: 1.1.01)." };
  if (!nome) return { erro: "Informe o nome da conta." };

  const tipo = dados.tipo;
  const tipoConta = dados.tipoConta || "analitica";
  const ativo = dados.ativo === false ? 0 : 1;

  if (dados.id) {
    // Atualização
    await db.execute({
      sql: `UPDATE tb_plano_contas
            SET codigo = ?, nome = ?, tipo = ?, conta_pai_id = ?, tipo_conta = ?, ativo = ?
            WHERE empresa_id = ? AND id = ?`,
      args: [codigo, nome, tipo, dados.contaPaiId || null, tipoConta, ativo, empresaId, dados.id],
    });
    return { id: dados.id, ok: true };
  }

  // Novo registro
  const check = await db.execute({
    sql: `SELECT id FROM tb_plano_contas WHERE empresa_id = ? AND codigo = ?`,
    args: [empresaId, codigo],
  });
  if (check.rows.length > 0) {
    return { erro: `Já existe uma conta com o código ${codigo}.` };
  }

  const insert = await db.execute({
    sql: `INSERT INTO tb_plano_contas (
            empresa_id, codigo, nome, tipo, conta_pai_id, tipo_conta, ativo, criado_em
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [empresaId, codigo, nome, tipo, dados.contaPaiId || null, tipoConta, ativo, NOW()],
  });

  return { id: Number(insert.lastInsertRowid), ok: true };
}

export async function excluirPlanoConta(empresaId: number, id: number) {
  // 1. Checa filhas
  const filhas = await db.execute({
    sql: `SELECT COUNT(*) AS total FROM tb_plano_contas WHERE empresa_id = ? AND conta_pai_id = ?`,
    args: [empresaId, id],
  });
  if (Number(filhas.rows[0]?.total ?? 0) > 0) {
    return { erro: "Não é possível excluir esta conta pois existem contas filhas vinculadas a ela. Apenas inative-a." };
  }

  // 2. Checa lançamentos em Contas a Pagar
  const titPagar = await db.execute({
    sql: `SELECT COUNT(*) AS total FROM tb_titulo_pagar WHERE empresa_id = ? AND plano_contas_id = ?`,
    args: [empresaId, id],
  });
  if (Number(titPagar.rows[0]?.total ?? 0) > 0) {
    return { erro: "Não é possível excluir esta conta pois existem títulos a pagar vinculados a ela. Apenas inative-a." };
  }

  // 3. Checa lançamentos em Contas a Receber
  const titRec = await db.execute({
    sql: `SELECT COUNT(*) AS total FROM tb_titulo_receber WHERE empresa_id = ? AND plano_contas_id = ?`,
    args: [empresaId, id],
  });
  if (Number(titRec.rows[0]?.total ?? 0) > 0) {
    return { erro: "Não é possível excluir esta conta pois existem títulos a receber vinculados a ela. Apenas inative-a." };
  }

  // 4. Checa movimentações financeiras
  const movs = await db.execute({
    sql: `SELECT COUNT(*) AS total FROM tb_movimentacao_financeira WHERE empresa_id = ? AND plano_contas_id = ?`,
    args: [empresaId, id],
  });
  if (Number(movs.rows[0]?.total ?? 0) > 0) {
    return { erro: "Não é possível excluir esta conta pois existem movimentações financeiras vinculadas. Apenas inative-a." };
  }

  await db.execute({
    sql: `DELETE FROM tb_plano_contas WHERE empresa_id = ? AND id = ?`,
    args: [empresaId, id],
  });

  return { ok: true };
}

/**
 * Criação idempotente do Plano de Contas Padrão para Confeitaria e Salgadeira
 */
export async function seedPlanoContasPadrao(empresaId: number) {
  const existing = await db.execute({
    sql: `SELECT COUNT(*) AS total FROM tb_plano_contas WHERE empresa_id = ?`,
    args: [empresaId],
  });
  if (Number(existing.rows[0]?.total ?? 0) > 0) return;

  const CONTAS_PADRAO: {
    codigo: string;
    nome: string;
    tipo: "receita" | "despesa";
    tipoConta: "sintetica" | "analitica";
    paiCodigo?: string;
  }[] = [
    // 1 RECEITAS
    { codigo: "1", nome: "RECEITAS", tipo: "receita", tipoConta: "sintetica" },
    { codigo: "1.1", nome: "Receitas Operacionais (Vendas)", tipo: "receita", tipoConta: "sintetica", paiCodigo: "1" },
    { codigo: "1.1.01", nome: "Venda de Bolos e Tortas", tipo: "receita", tipoConta: "analitica", paiCodigo: "1.1" },
    { codigo: "1.1.02", nome: "Venda de Doces e Brigadeiros", tipo: "receita", tipoConta: "analitica", paiCodigo: "1.1" },
    { codigo: "1.1.03", nome: "Venda de Salgados", tipo: "receita", tipoConta: "analitica", paiCodigo: "1.1" },
    { codigo: "1.1.04", nome: "Venda de Kits Festa", tipo: "receita", tipoConta: "analitica", paiCodigo: "1.1" },
    { codigo: "1.1.05", nome: "Venda Balcão / Cafeteria", tipo: "receita", tipoConta: "analitica", paiCodigo: "1.1" },
    { codigo: "1.1.06", nome: "Taxas de Entrega / Delivery", tipo: "receita", tipoConta: "analitica", paiCodigo: "1.1" },
    { codigo: "1.2", nome: "Outras Receitas", tipo: "receita", tipoConta: "sintetica", paiCodigo: "1" },
    { codigo: "1.2.01", nome: "Rendimentos Financeiros", tipo: "receita", tipoConta: "analitica", paiCodigo: "1.2" },
    { codigo: "1.2.02", nome: "Receitas Diversas", tipo: "receita", tipoConta: "analitica", paiCodigo: "1.2" },

    // 2 DESPESAS
    { codigo: "2", nome: "DESPESAS", tipo: "despesa", tipoConta: "sintetica" },
    { codigo: "2.1", nome: "Custos de Produção e Mercadorias", tipo: "despesa", tipoConta: "sintetica", paiCodigo: "2" },
    { codigo: "2.1.01", nome: "Compra de Insumos e Ingredientes", tipo: "despesa", tipoConta: "analitica", paiCodigo: "2.1" },
    { codigo: "2.1.02", nome: "Embalagens e Forminhas", tipo: "despesa", tipoConta: "analitica", paiCodigo: "2.1" },
    { codigo: "2.1.03", nome: "Mercadorias para Revenda", tipo: "despesa", tipoConta: "analitica", paiCodigo: "2.1" },
    { codigo: "2.1.04", nome: "Fretes sobre Compras", tipo: "despesa", tipoConta: "analitica", paiCodigo: "2.1" },
    { codigo: "2.2", nome: "Despesas Operacionais", tipo: "despesa", tipoConta: "sintetica", paiCodigo: "2" },
    { codigo: "2.2.01", nome: "Salários e Pró-labore", tipo: "despesa", tipoConta: "analitica", paiCodigo: "2.2" },
    { codigo: "2.2.02", nome: "Aluguel e Condomínio", tipo: "despesa", tipoConta: "analitica", paiCodigo: "2.2" },
    { codigo: "2.2.03", nome: "Energia Elétrica e Gás", tipo: "despesa", tipoConta: "analitica", paiCodigo: "2.2" },
    { codigo: "2.2.04", nome: "Água e Esgoto", tipo: "despesa", tipoConta: "analitica", paiCodigo: "2.2" },
    { codigo: "2.2.05", nome: "Internet, Telefone e Software", tipo: "despesa", tipoConta: "analitica", paiCodigo: "2.2" },
    { codigo: "2.2.06", nome: "Material de Limpeza e Copa", tipo: "despesa", tipoConta: "analitica", paiCodigo: "2.2" },
    { codigo: "2.2.07", nome: "Manutenção de Equipamentos", tipo: "despesa", tipoConta: "analitica", paiCodigo: "2.2" },
    { codigo: "2.3", nome: "Despesas Comerciais e Vendas", tipo: "despesa", tipoConta: "sintetica", paiCodigo: "2" },
    { codigo: "2.3.01", nome: "Taxas de Cartão e Plataformas (iFood)", tipo: "despesa", tipoConta: "analitica", paiCodigo: "2.3" },
    { codigo: "2.3.02", nome: "Propaganda e Marketing", tipo: "despesa", tipoConta: "analitica", paiCodigo: "2.3" },
    { codigo: "2.3.03", nome: "Descontos Concedidos", tipo: "despesa", tipoConta: "analitica", paiCodigo: "2.3" },
    { codigo: "2.4", nome: "Despesas Administrativas e Financeiras", tipo: "despesa", tipoConta: "sintetica", paiCodigo: "2" },
    { codigo: "2.4.01", nome: "Tarifas Bancárias e Juros", tipo: "despesa", tipoConta: "analitica", paiCodigo: "2.4" },
    { codigo: "2.4.02", nome: "Impostos e Tributos (DAS/Simples)", tipo: "despesa", tipoConta: "analitica", paiCodigo: "2.4" },
    { codigo: "2.4.03", nome: "Honorários Contábeis", tipo: "despesa", tipoConta: "analitica", paiCodigo: "2.4" },
  ];

  const mapIds: Record<string, number> = {};

  for (const c of CONTAS_PADRAO) {
    const paiId = c.paiCodigo ? mapIds[c.paiCodigo] || null : null;
    const res = await db.execute({
      sql: `INSERT INTO tb_plano_contas (
              empresa_id, codigo, nome, tipo, conta_pai_id, tipo_conta, ativo, criado_em
            ) VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
      args: [empresaId, c.codigo, c.nome, c.tipo, paiId, c.tipoConta, NOW()],
    });
    mapIds[c.codigo] = Number(res.lastInsertRowid);
  }
}

// ============================================================================
// 2. CENTRO DE CUSTO
// ============================================================================

export type CentroCusto = {
  id: number;
  codigo: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  criadoEm: string;
};

export async function listarCentrosCusto(empresaId: number, apenasAtivos = false): Promise<CentroCusto[]> {
  let sql = `SELECT * FROM tb_centro_custo WHERE empresa_id = ?`;
  const args: any[] = [empresaId];
  if (apenasAtivos) {
    sql += ` AND ativo = 1`;
  }
  sql += ` ORDER BY nome COLLATE NOCASE ASC`;

  const result = await db.execute({ sql, args });

  const lista: CentroCusto[] = result.rows.map((row) => ({
    id: Number(row.id),
    codigo: String(row.codigo),
    nome: String(row.nome),
    descricao: row.descricao ? String(row.descricao) : null,
    ativo: Number(row.ativo ?? 1) === 1,
    criadoEm: String(row.criado_em),
  }));

  // Ordenação garantida em Português sem case e sem acento
  return lista.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }));
}

export async function obterCentroCusto(empresaId: number, id: number): Promise<CentroCusto | null> {
  const lista = await listarCentrosCusto(empresaId);
  return lista.find((c) => c.id === id) ?? null;
}

export async function salvarCentroCusto(
  empresaId: number,
  dados: { id?: number; codigo: string; nome: string; descricao?: string; ativo?: boolean }
) {
  const codigo = dados.codigo.trim();
  const nome = dados.nome.trim();
  if (!codigo) return { erro: "Informe o código do centro de custo." };
  if (!nome) return { erro: "Informe o nome do centro de custo." };
  const ativo = dados.ativo === false ? 0 : 1;

  if (dados.id) {
    await db.execute({
      sql: `UPDATE tb_centro_custo
            SET codigo = ?, nome = ?, descricao = ?, ativo = ?
            WHERE empresa_id = ? AND id = ?`,
      args: [codigo, nome, dados.descricao?.trim() || null, ativo, empresaId, dados.id],
    });
    return { id: dados.id, ok: true };
  }

  const check = await db.execute({
    sql: `SELECT id FROM tb_centro_custo WHERE empresa_id = ? AND codigo = ?`,
    args: [empresaId, codigo],
  });
  if (check.rows.length > 0) {
    return { erro: `Já existe um centro de custo com o código ${codigo}.` };
  }

  const insert = await db.execute({
    sql: `INSERT INTO tb_centro_custo (empresa_id, codigo, nome, descricao, ativo, criado_em)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [empresaId, codigo, nome, dados.descricao?.trim() || null, ativo, NOW()],
  });

  return { id: Number(insert.lastInsertRowid), ok: true };
}

export async function excluirCentroCusto(empresaId: number, id: number) {
  const pag = await db.execute({
    sql: `SELECT COUNT(*) AS total FROM tb_titulo_pagar WHERE empresa_id = ? AND centro_custo_id = ?`,
    args: [empresaId, id],
  });
  if (Number(pag.rows[0]?.total ?? 0) > 0) {
    return { erro: "Não é possível excluir este centro de custo pois há títulos a pagar vinculados a ele. Apenas inative-o." };
  }

  const rec = await db.execute({
    sql: `SELECT COUNT(*) AS total FROM tb_titulo_receber WHERE empresa_id = ? AND centro_custo_id = ?`,
    args: [empresaId, id],
  });
  if (Number(rec.rows[0]?.total ?? 0) > 0) {
    return { erro: "Não é possível excluir este centro de custo pois há títulos a receber vinculados a ele. Apenas inative-o." };
  }

  const mov = await db.execute({
    sql: `SELECT COUNT(*) AS total FROM tb_movimentacao_financeira WHERE empresa_id = ? AND centro_custo_id = ?`,
    args: [empresaId, id],
  });
  if (Number(mov.rows[0]?.total ?? 0) > 0) {
    return { erro: "Não é possível excluir este centro de custo pois há movimentações financeiras vinculadas. Apenas inative-o." };
  }

  await db.execute({
    sql: `DELETE FROM tb_centro_custo WHERE empresa_id = ? AND id = ?`,
    args: [empresaId, id],
  });

  return { ok: true };
}

export async function seedCentrosCustoPadrao(empresaId: number) {
  const existing = await db.execute({
    sql: `SELECT COUNT(*) AS total FROM tb_centro_custo WHERE empresa_id = ?`,
    args: [empresaId],
  });
  if (Number(existing.rows[0]?.total ?? 0) > 0) return;

  const PADROES = [
    { codigo: "CC-001", nome: "Produção", descricao: "Cozinha, confeitaria, masseira e fabricação de doces e salgados" },
    { codigo: "CC-002", nome: "Loja / Balcão", descricao: "Atendimento no balcão, cafeteria e salão da confeitaria" },
    { codigo: "CC-003", nome: "Delivery", descricao: "Logística de entregas, motoboys e expedição de pedidos" },
    { codigo: "CC-004", nome: "Administrativo", descricao: "Gestão do negócio, compras, escritório e suporte geral" },
  ];

  for (const c of PADROES) {
    await db.execute({
      sql: `INSERT INTO tb_centro_custo (empresa_id, codigo, nome, descricao, ativo, criado_em)
            VALUES (?, ?, ?, ?, 1, ?)`,
      args: [empresaId, c.codigo, c.nome, c.descricao, NOW()],
    });
  }
}

// ============================================================================
// 3. CONTAS BANCÁRIAS
// ============================================================================

export type ContaBancaria = {
  id: number;
  banco: string;
  agencia: string | null;
  conta: string;
  tipo: "corrente" | "poupanca" | "pagamento" | "investimento";
  saldoInicial: number;
  saldoAtual?: number;
  ativo: boolean;
  criadoEm: string;
};

export async function listarContasBancarias(empresaId: number, apenasAtivas = false): Promise<ContaBancaria[]> {
  let sql = `SELECT * FROM tb_conta_bancaria WHERE empresa_id = ?`;
  const args: any[] = [empresaId];
  if (apenasAtivas) {
    sql += ` AND ativo = 1`;
  }
  sql += ` ORDER BY banco COLLATE NOCASE ASC, conta ASC`;

  const result = await db.execute({ sql, args });

  const contas: ContaBancaria[] = [];
  for (const row of result.rows) {
    const id = Number(row.id);
    const saldoInicial = arredondarMoeda(Number(row.saldo_inicial ?? 0));

    // Calcula saldo atual baseado em movimentações
    const movs = await db.execute({
      sql: `SELECT 
              COALESCE(SUM(CASE WHEN tipo = 'receita' OR (tipo = 'transferencia' AND conta_bancaria_destino_id = ?) THEN valor_liquido ELSE 0 END), 0) AS total_entradas,
              COALESCE(SUM(CASE WHEN tipo = 'despesa' OR (tipo = 'transferencia' AND conta_bancaria_id = ?) THEN valor_liquido ELSE 0 END), 0) AS total_saidas
            FROM tb_movimentacao_financeira
            WHERE empresa_id = ? AND (conta_bancaria_id = ? OR conta_bancaria_destino_id = ?)`,
      args: [id, id, empresaId, id, id],
    });

    const entradas = Number(movs.rows[0]?.total_entradas ?? 0);
    const saidas = Number(movs.rows[0]?.total_saidas ?? 0);
    const saldoAtual = arredondarMoeda(saldoInicial + entradas - saidas);

    contas.push({
      id,
      banco: String(row.banco),
      agencia: row.agencia ? String(row.agencia) : null,
      conta: String(row.conta),
      tipo: (row.tipo ?? "corrente") as ContaBancaria["tipo"],
      saldoInicial,
      saldoAtual,
      ativo: Number(row.ativo ?? 1) === 1,
      criadoEm: String(row.criado_em),
    });
  }

  return contas.sort((a, b) => a.banco.localeCompare(b.banco, "pt-BR", { sensitivity: "base" }));
}

export async function salvarContaBancaria(
  empresaId: number,
  dados: {
    id?: number;
    banco: string;
    agencia?: string;
    conta: string;
    tipo?: "corrente" | "poupanca" | "pagamento" | "investimento";
    saldoInicial?: number;
    ativo?: boolean;
  }
) {
  const banco = dados.banco.trim();
  const conta = dados.conta.trim();
  if (!banco) return { erro: "Informe o nome ou código do banco." };
  if (!conta) return { erro: "Informe o número da conta." };
  const tipo = dados.tipo || "corrente";
  const saldoInicial = arredondarMoeda(Number(dados.saldoInicial || 0));
  const ativo = dados.ativo === false ? 0 : 1;

  if (dados.id) {
    await db.execute({
      sql: `UPDATE tb_conta_bancaria
            SET banco = ?, agencia = ?, conta = ?, tipo = ?, saldo_inicial = ?, ativo = ?
            WHERE empresa_id = ? AND id = ?`,
      args: [banco, dados.agencia?.trim() || null, conta, tipo, saldoInicial, ativo, empresaId, dados.id],
    });
    return { id: dados.id, ok: true };
  }

  const insert = await db.execute({
    sql: `INSERT INTO tb_conta_bancaria (
            empresa_id, banco, agencia, conta, tipo, saldo_inicial, ativo, criado_em
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [empresaId, banco, dados.agencia?.trim() || null, conta, tipo, saldoInicial, ativo, NOW()],
  });

  return { id: Number(insert.lastInsertRowid), ok: true };
}

// ============================================================================
// 4. CONTAS A PAGAR
// ============================================================================

export type TituloPagar = {
  id: number;
  fornecedorId: number | null;
  fornecedorNome?: string | null;
  compraId: number | null;
  descricao: string;
  planoContasId: number;
  planoContasCodigo?: string | null;
  planoContasNome?: string | null;
  centroCustoId: number | null;
  centroCustoNome?: string | null;
  valorOriginal: number;
  valorPago: number;
  saldoRestante: number;
  vencimento: string;
  numeroParcela: number;
  totalParcelas: number;
  formaPagamento: string;
  status: "aberto" | "pago_parcial" | "pago" | "cancelado";
  dataPagamento: string | null;
  observacoes: string | null;
  criadoEm: string;
};

export async function listarTitulosPagar(
  empresaId: number,
  filtros?: {
    status?: string;
    fornecedorId?: number;
    planoContasId?: number;
    centroCustoId?: number;
    dataInicio?: string;
    dataFim?: string;
  }
): Promise<TituloPagar[]> {
  let sql = `
    SELECT tp.*,
           f.razao_social AS fornecedor_razao, f.nome_fantasia AS fornecedor_fantasia,
           pc.codigo AS plano_codigo, pc.nome AS plano_nome,
           cc.nome AS centro_custo_nome
    FROM tb_titulo_pagar tp
    LEFT JOIN tb_fornecedor f ON f.id = tp.fornecedor_id
    LEFT JOIN tb_plano_contas pc ON pc.id = tp.plano_contas_id
    LEFT JOIN tb_centro_custo cc ON cc.id = tp.centro_custo_id
    WHERE tp.empresa_id = ?
  `;
  const args: any[] = [empresaId];

  if (filtros?.status && filtros.status !== "todos") {
    sql += ` AND tp.status = ?`;
    args.push(filtros.status);
  }
  if (filtros?.fornecedorId) {
    sql += ` AND tp.fornecedor_id = ?`;
    args.push(filtros.fornecedorId);
  }
  if (filtros?.planoContasId) {
    sql += ` AND tp.plano_contas_id = ?`;
    args.push(filtros.planoContasId);
  }
  if (filtros?.centroCustoId) {
    sql += ` AND tp.centro_custo_id = ?`;
    args.push(filtros.centroCustoId);
  }
  if (filtros?.dataInicio) {
    sql += ` AND tp.vencimento >= ?`;
    args.push(filtros.dataInicio);
  }
  if (filtros?.dataFim) {
    sql += ` AND tp.vencimento <= ?`;
    args.push(filtros.dataFim);
  }

  sql += ` ORDER BY tp.vencimento ASC, tp.id ASC`;

  const result = await db.execute({ sql, args });

  return result.rows.map((row) => {
    const vOriginal = arredondarMoeda(Number(row.valor_original ?? 0));
    const vPago = arredondarMoeda(Number(row.valor_pago ?? 0));
    const saldo = Math.max(0, arredondarMoeda(vOriginal - vPago));

    return {
      id: Number(row.id),
      fornecedorId: row.fornecedor_id ? Number(row.fornecedor_id) : null,
      fornecedorNome: (row.fornecedor_fantasia || row.fornecedor_razao)
        ? String(row.fornecedor_fantasia || row.fornecedor_razao)
        : null,
      compraId: row.compra_id ? Number(row.compra_id) : null,
      descricao: String(row.descricao),
      planoContasId: Number(row.plano_contas_id),
      planoContasCodigo: row.plano_codigo ? String(row.plano_codigo) : null,
      planoContasNome: row.plano_nome ? String(row.plano_nome) : null,
      centroCustoId: row.centro_custo_id ? Number(row.centro_custo_id) : null,
      centroCustoNome: row.centro_custo_nome ? String(row.centro_custo_nome) : null,
      valorOriginal: vOriginal,
      valorPago: vPago,
      saldoRestante: saldo,
      vencimento: String(row.vencimento),
      numeroParcela: Number(row.numero_parcela ?? 1),
      totalParcelas: Number(row.total_parcelas ?? 1),
      formaPagamento: String(row.forma_pagamento ?? "boleto"),
      status: (row.status ?? "aberto") as TituloPagar["status"],
      dataPagamento: row.data_pagamento ? String(row.data_pagamento) : null,
      observacoes: row.observacoes ? String(row.observacoes) : null,
      criadoEm: String(row.criado_em),
    };
  });
}

export async function salvarTituloPagar(
  empresaId: number,
  dados: {
    id?: number;
    fornecedorId?: number | null;
    compraId?: number | null;
    descricao: string;
    planoContasId: number;
    centroCustoId?: number | null;
    valorOriginal: number;
    vencimento: string;
    numeroParcela?: number;
    totalParcelas?: number;
    formaPagamento?: string;
    observacoes?: string;
  }
) {
  const descricao = dados.descricao.trim();
  if (!descricao) return { erro: "Informe a descrição do título." };
  if (!dados.planoContasId) return { erro: "Selecione uma conta no Plano de Contas." };
  if (!dados.vencimento) return { erro: "Informe a data de vencimento." };

  const valorOriginal = arredondarMoeda(dados.valorOriginal);
  if (valorOriginal <= 0) return { erro: "O valor do título deve ser maior que zero." };

  // Validação: Somente contas analíticas de despesa podem ser usadas
  const conta = await obterPlanoConta(empresaId, dados.planoContasId);
  if (!conta) return { erro: "Conta do plano de contas não encontrada." };
  if (conta.tipoConta !== "analitica") {
    return { erro: "Apenas contas analíticas recebem lançamentos. Escolha uma subconta analítica." };
  }
  if (conta.tipo !== "despesa") {
    return { erro: "O título a pagar deve ser vinculado a uma conta de despesa." };
  }

  if (dados.id) {
    await db.execute({
      sql: `UPDATE tb_titulo_pagar
            SET fornecedor_id = ?, descricao = ?, plano_contas_id = ?, centro_custo_id = ?,
                valor_original = ?, vencimento = ?, forma_pagamento = ?, observacoes = ?
            WHERE empresa_id = ? AND id = ?`,
      args: [
        dados.fornecedorId || null,
        descricao,
        dados.planoContasId,
        dados.centroCustoId || null,
        valorOriginal,
        dados.vencimento,
        dados.formaPagamento || "boleto",
        dados.observacoes?.trim() || null,
        empresaId,
        dados.id,
      ],
    });
    return { id: dados.id, ok: true };
  }

  const insert = await db.execute({
    sql: `INSERT INTO tb_titulo_pagar (
            empresa_id, fornecedor_id, compra_id, descricao, plano_contas_id,
            centro_custo_id, valor_original, valor_pago, vencimento, numero_parcela,
            total_parcelas, forma_pagamento, status, observacoes, criado_em
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, 'aberto', ?, ?)`,
    args: [
      empresaId,
      dados.fornecedorId || null,
      dados.compraId || null,
      descricao,
      dados.planoContasId,
      dados.centroCustoId || null,
      valorOriginal,
      dados.vencimento,
      dados.numeroParcela || 1,
      dados.totalParcelas || 1,
      dados.formaPagamento || "boleto",
      dados.observacoes?.trim() || null,
      NOW(),
    ],
  });

  return { id: Number(insert.lastInsertRowid), ok: true };
}

/**
 * Baixa (Liquidação Total ou Parcial) de Título a Pagar
 */
export async function baixarTituloPagar(
  empresaId: number,
  dados: {
    tituloId: number;
    usuarioId: number;
    dataBaixa: string;
    valorBaixa: number;
    jurosMulta?: number;
    desconto?: number;
    contaDestinoTipo: "caixa" | "banco";
    caixaId?: number;
    contaBancariaId?: number;
    observacoes?: string;
  }
) {
  const titRes = await db.execute({
    sql: `SELECT * FROM tb_titulo_pagar WHERE empresa_id = ? AND id = ?`,
    args: [empresaId, dados.tituloId],
  });
  const tit = titRes.rows[0];
  if (!tit) return { erro: "Título a pagar não encontrado." };
  if (tit.status === "pago") return { erro: "Este título já foi totalmente pago." };
  if (tit.status === "cancelado") return { erro: "Não é possível baixar um título cancelado." };

  const valorOriginal = arredondarMoeda(Number(tit.valor_original));
  const valorPagoAtual = arredondarMoeda(Number(tit.valor_pago || 0));
  const saldoRestante = arredondarMoeda(valorOriginal - valorPagoAtual);

  const valorBaixa = arredondarMoeda(dados.valorBaixa);
  if (valorBaixa <= 0) return { erro: "Informe um valor de baixa maior que zero." };
  if (valorBaixa > saldoRestante + 0.01) {
    return { erro: `O valor informado (R$ ${valorBaixa.toFixed(2)}) ultrapassa o saldo em aberto (R$ ${saldoRestante.toFixed(2)}).` };
  }

  const jurosMulta = arredondarMoeda(Number(dados.jurosMulta || 0));
  const desconto = arredondarMoeda(Number(dados.desconto || 0));
  const valorLiquido = arredondarMoeda(valorBaixa + jurosMulta - desconto);

  // Verificação da conta de saída
  let caixaIdFinal: number | null = null;
  let contaBancariaIdFinal: number | null = null;

  if (dados.contaDestinoTipo === "caixa") {
    // Valida se o caixa informado está aberto
    let caixaId = dados.caixaId;
    if (!caixaId) {
      const caixaAberto = await obterCaixaAberto(empresaId, dados.usuarioId);
      if (!caixaAberto) {
        return { erro: "Nenhum caixa aberto encontrado para registrar o pagamento em dinheiro. Abra o caixa primeiro." };
      }
      caixaId = caixaAberto.id;
    } else {
      const cxCheck = await db.execute({
        sql: `SELECT status FROM tb_caixa WHERE empresa_id = ? AND id = ?`,
        args: [empresaId, caixaId],
      });
      if (!cxCheck.rows[0] || cxCheck.rows[0].status === "fechado") {
        return { erro: "O caixa selecionado está fechado. Não é permitido lançar pagamentos em caixa fechado." };
      }
    }
    caixaIdFinal = caixaId;
  } else {
    if (!dados.contaBancariaId) {
      return { erro: "Selecione a conta bancária para saída do pagamento." };
    }
    contaBancariaIdFinal = dados.contaBancariaId;
  }

  const novoValorPago = arredondarMoeda(valorPagoAtual + valorBaixa);
  const quitado = novoValorPago >= valorOriginal - 0.009;
  const novoStatus = quitado ? "pago" : "pago_parcial";

  // 1. Atualiza o título
  await db.execute({
    sql: `UPDATE tb_titulo_pagar
          SET valor_pago = ?, status = ?, data_pagamento = ?
          WHERE empresa_id = ? AND id = ?`,
    args: [novoValorPago, novoStatus, dados.dataBaixa, empresaId, dados.tituloId],
  });

  // 2. Cria a movimentação financeira
  const descMov = `Baixa ${novoStatus === "pago" ? "Total" : "Parcial"} - Título #${tit.id}: ${tit.descricao}`;
  await db.execute({
    sql: `INSERT INTO tb_movimentacao_financeira (
            empresa_id, tipo, origem, titulo_pagar_id, caixa_id, conta_bancaria_id,
            plano_contas_id, centro_custo_id, valor, juros_multa, desconto,
            valor_liquido, data_movimento, descricao, criado_em
          ) VALUES (?, 'despesa', 'baixa_titulo', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      empresaId,
      tit.id,
      caixaIdFinal,
      contaBancariaIdFinal,
      tit.plano_contas_id,
      tit.centro_custo_id || null,
      valorBaixa,
      jurosMulta,
      desconto,
      valorLiquido,
      dados.dataBaixa,
      descMov,
      NOW(),
    ],
  });

  return { ok: true, status: novoStatus, valorPago: novoValorPago, saldoRestante: Math.max(0, valorOriginal - novoValorPago) };
}

export async function cancelarTituloPagar(empresaId: number, id: number) {
  const titRes = await db.execute({
    sql: `SELECT * FROM tb_titulo_pagar WHERE empresa_id = ? AND id = ?`,
    args: [empresaId, id],
  });
  const tit = titRes.rows[0];
  if (!tit) return { erro: "Título não encontrado." };
  if (tit.status === "pago" || Number(tit.valor_pago || 0) > 0) {
    return { erro: "Não é possível cancelar um título que já possui pagamentos registrados." };
  }

  await db.execute({
    sql: `UPDATE tb_titulo_pagar SET status = 'cancelado' WHERE empresa_id = ? AND id = ?`,
    args: [empresaId, id],
  });

  return { ok: true };
}

/**
 * Integração: Gera automaticamente títulos a pagar a partir de Nota de Entrada confirmada
 */
export async function gerarTitulosDeCompra(
  empresaId: number,
  compraId: number,
  dadosNota: {
    fornecedorId?: number | null;
    numeroNota: string;
    valorTotal: number;
    dataEntrada: string;
    planoContasId?: number | null;
    centroCustoId?: number | null;
    parcelas?: number;
    intervaloDias?: number;
    formaPagamento?: string;
  }
) {
  // Evita duplicidade
  const check = await db.execute({
    sql: `SELECT COUNT(*) AS total FROM tb_titulo_pagar WHERE empresa_id = ? AND compra_id = ?`,
    args: [empresaId, compraId],
  });
  if (Number(check.rows[0]?.total ?? 0) > 0) {
    return { ok: true, repetido: true };
  }

  // Busca plano padrão de compra de insumos se não informado
  let planoId = dadosNota.planoContasId;
  if (!planoId) {
    const planoPadrao = await db.execute({
      sql: `SELECT id FROM tb_plano_contas 
            WHERE empresa_id = ? AND tipo = 'despesa' AND tipo_conta = 'analitica' AND codigo = '2.1.01' LIMIT 1`,
      args: [empresaId],
    });
    planoId = planoPadrao.rows[0]?.id ? Number(planoPadrao.rows[0].id) : null;
  }
  if (!planoId) {
    // Pega qualquer analítica de despesa
    const qqPlano = await db.execute({
      sql: `SELECT id FROM tb_plano_contas WHERE empresa_id = ? AND tipo = 'despesa' AND tipo_conta = 'analitica' LIMIT 1`,
      args: [empresaId],
    });
    planoId = qqPlano.rows[0]?.id ? Number(qqPlano.rows[0].id) : null;
  }

  // Busca centro de custo padrão Produção se não informado
  let ccId = dadosNota.centroCustoId;
  if (!ccId) {
    const ccPadrao = await db.execute({
      sql: `SELECT id FROM tb_centro_custo WHERE empresa_id = ? AND codigo = 'CC-001' LIMIT 1`,
      args: [empresaId],
    });
    ccId = ccPadrao.rows[0]?.id ? Number(ccPadrao.rows[0].id) : null;
  }

  if (!planoId) {
    // Se ainda não existir plano de contas, executa o seed
    await seedPlanoContasPadrao(empresaId);
    const planoNovo = await db.execute({
      sql: `SELECT id FROM tb_plano_contas WHERE empresa_id = ? AND codigo = '2.1.01' LIMIT 1`,
      args: [empresaId],
    });
    planoId = planoNovo.rows[0]?.id ? Number(planoNovo.rows[0].id) : null;
  }

  const parcelas = Math.max(1, Number(dadosNota.parcelas || 1));
  const intervaloDias = Math.max(1, Number(dadosNota.intervaloDias || 30));
  const total = arredondarMoeda(dadosNota.valorTotal);
  const valorParcelaBase = arredondarMoeda(total / parcelas);
  let soma = 0;

  for (let i = 1; i <= parcelas; i++) {
    // Corrige centavos na última parcela
    const valorParcela = (i === parcelas) ? arredondarMoeda(total - soma) : valorParcelaBase;
    soma = arredondarMoeda(soma + valorParcela);

    // Calcula data de vencimento
    const dEntrada = new Date(dadosNota.dataEntrada + "T12:00:00");
    dEntrada.setDate(dEntrada.getDate() + (i * intervaloDias));
    const vencimento = dEntrada.toISOString().split("T")[0];

    const desc = `NF ${dadosNota.numeroNota} - Parcela ${i}/${parcelas}`;

    await db.execute({
      sql: `INSERT INTO tb_titulo_pagar (
              empresa_id, fornecedor_id, compra_id, descricao, plano_contas_id,
              centro_custo_id, valor_original, valor_pago, vencimento, numero_parcela,
              total_parcelas, forma_pagamento, status, criado_em
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, 'aberto', ?)`,
      args: [
        empresaId,
        dadosNota.fornecedorId || null,
        compraId,
        desc,
        planoId,
        ccId || null,
        valorParcela,
        vencimento,
        i,
        parcelas,
        dadosNota.formaPagamento || "boleto",
        NOW(),
      ],
    });
  }

  return { ok: true, parcelasGeradas: parcelas };
}

/**
 * Cancela títulos a pagar vinculados a nota cancelada
 */
export async function cancelarTitulosDeCompra(empresaId: number, compraId: number) {
  await db.execute({
    sql: `UPDATE tb_titulo_pagar 
          SET status = 'cancelado' 
          WHERE empresa_id = ? AND compra_id = ? AND status = 'aberto'`,
    args: [empresaId, compraId],
  });
  return { ok: true };
}

// ============================================================================
// 5. CONTAS A RECEBER
// ============================================================================

export type TituloReceber = {
  id: number;
  clienteId: number | null;
  clienteNome?: string | null;
  pedidoId: number | null;
  descricao: string;
  planoContasId: number;
  planoContasCodigo?: string | null;
  planoContasNome?: string | null;
  centroCustoId: number | null;
  centroCustoNome?: string | null;
  valorOriginal: number;
  valorRecebido: number;
  saldoRestante: number;
  vencimento: string;
  numeroParcela: number;
  totalParcelas: number;
  formaPagamento: string;
  status: "aberto" | "pago_parcial" | "pago" | "cancelado";
  dataRecebimento: string | null;
  observacoes: string | null;
  criadoEm: string;
};

export async function listarTitulosReceber(
  empresaId: number,
  filtros?: {
    status?: string;
    clienteId?: number;
    planoContasId?: number;
    centroCustoId?: number;
    dataInicio?: string;
    dataFim?: string;
  }
): Promise<TituloReceber[]> {
  let sql = `
    SELECT tr.*,
           c.nome AS cliente_nome,
           pc.codigo AS plano_codigo, pc.nome AS plano_nome,
           cc.nome AS centro_custo_nome
    FROM tb_titulo_receber tr
    LEFT JOIN tb_cliente c ON c.id = tr.cliente_id
    LEFT JOIN tb_plano_contas pc ON pc.id = tr.plano_contas_id
    LEFT JOIN tb_centro_custo cc ON cc.id = tr.centro_custo_id
    WHERE tr.empresa_id = ?
  `;
  const args: any[] = [empresaId];

  if (filtros?.status && filtros.status !== "todos") {
    sql += ` AND tr.status = ?`;
    args.push(filtros.status);
  }
  if (filtros?.clienteId) {
    sql += ` AND tr.cliente_id = ?`;
    args.push(filtros.clienteId);
  }
  if (filtros?.planoContasId) {
    sql += ` AND tr.plano_contas_id = ?`;
    args.push(filtros.planoContasId);
  }
  if (filtros?.centroCustoId) {
    sql += ` AND tr.centro_custo_id = ?`;
    args.push(filtros.centroCustoId);
  }
  if (filtros?.dataInicio) {
    sql += ` AND tr.vencimento >= ?`;
    args.push(filtros.dataInicio);
  }
  if (filtros?.dataFim) {
    sql += ` AND tr.vencimento <= ?`;
    args.push(filtros.dataFim);
  }

  sql += ` ORDER BY tr.vencimento ASC, tr.id ASC`;

  const result = await db.execute({ sql, args });

  return result.rows.map((row) => {
    const vOriginal = arredondarMoeda(Number(row.valor_original ?? 0));
    const vRec = arredondarMoeda(Number(row.valor_recebido ?? 0));
    const saldo = Math.max(0, arredondarMoeda(vOriginal - vRec));

    return {
      id: Number(row.id),
      clienteId: row.cliente_id ? Number(row.cliente_id) : null,
      clienteNome: row.cliente_nome ? String(row.cliente_nome) : null,
      pedidoId: row.pedido_id ? Number(row.pedido_id) : null,
      descricao: String(row.descricao),
      planoContasId: Number(row.plano_contas_id),
      planoContasCodigo: row.plano_codigo ? String(row.plano_codigo) : null,
      planoContasNome: row.plano_nome ? String(row.plano_nome) : null,
      centroCustoId: row.centro_custo_id ? Number(row.centro_custo_id) : null,
      centroCustoNome: row.centro_custo_nome ? String(row.centro_custo_nome) : null,
      valorOriginal: vOriginal,
      valorRecebido: vRec,
      saldoRestante: saldo,
      vencimento: String(row.vencimento),
      numeroParcela: Number(row.numero_parcela ?? 1),
      totalParcelas: Number(row.total_parcelas ?? 1),
      formaPagamento: String(row.forma_pagamento ?? "pix"),
      status: (row.status ?? "aberto") as TituloReceber["status"],
      dataRecebimento: row.data_recebimento ? String(row.data_recebimento) : null,
      observacoes: row.observacoes ? String(row.observacoes) : null,
      criadoEm: String(row.criado_em),
    };
  });
}

export async function salvarTituloReceber(
  empresaId: number,
  dados: {
    id?: number;
    clienteId?: number | null;
    pedidoId?: number | null;
    descricao: string;
    planoContasId: number;
    centroCustoId?: number | null;
    valorOriginal: number;
    vencimento: string;
    numeroParcela?: number;
    totalParcelas?: number;
    formaPagamento?: string;
    observacoes?: string;
  }
) {
  const descricao = dados.descricao.trim();
  if (!descricao) return { erro: "Informe a descrição do título." };
  if (!dados.planoContasId) return { erro: "Selecione uma conta no Plano de Contas." };
  if (!dados.vencimento) return { erro: "Informe a data de vencimento." };

  const valorOriginal = arredondarMoeda(dados.valorOriginal);
  if (valorOriginal <= 0) return { erro: "O valor do título deve ser maior que zero." };

  // Validação: Somente contas analíticas de receita podem ser usadas
  const conta = await obterPlanoConta(empresaId, dados.planoContasId);
  if (!conta) return { erro: "Conta do plano de contas não encontrada." };
  if (conta.tipoConta !== "analitica") {
    return { erro: "Apenas contas analíticas recebem lançamentos. Escolha uma subconta analítica." };
  }
  if (conta.tipo !== "receita") {
    return { erro: "O título a receber deve ser vinculado a uma conta de receita." };
  }

  if (dados.id) {
    await db.execute({
      sql: `UPDATE tb_titulo_receber
            SET cliente_id = ?, descricao = ?, plano_contas_id = ?, centro_custo_id = ?,
                valor_original = ?, vencimento = ?, forma_pagamento = ?, observacoes = ?
            WHERE empresa_id = ? AND id = ?`,
      args: [
        dados.clienteId || null,
        descricao,
        dados.planoContasId,
        dados.centroCustoId || null,
        valorOriginal,
        dados.vencimento,
        dados.formaPagamento || "pix",
        dados.observacoes?.trim() || null,
        empresaId,
        dados.id,
      ],
    });
    return { id: dados.id, ok: true };
  }

  const insert = await db.execute({
    sql: `INSERT INTO tb_titulo_receber (
            empresa_id, cliente_id, pedido_id, descricao, plano_contas_id,
            centro_custo_id, valor_original, valor_recebido, vencimento, numero_parcela,
            total_parcelas, forma_pagamento, status, observacoes, criado_em
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, 'aberto', ?, ?)`,
    args: [
      empresaId,
      dados.clienteId || null,
      dados.pedidoId || null,
      descricao,
      dados.planoContasId,
      dados.centroCustoId || null,
      valorOriginal,
      dados.vencimento,
      dados.numeroParcela || 1,
      dados.totalParcelas || 1,
      dados.formaPagamento || "pix",
      dados.observacoes?.trim() || null,
      NOW(),
    ],
  });

  return { id: Number(insert.lastInsertRowid), ok: true };
}

/**
 * Baixa (Liquidação Total ou Parcial) de Título a Receber
 */
export async function baixarTituloReceber(
  empresaId: number,
  dados: {
    tituloId: number;
    usuarioId: number;
    dataBaixa: string;
    valorBaixa: number;
    jurosMulta?: number;
    desconto?: number;
    contaDestinoTipo: "caixa" | "banco";
    caixaId?: number;
    contaBancariaId?: number;
    observacoes?: string;
  }
) {
  const titRes = await db.execute({
    sql: `SELECT * FROM tb_titulo_receber WHERE empresa_id = ? AND id = ?`,
    args: [empresaId, dados.tituloId],
  });
  const tit = titRes.rows[0];
  if (!tit) return { erro: "Título a receber não encontrado." };
  if (tit.status === "pago") return { erro: "Este título já foi totalmente recebido." };
  if (tit.status === "cancelado") return { erro: "Não é possível baixar um título cancelado." };

  const valorOriginal = arredondarMoeda(Number(tit.valor_original));
  const valorRecAtual = arredondarMoeda(Number(tit.valor_recebido || 0));
  const saldoRestante = arredondarMoeda(valorOriginal - valorRecAtual);

  const valorBaixa = arredondarMoeda(dados.valorBaixa);
  if (valorBaixa <= 0) return { erro: "Informe um valor de recebimento maior que zero." };
  if (valorBaixa > saldoRestante + 0.01) {
    return { erro: `O valor informado (R$ ${valorBaixa.toFixed(2)}) ultrapassa o saldo em aberto (R$ ${saldoRestante.toFixed(2)}).` };
  }

  const jurosMulta = arredondarMoeda(Number(dados.jurosMulta || 0));
  const desconto = arredondarMoeda(Number(dados.desconto || 0));
  const valorLiquido = arredondarMoeda(valorBaixa + jurosMulta - desconto);

  // Verificação da conta de entrada
  let caixaIdFinal: number | null = null;
  let contaBancariaIdFinal: number | null = null;

  if (dados.contaDestinoTipo === "caixa") {
    let caixaId = dados.caixaId;
    if (!caixaId) {
      const caixaAberto = await obterCaixaAberto(empresaId, dados.usuarioId);
      if (!caixaAberto) {
        return { erro: "Nenhum caixa aberto encontrado para registrar o recebimento em dinheiro. Abra o caixa primeiro." };
      }
      caixaId = caixaAberto.id;
    } else {
      const cxCheck = await db.execute({
        sql: `SELECT status FROM tb_caixa WHERE empresa_id = ? AND id = ?`,
        args: [empresaId, caixaId],
      });
      if (!cxCheck.rows[0] || cxCheck.rows[0].status === "fechado") {
        return { erro: "O caixa selecionado está fechado. Não é permitido lançar recebimentos em caixa fechado." };
      }
    }
    caixaIdFinal = caixaId;
  } else {
    if (!dados.contaBancariaId) {
      return { erro: "Selecione a conta bancária para entrada do recebimento." };
    }
    contaBancariaIdFinal = dados.contaBancariaId;
  }

  const novoValorRec = arredondarMoeda(valorRecAtual + valorBaixa);
  const quitado = novoValorRec >= valorOriginal - 0.009;
  const novoStatus = quitado ? "pago" : "pago_parcial";

  // 1. Atualiza o título
  await db.execute({
    sql: `UPDATE tb_titulo_receber
          SET valor_recebido = ?, status = ?, data_recebimento = ?
          WHERE empresa_id = ? AND id = ?`,
    args: [novoValorRec, novoStatus, dados.dataBaixa, empresaId, dados.tituloId],
  });

  // 2. Cria movimentação financeira
  const descMov = `Recebimento ${novoStatus === "pago" ? "Total" : "Parcial"} - Título #${tit.id}: ${tit.descricao}`;
  await db.execute({
    sql: `INSERT INTO tb_movimentacao_financeira (
            empresa_id, tipo, origem, titulo_receber_id, caixa_id, conta_bancaria_id,
            plano_contas_id, centro_custo_id, valor, juros_multa, desconto,
            valor_liquido, data_movimento, descricao, criado_em
          ) VALUES (?, 'receita', 'baixa_titulo', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      empresaId,
      tit.id,
      caixaIdFinal,
      contaBancariaIdFinal,
      tit.plano_contas_id,
      tit.centro_custo_id || null,
      valorBaixa,
      jurosMulta,
      desconto,
      valorLiquido,
      dados.dataBaixa,
      descMov,
      NOW(),
    ],
  });

  return { ok: true, status: novoStatus, valorRecebido: novoValorRec, saldoRestante: Math.max(0, valorOriginal - novoValorRec) };
}

export async function cancelarTituloReceber(empresaId: number, id: number) {
  const titRes = await db.execute({
    sql: `SELECT * FROM tb_titulo_receber WHERE empresa_id = ? AND id = ?`,
    args: [empresaId, id],
  });
  const tit = titRes.rows[0];
  if (!tit) return { erro: "Título não encontrado." };
  if (tit.status === "pago" || Number(tit.valor_recebido || 0) > 0) {
    return { erro: "Não é possível cancelar um título que já possui valores recebidos." };
  }

  await db.execute({
    sql: `UPDATE tb_titulo_receber SET status = 'cancelado' WHERE empresa_id = ? AND id = ?`,
    args: [empresaId, id],
  });

  return { ok: true };
}

/**
 * Integração: Gera automaticamente títulos a receber quando Pedido é Aprovado
 */
export async function gerarTitulosDePedido(
  empresaId: number,
  pedidoId: number,
  dadosPedido: {
    clienteId?: number | null;
    codigo: string;
    valorTotal: number;
    valorSinal?: number;
    dataPedido: string;
    dataEntrega?: string | null;
    planoContasId?: number | null;
    centroCustoId?: number | null;
    formaPagamento?: string;
  }
) {
  // Evita duplicidade
  const check = await db.execute({
    sql: `SELECT COUNT(*) AS total FROM tb_titulo_receber WHERE empresa_id = ? AND pedido_id = ?`,
    args: [empresaId, pedidoId],
  });
  if (Number(check.rows[0]?.total ?? 0) > 0) {
    return { ok: true, repetido: true };
  }

  // Busca plano padrão de receita de bolos/vendas
  let planoId = dadosPedido.planoContasId;
  if (!planoId) {
    const planoPadrao = await db.execute({
      sql: `SELECT id FROM tb_plano_contas 
            WHERE empresa_id = ? AND tipo = 'receita' AND tipo_conta = 'analitica' AND codigo = '1.1.01' LIMIT 1`,
      args: [empresaId],
    });
    planoId = planoPadrao.rows[0]?.id ? Number(planoPadrao.rows[0].id) : null;
  }
  if (!planoId) {
    const qqPlano = await db.execute({
      sql: `SELECT id FROM tb_plano_contas WHERE empresa_id = ? AND tipo = 'receita' AND tipo_conta = 'analitica' LIMIT 1`,
      args: [empresaId],
    });
    planoId = qqPlano.rows[0]?.id ? Number(qqPlano.rows[0].id) : null;
  }

  // Centro de custo padrão Loja / Balcão
  let ccId = dadosPedido.centroCustoId;
  if (!ccId) {
    const ccPadrao = await db.execute({
      sql: `SELECT id FROM tb_centro_custo WHERE empresa_id = ? AND codigo = 'CC-002' LIMIT 1`,
      args: [empresaId],
    });
    ccId = ccPadrao.rows[0]?.id ? Number(ccPadrao.rows[0].id) : null;
  }

  if (!planoId) {
    await seedPlanoContasPadrao(empresaId);
    const planoNovo = await db.execute({
      sql: `SELECT id FROM tb_plano_contas WHERE empresa_id = ? AND codigo = '1.1.01' LIMIT 1`,
      args: [empresaId],
    });
    planoId = planoNovo.rows[0]?.id ? Number(planoNovo.rows[0].id) : null;
  }

  const total = arredondarMoeda(dadosPedido.valorTotal);
  const sinal = arredondarMoeda(Number(dadosPedido.valorSinal || 0));
  const vencimento = dadosPedido.dataEntrega || dadosPedido.dataPedido || new Date().toISOString().split("T")[0];

  // Se houver sinal já pago antecipadamente, geramos o título com o sinal baixado ou com o restante
  if (sinal > 0 && sinal < total) {
    // Parcela 1: Sinal (já recebido)
    await db.execute({
      sql: `INSERT INTO tb_titulo_receber (
              empresa_id, cliente_id, pedido_id, descricao, plano_contas_id,
              centro_custo_id, valor_original, valor_recebido, vencimento, numero_parcela,
              total_parcelas, forma_pagamento, status, data_recebimento, criado_em
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 2, ?, 'pago', ?, ?)`,
      args: [
        empresaId,
        dadosPedido.clienteId || null,
        pedidoId,
        `Pedido ${dadosPedido.codigo} - Sinal Antecipado`,
        planoId,
        ccId || null,
        sinal,
        sinal,
        dadosPedido.dataPedido,
        dadosPedido.formaPagamento || "pix",
        dadosPedido.dataPedido,
        NOW(),
      ],
    });

    // Parcela 2: Restante na entrega (em aberto)
    const restante = arredondarMoeda(total - sinal);
    await db.execute({
      sql: `INSERT INTO tb_titulo_receber (
              empresa_id, cliente_id, pedido_id, descricao, plano_contas_id,
              centro_custo_id, valor_original, valor_recebido, vencimento, numero_parcela,
              total_parcelas, forma_pagamento, status, criado_em
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 2, 2, ?, 'aberto', ?)`,
      args: [
        empresaId,
        dadosPedido.clienteId || null,
        pedidoId,
        `Pedido ${dadosPedido.codigo} - Restante na Entrega`,
        planoId,
        ccId || null,
        restante,
        vencimento,
        dadosPedido.formaPagamento || "pix",
        NOW(),
      ],
    });

    return { ok: true, parcelas: 2 };
  }

  // Título integral único
  const quitado = sinal >= total && total > 0;
  await db.execute({
    sql: `INSERT INTO tb_titulo_receber (
            empresa_id, cliente_id, pedido_id, descricao, plano_contas_id,
            centro_custo_id, valor_original, valor_recebido, vencimento, numero_parcela,
            total_parcelas, forma_pagamento, status, data_recebimento, criado_em
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?, ?, ?)`,
    args: [
      empresaId,
      dadosPedido.clienteId || null,
      pedidoId,
      `Pedido ${dadosPedido.codigo}`,
      planoId,
      ccId || null,
      total,
      quitado ? total : 0,
      vencimento,
      dadosPedido.formaPagamento || "pix",
      quitado ? "pago" : "aberto",
      quitado ? dadosPedido.dataPedido : null,
      NOW(),
    ],
  });

  return { ok: true, parcelas: 1 };
}

/**
 * Cancela títulos a receber vinculados a pedido cancelado
 */
export async function cancelarTitulosDePedido(empresaId: number, pedidoId: number) {
  await db.execute({
    sql: `UPDATE tb_titulo_receber 
          SET status = 'cancelado' 
          WHERE empresa_id = ? AND pedido_id = ? AND status = 'aberto'`,
    args: [empresaId, pedidoId],
  });
  return { ok: true };
}

// ============================================================================
// 6. CONTROLE DE CAIXA
// ============================================================================

export type Caixa = {
  id: number;
  usuarioId: number;
  usuarioNome?: string;
  dataAbertura: string;
  saldoInicial: number;
  dataFechamento: string | null;
  saldoInformado: number | null;
  saldoCalculado: number | null;
  diferenca: number | null;
  status: "aberto" | "fechado";
  observacoes: string | null;
  criadoEm: string;
};

export async function obterCaixaAberto(empresaId: number, usuarioId: number): Promise<Caixa | null> {
  const result = await db.execute({
    sql: `SELECT c.*, u.nome AS usuario_nome
          FROM tb_caixa c
          INNER JOIN tb_usuario u ON u.id = c.usuario_id
          WHERE c.empresa_id = ? AND c.usuario_id = ? AND c.status = 'aberto'
          ORDER BY c.id DESC LIMIT 1`,
    args: [empresaId, usuarioId],
  });

  if (!result.rows[0]) return null;
  const row = result.rows[0];

  return {
    id: Number(row.id),
    usuarioId: Number(row.usuario_id),
    usuarioNome: String(row.usuario_nome),
    dataAbertura: String(row.data_abertura),
    saldoInicial: arredondarMoeda(Number(row.saldo_inicial ?? 0)),
    dataFechamento: row.data_fechamento ? String(row.data_fechamento) : null,
    saldoInformado: row.saldo_informado !== null ? Number(row.saldo_informado) : null,
    saldoCalculado: row.saldo_calculado !== null ? Number(row.saldo_calculado) : null,
    diferenca: row.diferenca !== null ? Number(row.diferenca) : null,
    status: (row.status ?? "aberto") as "aberto" | "fechado",
    observacoes: row.observacoes ? String(row.observacoes) : null,
    criadoEm: String(row.criado_em),
  };
}

export async function listarHistoricoCaixas(empresaId: number): Promise<Caixa[]> {
  const result = await db.execute({
    sql: `SELECT c.*, u.nome AS usuario_nome
          FROM tb_caixa c
          INNER JOIN tb_usuario u ON u.id = c.usuario_id
          WHERE c.empresa_id = ?
          ORDER BY c.id DESC LIMIT 30`,
    args: [empresaId],
  });

  return result.rows.map((row) => ({
    id: Number(row.id),
    usuarioId: Number(row.usuario_id),
    usuarioNome: String(row.usuario_nome),
    dataAbertura: String(row.data_abertura),
    saldoInicial: arredondarMoeda(Number(row.saldo_inicial ?? 0)),
    dataFechamento: row.data_fechamento ? String(row.data_fechamento) : null,
    saldoInformado: row.saldo_informado !== null ? Number(row.saldo_informado) : null,
    saldoCalculado: row.saldo_calculado !== null ? Number(row.saldo_calculado) : null,
    diferenca: row.diferenca !== null ? Number(row.diferenca) : null,
    status: (row.status ?? "aberto") as "aberto" | "fechado",
    observacoes: row.observacoes ? String(row.observacoes) : null,
    criadoEm: String(row.criado_em),
  }));
}

export async function abrirCaixa(
  empresaId: number,
  usuarioId: number,
  saldoInicial: number,
  dataAbertura?: string
) {
  const aberto = await obterCaixaAberto(empresaId, usuarioId);
  if (aberto) {
    return { erro: "Já existe um caixa aberto para este operador. Feche o caixa anterior antes de abrir um novo." };
  }

  const sInicial = arredondarMoeda(saldoInicial);
  const data = dataAbertura || new Date().toISOString().split("T")[0];

  const insert = await db.execute({
    sql: `INSERT INTO tb_caixa (
            empresa_id, usuario_id, data_abertura, saldo_inicial, status, criado_em
          ) VALUES (?, ?, ?, ?, 'aberto', ?)`,
    args: [empresaId, usuarioId, data, sInicial, NOW()],
  });

  return { id: Number(insert.lastInsertRowid), ok: true };
}

export async function calcularSaldoCaixa(empresaId: number, caixaId: number) {
  const cxRes = await db.execute({
    sql: `SELECT * FROM tb_caixa WHERE empresa_id = ? AND id = ?`,
    args: [empresaId, caixaId],
  });
  const cx = cxRes.rows[0];
  if (!cx) return null;

  const saldoInicial = arredondarMoeda(Number(cx.saldo_inicial ?? 0));

  // Entradas em dinheiro (receitas e suprimentos)
  const entRes = await db.execute({
    sql: `SELECT 
            COALESCE(SUM(CASE WHEN tipo = 'receita' THEN valor_liquido ELSE 0 END), 0) AS total_receitas,
            COALESCE(SUM(CASE WHEN origem = 'suprimento' THEN valor_liquido ELSE 0 END), 0) AS total_suprimentos,
            COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN valor_liquido ELSE 0 END), 0) AS total_despesas,
            COALESCE(SUM(CASE WHEN origem = 'sangria' THEN valor_liquido ELSE 0 END), 0) AS total_sangrias
          FROM tb_movimentacao_financeira
          WHERE empresa_id = ? AND caixa_id = ?`,
    args: [empresaId, caixaId],
  });

  const row = entRes.rows[0];
  const receitas = arredondarMoeda(Number(row?.total_receitas ?? 0));
  const suprimentos = arredondarMoeda(Number(row?.total_suprimentos ?? 0));
  const despesas = arredondarMoeda(Number(row?.total_despesas ?? 0));
  const sangrias = arredondarMoeda(Number(row?.total_sangrias ?? 0));

  const totalEntradas = arredondarMoeda(receitas + suprimentos);
  const totalSaidas = arredondarMoeda(despesas + sangrias);
  const saldoCalculado = arredondarMoeda(saldoInicial + totalEntradas - totalSaidas);

  return {
    saldoInicial,
    receitas,
    suprimentos,
    despesas,
    sangrias,
    totalEntradas,
    totalSaidas,
    saldoCalculado,
  };
}

export async function fecharCaixa(
  empresaId: number,
  caixaId: number,
  saldoInformado: number,
  observacoes?: string
) {
  const calc = await calcularSaldoCaixa(empresaId, caixaId);
  if (!calc) return { erro: "Caixa não encontrado." };

  const sInformado = arredondarMoeda(saldoInformado);
  const diferenca = arredondarMoeda(sInformado - calc.saldoCalculado);
  const dataFechamento = new Date().toISOString().split("T")[0];

  await db.execute({
    sql: `UPDATE tb_caixa
          SET data_fechamento = ?, saldo_informado = ?, saldo_calculado = ?, diferenca = ?,
              status = 'fechado', observacoes = ?
          WHERE empresa_id = ? AND id = ?`,
    args: [dataFechamento, sInformado, calc.saldoCalculado, diferenca, observacoes?.trim() || null, empresaId, caixaId],
  });

  return {
    ok: true,
    saldoCalculado: calc.saldoCalculado,
    saldoInformado: sInformado,
    diferenca,
  };
}

/**
 * Lançamento avulso no Caixa (Entrada, Saída, Sangria, Suprimento)
 */
export async function lancarMovimentoCaixa(
  empresaId: number,
  usuarioId: number,
  dados: {
    caixaId: number;
    tipo: "entrada" | "saida" | "sangria" | "suprimento";
    valor: number;
    planoContasId?: number | null;
    centroCustoId?: number | null;
    descricao: string;
    dataMovimento?: string;
  }
) {
  const cxRes = await db.execute({
    sql: `SELECT status FROM tb_caixa WHERE empresa_id = ? AND id = ?`,
    args: [empresaId, dados.caixaId],
  });
  if (!cxRes.rows[0]) return { erro: "Caixa não encontrado." };
  if (cxRes.rows[0].status === "fechado") {
    return { erro: "Não é permitido realizar lançamentos em um caixa fechado." };
  }

  const valor = arredondarMoeda(dados.valor);
  if (valor <= 0) return { erro: "O valor do movimento deve ser maior que zero." };

  const descricao = dados.descricao.trim();
  if (!descricao) return { erro: "Informe a descrição do movimento de caixa." };

  const dataMov = dados.dataMovimento || new Date().toISOString().split("T")[0];

  let tipoMov: "receita" | "despesa" | "transferencia";
  let origemMov: string;

  if (dados.tipo === "sangria") {
    tipoMov = "transferencia";
    origemMov = "sangria";
  } else if (dados.tipo === "suprimento") {
    tipoMov = "transferencia";
    origemMov = "suprimento";
  } else if (dados.tipo === "entrada") {
    tipoMov = "receita";
    origemMov = "manual";
    if (!dados.planoContasId) return { erro: "Para entradas, selecione uma conta de receita no Plano de Contas." };
  } else {
    tipoMov = "despesa";
    origemMov = "manual";
    if (!dados.planoContasId) return { erro: "Para saídas, selecione uma conta de despesa no Plano de Contas." };
  }

  await db.execute({
    sql: `INSERT INTO tb_movimentacao_financeira (
            empresa_id, tipo, origem, caixa_id, plano_contas_id, centro_custo_id,
            valor, juros_multa, desconto, valor_liquido, data_movimento, descricao, criado_em
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?)`,
    args: [
      empresaId,
      tipoMov,
      origemMov,
      dados.caixaId,
      dados.planoContasId || null,
      dados.centroCustoId || null,
      valor,
      valor,
      dataMov,
      `[${dados.tipo.toUpperCase()}] ${descricao}`,
      NOW(),
    ],
  });

  return { ok: true };
}

// ============================================================================
// 7. EXTRATOS & MOVIMENTAÇÕES BANCÁRIAS E CONSOLIDADAS
// ============================================================================

export type MovimentacaoFinanceira = {
  id: number;
  tipo: "receita" | "despesa" | "transferencia";
  origem: string;
  tituloPagarId: number | null;
  tituloReceberId: number | null;
  caixaId: number | null;
  contaBancariaId: number | null;
  contaBancariaNome?: string | null;
  contaBancariaDestinoId: number | null;
  planoContasId: number | null;
  planoContasNome?: string | null;
  centroCustoId: number | null;
  centroCustoNome?: string | null;
  valor: number;
  jurosMulta: number;
  desconto: number;
  valorLiquido: number;
  dataMovimento: string;
  descricao: string;
  criadoEm: string;
};

export async function listarMovimentacoes(
  empresaId: number,
  filtros?: {
    caixaId?: number;
    contaBancariaId?: number;
    dataInicio?: string;
    dataFim?: string;
    tipo?: string;
  }
): Promise<MovimentacaoFinanceira[]> {
  let sql = `
    SELECT m.*,
           cb.banco AS banco_nome, cb.conta AS banco_conta,
           pc.nome AS plano_nome, pc.codigo AS plano_codigo,
           cc.nome AS centro_custo_nome
    FROM tb_movimentacao_financeira m
    LEFT JOIN tb_conta_bancaria cb ON cb.id = m.conta_bancaria_id
    LEFT JOIN tb_plano_contas pc ON pc.id = m.plano_contas_id
    LEFT JOIN tb_centro_custo cc ON cc.id = m.centro_custo_id
    WHERE m.empresa_id = ?
  `;
  const args: any[] = [empresaId];

  if (filtros?.caixaId) {
    sql += ` AND m.caixa_id = ?`;
    args.push(filtros.caixaId);
  }
  if (filtros?.contaBancariaId) {
    sql += ` AND (m.conta_bancaria_id = ? OR m.conta_bancaria_destino_id = ?)`;
    args.push(filtros.contaBancariaId, filtros.contaBancariaId);
  }
  if (filtros?.dataInicio) {
    sql += ` AND m.data_movimento >= ?`;
    args.push(filtros.dataInicio);
  }
  if (filtros?.dataFim) {
    sql += ` AND m.data_movimento <= ?`;
    args.push(filtros.dataFim);
  }
  if (filtros?.tipo && filtros.tipo !== "todos") {
    sql += ` AND m.tipo = ?`;
    args.push(filtros.tipo);
  }

  sql += ` ORDER BY m.data_movimento DESC, m.id DESC`;

  const result = await db.execute({ sql, args });

  return result.rows.map((row) => ({
    id: Number(row.id),
    tipo: row.tipo as MovimentacaoFinanceira["tipo"],
    origem: String(row.origem),
    tituloPagarId: row.titulo_pagar_id ? Number(row.titulo_pagar_id) : null,
    tituloReceberId: row.titulo_receber_id ? Number(row.titulo_receber_id) : null,
    caixaId: row.caixa_id ? Number(row.caixa_id) : null,
    contaBancariaId: row.conta_bancaria_id ? Number(row.conta_bancaria_id) : null,
    contaBancariaNome: row.banco_nome ? `${row.banco_nome} (Conta ${row.banco_conta})` : null,
    contaBancariaDestinoId: row.conta_bancaria_destino_id ? Number(row.conta_bancaria_destino_id) : null,
    planoContasId: row.plano_contas_id ? Number(row.plano_contas_id) : null,
    planoContasNome: row.plano_nome ? `${row.plano_codigo} - ${row.plano_nome}` : null,
    centroCustoId: row.centro_custo_id ? Number(row.centro_custo_id) : null,
    centroCustoNome: row.centro_custo_nome ? String(row.centro_custo_nome) : null,
    valor: arredondarMoeda(Number(row.valor)),
    jurosMulta: arredondarMoeda(Number(row.juros_multa ?? 0)),
    desconto: arredondarMoeda(Number(row.desconto ?? 0)),
    valorLiquido: arredondarMoeda(Number(row.valor_liquido)),
    dataMovimento: String(row.data_movimento),
    descricao: String(row.descricao),
    criadoEm: String(row.criado_em),
  }));
}

export async function transferirEntreContasBancarias(
  empresaId: number,
  dados: {
    contaOrigemId: number;
    contaDestinoId: number;
    valor: number;
    dataMovimento: string;
    descricao?: string;
  }
) {
  if (dados.contaOrigemId === dados.contaDestinoId) {
    return { erro: "A conta de origem e destino devem ser diferentes." };
  }
  const valor = arredondarMoeda(dados.valor);
  if (valor <= 0) return { erro: "O valor da transferência deve ser maior que zero." };

  const desc = dados.descricao?.trim() || "Transferência entre contas bancárias";

  await db.execute({
    sql: `INSERT INTO tb_movimentacao_financeira (
            empresa_id, tipo, origem, conta_bancaria_id, conta_bancaria_destino_id,
            valor, juros_multa, desconto, valor_liquido, data_movimento, descricao, criado_em
          ) VALUES (?, 'transferencia', 'transferencia', ?, ?, ?, 0, 0, ?, ?, ?, ?)`,
    args: [
      empresaId,
      dados.contaOrigemId,
      dados.contaDestinoId,
      valor,
      valor,
      dados.dataMovimento,
      desc,
      NOW(),
    ],
  });

  return { ok: true };
}

export async function transferirCaixaBanco(
  empresaId: number,
  dados: {
    sentido: "caixa_para_banco" | "banco_para_caixa";
    caixaId: number;
    contaBancariaId: number;
    valor: number;
    dataMovimento: string;
    descricao?: string;
  }
) {
  const cx = await db.execute({
    sql: `SELECT status FROM tb_caixa WHERE empresa_id = ? AND id = ?`,
    args: [empresaId, dados.caixaId],
  });
  if (!cx.rows[0]) return { erro: "Caixa não encontrado." };
  if (cx.rows[0].status === "fechado") {
    return { erro: "O caixa selecionado está fechado. Operação não permitida." };
  }

  const valor = arredondarMoeda(dados.valor);
  if (valor <= 0) return { erro: "O valor da transferência deve ser maior que zero." };

  const isCaixaParaBanco = dados.sentido === "caixa_para_banco";
  const desc = dados.descricao?.trim() || (isCaixaParaBanco ? "Depósito Caixa -> Banco" : "Saque Banco -> Caixa");

  // Se caixa para banco: sangria no caixa, entrada na conta bancária destino
  await db.execute({
    sql: `INSERT INTO tb_movimentacao_financeira (
            empresa_id, tipo, origem, caixa_id, conta_bancaria_id, conta_bancaria_destino_id,
            valor, juros_multa, desconto, valor_liquido, data_movimento, descricao, criado_em
          ) VALUES (?, 'transferencia', ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?)`,
    args: [
      empresaId,
      isCaixaParaBanco ? "sangria" : "suprimento",
      dados.caixaId,
      isCaixaParaBanco ? null : dados.contaBancariaId,
      isCaixaParaBanco ? dados.contaBancariaId : null,
      valor,
      valor,
      dados.dataMovimento,
      desc,
      NOW(),
    ],
  });

  return { ok: true };
}
