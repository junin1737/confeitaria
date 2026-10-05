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
  nome: string;
  categoria: "ingrediente" | "embalagem" | "decoracao" | "outro";
  unidadeMedida: "g" | "ml" | "un";
  unidadeCompra: "kg" | "g" | "l" | "ml" | "un";
  quantidadeEmbalagem: number;
  precoCompra: number;
  custoUnitario: number; // Preço por grama, por ml ou por unidade
  estoqueAtual: number;
  estoqueMinimo: number;
  marca: string | null;
  criadoEm: string;
};

export type InsumoInput = {
  id?: number;
  nome: string;
  categoria?: "ingrediente" | "embalagem" | "decoracao" | "outro";
  unidadeMedida?: "g" | "ml" | "un";
  unidadeCompra?: "kg" | "g" | "l" | "ml" | "un";
  quantidadeEmbalagem: number;
  precoCompra: number;
  estoqueAtual?: number;
  estoqueMinimo?: number;
  marca?: string;
};

/**
 * [FUNÇÃO AUXILIAR: normalizarUnidadeECusto]
 * Converte a embalagem comprada para a unidade base de uso na receita (g, ml, un)
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
  // Se comprou em L e mede em ml: 1L = 1000ml
  else if (unidadeCompra === "l" && unidadeMedida === "ml") {
    fator = 1000;
  }

  const quantidadeTotalBase = Math.max(0.0001, quantidadeEmbalagem * fator);
  const custoUnitario = Math.max(0, precoCompra / quantidadeTotalBase);

  return {
    custoUnitario: Math.round(custoUnitario * 100000) / 100000, // 5 casas decimais para precisão de centavos
    quantidadeTotalBase,
  };
}

/**
 * [INSUMOS: listarInsumos]
 * Retorna todos os insumos cadastrados para a empresa.
 */
export async function listarInsumos(empresaId: number): Promise<Insumo[]> {
  const result = await db.execute({
    sql: `SELECT id, nome, categoria, unidade_medida, unidade_compra, quantidade_embalagem,
                 preco_compra, custo_unitario, estoque_atual, estoque_minimo, marca, criado_em
          FROM tb_insumo
          WHERE empresa_id = ?
          ORDER BY categoria, nome`,
    args: [empresaId],
  });

  return result.rows.map((row) => ({
    id: Number(row.id),
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
    criadoEm: String(row.criado_em),
  }));
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
 * Cria ou atualiza um insumo e recalcula o custo unitário.
 */
export async function salvarInsumo(empresaId: number, dados: InsumoInput) {
  const nome = dados.nome.trim();
  if (!nome) return { erro: "Informe o nome do insumo/ingrediente." };

  const categoria = dados.categoria || "ingrediente";
  const unidadeMedida = dados.unidadeMedida || (categoria === "embalagem" ? "un" : "g");
  const unidadeCompra = dados.unidadeCompra || unidadeMedida;
  const quantidadeEmbalagem = Math.max(0.001, Number(dados.quantidadeEmbalagem || 1));
  const precoCompra = Math.max(0, Number(dados.precoCompra || 0));

  const { custoUnitario } = normalizarUnidadeECusto(
    unidadeCompra,
    unidadeMedida,
    quantidadeEmbalagem,
    precoCompra,
  );

  const agora = new Date().toISOString();

  if (dados.id) {
    // Atualização
    await db.execute({
      sql: `UPDATE tb_insumo SET
              nome = ?, categoria = ?, unidade_medida = ?, unidade_compra = ?,
              quantidade_embalagem = ?, preco_compra = ?, custo_unitario = ?,
              estoque_atual = ?, estoque_minimo = ?, marca = ?
            WHERE empresa_id = ? AND id = ?`,
      args: [
        nome,
        categoria,
        unidadeMedida,
        unidadeCompra,
        quantidadeEmbalagem,
        precoCompra,
        custoUnitario,
        dados.estoqueAtual ?? 0,
        dados.estoqueMinimo ?? 0,
        dados.marca?.trim() || null,
        empresaId,
        dados.id,
      ],
    });

    // Efeito cascata: atualiza preços sugeridos de receitas dependentes
    await recalcularReceitasPorInsumo(empresaId, dados.id);

    return obterInsumo(empresaId, dados.id);
  }

  // Inserção
  const created = await db.execute({
    sql: `INSERT INTO tb_insumo (
            empresa_id, nome, categoria, unidade_medida, unidade_compra,
            quantidade_embalagem, preco_compra, custo_unitario, estoque_atual,
            estoque_minimo, marca, criado_em
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      empresaId,
      nome,
      categoria,
      unidadeMedida,
      unidadeCompra,
      quantidadeEmbalagem,
      precoCompra,
      custoUnitario,
      dados.estoqueAtual ?? 0,
      dados.estoqueMinimo ?? 0,
      dados.marca?.trim() || null,
      agora,
    ],
  });

  return obterInsumo(empresaId, Number(created.lastInsertRowid));
}

/**
 * [INSUMOS: excluirInsumo]
 * Remove o insumo caso ele não esteja sendo utilizado em nenhuma receita ativa.
 */
export async function excluirInsumo(empresaId: number, id: number) {
  const check = await db.execute({
    sql: `SELECT r.nome FROM tb_receita_item ri
          INNER JOIN tb_receita r ON r.id = ri.receita_id
          WHERE r.empresa_id = ? AND ri.insumo_id = ?
          LIMIT 1`,
    args: [empresaId, id],
  });

  if (check.rows.length > 0) {
    return {
      erro: `Este insumo não pode ser excluído pois está em uso na receita "${check.rows[0].nome}".`,
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
 * Atualiza o 'atualizado_em' das receitas afetadas para que a interface e relatórios
 * reflitam a nova formação de custos em tempo real.
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
}
