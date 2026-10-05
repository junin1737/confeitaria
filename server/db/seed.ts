/**
 * ============================================================================
 * PROJETO: Doce Gestor - Sistema de Gestão para Confeitarias
 * REPOSITÓRIO: https://github.com/junin1737/confeitaria
 * ARQUIVO: server/db/seed.ts
 * DESCRIÇÃO: Carga inicial de dados (seeding) para ambiente de desenvolvimento.
 * ============================================================================
 * 
 * [RESPONSABILIDADE DO SEED]
 * 1. Popula os 27 estados da federação (tabela tb_estado).
 * 2. Garante a existência da empresa inicial ('Ateliê Açúcar & Afeto') e licença.
 * 3. Cria o usuário administrador 'Master' com senha criptografada via bcrypt.
 * 4. Insere grupos de confeitaria padrão (Bolos, Tortas, Doces Finos, etc.).
 * 5. Gera histórico de vendas diárias simuladas para alimentar o Dashboard analítico.
 * ============================================================================
 */

import bcrypt from "bcryptjs";
import { db } from "./client";
import { garantirMensagens } from "../mensagens";
import { salvarInsumo, salvarReceita } from "../precificacao";
import { salvarCliente, salvarFornecedor, salvarProduto, salvarSubgrupo, salvarTipoItem } from "../cadastros";

const NOW = () => new Date().toISOString();

/**
 * [BLOCO: DOMÍNIO DOS ESTADOS BRASILEIROS]
 * Matriz contendo a sigla e o nome completo de todas as 27 Unidades da Federação.
 */
const ESTADOS = [
  ["AC", "Acre"],
  ["AL", "Alagoas"],
  ["AP", "Amapá"],
  ["AM", "Amazonas"],
  ["BA", "Bahia"],
  ["CE", "Ceará"],
  ["DF", "Distrito Federal"],
  ["ES", "Espírito Santo"],
  ["GO", "Goiás"],
  ["MA", "Maranhão"],
  ["MT", "Mato Grosso"],
  ["MS", "Mato Grosso do Sul"],
  ["MG", "Minas Gerais"],
  ["PA", "Pará"],
  ["PB", "Paraíba"],
  ["PR", "Paraná"],
  ["PE", "Pernambuco"],
  ["PI", "Piauí"],
  ["RJ", "Rio de Janeiro"],
  ["RN", "Rio Grande do Norte"],
  ["RS", "Rio Grande do Sul"],
  ["RO", "Rondônia"],
  ["RR", "Roraima"],
  ["SC", "Santa Catarina"],
  ["SP", "São Paulo"],
  ["SE", "Sergipe"],
  ["TO", "Tocantins"],
];

/**
 * [FUNÇÃO EXECUTORA: seed]
 * Executa de forma idempotente a carga inicial de dados essenciais para o sistema.
 */
export async function seed() {
  // 1. CARGA DE ESTADOS
  const estados = await db.execute("SELECT COUNT(*) AS total FROM tb_estado");
  if (Number(estados.rows[0]?.total ?? 0) === 0) {
    for (const [sigla, nome] of ESTADOS) {
      await db.execute({
        sql: "INSERT INTO tb_estado (sigla, nome) VALUES (?, ?)",
        args: [sigla, nome],
      });
    }
  }

  // 2. EMPRESA INICIAL DE DEMONSTRAÇÃO
  let empresaId: number;
  const empresa = await db.execute("SELECT id FROM tb_empresa LIMIT 1");
  if (empresa.rows[0]) {
    empresaId = Number(empresa.rows[0].id);
  } else {
    const created = await db.execute({
      sql: `INSERT INTO tb_empresa (nome, status, plano, serial_key, criado_em) 
            VALUES (?, 'ativa', 'vitalicio', 'DG-MESTRE-2026-VIP', ?)`,
      args: ["Ateliê Açúcar & Afeto", NOW()],
    });
    empresaId = Number(created.lastInsertRowid);
  }

  // 3. USUÁRIO ADMINISTRADOR MASTER
  const master = await db.execute({
    sql: "SELECT id FROM tb_usuario WHERE login = ?",
    args: ["Master"],
  });

  const novaSenhaHash = bcrypt.hashSync("Gold1737**", 10);
  if (!master.rows[0]) {
    await db.execute({
      sql: `INSERT INTO tb_usuario (empresa_id, login, nome, senha_hash, perfil, status, criado_em)
            VALUES (?, 'Master', 'Master', ?, 'master', 'ativo', ?)`,
      args: [empresaId, novaSenhaHash, NOW()],
    });
  } else {
    // Garante atualização para a senha solicitada
    await db.execute({
      sql: `UPDATE tb_usuario SET senha_hash = ? WHERE login = 'Master'`,
      args: [novaSenhaHash],
    });
  }

  // 4. CATEGORIAS DE CONFEITARIA E HISTÓRICO DE VENDAS
  await seedVendas(empresaId);

  // 5. TEMPLATES DE MENSAGENS E ANIVERSÁRIOS
  await garantirMensagens(empresaId);

  // 6. INSUMOS, FICHAS TÉCNICAS E PRECIFICAÇÃO
  await seedPrecificacao(empresaId);

  // 7. CADASTROS PADRÃO (SUBGRUPOS, FORNECEDORES, CLIENTES, PRODUTOS C/ RECEITA)
  await seedCadastrosPadrao(empresaId);
}

