/**
 * ============================================================================
 * PROJETO: Doce Gestor - Sistema de Gestão para Confeitarias
 * REPOSITÓRIO: https://github.com/junin1737/confeitaria
 * ARQUIVO: server/db/client.ts
 * DESCRIÇÃO: Configuração e inicialização do cliente de banco de dados LibSQL.
 * ============================================================================
 * 
 * [ARQUITETURA DE BANCO DE DADOS]
 * O projeto utiliza a biblioteca `@libsql/client`.
 * Essa abordagem oferece uma vantagem arquitetural estratégica:
 * 1. Em desenvolvimento local: Opera sobre um arquivo SQLite local (doce-gestor.db)
 *    com altíssima velocidade e zero custo de infraestrutura.
 * 2. Em produção online: Conecta de forma transparente ao cluster de nuvem da Turso
 *    (LibSQL Serverless), bastando alterar a URL de conexão para um endpoint remoto.
 * ============================================================================
 */

import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient, type Client } from "@libsql/client";

/**
 * [BLOCO: DEFINIÇÃO DE CAMINHOS LOCAIS]
 * Calcula o caminho absoluto da pasta raiz e do diretório 'data' onde o
 * arquivo do banco de dados SQLite é persistido.
 */
const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
export const DATA_DIR = join(root, "data");
export const DB_PATH = join(DATA_DIR, "doce-gestor.db");

/**
 * [BLOCO: CRIAÇÃO DO DIRETÓRIO DE DADOS]
 * Garante que a pasta 'data' exista no disco antes de abrir a conexão.
 */
mkdirSync(DATA_DIR, { recursive: true });

/**
 * [BLOCO: INSTANCIAÇÃO DO CLIENTE DE BANCO DE DADOS]
 * Inicializa a conexão LibSQL. Suporta URL de arquivo local ou endpoint remoto.
 * O cliente exportado 'db' é utilizado em todas as queries e migrations da aplicação.
 */
export const db: Client = createClient({
  url: process.env.DATABASE_URL || `file:${DB_PATH.replace(/\\/g, "/")}`,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});
