/**
 * ============================================================================
 * PROJETO: Doce Gestor - Sistema de Gestão para Confeitarias
 * REPOSITÓRIO: https://github.com/junin1737/confeitaria
 * ARQUIVO: server/index.ts
 * DESCRIÇÃO: Ponto de entrada do servidor HTTP Express, rotas e middlewares.
 * ============================================================================
 * 
 * [ESTRUTURA DE SERVIÇOS & MIDDLEWARES]
 * 1. CORS: Habilita requisições do frontend Vite (portas 5180/IP local) com cookies.
 * 2. requireAuth: Protege endpoints internos exigindo sessão válida ativa.
 * 3. requireActiveLicense: Verifica em tempo real se a confeitaria está ativa
 *    e se a licença não expirou, cortando o acesso de empresas bloqueadas.
 * 4. requireAdminAuth: Protege o Painel Master e os endpoints da API de integração
 *    via sessão Master ou chave mestre de integração (X-Admin-Api-Key).
 * 5. Rotas de API organizadas por domínios: Auth, Admin, Dashboard, Funcionários, Mensagens e Localidades.
 * ============================================================================
 */

import cors from "cors";
import cookieParser from "cookie-parser";
import express, { type Request, type Response } from "express";
import { autenticar, criarSessao, encerrarSessao, obterUsuarioPorSessao } from "./auth";
import {
  alterarStatusEmpresa,
  atualizarFichaEmpresa,
  criarEmpresaAdmin,
  listarEmpresasAdmin,
  obterEmpresaAdmin,
  prorrogarLicencaEmpresa,
  renovarSerialEmpresa,
  verificarAcessoEmpresa,
} from "./admin";
import { consultarCnpj } from "./cnpj";
import { evolucaoDiaria, evolucaoMensal, resumoPeriodo, variacao, vendasPorGrupo } from "./dashboard";
import {
  atualizarFuncionario,
  criarFuncionario,
  listarFuncionarios,
  obterFuncionario,
  proximoCodigo,
} from "./funcionarios";
import { aniversariantesDoDia, listarMensagens, obterMensagem, salvarMensagem } from "./mensagens";
import { consultarCep, listarCidades, listarEstados } from "./localidades";
import {
  listarInsumos,
  obterInsumo,
  salvarInsumo,
  excluirInsumo,
  listarReceitas,
  obterReceita,
  salvarReceita,
  excluirReceita,
  calcularTotaisReceita,
} from "./precificacao";
import {
  listarGrupos,
  salvarGrupo,
  excluirGrupo,
  listarSubgrupos,
  salvarSubgrupo,
  excluirSubgrupo,
  listarFornecedores,
  obterFornecedor,
  salvarFornecedor,
  excluirFornecedor,
  proximoCodigoFornecedor,
  listarClientes,
  obterCliente,
  salvarCliente,
  excluirCliente,
  proximoCodigoCliente,
  listarProdutos,
  obterProduto,
  salvarProduto,
  excluirProduto,
  proximoCodigoProduto,
  listarTiposItem,
  salvarTipoItem,
  excluirTipoItem,
  listarHistoricoCustoProduto,
} from "./cadastros";
import { executarProducao, listarProducoes } from "./producao";
import { listarCompras, parseNfeXml, registrarEntradaNota } from "./compras";
import { migrate } from "./db/migrate";
import { seed } from "./db/seed";

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT ? Number(process.env.PORT) : 5181;
const COOKIE = "dg_sid";
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || "dg_master_secret_key_2026";

/**
 * [FUNÇÕES UTILITÁRIAS DE DATA]
 */
function localISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftDays(iso: string, days: number) {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + days);
  return localISODate(date);
}

function shiftMonths(iso: string, months: number) {
  const date = new Date(`${iso}T12:00:00`);
  date.setMonth(date.getMonth() + months);
  return localISODate(date);
}

type AuthedRequest = Request & { usuario?: Awaited<ReturnType<typeof obterUsuarioPorSessao>> };

/**
 * [MIDDLEWARE: requireAuth]
 * Valida o cookie dg_sid e anexa os dados do usuário autenticado no objeto da requisição (req.usuario).
 */
async function requireAuth(req: AuthedRequest, res: Response, next: () => void) {
  const usuario = await obterUsuarioPorSessao(req.cookies[COOKIE]);
  if (!usuario) {
    res.status(401).json({ erro: "Não autenticado" });
    return;
  }
  req.usuario = usuario;
  next();
}

/**
 * [MIDDLEWARE: requireActiveLicense]
 * Validação de Tenant & Licença em tempo real.
 * Usuários com perfil 'master' nunca são bloqueados. Confeitarias bloqueadas ou com prazo
 * expirado recebem resposta 403 Forbidden imediata.
 */
async function requireActiveLicense(req: AuthedRequest, res: Response, next: () => void) {
  if (req.usuario?.perfil === "master" || req.usuario?.perfil === "superadmin") {
    return next();
  }
  const acesso = await verificarAcessoEmpresa(req.usuario!.empresaId);
  if (!acesso.permitido) {
    res.status(403).json({
      erro: "EMPRESA_BLOQUEADA",
      status: acesso.status,
      mensagem: acesso.motivo || "O acesso da sua empresa está suspenso ou a licença expirou.",
    });
    return;
  }
  next();
}

