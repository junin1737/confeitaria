/**
 * ============================================================================
 * PROJETO: Doce Gestor - Sistema de Gestão para Confeitarias
 * REPOSITÓRIO: https://github.com/junin1737/confeitaria
 * ARQUIVO: server/db/migrate.ts
 * DESCRIÇÃO: Esquema de tabelas relacionais, índices e migrações incrementais.
 * ============================================================================
 * 
 * [ISOLAMENTO MULTI-TENANT NA CAMADA DE DADOS]
 * Cada tabela operacional (tb_usuario, tb_funcionario, tb_venda_grupo, etc.)
 * possui uma coluna `empresa_id` com chave estrangeira apontando para `tb_empresa(id)`.
 * Índices dedicados por `empresa_id` garantem performance e consultas estritamente
 * segmentadas por empresa.
 * ============================================================================
 */

import { db } from "./client";

/**
 * [BLOCO: DEFINIÇÃO DDL DAS TABELAS E ÍNDICES INICIAIS]
 * Cria as tabelas do sistema caso elas ainda não existam no banco.
 */
const STATEMENTS = [
  // 1. Habilita integridade referencial com chaves estrangeiras no SQLite/LibSQL
  `PRAGMA foreign_keys = ON`,

  // 2. Entidade Tenant: tb_empresa (armazena as confeitarias cadastradas)
  `CREATE TABLE IF NOT EXISTS tb_empresa (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ativa',
    criado_em TEXT NOT NULL
  )`,

  // 3. Entidade de Acesso: tb_usuario (vinculada à respectiva confeitaria)
  `CREATE TABLE IF NOT EXISTS tb_usuario (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empresa_id INTEGER NOT NULL REFERENCES tb_empresa(id),
    login TEXT NOT NULL UNIQUE,
    nome TEXT NOT NULL,
    senha_hash TEXT NOT NULL,
    perfil TEXT NOT NULL DEFAULT 'usuario',
    status TEXT NOT NULL DEFAULT 'ativo',
    criado_em TEXT NOT NULL
  )`,

  // 4. Domínio Geográfico: tb_estado (Unidades Federativas do Brasil)
  `CREATE TABLE IF NOT EXISTS tb_estado (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sigla TEXT NOT NULL UNIQUE,
    nome TEXT NOT NULL
  )`,

  // 5. Domínio Geográfico: tb_cidade (Municípios vinculados a cada estado)
  `CREATE TABLE IF NOT EXISTS tb_cidade (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    estado_id INTEGER NOT NULL REFERENCES tb_estado(id),
    nome TEXT NOT NULL
  )`,

  // 6. Gestão de Pessoas: tb_funcionario (colaboradores com endereço, salário e cargo)
  `CREATE TABLE IF NOT EXISTS tb_funcionario (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empresa_id INTEGER NOT NULL REFERENCES tb_empresa(id),
    codigo TEXT NOT NULL,
    nome TEXT NOT NULL,
    cpf TEXT,
    data_nascimento TEXT,
    data_cadastro TEXT NOT NULL,
    email TEXT,
    telefone TEXT,
    celular TEXT,
    logradouro TEXT,
    numero TEXT,
    complemento TEXT,
    bairro TEXT,
    uf_id INTEGER REFERENCES tb_estado(id),
    cidade_id INTEGER REFERENCES tb_cidade(id),
    data_admissao TEXT,
    data_demissao TEXT,
    salario_fixo REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'ativo',
    UNIQUE (empresa_id, codigo)
  )`,

  // 7. Sessões Ativas: tb_sessao (cookies autenticados com data de expiração)
  `CREATE TABLE IF NOT EXISTS tb_sessao (
    id TEXT PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES tb_usuario(id),
    criado_em TEXT NOT NULL,
    expira_em TEXT NOT NULL
  )`,

  // 8. Catálogo: tb_grupo_produto (categorias como Bolos, Tortas, Doces Finos)
  `CREATE TABLE IF NOT EXISTS tb_grupo_produto (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empresa_id INTEGER NOT NULL REFERENCES tb_empresa(id),
    nome TEXT NOT NULL,
    cor TEXT NOT NULL,
    UNIQUE (empresa_id, nome)
  )`,

  // 9. Histórico Financeiro: tb_venda_grupo (vendas consolidadas por categoria e data)
  `CREATE TABLE IF NOT EXISTS tb_venda_grupo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empresa_id INTEGER NOT NULL REFERENCES tb_empresa(id),
    grupo_id INTEGER NOT NULL REFERENCES tb_grupo_produto(id),
    data TEXT NOT NULL,
    valor REAL NOT NULL DEFAULT 0,
    custo REAL NOT NULL DEFAULT 0,
    pedidos INTEGER NOT NULL DEFAULT 0
  )`,

  // 10. Índices de Otimização e Segurança de Tenant
  `CREATE INDEX IF NOT EXISTS idx_usuario_empresa ON tb_usuario (empresa_id)`,
  `CREATE INDEX IF NOT EXISTS idx_funcionario_empresa ON tb_funcionario (empresa_id)`,
  `CREATE INDEX IF NOT EXISTS idx_cidade_estado ON tb_cidade (estado_id)`,
  `CREATE INDEX IF NOT EXISTS idx_sessao_usuario ON tb_sessao (usuario_id)`,
  `CREATE INDEX IF NOT EXISTS idx_venda_grupo_empresa_data ON tb_venda_grupo (empresa_id, data)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_cidade_estado_nome ON tb_cidade (estado_id, nome)`,

  // 11. Comunicação: tb_mensagem (templates de mensagens de aniversário e WhatsApp)
  `CREATE TABLE IF NOT EXISTS tb_mensagem (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empresa_id INTEGER NOT NULL REFERENCES tb_empresa(id),
    chave TEXT NOT NULL,
    titulo TEXT NOT NULL,
    texto TEXT NOT NULL,
    UNIQUE (empresa_id, chave)
  )`,

  // 12. Fase 1: tb_insumo (Ingredientes, insumos e embalagens com custo unitário)
  `CREATE TABLE IF NOT EXISTS tb_insumo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empresa_id INTEGER NOT NULL REFERENCES tb_empresa(id),
    nome TEXT NOT NULL,
    categoria TEXT NOT NULL DEFAULT 'ingrediente',
    unidade_medida TEXT NOT NULL DEFAULT 'g',
    unidade_compra TEXT NOT NULL DEFAULT 'g',
    quantidade_embalagem REAL NOT NULL DEFAULT 1,
    preco_compra REAL NOT NULL DEFAULT 0,
    custo_unitario REAL NOT NULL DEFAULT 0,
    estoque_atual REAL DEFAULT 0,
    estoque_minimo REAL DEFAULT 0,
    marca TEXT,
    criado_em TEXT NOT NULL,
    UNIQUE (empresa_id, nome)
  )`,

  // 13. Fase 1: tb_receita (Fichas técnicas, receitas de doces/salgados e precificação)
  `CREATE TABLE IF NOT EXISTS tb_receita (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empresa_id INTEGER NOT NULL REFERENCES tb_empresa(id),
    grupo_id INTEGER REFERENCES tb_grupo_produto(id),
    nome TEXT NOT NULL,
    descricao TEXT,
    rendimento_quantidade REAL NOT NULL DEFAULT 1,
    rendimento_unidade TEXT NOT NULL DEFAULT 'unidade',
    tempo_preparo_minutos INTEGER NOT NULL DEFAULT 60,
    custo_hora_trabalho REAL NOT NULL DEFAULT 20.0,
    percentual_custos_fixos REAL NOT NULL DEFAULT 15.0,
    margem_lucro_desejada REAL NOT NULL DEFAULT 100.0,
    preco_sugerido REAL NOT NULL DEFAULT 0,
    preco_venda REAL NOT NULL DEFAULT 0,
    modo_preparo TEXT,
    status TEXT NOT NULL DEFAULT 'ativo',
    criado_em TEXT NOT NULL,
    atualizado_em TEXT NOT NULL,
    UNIQUE (empresa_id, nome)
  )`,

  // 14. Fase 1: tb_receita_item (Itens da ficha técnica vinculados a cada insumo)
  `CREATE TABLE IF NOT EXISTS tb_receita_item (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    receita_id INTEGER NOT NULL REFERENCES tb_receita(id) ON DELETE CASCADE,
    insumo_id INTEGER NOT NULL REFERENCES tb_insumo(id),
    quantidade REAL NOT NULL,
    unidade TEXT NOT NULL DEFAULT 'g'
  )`,

  // 15. Fase 1: tb_subgrupo_produto (Subcategorias vinculadas ao grupo pai)
  `CREATE TABLE IF NOT EXISTS tb_subgrupo_produto (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empresa_id INTEGER NOT NULL REFERENCES tb_empresa(id),
    grupo_id INTEGER NOT NULL REFERENCES tb_grupo_produto(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    UNIQUE (empresa_id, grupo_id, nome)
  )`,

  // 16. Fase 1: tb_fornecedor (Fornecedores de insumos, embalagens e serviços)
  `CREATE TABLE IF NOT EXISTS tb_fornecedor (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empresa_id INTEGER NOT NULL REFERENCES tb_empresa(id),
    codigo TEXT NOT NULL,
    razao_social TEXT NOT NULL,
    nome_fantasia TEXT,
    cnpj_cpf TEXT,
    telefone TEXT,
    celular TEXT,
    email TEXT,
    contato TEXT,
    cep TEXT,
    logradouro TEXT,
    numero TEXT,
    complemento TEXT,
    bairro TEXT,
    cidade_id INTEGER REFERENCES tb_cidade(id),
    status TEXT NOT NULL DEFAULT 'ativo',
    observacoes TEXT,
    criado_em TEXT NOT NULL,
    UNIQUE (empresa_id, codigo)
  )`,

  // 17. Fase 1: tb_cliente (Clientes para encomendas, aniversários e delivery)
  `CREATE TABLE IF NOT EXISTS tb_cliente (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empresa_id INTEGER NOT NULL REFERENCES tb_empresa(id),
    codigo TEXT NOT NULL,
    nome TEXT NOT NULL,
    cpf_cnpj TEXT,
    telefone TEXT,
    celular TEXT,
    email TEXT,
    data_nascimento TEXT,
    cep TEXT,
    logradouro TEXT,
    numero TEXT,
    complemento TEXT,
    bairro TEXT,
    cidade_id INTEGER REFERENCES tb_cidade(id),
    status TEXT NOT NULL DEFAULT 'ativo',
    observacoes TEXT,
    criado_em TEXT NOT NULL,
    UNIQUE (empresa_id, codigo)
  )`,

  // 18. Fase 1: tb_produto (Produtos finais comercializáveis com Ficha Técnica / Receita integrada)
  `CREATE TABLE IF NOT EXISTS tb_produto (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empresa_id INTEGER NOT NULL REFERENCES tb_empresa(id),
    codigo TEXT NOT NULL,
    nome TEXT NOT NULL,
    descricao TEXT,
    grupo_id INTEGER REFERENCES tb_grupo_produto(id),
    subgrupo_id INTEGER REFERENCES tb_subgrupo_produto(id),
    unidade_venda TEXT NOT NULL DEFAULT 'unidade',
    preco_custo REAL NOT NULL DEFAULT 0,
    preco_venda REAL NOT NULL DEFAULT 0,
    estoque_atual REAL DEFAULT 0,
    estoque_minimo REAL DEFAULT 0,
    tem_receita INTEGER NOT NULL DEFAULT 1,
    rendimento_quantidade REAL NOT NULL DEFAULT 1,
    rendimento_unidade TEXT NOT NULL DEFAULT 'unidade',
    tempo_preparo_minutos INTEGER NOT NULL DEFAULT 60,
    custo_hora_trabalho REAL NOT NULL DEFAULT 20.0,
    percentual_custos_fixos REAL NOT NULL DEFAULT 15.0,
    margem_lucro_desejada REAL NOT NULL DEFAULT 100.0,
    preco_sugerido REAL NOT NULL DEFAULT 0,
    modo_preparo TEXT,
    status TEXT NOT NULL DEFAULT 'ativo',
    foto_url TEXT,
    criado_em TEXT NOT NULL,
    atualizado_em TEXT NOT NULL,
    UNIQUE (empresa_id, codigo)
  )`,

  // 19. Fase 1: tb_produto_insumo (Itens e quantidades da receita vinculados ao Produto)
  `CREATE TABLE IF NOT EXISTS tb_produto_insumo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    produto_id INTEGER NOT NULL REFERENCES tb_produto(id) ON DELETE CASCADE,
    insumo_id INTEGER NOT NULL REFERENCES tb_insumo(id),
    quantidade REAL NOT NULL,
    unidade TEXT NOT NULL DEFAULT 'g'
  )`,

  // 20. Índices de Otimização Fase 1
  `CREATE INDEX IF NOT EXISTS idx_insumo_empresa ON tb_insumo (empresa_id)`,
  `CREATE INDEX IF NOT EXISTS idx_receita_empresa ON tb_receita (empresa_id)`,
  `CREATE INDEX IF NOT EXISTS idx_receita_item_receita ON tb_receita_item (receita_id)`,
  `CREATE INDEX IF NOT EXISTS idx_subgrupo_grupo ON tb_subgrupo_produto (grupo_id)`,
  `CREATE INDEX IF NOT EXISTS idx_fornecedor_empresa ON tb_fornecedor (empresa_id)`,
  `CREATE INDEX IF NOT EXISTS idx_cliente_empresa ON tb_cliente (empresa_id)`,
  `CREATE INDEX IF NOT EXISTS idx_produto_empresa ON tb_produto (empresa_id)`,
  `CREATE INDEX IF NOT EXISTS idx_produto_insumo_produto ON tb_produto_insumo (produto_id)`,
];