/**
 * [BLOCO: GRUPOS / CATEGORIAS DE PRODUTOS DE CONFEITARIA]
 * Paleta de cores e categorias padronizadas do segmento doceiro.
 */
const GRUPOS = [
  ["Bolos", "#c96852"],
  ["Tortas", "#7b6aa8"],
  ["Doces finos", "#c45c78"],
  ["Kits festa", "#c4894a"],
  ["Salgados", "#4f7c9b"],
];

/**
 * [FUNÇÃO AUXILIAR: rand]
 * Gerador determinístico pseudoaleatório baseado em seno para simulação de vendas realistas.
 */
function rand(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/**
 * [FUNÇÃO AUXILIAR: isoDate]
 * Converte data para string no padrão 'AAAA-MM-DD'.
 */
function isoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * [FUNÇÃO: seedVendas]
 * Popula a tabela tb_grupo_produto e gera registros diários de vendas na tb_venda_grupo.
 * Permite que o Dashboard exiba gráficos de evolução temporal, ticket médio e margem de lucro.
 */
async function seedVendas(empresaId: number) {
  // Cria os grupos de produtos para a confeitaria caso ainda não existam
  const existing = await db.execute({
    sql: "SELECT COUNT(*) AS total FROM tb_grupo_produto WHERE empresa_id = ?",
    args: [empresaId],
  });
  if (Number(existing.rows[0]?.total ?? 0) === 0) {
    for (const [nome, cor] of GRUPOS) {
      await db.execute({
        sql: "INSERT INTO tb_grupo_produto (empresa_id, nome, cor) VALUES (?, ?, ?)",
        args: [empresaId, nome, cor],
      });
    }
  }

  // 6. POPULA INSUMOS E FICHAS TÉCNICAS (FASE 1)
  await seedPrecificacao(empresaId);

  // Verifica se já existem movimentações de venda cadastradas
  const movimentos = await db.execute({
    sql: "SELECT COUNT(*) AS total FROM tb_venda_grupo WHERE empresa_id = ?",
    args: [empresaId],
  });
  if (Number(movimentos.rows[0]?.total ?? 0) > 0) return;

  const grupos = await db.execute({
    sql: "SELECT id, nome FROM tb_grupo_produto WHERE empresa_id = ?",
    args: [empresaId],
  });

  const bases: Record<string, { valor: number; margem: number }> = {
    Bolos: { valor: 420, margem: 0.43 },
    Tortas: { valor: 280, margem: 0.39 },
    "Doces finos": { valor: 190, margem: 0.48 },
    "Kits festa": { valor: 510, margem: 0.34 },
    Salgados: { valor: 160, margem: 0.41 },
  };

  const start = new Date("2026-01-01T12:00:00");
  const end = new Date();
  end.setHours(12, 0, 0, 0);

  for (let day = new Date(start), n = 1; day <= end; day.setDate(day.getDate() + 1), n += 1) {
    const data = isoDate(day);
    for (const grupo of grupos.rows) {
      const nome = String(grupo.nome);
      const spec = bases[nome] ?? { valor: 200, margem: 0.4 };
      const chance = rand(n * 17 + Number(grupo.id) * 9);
      if (chance < 0.22) continue;
      const fator = 0.55 + rand(n * 13 + Number(grupo.id) * 5) * 1.35;
      const valor = Math.round(spec.valor * fator * 100) / 100;
      const custo = Math.round(valor * (1 - spec.margem) * 100) / 100;
      const pedidos = 1 + Math.floor(rand(n * 3 + Number(grupo.id)) * 4);
      await db.execute({
        sql: `INSERT INTO tb_venda_grupo (empresa_id, grupo_id, data, valor, custo, pedidos)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [empresaId, Number(grupo.id), data, valor, custo, pedidos],
      });
    }
  }
}

/**
 * [BLOCO: SEED DE INSUMOS & RECEITAS - FASE 1]
 * Cria insumos comuns de confeitaria e fichas técnicas demonstrativas completas.
 */
async function seedPrecificacao(empresaId: number) {
  const existing = await db.execute({
    sql: "SELECT COUNT(*) AS total FROM tb_insumo WHERE empresa_id = ?",
    args: [empresaId],
  });

  if (Number(existing.rows[0]?.total ?? 0) > 0) return;

  // Insumos básicos com preços médios praticados no Brasil
  const leiteCondensado = await salvarInsumo(empresaId, {
    nome: "Leite Condensado 395g",
    categoria: "ingrediente",
    unidadeMedida: "g",
    unidadeCompra: "g",
    quantidadeEmbalagem: 395,
    precoCompra: 6.89,
    estoqueAtual: 7900,
    estoqueMinimo: 1975,
    marca: "Leite Moça / Itambé",
  });

  const cremeLeite = await salvarInsumo(empresaId, {
    nome: "Creme de Leite 200g (17% gordura)",
    categoria: "ingrediente",
    unidadeMedida: "g",
    unidadeCompra: "g",
    quantidadeEmbalagem: 200,
    precoCompra: 3.49,
    estoqueAtual: 4000,
    estoqueMinimo: 1000,
    marca: "Nestlé / Piracanjuba",
  });

  const chocolateNobre = await salvarInsumo(empresaId, {
    nome: "Chocolate Nobre Meio Amargo 50% em Gotas 1kg",
    categoria: "ingrediente",
    unidadeMedida: "g",
    unidadeCompra: "kg",
    quantidadeEmbalagem: 1,
    precoCompra: 52.00,
    estoqueAtual: 4000,
    estoqueMinimo: 1000,
    marca: "Sicao / Melken",
  });

  const cacauPo = await salvarInsumo(empresaId, {
    nome: "Cacau em Pó 100% Alcalino 500g",
    categoria: "ingrediente",
    unidadeMedida: "g",
    unidadeCompra: "g",
    quantidadeEmbalagem: 500,
    precoCompra: 28.50,
    estoqueAtual: 1500,
    estoqueMinimo: 500,
    marca: "Callebaut / Melken",
  });

  const farinhaTrigo = await salvarInsumo(empresaId, {
    nome: "Farinha de Trigo Tradicional 1kg",
    categoria: "ingrediente",
    unidadeMedida: "g",
    unidadeCompra: "kg",
    quantidadeEmbalagem: 1,
    precoCompra: 5.50,
    estoqueAtual: 10000,
    estoqueMinimo: 3000,
    marca: "Dona Benta / Rosa Branca",
  });

  const acucarRefinado = await salvarInsumo(empresaId, {
    nome: "Açúcar Refinado 1kg",
    categoria: "ingrediente",
    unidadeMedida: "g",
    unidadeCompra: "kg",
    quantidadeEmbalagem: 1,
    precoCompra: 4.80,
    estoqueAtual: 8000,
    estoqueMinimo: 2000,
    marca: "União",
  });

  const manteiga = await salvarInsumo(empresaId, {
    nome: "Manteiga Primeira Qualidade Sem Sal 500g",
    categoria: "ingrediente",
    unidadeMedida: "g",
    unidadeCompra: "g",
    quantidadeEmbalagem: 500,
    precoCompra: 26.90,
    estoqueAtual: 2000,
    estoqueMinimo: 500,
    marca: "President / Itambé",
  });

  const ovos = await salvarInsumo(empresaId, {
    nome: "Ovos Médios Vermelhos (Bandeja 30 un)",
    categoria: "ingrediente",
    unidadeMedida: "un",
    unidadeCompra: "un",
    quantidadeEmbalagem: 30,
    precoCompra: 24.00,
    estoqueAtual: 60,
    estoqueMinimo: 30,
    marca: "Granja Local",
  });

  const leiteNinho = await salvarInsumo(empresaId, {
    nome: "Leite em Pó Integral Ninho 380g",
    categoria: "ingrediente",
    unidadeMedida: "g",
    unidadeCompra: "g",
    quantidadeEmbalagem: 380,
    precoCompra: 18.90,
    estoqueAtual: 1140,
    estoqueMinimo: 380,
    marca: "Nestlé Ninho",
  });

  const nutella = await salvarInsumo(empresaId, {
    nome: "Creme de Avelã Nutella Pote 650g",
    categoria: "ingrediente",
    unidadeMedida: "g",
    unidadeCompra: "g",
    quantidadeEmbalagem: 650,
    precoCompra: 45.00,
    estoqueAtual: 1300,
    estoqueMinimo: 650,
    marca: "Ferrero",
  });

  const cakeboard = await salvarInsumo(empresaId, {
    nome: "Base Rígida para Bolo Cakeboard MDF Branco 25cm",
    categoria: "embalagem",
    unidadeMedida: "un",
    unidadeCompra: "un",
    quantidadeEmbalagem: 1,
    precoCompra: 4.50,
    estoqueAtual: 25,
    estoqueMinimo: 10,
    marca: "Art Cake",
  });

  const caixaBolo = await salvarInsumo(empresaId, {
    nome: "Caixa de Transporte com Visor para Bolo Alto 25x25x25cm",
    categoria: "embalagem",
    unidadeMedida: "un",
    unidadeCompra: "un",
    quantidadeEmbalagem: 1,
    precoCompra: 6.20,
    estoqueAtual: 20,
    estoqueMinimo: 10,
    marca: "Scrap Festas",
  });

  const granulado = await salvarInsumo(empresaId, {
    nome: "Granulado de Chocolate Nobre Callets/Vermicelli 500g",
    categoria: "decoracao",
    unidadeMedida: "g",
    unidadeCompra: "g",
    quantidadeEmbalagem: 500,
    precoCompra: 34.00,
    estoqueAtual: 1000,
    estoqueMinimo: 500,
    marca: "Mona Lisa / Melken",
  });

  const forminhas = await salvarInsumo(empresaId, {
    nome: "Forminhas nº 4 Marrom para Brigadeiro 4 Pétalas (Cento)",
    categoria: "embalagem",
    unidadeMedida: "un",
    unidadeCompra: "un",
    quantidadeEmbalagem: 100,
    precoCompra: 12.00,
    estoqueAtual: 300,
    estoqueMinimo: 100,
    marca: "Dufesta",
  });

  // Busca ID de grupo para associar
  const boloGrupo = await db.execute({
    sql: "SELECT id FROM tb_grupo_produto WHERE empresa_id = ? AND nome = 'Bolos' LIMIT 1",
    args: [empresaId],
  });
  const docesGrupo = await db.execute({
    sql: "SELECT id FROM tb_grupo_produto WHERE empresa_id = ? AND nome = 'Doces finos' LIMIT 1",
    args: [empresaId],
  });

  const boloGrupoId = boloGrupo.rows[0]?.id ? Number(boloGrupo.rows[0].id) : undefined;
  const docesGrupoId = docesGrupo.rows[0]?.id ? Number(docesGrupo.rows[0].id) : undefined;

  // 1. Receita: Bolo Vulcão Ninho com Nutella
  if (
    "id" in leiteCondensado &&
    "id" in cremeLeite &&
    "id" in farinhaTrigo &&
    "id" in acucarRefinado &&
    "id" in ovos &&
    "id" in manteiga &&
    "id" in leiteNinho &&
    "id" in nutella &&
    "id" in cakeboard &&
    "id" in caixaBolo
  ) {
    await salvarReceita(empresaId, {
      nome: "Bolo Vulcão Ninho c/ Nutella (Forma 20cm)",
      descricao: "Massa amanteigada fofinha de baunilha com cobertura cremosa vulcão de Ninho e pura Nutella no centro.",
      grupoId: boloGrupoId,
      rendimentoQuantidade: 1,
      rendimentoUnidade: "bolo (aprox. 1,6kg)",
      tempoPreparoMinutos: 90, // 1h30 de preparo e montagem
      custoHoraTrabalho: 22.00, // R$ 22,00 por hora da confeiteira
      percentualCustosFixos: 15, // 15% para gás de forno, eletricidade, água
      margemLucroDesejada: 90, // 90% de lucro líquido sugerido
      precoVenda: 95.00,
      modoPreparo: "1. Bater ovos e açúcar até dobrar de volume. 2. Acrescentar manteiga e farinha aos poucos. 3. Assar a 180°C por 40 min. 4. Fazer brigadeiro cremoso de Ninho. 5. Desenformar, colocar no cakeboard, preencher cavidade com Nutella e despejar o creme de Ninho.",
      status: "ativo",
      itens: [
        { insumoId: farinhaTrigo.id, quantidade: 300, unidade: "g" },
        { insumoId: acucarRefinado.id, quantidade: 250, unidade: "g" },
        { insumoId: manteiga.id, quantidade: 100, unidade: "g" },
        { insumoId: ovos.id, quantidade: 4, unidade: "un" },
        { insumoId: leiteCondensado.id, quantidade: 395, unidade: "g" }, // 1 lata no creme
        { insumoId: cremeLeite.id, quantidade: 200, unidade: "g" }, // 1 caixa no creme
        { insumoId: leiteNinho.id, quantidade: 80, unidade: "g" },
        { insumoId: nutella.id, quantidade: 150, unidade: "g" },
        { insumoId: cakeboard.id, quantidade: 1, unidade: "un" },
        { insumoId: caixaBolo.id, quantidade: 1, unidade: "un" },
      ],
    });
  }

  // 2. Receita: Cento de Brigadeiro Gourmet Tradicional
  if (
    "id" in leiteCondensado &&
    "id" in cremeLeite &&
    "id" in chocolateNobre &&
    "id" in cacauPo &&
    "id" in manteiga &&
    "id" in granulado &&
    "id" in forminhas
  ) {
    await salvarReceita(empresaId, {
      nome: "Cento de Brigadeiro Gourmet Belga Tradicional",
      descricao: "100 unidades de 16g cada, feitos com chocolate nobre meio amargo e confeito artesanal.",
      grupoId: docesGrupoId,
      rendimentoQuantidade: 100,
      rendimentoUnidade: "unidades (16g cada)",
      tempoPreparoMinutos: 120, // 2h para ponto de bico, resfriamento, pesagem, enrolar e emformar
      custoHoraTrabalho: 20.00,
      percentualCustosFixos: 15,
      margemLucroDesejada: 110,
      precoVenda: 160.00,
      modoPreparo: "1. Misturar leite condensado, creme de leite, cacau e chocolate em panela de fundo grosso. 2. Ponto de bloco (desgrudando do fundo). 3. Esfriar em plástico filme em contato. 4. Pesar bolinhas de 14g, passar no granulado e colocar nas forminhas 4 pétalas.",
      status: "ativo",
      itens: [
        { insumoId: leiteCondensado.id, quantidade: 790, unidade: "g" }, // 2 latas
        { insumoId: cremeLeite.id, quantidade: 200, unidade: "g" }, // 1 cx
        { insumoId: chocolateNobre.id, quantidade: 150, unidade: "g" },
        { insumoId: cacauPo.id, quantidade: 30, unidade: "g" },
        { insumoId: manteiga.id, quantidade: 40, unidade: "g" },
        { insumoId: granulado.id, quantidade: 250, unidade: "g" },
        { insumoId: forminhas.id, quantidade: 100, unidade: "un" },
      ],
    });
  }

  // 3. POPULA CADASTROS PADRÃO (SUBGRUPOS, FORNECEDORES, CLIENTES, PRODUTOS C/ RECEITA)
  await seedCadastrosPadrao(empresaId);
}

/**
 * [BLOCO: SEED DE CADASTROS PADRÃO DA FASE 1]
 * Cria subgrupos, fornecedores, clientes e cadastra produtos com ficha técnica integrada.
 */
async function seedCadastrosPadrao(empresaId: number) {
  // 0. TIPOS DE ITEM (Insumo, Embalagem, Acabado, Revenda, Semi-acabado)
  const existingTipos = await db.execute({
    sql: "SELECT COUNT(*) AS total FROM tb_tipo_item WHERE empresa_id = ?",
    args: [empresaId],
  });

  let tipoAcabadoId: number | undefined;

  if (Number(existingTipos.rows[0]?.total ?? 0) === 0) {
    const tAcabado = await salvarTipoItem(empresaId, {
      nome: "Produto Acabado",
      codigo: "PA",
      descricao: "Itens finalizados para venda direta aos clientes (bolos, doces, kits).",
      padrao: true,
    });
    if ("id" in tAcabado) tipoAcabadoId = tAcabado.id;

    await salvarTipoItem(empresaId, {
      nome: "Insumo / Matéria-prima",
      codigo: "MP",
      descricao: "Ingredientes que compõem a receita (leite condensado, farinha, cacau, etc.).",
      padrao: false,
    });

    await salvarTipoItem(empresaId, {
      nome: "Embalagem",
      codigo: "EMB",
      descricao: "Caixas, cakeboards, fitas e forminhas de acomodação.",
      padrao: false,
    });

    await salvarTipoItem(empresaId, {
      nome: "Mercadoria para Revenda",
      codigo: "REV",
      descricao: "Itens comprados prontos para comercialização (refrigerantes, velas, descartáveis).",
      padrao: false,
    });

    await salvarTipoItem(empresaId, {
      nome: "Semi-acabado / Recheio Base",
      codigo: "SA",
      descricao: "Bases produzidas internamente (brigadeiro de ponto de bico, geleias caseiras, massas).",
      padrao: false,
    });
  } else {
    const tipos = await db.execute({
      sql: "SELECT id FROM tb_tipo_item WHERE empresa_id = ? AND nome = 'Produto Acabado'",
      args: [empresaId],
    });
    if (tipos.rows[0]) tipoAcabadoId = Number(tipos.rows[0].id);
  }

  // 1. SUBGRUPOS DE PRODUTOS
  const grupos = await db.execute({
    sql: "SELECT id, nome FROM tb_grupo_produto WHERE empresa_id = ?",
    args: [empresaId],
  });

  const boloGrupo = grupos.rows.find((g) => g.nome === "Bolos");
  const docesGrupo = grupos.rows.find((g) => g.nome === "Doces finos");
  const tortasGrupo = grupos.rows.find((g) => g.nome === "Tortas");
  const kitsGrupo = grupos.rows.find((g) => g.nome === "Kits festa");

  let subBoloVulcaoId: number | undefined;
  let subBrigadeiroId: number | undefined;

  const existingSub = await db.execute({
    sql: "SELECT COUNT(*) AS total FROM tb_subgrupo_produto WHERE empresa_id = ?",
    args: [empresaId],
  });

  if (Number(existingSub.rows[0]?.total ?? 0) === 0) {
    if (boloGrupo) {
      const s1 = await salvarSubgrupo(empresaId, {
        grupoId: Number(boloGrupo.id),
        nome: "Bolos Vulcão",
      });
      if ("id" in s1) subBoloVulcaoId = s1.id;
      await salvarSubgrupo(empresaId, { grupoId: Number(boloGrupo.id), nome: "Bolos Caseiros" });
      await salvarSubgrupo(empresaId, { grupoId: Number(boloGrupo.id), nome: "Bolos Recheados" });
    }

    if (docesGrupo) {
      const s2 = await salvarSubgrupo(empresaId, {
        grupoId: Number(docesGrupo.id),
        nome: "Brigadeiros Gourmet",
      });
      if ("id" in s2) subBrigadeiroId = s2.id;
      await salvarSubgrupo(empresaId, { grupoId: Number(docesGrupo.id), nome: "Trufas & Bombons" });
      await salvarSubgrupo(empresaId, { grupoId: Number(docesGrupo.id), nome: "Doces Tradicionais" });
    }

    if (tortasGrupo) {
      await salvarSubgrupo(empresaId, { grupoId: Number(tortasGrupo.id), nome: "Tortas Doces" });
      await salvarSubgrupo(empresaId, { grupoId: Number(tortasGrupo.id), nome: "Tortas Salgadas" });
    }

    if (kitsGrupo) {
      await salvarSubgrupo(empresaId, { grupoId: Number(kitsGrupo.id), nome: "Kits Aniversário" });
      await salvarSubgrupo(empresaId, { grupoId: Number(kitsGrupo.id), nome: "Kits Corporativos" });
    }
  } else {
    const subgrupos = await db.execute({
      sql: "SELECT id, nome FROM tb_subgrupo_produto WHERE empresa_id = ?",
      args: [empresaId],
    });
    subBoloVulcaoId = subgrupos.rows.find((s) => s.nome === "Bolos Vulcão")?.id ? Number(subgrupos.rows.find((s) => s.nome === "Bolos Vulcão")!.id) : undefined;
    subBrigadeiroId = subgrupos.rows.find((s) => s.nome === "Brigadeiros Gourmet")?.id ? Number(subgrupos.rows.find((s) => s.nome === "Brigadeiros Gourmet")!.id) : undefined;
  }

  // 2. FORNECEDORES DE CONFEITARIA
  const existingFornec = await db.execute({
    sql: "SELECT COUNT(*) AS total FROM tb_fornecedor WHERE empresa_id = ?",
    args: [empresaId],
  });

  let fornecAlimentosId: number | undefined;

  if (Number(existingFornec.rows[0]?.total ?? 0) === 0) {
    const f1 = await salvarFornecedor(empresaId, {
      codigo: "FOR-001",
      razaoSocial: "Distribuidora Doce Mel Alimentos Ltda",
      nomeFantasia: "Doce Mel Distribuidora",
      cnpjCpf: "12.345.678/0001-90",
      telefone: "(11) 3456-7890",
      celular: "(11) 98765-4321",
      email: "pedidos@docemelalimentos.com.br",
      contato: "Carlos Vendedor",
      cep: "01310-100",
      logradouro: "Av. Paulista",
      numero: "1000",
      bairro: "Bela Vista",
      status: "ativo",
      observacoes: "Fornecedor principal de chocolate nobre, cacau alcalino, farinhas e laticínios.",
    });
    if (f1 && "id" in f1) fornecAlimentosId = f1.id;

    await salvarFornecedor(empresaId, {
      codigo: "FOR-002",
      razaoSocial: "Embalagens & Festas Brasil Ltda",
      nomeFantasia: "Festas Express Embalagens",
      cnpjCpf: "23.456.789/0001-01",
      telefone: "(11) 3214-5678",
      celular: "(11) 97654-3210",
      email: "contato@festasexpressembalagens.com.br",
      contato: "Mariana",
      cep: "03010-000",
      logradouro: "Rua das Festas",
      numero: "250",
      bairro: "Brás",
      status: "ativo",
      observacoes: "Fornecedor de cakeboards MDF, caixas com visor de acetato e forminhas 4 pétalas.",
    });

    await salvarFornecedor(empresaId, {
      codigo: "FOR-003",
      razaoSocial: "Granja Santa Clara Agropecuária",
      nomeFantasia: "Ovos Santa Clara",
      cnpjCpf: "34.567.890/0001-12",
      telefone: "(11) 4567-8901",
      celular: "(11) 96543-2109",
      email: "vendas@granjasantaclara.com.br",
      contato: "Seu José",
      status: "ativo",
      observacoes: "Entrega semanal de bandejas de ovos frescos selecionados.",
    });
  }

  // 3. CLIENTES MODELO
  const existingClientes = await db.execute({
    sql: "SELECT COUNT(*) AS total FROM tb_cliente WHERE empresa_id = ?",
    args: [empresaId],
  });

  if (Number(existingClientes.rows[0]?.total ?? 0) === 0) {
    await salvarCliente(empresaId, {
      codigo: "CLI-001",
      nome: "Juliana Mendes Silva",
      cpfCnpj: "234.567.890-12",
      telefone: "(11) 3456-1122",
      celular: "(11) 99876-5432",
      email: "juliana.mendes@gmail.com",
      dataNascimento: "1992-10-15",
      cep: "04530-001",
      logradouro: "Rua Joaquim Floriano",
      numero: "450",
      complemento: "Apto 82",
      bairro: "Itaim Bibi",
      status: "ativo",
      observacoes: "Cliente VIP. Prefere bolos com recheio de Ninho e Nutella. Aniversário em 15/Outubro.",
    });

    await salvarCliente(empresaId, {
      codigo: "CLI-002",
      nome: "Mariana Costa Oliveira (Empresa Nexa)",
      cpfCnpj: "45.678.901/0001-23",
      telefone: "(11) 3098-7654",
      celular: "(11) 98123-4567",
      email: "rh@nexatech.com.br",
      dataNascimento: "1988-05-20",
      cep: "04578-000",
      logradouro: "Av. das Nações Unidas",
      numero: "12551",
      complemento: "14º andar",
      bairro: "Brooklin",
      status: "ativo",
      observacoes: "Encomendas corporativas quinzenais de cento de brigadeiro e kits de comemoração de metas.",
    });

    await salvarCliente(empresaId, {
      codigo: "CLI-003",
      nome: "Carlos Eduardo Santos",
      cpfCnpj: "345.678.901-23",
      telefone: "(11) 2345-6789",
      celular: "(11) 97234-5678",
      email: "cadu.santos@outlook.com",
      dataNascimento: "1995-12-08",
      cep: "04038-002",
      logradouro: "Rua Domingos de Morais",
      numero: "1800",
      bairro: "Vila Mariana",
      status: "ativo",
      observacoes: "Pede bolos de aniversário para a família.",
    });
  }

  // 4. PRODUTOS COM FICHA TÉCNICA / RECEITA INTEGRADA
  const existingProdutos = await db.execute({
    sql: "SELECT COUNT(*) AS total FROM tb_produto WHERE empresa_id = ?",
    args: [empresaId],
  });

  if (Number(existingProdutos.rows[0]?.total ?? 0) === 0) {
    const insumosDb = await db.execute({
      sql: "SELECT id, nome FROM tb_insumo WHERE empresa_id = ?",
      args: [empresaId],
    });

    const getIns = (parteNome: string) =>
      insumosDb.rows.find((i) =>
        String(i.nome).toLowerCase().includes(parteNome.toLowerCase())
      )?.id;

    const farinhaId = getIns("Farinha de Trigo");
    const acucarId = getIns("Açúcar Refinado");
    const manteigaId = getIns("Manteiga");
    const ovosId = getIns("Ovos Médios");
    const leiteCondId = getIns("Leite Condensado");
    const cremeLeiteId = getIns("Creme de Leite");
    const ninhoId = getIns("Ninho");
    const nutellaId = getIns("Nutella");
    const cakeboardId = getIns("Cakeboard");
    const caixaBoloId = getIns("Caixa de Transporte");
    const chocNobreId = getIns("Chocolate Nobre");
    const cacauId = getIns("Cacau em Pó");
    const granuladoId = getIns("Granulado");
    const forminhasId = getIns("Forminhas");

    // Produto 1: Bolo Vulcão Ninho c/ Nutella
    if (
      farinhaId &&
      acucarId &&
      manteigaId &&
      ovosId &&
      leiteCondId &&
      cremeLeiteId &&
      ninhoId &&
      nutellaId &&
      cakeboardId &&
      caixaBoloId
    ) {
      await salvarProduto(empresaId, {
        codigo: "PRD-001",
        nome: "Bolo Vulcão Ninho c/ Nutella (Forma 20cm)",
        descricao: "Massa amanteigada fofinha de baunilha com cobertura cremosa vulcão de Ninho e pura Nutella no centro.",
        tipoItemId: tipoAcabadoId || null,
        grupoId: boloGrupo ? Number(boloGrupo.id) : null,
        subgrupoId: subBoloVulcaoId || null,
        unidadeVenda: "unidade",
        precoVenda: 95.00,
        estoqueAtual: 5,
        estoqueMinimo: 2,
        temReceita: true,
        rendimentoQuantidade: 1,
        rendimentoUnidade: "bolo (~1,6kg)",
        tempoPreparoMinutos: 90,
        custoHoraTrabalho: 22.00,
        percentualCustosFixos: 15,
        margemLucroDesejada: 90,
        modoPreparo: "1. Bater ovos e açúcar até dobrar de volume. 2. Acrescentar manteiga e farinha aos poucos. 3. Assar a 180°C por 40 min. 4. Fazer brigadeiro cremoso de Ninho. 5. Desenformar, colocar no cakeboard, preencher cavidade com Nutella e despejar o creme de Ninho.",
        status: "ativo",
        itensReceita: [
          { insumoId: Number(farinhaId), quantidade: 300, unidade: "g" },
          { insumoId: Number(acucarId), quantidade: 250, unidade: "g" },
          { insumoId: Number(manteigaId), quantidade: 100, unidade: "g" },
          { insumoId: Number(ovosId), quantidade: 4, unidade: "un" },
          { insumoId: Number(leiteCondId), quantidade: 395, unidade: "g" },
          { insumoId: Number(cremeLeiteId), quantidade: 200, unidade: "g" },
          { insumoId: Number(ninhoId), quantidade: 80, unidade: "g" },
          { insumoId: Number(nutellaId), quantidade: 150, unidade: "g" },
          { insumoId: Number(cakeboardId), quantidade: 1, unidade: "un" },
          { insumoId: Number(caixaBoloId), quantidade: 1, unidade: "un" },
        ],
      });
    }

    // Produto 2: Cento de Brigadeiro Gourmet Belga Tradicional
    if (
      leiteCondId &&
      cremeLeiteId &&
      chocNobreId &&
      cacauId &&
      manteigaId &&
      granuladoId &&
      forminhasId
    ) {
      await salvarProduto(empresaId, {
        codigo: "PRD-002",
        nome: "Cento de Brigadeiro Gourmet Belga Tradicional",
        descricao: "100 unidades de 16g cada, feitos com chocolate nobre meio amargo e confeito artesanal.",
        tipoItemId: tipoAcabadoId || null,
        grupoId: docesGrupo ? Number(docesGrupo.id) : null,
        subgrupoId: subBrigadeiroId || null,
        unidadeVenda: "cento",
        precoVenda: 160.00,
        estoqueAtual: 2,
        estoqueMinimo: 1,
        temReceita: true,
        rendimentoQuantidade: 100,
        rendimentoUnidade: "unidades",
        tempoPreparoMinutos: 120,
        custoHoraTrabalho: 20.00,
        percentualCustosFixos: 15,
        margemLucroDesejada: 110,
        modoPreparo: "1. Misturar leite condensado, creme de leite, cacau e chocolate em panela de fundo grosso. 2. Ponto de bloco (desgrudando do fundo). 3. Esfriar em contato. 4. Pesar bolinhas de 14g, passar no granulado e colocar nas forminhas 4 pétalas.",
        status: "ativo",
        itensReceita: [
          { insumoId: Number(leiteCondId), quantidade: 790, unidade: "g" },
          { insumoId: Number(cremeLeiteId), quantidade: 200, unidade: "g" },
          { insumoId: Number(chocNobreId), quantidade: 150, unidade: "g" },
          { insumoId: Number(cacauId), quantidade: 30, unidade: "g" },
          { insumoId: Number(manteigaId), quantidade: 40, unidade: "g" },
          { insumoId: Number(granuladoId), quantidade: 250, unidade: "g" },
          { insumoId: Number(forminhasId), quantidade: 100, unidade: "un" },
        ],
      });
    }
  }
}