/**
 * [MIDDLEWARE: requireAdminAuth]
 * Controle de acesso mestre. Aceita:
 * 1. Chave de API externa via header X-Admin-Api-Key ou Authorization Bearer.
 * 2. Sessão autenticada de usuário com perfil 'master' no navegador.
 */
async function requireAdminAuth(req: Request, res: Response, next: () => void) {
  const headerKey = req.headers["x-admin-api-key"] as string | undefined;
  const authHeader = req.headers["authorization"];
  const bearerKey = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : undefined;
  const providedKey = headerKey || bearerKey;

  if (providedKey && providedKey === ADMIN_API_KEY) {
    return next();
  }

  const usuario = await obterUsuarioPorSessao(req.cookies[COOKIE]);
  if (usuario && (usuario.perfil === "master" || usuario.perfil === "superadmin")) {
    (req as AuthedRequest).usuario = usuario;
    return next();
  }

  res.status(403).json({
    erro: "ACESSO_ADMIN_NEGADO",
    mensagem: "Acesso restrito ao Administrador do Sistema. Chave de API inválida ou usuário sem permissão.",
  });
}

/**
 * [INICIALIZAÇÃO DO SERVIDOR]
 */
async function start() {
  // Executa migrações de banco e seeding inicial
  await migrate();
  await seed();

  const app = express();
  app.use(cors({ origin: ["http://localhost:5180", "http://127.0.0.1:5180"], credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  // Health check de monitoramento
  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  // ============================================================================
  // DOMÍNIO: AUTENTICAÇÃO E CONTA
  // ============================================================================

  // Login de usuário (suporta login ou e-mail)
  app.post("/api/auth/login", async (req, res) => {
    const login = String(req.body?.login ?? "").trim();
    const senha = String(req.body?.senha ?? "");
    if (!login || !senha) {
      res.status(400).json({ erro: "Informe usuário/e-mail e senha." });
      return;
    }
    const usuario = await autenticar(login, senha);
    if (!usuario) {
      res.status(401).json({ erro: "Usuário/e-mail ou senha inválidos." });
      return;
    }

    // Bloqueia tentativa de login caso a empresa esteja suspensa
    if (usuario.perfil !== "master" && usuario.perfil !== "superadmin") {
      const acesso = await verificarAcessoEmpresa(usuario.empresaId);
      if (!acesso.permitido) {
        res.status(403).json({
          erro: "EMPRESA_BLOQUEADA",
          mensagem: acesso.motivo || "O acesso desta confeitaria está suspenso.",
        });
        return;
      }
    }

    const sessaoId = await criarSessao(usuario.id, req.body?.lembrar ? 30 : 1);
    res.cookie(COOKIE, sessaoId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: (req.body?.lembrar ? 30 : 1) * 24 * 60 * 60 * 1000,
    });
    res.json({ usuario });
  });

  // Auto-cadastro (self-service) para confeitarias piloto com 15 dias de Trial
  app.post("/api/auth/registrar", async (req, res) => {
    const nomeCompleto = String(req.body?.nomeCompleto ?? "").trim();
    const nomeAtelie = String(req.body?.nomeAtelie ?? "").trim();
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const telefone = String(req.body?.telefone ?? "").trim();
    const senha = String(req.body?.senha ?? "").trim();

    if (!nomeCompleto) {
      res.status(400).json({ erro: "Informe o seu nome completo." });
      return;
    }
    if (!nomeAtelie) {
      res.status(400).json({ erro: "Informe o nome do seu ateliê ou confeitaria." });
      return;
    }
    if (!email || !email.includes("@")) {
      res.status(400).json({ erro: "Informe um e-mail válido para ser usado como login." });
      return;
    }
    if (!telefone) {
      res.status(400).json({ erro: "Informe seu WhatsApp ou telefone de contato." });
      return;
    }
    if (senha.length < 4) {
      res.status(400).json({ erro: "A senha deve ter no mínimo 4 caracteres." });
      return;
    }

    const result = await criarEmpresaAdmin({
      nome: nomeAtelie,
      email,
      telefone,
      nomeCompletoUsuario: nomeCompleto,
      plano: "trial",
      diasValidade: 15,
      senhaAdmin: senha,
    });

    if ("erro" in result) {
      res.status(400).json({ erro: result.erro });
      return;
    }

    // Login automático pós-cadastro
    const usuario = await autenticar(email, senha);
    if (usuario) {
      const sessaoId = await criarSessao(usuario.id, 15);
      res.cookie(COOKIE, sessaoId, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 15 * 24 * 60 * 60 * 1000,
      });
      res.status(201).json({ ok: true, usuario });
      return;
    }

    res.status(201).json({ ok: true, ...result });
  });

  // Identificação do usuário da sessão atual
  app.get("/api/auth/me", async (req, res) => {
    const usuario = await obterUsuarioPorSessao(req.cookies[COOKIE]);
    if (!usuario) {
      res.status(401).json({ erro: "Não autenticado" });
      return;
    }
    res.json({ usuario });
  });

  // Encerramento de sessão
  app.post("/api/auth/logout", async (req, res) => {
    await encerrarSessao(req.cookies[COOKIE]);
    res.clearCookie(COOKIE, { path: "/" });
    res.json({ ok: true });
  });

  // Dados da licença e Ficha Cadastral da confeitaria logada
  app.get("/api/empresa/licenca", requireAuth, async (req: AuthedRequest, res) => {
    const empresa = await obterEmpresaAdmin(req.usuario!.empresaId);
    if (!empresa) {
      res.status(404).json({ erro: "Empresa não encontrada." });
      return;
    }
    res.json({ licenca: empresa });
  });

  // Obter Ficha Cadastral da Empresa logada
  app.get("/api/empresa/dados", requireAuth, async (req: AuthedRequest, res) => {
    const empresa = await obterEmpresaAdmin(req.usuario!.empresaId);
    if (!empresa) {
      res.status(404).json({ erro: "Empresa não encontrada." });
      return;
    }
    res.json({ empresa });
  });

  // Atualizar Ficha Cadastral da Empresa logada
  app.put("/api/empresa/dados", requireAuth, async (req: AuthedRequest, res) => {
    try {
      const atualizada = await atualizarFichaEmpresa(req.usuario!.empresaId, req.body ?? {});
      res.json({ ok: true, empresa: atualizada });
    } catch (e: any) {
      res.status(500).json({ erro: e?.message || "Erro ao salvar dados da empresa." });
    }
  });

  // Consulta e auto-preenchimento de dados de CNPJ via API pública
  app.get("/api/cnpj/:cnpj", requireAuth, async (req: AuthedRequest, res) => {
    const resultado = await consultarCnpj(String(req.params.cnpj));
    if (!resultado.ok) {
      res.status(400).json({ erro: resultado.erro });
      return;
    }
    res.json(resultado.dados);
  });

  // ============================================================================
  // DOMÍNIO: PAINEL ADMINISTRATIVO MASTER & API EXTERNA
  // ============================================================================

  // Listagem de todas as confeitarias cadastradas
  app.get("/api/admin/empresas", requireAdminAuth, async (_req, res) => {
    const empresas = await listarEmpresasAdmin();
    res.json({ empresas });
  });

  // Cadastro de empresa por via administrativa
  app.post("/api/admin/empresas", requireAdminAuth, async (req, res) => {
    const result = await criarEmpresaAdmin(req.body ?? {});
    if ("erro" in result) {
      res.status(400).json({ erro: result.erro });
      return;
    }
    res.status(201).json(result);
  });

  // Detalhes de uma empresa específica
  app.get("/api/admin/empresas/:id", requireAdminAuth, async (req, res) => {
    const empresa = await obterEmpresaAdmin(Number(req.params.id));
    if (!empresa) {
      res.status(404).json({ erro: "Empresa não encontrada." });
      return;
    }
    res.json({ empresa });
  });

  // Alteração de status: Bloquear ou Liberar acesso
  app.patch("/api/admin/empresas/:id/status", requireAdminAuth, async (req, res) => {
    const id = Number(req.params.id);
    const status = req.body?.status as "ativa" | "bloqueada" | "trial";
    const motivo = req.body?.motivo ? String(req.body.motivo) : undefined;
    const diasValidade = req.body?.diasValidade ? Number(req.body.diasValidade) : undefined;

    if (!status || !["ativa", "bloqueada", "trial"].includes(status)) {
      res.status(400).json({ erro: "Status inválido. Use 'ativa', 'bloqueada' ou 'trial'." });
      return;
    }

    const result = await alterarStatusEmpresa(id, status, motivo, diasValidade);
    res.json(result);
  });

  // Prorrogação de licença (+30 dias, +90 dias, etc.)
  app.post("/api/admin/empresas/:id/prorrogar", requireAdminAuth, async (req, res) => {
    const id = Number(req.params.id);
    const dias = Number(req.body?.dias ?? 30);
    const plano = req.body?.plano ? String(req.body.plano) : undefined;

    const result = await prorrogarLicencaEmpresa(id, dias, plano);
    if ("erro" in result) {
      res.status(400).json({ erro: result.erro });
      return;
    }
    res.json(result);
  });

  // Geração de nova chave serial
  app.post("/api/admin/empresas/:id/serial", requireAdminAuth, async (req, res) => {
    const id = Number(req.params.id);
    const plano = req.body?.plano ? String(req.body.plano) : undefined;
    const result = await renovarSerialEmpresa(id, plano);
    res.json(result);
  });

  // ============================================================================
  // DOMÍNIO: OPERAÇÃO DA CONFEITARIA (PROTEGIDO POR AUTENTICAÇÃO E LICENÇA)
  // ============================================================================

  // Estados federativos
  app.get("/api/estados", requireAuth, requireActiveLicense, async (_req, res) => {
    res.json({ estados: await listarEstados() });
  });

  // Cidades do estado
  app.get("/api/cidades", requireAuth, requireActiveLicense, async (req, res) => {
    const ufId = Number(req.query.ufId);
    if (!ufId) {
      res.status(400).json({ erro: "Informe a UF." });
      return;
    }
    try {
      res.json({ cidades: await listarCidades(ufId) });
    } catch (error) {
      res.status(502).json({
        erro: error instanceof Error ? error.message : "Não foi possível carregar as cidades.",
      });
    }
  });

  // Consulta e autopreenchimento de CEP
  app.get("/api/cep/:cep", requireAuth, requireActiveLicense, async (req, res) => {
    try {
      const result = await consultarCep(String(req.params.cep));
      if (!result.ok) {
        res.status(400).json({ erro: result.erro });
        return;
      }
      res.json(result);
    } catch {
      res.status(502).json({ erro: "Não foi possível consultar o CEP agora." });
    }
  });

  // Listagem de colaboradores da empresa
  app.get("/api/funcionarios", requireAuth, requireActiveLicense, async (req: AuthedRequest, res) => {
    const empresaId = req.usuario!.empresaId;
    const [funcionarios, codigo] = await Promise.all([
      listarFuncionarios(empresaId),
      proximoCodigo(empresaId),
    ]);
    res.json({ funcionarios, proximoCodigo: codigo });
  });

  // Obtenção de colaborador individual
  app.get("/api/funcionarios/:id", requireAuth, requireActiveLicense, async (req: AuthedRequest, res) => {
    const funcionario = await obterFuncionario(req.usuario!.empresaId, Number(req.params.id));
    if (!funcionario) {
      res.status(404).json({ erro: "Funcionário não encontrado." });
      return;
    }
    res.json({ funcionario });
  });

  // Cadastro de novo colaborador
  app.post("/api/funcionarios", requireAuth, requireActiveLicense, async (req: AuthedRequest, res) => {
    const result = await criarFuncionario(req.usuario!.empresaId, req.body ?? {});
    if (result && "erro" in result) {
      res.status(400).json({ erro: result.erro });
      return;
    }
    res.status(201).json({ funcionario: result });
  });

  // Atualização de colaborador
  app.put("/api/funcionarios/:id", requireAuth, requireActiveLicense, async (req: AuthedRequest, res) => {
    const result = await atualizarFuncionario(
      req.usuario!.empresaId,
      Number(req.params.id),
      req.body ?? {},
    );
    if (result && "erro" in result) {
      res.status(400).json({ erro: result.erro });
      return;
    }
    res.json({ funcionario: result });
  });

  // Métricas do Dashboard (dia, mês, ano, variações e sparklines)
  app.get("/api/dashboard/resumo", requireAuth, requireActiveLicense, async (req: AuthedRequest, res) => {
    const empresaId = req.usuario!.empresaId;
    const hoje = localISODate(new Date());
    const inicioMes = `${hoje.slice(0, 7)}-01`;
    const inicioAno = `${hoje.slice(0, 4)}-01-01`;
    const ontem = shiftDays(hoje, -1);
    const inicioMesAnterior = shiftMonths(inicioMes, -1);
    const mesmoDiaMesAnterior = shiftMonths(hoje, -1);
    const inicioAnoAnterior = `${Number(hoje.slice(0, 4)) - 1}-01-01`;
    const mesmoDiaAnoAnterior = `${Number(hoje.slice(0, 4)) - 1}${hoje.slice(4)}`;
    const inicioSerie = shiftMonths(inicioMes, -11);
    const inicioSparkDia = shiftDays(hoje, -6);
    const [
      dia,
      mes,
      ano,
      diaAnterior,
      mesAnterior,
      anoAnterior,
      gruposAno,
      serieMensal,
      sparkDia,
      sparkMes,
    ] = await Promise.all([
      resumoPeriodo(empresaId, hoje, hoje),
      resumoPeriodo(empresaId, inicioMes, hoje),
      resumoPeriodo(empresaId, inicioAno, hoje),
      resumoPeriodo(empresaId, ontem, ontem),
      resumoPeriodo(empresaId, inicioMesAnterior, mesmoDiaMesAnterior),
      resumoPeriodo(empresaId, inicioAnoAnterior, mesmoDiaAnoAnterior),
      vendasPorGrupo(empresaId, inicioAno, hoje),
      evolucaoMensal(empresaId, inicioSerie),
      evolucaoDiaria(empresaId, inicioSparkDia, hoje),
      evolucaoDiaria(empresaId, inicioMes, hoje),
    ]);
    res.json({
      dia,
      mes,
      ano,
      variacao: {
        dia: variacao(dia.valor, diaAnterior.valor),
        mes: variacao(mes.valor, mesAnterior.valor),
        ano: variacao(ano.valor, anoAnterior.valor),
      },
      sparks: {
        dia: sparkDia,
        mes: sparkMes.slice(-8),
        ano: serieMensal.map((ponto) => ponto.valor).slice(-8),
      },
      gruposAno,
      serieMensal,
    });
  });

  // Filtro de Dashboard por período customizado
  app.get("/api/dashboard/periodo", requireAuth, requireActiveLicense, async (req: AuthedRequest, res) => {
    const empresaId = req.usuario!.empresaId;
    const de = String(req.query.de ?? "").slice(0, 10);
    const ate = String(req.query.ate ?? "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(de) || !/^\d{4}-\d{2}-\d{2}$/.test(ate)) {
      res.status(400).json({ erro: "Informe o período inicial e final." });
      return;
    }
    if (de > ate) {
      res.status(400).json({ erro: "A data inicial não pode ser maior que a final." });
      return;
    }
    const [resumo, grupos] = await Promise.all([
      resumoPeriodo(empresaId, de, ate),
      vendasPorGrupo(empresaId, de, ate),
    ]);
    res.json({ resumo, grupos });
  });

  // Indicadores do dia e aniversariantes
  app.get("/api/dashboard/hoje", requireAuth, requireActiveLicense, async (req: AuthedRequest, res) => {
    const empresaId = req.usuario!.empresaId;
    const hoje = localISODate(new Date());
    const [aniversariantes, mensagem] = await Promise.all([
      aniversariantesDoDia(empresaId, hoje),
      obterMensagem(empresaId, "aniversario"),
    ]);
    res.json({
      aniversariantes,
      mensagemAniversario: mensagem,
      empresaNome: req.usuario!.empresaNome,
    });
  });

  // Listagem de templates de mensagens
  app.get("/api/mensagens", requireAuth, requireActiveLicense, async (req: AuthedRequest, res) => {
    res.json({ mensagens: await listarMensagens(req.usuario!.empresaId) });
  });

  // Atualização de template de mensagem
  app.put("/api/mensagens/:chave", requireAuth, requireActiveLicense, async (req: AuthedRequest, res) => {
    const result = await salvarMensagem(
      req.usuario!.empresaId,
      String(req.params.chave),
      String(req.body?.titulo ?? ""),
      String(req.body?.texto ?? ""),
    );
    if (result && "erro" in result) {
      res.status(400).json({ erro: result.erro });
      return;
    }
    res.json({ mensagem: result });
  });

  /**
   * ============================================================================
   * [FASE 1: ROTAS DE INSUMOS & GESTÃO DE ESTOQUE DE MATÉRIAS-PRIMAS]
   * ============================================================================
   */

  // Listagem de insumos da empresa
  app.get("/api/insumos", requireAuth, requireActiveLicense, async (req: AuthedRequest, res) => {
    try {
      const insumos = await listarInsumos(req.usuario!.empresaId);
      res.json({ insumos });
    } catch (e: any) {
      res.status(500).json({ erro: e?.message || "Erro ao listar insumos" });
    }
  });

  // Cadastro ou edição de insumo
  app.post("/api/insumos", requireAuth, requireActiveLicense, async (req: AuthedRequest, res) => {
    try {
      const result = await salvarInsumo(req.usuario!.empresaId, req.body);
      if ("erro" in result) {
        res.status(400).json({ erro: result.erro });
        return;
      }
      res.json({ insumo: result });
    } catch (e: any) {
      res.status(500).json({ erro: e?.message || "Erro ao salvar insumo" });
    }
  });

  // Exclusão de insumo (com integridade referencial)
  app.delete("/api/insumos/:id", requireAuth, requireActiveLicense, async (req: AuthedRequest, res) => {
    try {
      const id = Number(req.params.id);
      if (!id) {
        res.status(400).json({ erro: "ID inválido" });
        return;
      }
      const result = await excluirInsumo(req.usuario!.empresaId, id);
      if ("erro" in result) {
        res.status(400).json({ erro: result.erro });
        return;
      }
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ erro: e?.message || "Erro ao excluir insumo" });
    }
  });

  /**
   * ============================================================================
   * [FASE 1: ROTAS DE FICHAS TÉCNICAS, RECEITAS & PRECIFICAÇÃO INTELIGENTE]
   * ============================================================================
   */

  // Listagem de receitas com métricas de precificação e custos completos
  app.get("/api/receitas", requireAuth, requireActiveLicense, async (req: AuthedRequest, res) => {
    try {
      const receitas = await listarReceitas(req.usuario!.empresaId);
      res.json({ receitas });
    } catch (e: any) {
      res.status(500).json({ erro: e?.message || "Erro ao listar receitas" });
    }
  });

  // Obtenção de uma receita específica
  app.get("/api/receitas/:id", requireAuth, requireActiveLicense, async (req: AuthedRequest, res) => {
    try {
      const id = Number(req.params.id);
      const receita = await obterReceita(req.usuario!.empresaId, id);
      if (!receita) {
        res.status(404).json({ erro: "Receita não encontrada" });
        return;
      }
      res.json({ receita });
    } catch (e: any) {
      res.status(500).json({ erro: e?.message || "Erro ao obter receita" });
    }
  });

  // Criação ou atualização de receita e seus itens
  app.post("/api/receitas", requireAuth, requireActiveLicense, async (req: AuthedRequest, res) => {
    try {
      const result = await salvarReceita(req.usuario!.empresaId, req.body);
      if ("erro" in result) {
        res.status(400).json({ erro: result.erro });
        return;
      }
      res.json({ receita: result });
    } catch (e: any) {
      res.status(500).json({ erro: e?.message || "Erro ao salvar receita" });
    }
  });

  // Exclusão de receita
  app.delete("/api/receitas/:id", requireAuth, requireActiveLicense, async (req: AuthedRequest, res) => {
    try {
      const id = Number(req.params.id);
      if (!id) {
        res.status(400).json({ erro: "ID inválido" });
        return;
      }
      const result = await excluirReceita(req.usuario!.empresaId, id);
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ erro: e?.message || "Erro ao excluir receita" });
    }
  });

  // Simulação rápida de precificação sem persistir
  app.post("/api/receitas/simular", requireAuth, requireActiveLicense, async (req: AuthedRequest, res) => {
    try {
      const { itens, tempoPreparoMinutos, custoHoraTrabalho, percentualCustosFixos, margemLucroDesejada, rendimentoQuantidade, precoVenda } = req.body;
      const metricas = calcularTotaisReceita(
        itens || [],
        Number(tempoPreparoMinutos || 60),
        Number(custoHoraTrabalho || 20),
        Number(percentualCustosFixos || 15),
        Number(margemLucroDesejada || 100),
        Number(rendimentoQuantidade || 1),
        Number(precoVenda || 0)
      );
      res.json({ metricas });
    } catch (e: any) {
      res.status(500).json({ erro: e?.message || "Erro ao simular precificação" });
    }
  });

  /**
   * ============================================================================
   * [FASE 1: ROTAS DE CADASTROS PADRÃO (GRUPOS, SUBGRUPOS, FORNECEDORES, CLIENTES, PRODUTOS)]
   * ============================================================================
   */

  // --- GRUPOS DE PRODUTOS ---
  app.get("/api/grupos", requireAuth, requireActiveLicense, async (req: AuthedRequest, res) => {
    try {
      res.json({ grupos: await listarGrupos(req.usuario!.empresaId) });
    } catch (e: any) {
      res.status(500).json({ erro: e?.message || "Erro ao listar grupos" });
    }
  });

  app.post("/api/grupos", requireAuth, requireActiveLicense, async (req: AuthedRequest, res) => {
    try {
      const result = await salvarGrupo(req.usuario!.empresaId, req.body);
      if ("erro" in result) {
        res.status(400).json({ erro: result.erro });
        return;
      }
      res.json({ grupo: result });
    } catch (e: any) {
      res.status(500).json({ erro: e?.message || "Erro ao salvar grupo" });
    }
  });

  app.delete("/api/grupos/:id", requireAuth, requireActiveLicense, async (req: AuthedRequest, res) => {
    try {
      const result = await excluirGrupo(req.usuario!.empresaId, Number(req.params.id));
      if ("erro" in result) {
        res.status(400).json({ erro: result.erro });
        return;
      }
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ erro: e?.message || "Erro ao excluir grupo" });
    }
  });

  // --- SUBGRUPOS DE PRODUTOS ---
  app.get("/api/subgrupos", requireAuth, requireActiveLicense, async (req: AuthedRequest, res) => {
    try {
      const grupoId = req.query.grupoId ? Number(req.query.grupoId) : undefined;
      res.json({ subgrupos: await listarSubgrupos(req.usuario!.empresaId, grupoId) });
    } catch (e: any) {
      res.status(500).json({ erro: e?.message || "Erro ao listar subgrupos" });
    }
  });

  app.post("/api/subgrupos", requireAuth, requireActiveLicense, async (req: AuthedRequest, res) => {
    try {
      const result = await salvarSubgrupo(req.usuario!.empresaId, req.body);
      if ("erro" in result) {
        res.status(400).json({ erro: result.erro });
        return;
      }
      res.json({ subgrupo: result });
    } catch (e: any) {
      res.status(500).json({ erro: e?.message || "Erro ao salvar subgrupo" });
    }
  });

  app.delete("/api/subgrupos/:id", requireAuth, requireActiveLicense, async (req: AuthedRequest, res) => {
    try {
      const result = await excluirSubgrupo(req.usuario!.empresaId, Number(req.params.id));
      if ("erro" in result) {
        res.status(400).json({ erro: result.erro });
        return;
      }
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ erro: e?.message || "Erro ao excluir subgrupo" });
    }
  });

  // --- FORNECEDORES ---
  app.get("/api/fornecedores/proximo-codigo", requireAuth, requireActiveLicense, async (req: AuthedRequest, res) => {
    try {
      res.json({ proximoCodigo: await proximoCodigoFornecedor(req.usuario!.empresaId) });
    } catch (e: any) {
      res.status(500).json({ erro: e?.message || "Erro ao gerar código de fornecedor" });
    }
  });

  app.get("/api/fornecedores", requireAuth, requireActiveLicense, async (req: AuthedRequest, res) => {
    try {
      res.json({ fornecedores: await listarFornecedores(req.usuario!.empresaId) });
    } catch (e: any) {
      res.status(500).json({ erro: e?.message || "Erro ao listar fornecedores" });
    }
  });

  app.get("/api/fornecedores/:id", requireAuth, requireActiveLicense, async (req: AuthedRequest, res) => {
    try {
      const fornecedor = await obterFornecedor(req.usuario!.empresaId, Number(req.params.id));
      if (!fornecedor) {
        res.status(404).json({ erro: "Fornecedor não encontrado" });
        return;
      }
      res.json({ fornecedor });
    } catch (e: any) {
      res.status(500).json({ erro: e?.message || "Erro ao obter fornecedor" });
    }
  });

  app.post("/api/fornecedores", requireAuth, requireActiveLicense, async (req: AuthedRequest, res) => {
    try {
      const result = await salvarFornecedor(req.usuario!.empresaId, req.body);
      if ("erro" in result) {
        res.status(400).json({ erro: result.erro });
        return;
      }
      res.json({ fornecedor: result });
    } catch (e: any) {
      res.status(500).json({ erro: e?.message || "Erro ao salvar fornecedor" });
    }
  });

  app.delete("/api/fornecedores/:id", requireAuth, requireActiveLicense, async (req: AuthedRequest, res) => {
    try {
      const result = await excluirFornecedor(req.usuario!.empresaId, Number(req.params.id));
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ erro: e?.message || "Erro ao excluir fornecedor" });
    }
  });

  // --- CLIENTES ---
  app.get("/api/clientes/proximo-codigo", requireAuth, requireActiveLicense, async (req: AuthedRequest, res) => {
    try {
      res.json({ proximoCodigo: await proximoCodigoCliente(req.usuario!.empresaId) });
    } catch (e: any) {
      res.status(500).json({ erro: e?.message || "Erro ao gerar código de cliente" });
    }
  });

  app.get("/api/clientes", requireAuth, requireActiveLicense, async (req: AuthedRequest, res) => {
    try {
      res.json({ clientes: await listarClientes(req.usuario!.empresaId) });
    } catch (e: any) {
      res.status(500).json({ erro: e?.message || "Erro ao listar clientes" });
    }
  });

  app.get("/api/clientes/:id", requireAuth, requireActiveLicense, async (req: AuthedRequest, res) => {
    try {
      const cliente = await obterCliente(req.usuario!.empresaId, Number(req.params.id));
      if (!cliente) {
        res.status(404).json({ erro: "Cliente não encontrado" });
        return;
      }
      res.json({ cliente });
    } catch (e: any) {
      res.status(500).json({ erro: e?.message || "Erro ao obter cliente" });
    }
  });

  app.post("/api/clientes", requireAuth, requireActiveLicense, async (req: AuthedRequest, res) => {
    try {
      const result = await salvarCliente(req.usuario!.empresaId, req.body);
      if ("erro" in result) {
        res.status(400).json({ erro: result.erro });
        return;
      }
      res.json({ cliente: result });
    } catch (e: any) {
      res.status(500).json({ erro: e?.message || "Erro ao salvar cliente" });
    }
  });

  app.delete("/api/clientes/:id", requireAuth, requireActiveLicense, async (req: AuthedRequest, res) => {
    try {
      const result = await excluirCliente(req.usuario!.empresaId, Number(req.params.id));
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ erro: e?.message || "Erro ao excluir cliente" });
    }
  });

  // --- PRODUTOS (COM FICHA TÉCNICA EMBUTIDA) ---
  app.get("/api/produtos/proximo-codigo", requireAuth, requireActiveLicense, async (req: AuthedRequest, res) => {
    try {
      res.json({ proximoCodigo: await proximoCodigoProduto(req.usuario!.empresaId) });
    } catch (e: any) {
      res.status(500).json({ erro: e?.message || "Erro ao gerar código de produto" });
    }
  });

  app.get("/api/produtos", requireAuth, requireActiveLicense, async (req: AuthedRequest, res) => {
    try {
      res.json({ produtos: await listarProdutos(req.usuario!.empresaId) });
    } catch (e: any) {
      res.status(500).json({ erro: e?.message || "Erro ao listar produtos" });
    }
  });

  app.get("/api/produtos/:id", requireAuth, requireActiveLicense, async (req: AuthedRequest, res) => {
    try {
      const produto = await obterProduto(req.usuario!.empresaId, Number(req.params.id));
      if (!produto) {
        res.status(404).json({ erro: "Produto não encontrado" });
        return;
      }
      res.json({ produto });
    } catch (e: any) {
      res.status(500).json({ erro: e?.message || "Erro ao obter produto" });
    }
  });

  app.post("/api/produtos", requireAuth, requireActiveLicense, async (req: AuthedRequest, res) => {
    try {
      const result = await salvarProduto(req.usuario!.empresaId, req.body);
      if ("erro" in result) {
        res.status(400).json({ erro: result.erro });
        return;
      }
      res.json({ produto: result });
    } catch (e: any) {
      res.status(500).json({ erro: e?.message || "Erro ao salvar produto" });
    }
  });

  app.delete("/api/produtos/:id", requireAuth, requireActiveLicense, async (req: AuthedRequest, res) => {
    try {
      const result = await excluirProduto(req.usuario!.empresaId, Number(req.params.id));
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ erro: e?.message || "Erro ao excluir produto" });
    }
  });

  // [FASE 1: HISTÓRICO DE EVOLUÇÃO DE CUSTO DO PRODUTO]
  app.get("/api/produtos/:id/historico-custo", requireAuth, requireActiveLicense, async (req: AuthedRequest, res) => {
    try {
      const { de, ate } = req.query as { de?: string; ate?: string };
      const historico = await listarHistoricoCustoProduto(
        req.usuario!.empresaId,
        Number(req.params.id),
        de,
        ate
      );
      res.json({ historico });
    } catch (e: any) {
      res.status(500).json({ erro: e?.message || "Erro ao consultar histórico de custo" });
    }
  });

  // [FASE 1: TIPOS DE ITEM (Insumo, Embalagem, Acabado, Revenda, Semi-acabado)]
  app.get("/api/tipos-item", requireAuth, requireActiveLicense, async (req: AuthedRequest, res) => {
    try {
      res.json({ tiposItem: await listarTiposItem(req.usuario!.empresaId) });
    } catch (e: any) {
      res.status(500).json({ erro: e?.message || "Erro ao listar tipos de item" });
    }
  });

  app.post("/api/tipos-item", requireAuth, requireActiveLicense, async (req: AuthedRequest, res) => {
    try {
      const result = await salvarTipoItem(req.usuario!.empresaId, req.body);
      if ("erro" in result) {
        res.status(400).json({ erro: result.erro });
        return;
      }
      res.json({ tipoItem: result });
    } catch (e: any) {
      res.status(500).json({ erro: e?.message || "Erro ao salvar tipo de item" });
    }
  });

  app.delete("/api/tipos-item/:id", requireAuth, requireActiveLicense, async (req: AuthedRequest, res) => {
    try {
      const result = await excluirTipoItem(req.usuario!.empresaId, Number(req.params.id));
      if ("erro" in result) {
        res.status(400).json({ erro: result.erro });
        return;
      }
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ erro: e?.message || "Erro ao excluir tipo de item" });
    }
  });

  // ============================================================================
  // MÓDULO: PRODUÇÃO (ORDENS DE PRODUÇÃO, BAIXA DE MATÉRIA-PRIMA E ENTRADA DE ACABADO)
  // ============================================================================
  app.get("/api/producao", requireAuth, requireActiveLicense, async (req: AuthedRequest, res) => {
    try {
      const lista = await listarProducoes(req.usuario!.empresaId);
      res.json({ producoes: lista });
    } catch (e: any) {
      res.status(500).json({ erro: e?.message || "Erro ao listar ordens de produção" });
    }
  });

  app.post("/api/producao/executar", requireAuth, requireActiveLicense, async (req: AuthedRequest, res) => {
    try {
      const result = await executarProducao(req.usuario!.empresaId, req.body);
      if ("erro" in result) {
        res.status(400).json({ erro: result.erro });
        return;
      }
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ erro: e?.message || "Erro ao executar ordem de produção" });
    }
  });

  // ============================================================================
  // MÓDULO: COMPRAS & ENTRADA DE ESTOQUE (NOTA FISCAL & IMPORTAÇÃO XML)
  // ============================================================================
  app.get("/api/compras", requireAuth, requireActiveLicense, async (req: AuthedRequest, res) => {
    try {
      const lista = await listarCompras(req.usuario!.empresaId);
      res.json({ compras: lista });
    } catch (e: any) {
      res.status(500).json({ erro: e?.message || "Erro ao listar notas fiscais de compras" });
    }
  });

  app.post("/api/compras", requireAuth, requireActiveLicense, async (req: AuthedRequest, res) => {
    try {
      const result = await registrarEntradaNota(req.usuario!.empresaId, req.body);
      if ("erro" in result) {
        res.status(400).json({ erro: result.erro });
        return;
      }
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ erro: e?.message || "Erro ao registrar entrada de nota" });
    }
  });

  app.post("/api/compras/parse-xml", requireAuth, requireActiveLicense, async (req: AuthedRequest, res) => {
    try {
      const xmlString = String(req.body?.xmlContent ?? "");
      if (!xmlString) {
        res.status(400).json({ erro: "Conteúdo XML não fornecido." });
        return;
      }
      const parsed = parseNfeXml(xmlString);
      res.json(parsed);
    } catch (e: any) {
      res.status(500).json({ erro: e?.message || "Erro ao processar XML de nota fiscal" });
    }
  });

  // ============================================================================
  // PRODUÇÃO: SERVIR ARQUIVOS ESTÁTICOS DO VITE (SPA FALLBACK)
  // ============================================================================
  const distPath = path.resolve(__dirname, "../dist");
  app.use(express.static(distPath));

  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api/")) {
      return next();
    }
    res.sendFile(path.join(distPath, "index.html"), (err) => {
      if (err) {
        next();
      }
    });
  });

  // Inicialização do servidor HTTP
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`API Doce Gestor em execução na porta ${PORT}`);
    console.log(`[Segurança] Chave Mestre de Integração API configurada.`);
  });
}

start().catch((error) => {
  console.error("Falha ao iniciar a API local", error);
  process.exit(1);
});