/**
 * [FUNÇÃO UTILITÁRIA: ensureColumn]
 * Verifica a existência prévia de uma coluna em uma tabela através do PRAGMA table_info.
 * Caso a coluna não exista, executa um ALTER TABLE ADD COLUMN de forma segura e não destrutiva.
 */
async function ensureColumn(table: string, column: string, definition: string) {
  const info = await db.execute(`PRAGMA table_info(${table})`);
  if (info.rows.some((row) => String(row.name) === column)) return;
  await db.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

/**
 * [FUNÇÃO EXECUTORA: migrate]
 * Orquestra a execução sequencial de todas as DDLs e aplica as migrações incrementais.
 * Adiciona campos de licença, controle serial, multi-empresa e dados de contato.
 */
export async function migrate() {
  // Executa os statements DDL principais
  for (const sql of STATEMENTS) {
    await db.execute(sql);
  }

  // Migrações incrementais na tabela de colaboradores
  await ensureColumn("tb_funcionario", "cep", "TEXT");
  await ensureColumn("tb_funcionario", "senha_hash", "TEXT");

  // Migrações incrementais na tabela de empresas (SaaS, Licenças e Seriais)
  await ensureColumn("tb_empresa", "email", "TEXT");
  await ensureColumn("tb_empresa", "telefone", "TEXT");
  await ensureColumn("tb_empresa", "documento", "TEXT");
  await ensureColumn("tb_empresa", "plano", "TEXT DEFAULT 'trial'");
  await ensureColumn("tb_empresa", "serial_key", "TEXT");
  await ensureColumn("tb_empresa", "expira_em", "TEXT");
  await ensureColumn("tb_empresa", "motivo_bloqueio", "TEXT");
  await ensureColumn("tb_empresa", "slug", "TEXT");

  // Migrações incrementais na tabela de usuários
  await ensureColumn("tb_usuario", "email", "TEXT");

  // Migrações incrementais na tabela de insumos (vínculo com fornecedor)
  await ensureColumn("tb_insumo", "fornecedor_id", "INTEGER REFERENCES tb_fornecedor(id)");
}
