/**
 * ============================================================================
 * PROJETO: Doce Gestor - Sistema de Gestão para Confeitarias
 * REPOSITÓRIO: https://github.com/junin1737/confeitaria
 * ARQUIVO: server/dashboard.ts
 * DESCRIÇÃO: Agregação analítica de vendas, custos, margens e evolução temporal.
 * ============================================================================
 * 
 * [MÉTRICAS GERENCIAIS DO DASHBOARD]
 * 1. Faturamento Total, Custo Total e Lucro Líquido Real.
 * 2. Margem de Lucro Percentual e Ticket Médio por Pedido.
 * 3. Vendas agrupadas por Categoria de Produto (Bolos, Doces Finos, Tortas).
 * 4. Séries temporais mensais e diárias (Sparklines) para gráficos interativos.
 * 5. Comparativo percentual com períodos anteriores (dia anterior, mês anterior).
 * ============================================================================
 */

import { db } from "./db/client";

/**
 * [CONTRATO DE DADOS: GrupoVenda]
 * Totalizadores de vendas, custos e lucratividade por categoria de produto.
 */
export type GrupoVenda = {
  id: number;
  nome: string;
  cor: string;
  valor: number;
  custo: number;
  pedidos: number;
  lucro: number;
  lucroPercent: number;
};

/**
 * [CONTRATO DE DADOS: ResumoPeriodo]
 * Indicadores macro consolidados para um período de datas específico.
 */
export type ResumoPeriodo = {
  valor: number;
  custo: number;
  pedidos: number;
  ticket: number;
  lucro: number;
  lucroPercent: number;
};

/**
 * [FUNÇÃO AUXILIAR: toNumber]
 * Conversão segura de valores de banco para tipo numérico JavaScript.
 */
function toNumber(value: unknown) {
  return Number(value ?? 0);
}

/**
 * [FUNÇÃO AUXILIAR: finalize]
 * Consolida as métricas financeiras calculando o Lucro Líquido, Margem % e Ticket Médio.
 */
function finalize(valor: number, custo: number, pedidos: number): ResumoPeriodo {
  const lucro = valor - custo;
  return {
    valor,
    custo,
    pedidos,
    ticket: pedidos > 0 ? valor / pedidos : 0,
    lucro,
    lucroPercent: valor > 0 ? (lucro / valor) * 100 : 0,
  };
}

/**
 * [FUNÇÃO: vendasPorGrupo]
 * Agrupa o faturamento e os custos por categoria de produto dentro de um intervalo de datas.
 * Filtra obrigatoriamente pelo empresa_id para garantir o isolamento do tenant.
 */
export async function vendasPorGrupo(empresaId: number, de: string, ate: string): Promise<GrupoVenda[]> {
  const result = await db.execute({
    sql: `SELECT g.id, g.nome, g.cor,
            COALESCE(SUM(v.valor), 0) AS valor,
            COALESCE(SUM(v.custo), 0) AS custo,
            COALESCE(SUM(v.pedidos), 0) AS pedidos
          FROM tb_grupo_produto g
          LEFT JOIN tb_venda_grupo v
            ON v.grupo_id = g.id AND v.empresa_id = g.empresa_id AND v.data BETWEEN ? AND ?
          WHERE g.empresa_id = ?
          GROUP BY g.id, g.nome, g.cor
          ORDER BY valor DESC`,
    args: [de, ate, empresaId],
  });

  return result.rows.map((row) => {
    const valor = toNumber(row.valor);
    const custo = toNumber(row.custo);
    const lucro = valor - custo;
    return {
      id: Number(row.id),
      nome: String(row.nome),
      cor: String(row.cor),
      valor,
      custo,
      pedidos: toNumber(row.pedidos),
      lucro,
      lucroPercent: valor > 0 ? (lucro / valor) * 100 : 0,
    };
  });
}

/**
 * [FUNÇÃO: resumoPeriodo]
 * Executa soma agregada de vendas, custos e contagem de pedidos para um intervalo de tempo.
 */
export async function resumoPeriodo(empresaId: number, de: string, ate: string) {
  const result = await db.execute({
    sql: `SELECT COALESCE(SUM(valor), 0) AS valor,
            COALESCE(SUM(custo), 0) AS custo,
            COALESCE(SUM(pedidos), 0) AS pedidos
          FROM tb_venda_grupo
          WHERE empresa_id = ? AND data BETWEEN ? AND ?`,
    args: [empresaId, de, ate],
  });
  const row = result.rows[0];
  return finalize(toNumber(row?.valor), toNumber(row?.custo), toNumber(row?.pedidos));
}

/**
 * [FUNÇÃO: variacao]
 * Calcula o crescimento ou queda percentual entre dois valores numéricos.
 */
export function variacao(atual: number, anterior: number) {
  if (anterior <= 0) return null;
  return ((atual - anterior) / anterior) * 100;
}

/**
 * [CONTRATO DE DADOS: PontoSerie]
 * Ponto individual em um gráfico de série temporal com chave, rótulo e valor.
 */
export type PontoSerie = {
  chave: string;
  label: string;
  valor: number;
};

/**
 * [FUNÇÃO: evolucaoMensal]
 * Agrupa o faturamento mês a mês para preenchimento de gráficos anuais e de tendência.
 */
export async function evolucaoMensal(empresaId: number, de: string): Promise<PontoSerie[]> {
  const result = await db.execute({
    sql: `SELECT substr(data, 1, 7) AS mes, COALESCE(SUM(valor), 0) AS valor
          FROM tb_venda_grupo
          WHERE empresa_id = ? AND data >= ?
          GROUP BY substr(data, 1, 7)
          ORDER BY mes`,
    args: [empresaId, de],
  });
  const byMonth = new Map(result.rows.map((row) => [String(row.mes), toNumber(row.valor)]));
  const start = new Date(`${de}T12:00:00`);
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  const points: PontoSerie[] = [];
  for (const cursor = new Date(start.getFullYear(), start.getMonth(), 1); cursor <= now; cursor.setMonth(cursor.getMonth() + 1)) {
    const chave = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    points.push({
      chave,
      label: cursor.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "").replace(/^./, (letter) => letter.toUpperCase()),
      valor: byMonth.get(chave) ?? 0,
    });
  }
  return points;
}

/**
 * [FUNÇÃO: evolucaoDiaria]
 * Retorna vetor de valores diários para geração de mini-gráficos (sparklines) de 7 ou 30 dias.
 */
export async function evolucaoDiaria(empresaId: number, de: string, ate: string): Promise<number[]> {
  const result = await db.execute({
    sql: `SELECT data, COALESCE(SUM(valor), 0) AS valor
          FROM tb_venda_grupo
          WHERE empresa_id = ? AND data BETWEEN ? AND ?
          GROUP BY data
          ORDER BY data`,
    args: [empresaId, de, ate],
  });
  const byDay = new Map(result.rows.map((row) => [String(row.data), toNumber(row.valor)]));
  const values: number[] = [];
  const cursor = new Date(`${de}T12:00:00`);
  const end = new Date(`${ate}T12:00:00`);
  while (cursor <= end) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
    values.push(byDay.get(key) ?? 0);
    cursor.setDate(cursor.getDate() + 1);
  }
  return values;
}
