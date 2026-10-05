import os
import subprocess

edge_exe = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
doc_dir = r"Documentos"
os.makedirs(doc_dir, exist_ok=True)

# ==============================================================================
# 1. ARQUITETURA DO PROJETO (HTML & PDF)
# ==============================================================================
html_arquitetura = """<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Arquitetura do Projeto — Doce Gestor</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Playfair+Display:wght@700&family=JetBrains+Mono:wght@400;600&display=swap');
    
    :root {
      --primary: #b33951;
      --secondary: #8c533e;
      --accent: #d4954a;
      --dark: #231c19;
      --muted: #665b55;
      --border: #e6dbd4;
      --bg-page: #ffffff;
      --code-bg: #26201e;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      color: var(--dark);
      background: #faf8f6;
      line-height: 1.6;
      padding: 30px;
      font-size: 13px;
    }

    .doc-container {
      max-width: 900px;
      margin: 0 auto;
      background: #ffffff;
      padding: 48px 56px;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.06);
    }

    .header {
      border-bottom: 2px solid var(--border);
      padding-bottom: 20px;
      margin-bottom: 30px;
    }

    .repo-badge {
      display: inline-block;
      background: #fbf0f2;
      color: var(--primary);
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 10px;
    }

    h1 {
      font-family: 'Playfair Display', serif;
      font-size: 28px;
      color: var(--primary);
      margin-bottom: 6px;
    }

    .subtitle {
      font-size: 14px;
      color: var(--secondary);
      font-weight: 500;
    }

    .github-link {
      display: block;
      margin-top: 8px;
      font-size: 12px;
      color: #0366d6;
      font-weight: 600;
      text-decoration: none;
    }

    h2 {
      font-size: 18px;
      color: var(--dark);
      border-left: 4px solid var(--primary);
      padding-left: 10px;
      margin-top: 30px;
      margin-bottom: 14px;
    }

    h3 {
      font-size: 14px;
      color: var(--secondary);
      margin-top: 18px;
      margin-bottom: 8px;
    }

    p { margin-bottom: 12px; color: #423833; }

    ul, ol { margin-left: 20px; margin-bottom: 14px; color: #423833; }
    li { margin-bottom: 4px; }

    .highlight-card {
      background: #fdf8f6;
      border: 1px solid #ebdcd5;
      border-radius: 8px;
      padding: 16px 20px;
      margin: 16px 0;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
      font-size: 12px;
    }

    th {
      background: #f5ebe6;
      color: var(--secondary);
      text-align: left;
      padding: 8px 12px;
      border: 1px solid var(--border);
      font-weight: 700;
    }

    td {
      padding: 8px 12px;
      border: 1px solid var(--border);
      color: #38302c;
    }

    pre {
      background: var(--code-bg);
      color: #f5ede8;
      padding: 14px 18px;
      border-radius: 8px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11.5px;
      overflow-x: auto;
      margin: 14px 0;
      line-height: 1.45;
    }

    code {
      font-family: 'JetBrains Mono', monospace;
      background: #f4eae5;
      padding: 2px 5px;
      border-radius: 4px;
      font-size: 11.5px;
      color: var(--primary);
    }

    .footer {
      border-top: 1px solid var(--border);
      padding-top: 16px;
      margin-top: 40px;
      font-size: 11px;
      color: var(--muted);
      display: flex;
      justify-content: space-between;
    }

    @media print {
      body { background: none; padding: 0; }
      .doc-container { box-shadow: none; border-radius: 0; padding: 20px; max-width: 100%; }
      h2 { page-break-after: avoid; }
      pre, table, .highlight-card { page-break-inside: avoid; }
    }
  </style>
</head>
<body>

<div class="doc-container">
  <div class="header">
    <div class="repo-badge">Documentação de Engenharia</div>
    <h1>Doce Gestor — Arquitetura de Software do Projeto</h1>
    <div class="subtitle">Sistema SaaS Web Multiempresa Especializado para Confeitarias e Pequenos Negócios de Alimentação</div>
    <a class="github-link" href="https://github.com/junin1737/confeitaria" target="_blank">
      🔗 Repositório GitHub Oficial: https://github.com/junin1737/confeitaria
    </a>
  </div>

  <h2>1. Visão Geral e Modelo de Negócio</h2>
  <p>
    O <strong>Doce Gestor</strong> foi concebido como uma plataforma comercial de software como serviço (SaaS), desenvolvida para atender inicialmente confeiteiras que trabalham em casa (produção artesanal e encomendas) e preparada para escalar para confeitarias físicas, padarias e pequenos estabelecimentos de alimentação.
  </p>
  <p>
    Diferente de sistemas ERP genéricos que impõem barreiras contábeis e burocráticas complexas, o Doce Gestor foi desenhado sob o princípio de <strong>baixa fricção operacional</strong>: o foco central é resolver as dores reais do nicho, como formação de preço e custos por grama (fichas técnicas), gerenciamento visual de encomendas com controle de sinal (50%) e geração de cardápio digital público integrado ao WhatsApp.
  </p>

  <h2>2. Princípios Arquiteturais</h2>
  <ul>
    <li><strong>Isolamento Multi-Tenant Rigoroso:</strong> Todas as tabelas operacionais possuem a chave estrangeira <code>empresa_id</code>. Consultas nunca misturam dados de confeitarias concorrentes.</li>
    <li><strong>Portabilidade de Banco de Dados:</strong> O uso da biblioteca <code>@libsql/client</code> viabiliza desenvolvimento local com SQLite e migração para produção em nuvem distribuída (Turso Serverless) sem alterar nenhuma linha de SQL.</li>
    <li><strong>Modularidade e Baixo Acoplamento:</strong> A interface do usuário (SPA em React 19) e a lógica de negócios (API REST Express 5) operam desacopladas, preparando a arquitetura para suportar futuros aplicativos mobile (Flutter/React Native).</li>
    <li><strong>Preservação da Integridade Histórica:</strong> Alterações de preços de insumos, percentuais de comissão e demissões de funcionários nunca recalculam vendas, pedidos ou folhas de pagamento fechadas no passado.</li>
  </ul>

  <h2>3. Topologia e Stack Tecnológica</h2>
  <table>
    <thead>
      <tr>
        <th>Camada</th>
        <th>Tecnologia</th>
        <th>Propósito / Justificativa</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Frontend</strong></td>
        <td>React 19 + TypeScript + Vite 8</td>
        <td>SPA de alta velocidade, tipagem estática e reatividade nativa.</td>
      </tr>
      <tr>
        <td><strong>Ícones & Design</strong></td>
        <td>Lucide React + CSS Moderno</td>
        <td>Design system customizável com 10 temas prontos de confeitaria.</td>
      </tr>
      <tr>
        <td><strong>Backend API</strong></td>
        <td>Node.js + Express 5 + TSX</td>
        <td>API REST assíncrona, robusta e modular.</td>
      </tr>
      <tr>
        <td><strong>Banco de Dados</strong></td>
        <td>@libsql/client (SQLite / Turso)</td>
        <td>Base local de alto desempenho em dev e cluster global em prod.</td>
      </tr>
      <tr>
        <td><strong>Segurança & Cripto</strong></td>
        <td>BcryptJS + Tokens Criptográficos</td>
        <td>Armazenamento seguro de senhas com salt e sessões HttpOnly.</td>
      </tr>
      <tr>
        <td><strong>Controle de Versão</strong></td>
        <td>Git + GitHub</td>
        <td>Repositório oficial: <code>https://github.com/junin1737/confeitaria</code>.</td>
      </tr>
    </tbody>
  </table>

  <h2>4. Arquitetura Multi-Tenant & Modelo de Licenças</h2>
  <div class="highlight-card">
    <p><strong>Ciclo de Vida do Tenant:</strong></p>
    <ol>
      <li><strong>Registro Self-Service ou Administrativo:</strong> A confeiteira cria a conta informando e-mail, senha e nome do ateliê. Uma nova <code>tb_empresa</code> é inserida no status <code>ativa</code> com plano <code>trial</code> de 15 dias.</li>
      <li><strong>Geração de Chave Serial:</strong> Cada confeitaria recebe uma chave única no padrão <code>DG-XXXX-YYYY-ANO</code>.</li>
      <li><strong>Middleware de Licença Ativa (<code>requireActiveLicense</code>):</strong> A cada requisição nas rotas de negócio, o backend valida se <code>status != 'bloqueada'</code> e se a data <code>expira_em</code> é futura. Se vencido ou bloqueado, retorna <code>403 Forbidden</code> com mensagem amigável.</li>
      <li><strong>Acesso Master:</strong> O usuário administrador ('Master') possui perfil imune a bloqueios, acessando o Painel Master de Gestão.</li>
    </ol>
  </div>

  <h2>5. Diagrama do Modelo de Dados Relacional (ERD)</h2>
  <pre>
┌─────────────────────────────────┐
│           tb_empresa            │ (Tenant Raiz)
├─────────────────────────────────┤
│ id (PK)                         │
│ nome, email, telefone, documento│
│ status ('ativa','bloqueada',...)│
│ plano ('trial','mensal','anual')│
│ serial_key, expira_em, slug     │
└───────────────┬─────────────────┘
                │ 1:N
   ┌────────────┼───────────────────────────┬──────────────────────┐
   ▼            ▼                           ▼                      ▼
┌────────────┐ ┌──────────────────────┐ ┌──────────────────┐ ┌────────────────┐
│ tb_usuario │ │    tb_funcionario    │ │ tb_grupo_produto │ │  tb_mensagem   │
├────────────┤ ├──────────────────────┤ ├──────────────────┤ ├────────────────┤
│ id (PK)    │ │ id (PK)              │ │ id (PK)          │ │ id (PK)        │
│ empresa_id │ │ empresa_id           │ │ empresa_id       │ │ empresa_id     │
│ login      │ │ codigo (ex:FUNC-001) │ │ nome, cor        │ │ chave, titulo  │
│ senha_hash │ │ nome, cpf, celular   │ └────────┬─────────┘ │ texto          │
│ perfil     │ │ cep, uf_id, cidade_id│          │ 1:N       └────────────────┘
└─────┬──────┘ │ salario_fixo, status │          │
      │ 1:N    └──────────────────────┘          ▼
      ▼                                 ┌──────────────────┐
┌────────────┐                          │  tb_venda_grupo  │
│ tb_sessao  │                          ├──────────────────┤
├────────────┤                          │ id (PK)          │
│ id (token) │                          │ empresa_id       │
│ usuario_id │                          │ grupo_id         │
│ expira_em  │                          │ data, valor      │
└────────────┘                          │ custo, pedidos   │
                                        └──────────────────┘
  </pre>

  <h2>6. API REST de Integração Externa (Para Painéis do Cliente)</h2>
  <p>
    Para permitir que o proprietário do software bloqueie, libere ou crie confeitarias diretamente por outros sistemas externos ou gateways de pagamento, o backend expõe endpoints protegidos por Chave Mestre (<code>X-Admin-Api-Key</code>):
  </p>
  <ul>
    <li><code>GET /api/admin/empresas</code> — Retorna a lista de todas as confeitarias, status, seriais e saldo de dias restantes.</li>
    <li><code>POST /api/admin/empresas</code> — Provisiona uma nova confeitaria remotamente.</li>
    <li><code>PATCH /api/admin/empresas/:id/status</code> — Altera o status (ex: bloqueia por falta de pagamento ou libera).</li>
    <li><code>POST /api/admin/empresas/:id/prorrogar</code> — Adiciona dias de validade à licença (+30 dias, +365 dias).</li>
    <li><code>POST /api/admin/empresas/:id/serial</code> — Gera uma nova chave serial para o ateliê.</li>
  </ul>

  <h2>7. Próximas Fases e Roteiro de Implementação</h2>
  <table>
    <thead>
      <tr>
        <th>Etapa</th>
        <th>Módulo</th>
        <th>Entregáveis</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Fase 0 (Concluída)</strong></td>
        <td>Fundação SaaS & Admin</td>
        <td>Multi-tenant, Painel Master, Bloqueio em Tempo Real, Auto-cadastro Trial e Repositório Git.</td>
      </tr>
      <tr>
        <td><strong>Fase 1 (Próxima)</strong></td>
        <td>Insumos & Fichas Técnicas</td>
        <td>Conversão de unidades (g, kg, ml), custo por receita, custos invisíveis (gás/energia) e preço sugerido.</td>
      </tr>
      <tr>
        <td><strong>Fase 2</strong></td>
        <td>Cardápio Digital Público</td>
        <td>Página responsiva mobile-first (<code>/cardapio/:slug</code>) e envio de pedido formatado no WhatsApp.</td>
      </tr>
      <tr>
        <td><strong>Fase 3</strong></td>
        <td>Gestão de Encomendas</td>
        <td>Kanban de produção, agenda de entregas do fim de semana e lista consolidada de compras.</td>
      </tr>
      <tr>
        <td><strong>Fase 4</strong></td>
        <td>Financeiro & Equipe</td>
        <td>Fluxo de caixa, integração com comissões de funcionários por forma de pagamento e folha.</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    <span>Doce Gestor — Documentação de Arquitetura</span>
    <span>Repositório: https://github.com/junin1737/confeitaria</span>
  </div>
</div>

</body>
</html>
"""

# ==============================================================================
# 2. DOCUMENTAÇÃO DO CÓDIGO (HTML & PDF)
# ==============================================================================
html_codigo = """<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Documentação do Código — Doce Gestor</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Playfair+Display:wght@700&family=JetBrains+Mono:wght@400;600&display=swap');
    
    :root {
      --primary: #b33951;
      --secondary: #8c533e;
      --accent: #d4954a;
      --dark: #231c19;
      --muted: #665b55;
      --border: #e6dbd4;
      --bg-page: #ffffff;
      --code-bg: #26201e;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      color: var(--dark);
      background: #faf8f6;
      line-height: 1.6;
      padding: 30px;
      font-size: 13px;
    }

    .doc-container {
      max-width: 900px;
      margin: 0 auto;
      background: #ffffff;
      padding: 48px 56px;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.06);
    }

    .header {
      border-bottom: 2px solid var(--border);
      padding-bottom: 20px;
      margin-bottom: 30px;
    }

    .repo-badge {
      display: inline-block;
      background: #fbf0f2;
      color: var(--primary);
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 10px;
    }

    h1 {
      font-family: 'Playfair Display', serif;
      font-size: 28px;
      color: var(--primary);
      margin-bottom: 6px;
    }

    .subtitle {
      font-size: 14px;
      color: var(--secondary);
      font-weight: 500;
    }

    .github-link {
      display: block;
      margin-top: 8px;
      font-size: 12px;
      color: #0366d6;
      font-weight: 600;
      text-decoration: none;
    }

    h2 {
      font-size: 18px;
      color: var(--dark);
      border-left: 4px solid var(--primary);
      padding-left: 10px;
      margin-top: 32px;
      margin-bottom: 14px;
    }

    h3 {
      font-size: 14px;
      color: var(--secondary);
      margin-top: 20px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    p { margin-bottom: 12px; color: #423833; }

    ul { margin-left: 20px; margin-bottom: 14px; color: #423833; }
    li { margin-bottom: 4px; }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
      font-size: 12px;
    }

    th {
      background: #f5ebe6;
      color: var(--secondary);
      text-align: left;
      padding: 8px 12px;
      border: 1px solid var(--border);
      font-weight: 700;
    }

    td {
      padding: 8px 12px;
      border: 1px solid var(--border);
      color: #38302c;
    }

    pre {
      background: var(--code-bg);
      color: #f5ede8;
      padding: 14px 18px;
      border-radius: 8px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      overflow-x: auto;
      margin: 12px 0 20px 0;
      line-height: 1.45;
    }

    code {
      font-family: 'JetBrains Mono', monospace;
      background: #f4eae5;
      padding: 2px 5px;
      border-radius: 4px;
      font-size: 11.5px;
      color: var(--primary);
    }

    .footer {
      border-top: 1px solid var(--border);
      padding-top: 16px;
      margin-top: 40px;
      font-size: 11px;
      color: var(--muted);
      display: flex;
      justify-content: space-between;
    }

    @media print {
      body { background: none; padding: 0; }
      .doc-container { box-shadow: none; border-radius: 0; padding: 20px; max-width: 100%; }
      h2, h3 { page-break-after: avoid; }
      pre, table { page-break-inside: avoid; }
    }
  </style>
</head>
<body>

<div class="doc-container">
  <div class="header">
    <div class="repo-badge">Manual Técnico de Código</div>
    <h1>Doce Gestor — Documentação Completa do Código-Fonte</h1>
    <div class="subtitle">Guia Descritivo de Todos os Módulos, Funções, Endpoints e Regras de Negócio</div>
    <a class="github-link" href="https://github.com/junin1737/confeitaria" target="_blank">
      🔗 Repositório GitHub Oficial: https://github.com/junin1737/confeitaria
    </a>
  </div>

  <h2>1. Estrutura Geral do Código</h2>
  <pre>
Confeitaria/
├── Documentos/               # Documentação técnica, PDFs e apresentações
├── data/                     # Armazenamento do banco de dados SQLite local
├── server/                   # Backend em Node.js / Express com TypeScript
│   ├── db/
│   │   ├── client.ts         # Conexão LibSQL (@libsql/client)
│   │   ├── migrate.ts        # DDLs, tabelas e migrações incrementais
│   │   └── seed.ts           # Carga de estados, empresa piloto e simulação
│   ├── admin.ts              # Regras do Painel Master, seriais e licenças
│   ├── auth.ts               # Autenticação dupla, sessões e bcrypt
│   ├── dashboard.ts          # Indicadores, resumos e séries temporais
│   ├── funcionarios.ts       # Validações de CPF, cidades/UF e colaboradores
│   ├── localidades.ts        # Integração IBGE (cidades) e ViaCEP
│   ├── mensagens.ts          # Templates WhatsApp e aniversariantes do dia
│   └── index.ts              # Middlewares, rotas Express e servidor HTTP
└── src/                      # Frontend em React 19 + TypeScript + Vite
    ├── pages/
    │   ├── AdminPage.tsx     # Tela do Painel Master e APIs externas
    │   ├── LoginPage.tsx     # Tela de login e auto-cadastro trial
    │   ├── DashboardPage.tsx # Painel de faturamento e aniversariantes
    │   ├── EmployeesPage.tsx # Cadastro e gestão de funcionários
    │   ├── SettingsPage.tsx  # Configuração de temas e templates
    │   └── AppPages.tsx      # Componentes auxiliares e placeholders
    ├── api.ts                # Cliente HTTP frontend de todas as rotas
    ├── data.ts               # Menu lateral e contratos de navegação
    ├── theme.ts              # Design system de cores e variáveis CSS
    └── App.tsx               # Roteamento SPA e layout base da aplicação
  </pre>

  <h2>2. Backend — Módulos de Banco de Dados</h2>

  <h3>📄 server/db/client.ts</h3>
  <p><strong>Responsabilidade:</strong> Gerenciar a conexão única com a base de dados utilizando <code>@libsql/client</code>.</p>
  <ul>
    <li>Cria a pasta <code>data/</code> de forma recursiva caso não exista.</li>
    <li>Exporta a instância <code>db</code> utilizada em todo o backend.</li>
    <li>Suporta alternância transparente para a nuvem da Turso através da variável de ambiente <code>DATABASE_URL</code>.</li>
  </ul>

  <h3>📄 server/db/migrate.ts</h3>
  <p><strong>Responsabilidade:</strong> Garantir a integridade do esquema do banco de dados.</p>
  <ul>
    <li><code>STATEMENTS</code>: Matriz DDL criando as tabelas centrais: <code>tb_empresa</code>, <code>tb_usuario</code>, <code>tb_estado</code>, <code>tb_cidade</code>, <code>tb_funcionario</code>, <code>tb_sessao</code>, <code>tb_grupo_produto</code>, <code>tb_venda_grupo</code> e <code>tb_mensagem</code>.</li>
    <li><code>ensureColumn()</code>: Aplica <code>ALTER TABLE ADD COLUMN</code> seguro e não destrutivo apenas para colunas inexistentes.</li>
    <li><code>migrate()</code>: Executado na inicialização para aplicar índices multi-tenant e campos de licença (<code>serial_key</code>, <code>plano</code>, <code>expira_em</code>).</li>
  </ul>

  <h3>📄 server/db/seed.ts</h3>
  <p><strong>Responsabilidade:</strong> Carga de dados iniciais para viabilizar testes e demonstrações imediatas.</p>
  <ul>
    <li>Insere os 27 estados do Brasil na <code>tb_estado</code>.</li>
    <li>Cria a empresa inicial <em>"Ateliê Açúcar & Afeto"</em> com plano vitalício.</li>
    <li>Cria o usuário administrador <em>"Master"</em> com senha criptografada <code>1737</code>.</li>
    <li>Gera grupos de confeitaria e simula histórico de vendas diárias desde janeiro de 2026.</li>
  </ul>

  <h2>3. Backend — Serviços de Negócio e Segurança</h2>

  <h3>📄 server/auth.ts</h3>
  <p><strong>Responsabilidade:</strong> Autenticação e ciclo de vida de sessões.</p>
  <ul>
    <li><code>autenticar(loginOrEmail, senha)</code>: Permite login por nome de usuário OU e-mail. Valida o hash com <code>bcrypt.compareSync</code> e retorna os dados da empresa e licença.</li>
    <li><code>criarSessao(usuarioId, dias)</code>: Gera um identificador randômico seguro via <code>randomBytes(32)</code> e salva na <code>tb_sessao</code>.</li>
    <li><code>obterUsuarioPorSessao(sessaoId)</code>: Valida o cookie HttpOnly e descarta sessões expiradas.</li>
    <li><code>encerrarSessao(sessaoId)</code>: Remove a sessão do banco no logout.</li>
  </ul>

  <h3>📄 server/admin.ts</h3>
  <p><strong>Responsabilidade:</strong> Administração Master de Tenants e Licenças.</p>
  <ul>
    <li><code>gerarSerial(prefixo)</code>: Gera chaves seriais no formato <code>DG-XXXX-YYYY-ANO</code>.</li>
    <li><code>listarEmpresasAdmin()</code>: Retorna lista de confeitarias com contagem de funcionários, usuários e total de vendas por subqueries.</li>
    <li><code>criarEmpresaAdmin(dados)</code>: Cadastra a empresa, cria o usuário administrador dela e provisiona templates iniciais.</li>
    <li><code>alterarStatusEmpresa(id, status, motivo)</code>: Altera status para <code>ativa</code>, <code>bloqueada</code> ou <code>trial</code>.</li>
    <li><code>prorrogarLicencaEmpresa(id, dias)</code>: Adiciona dias à validade e reativa empresas suspensas.</li>
    <li><code>verificarAcessoEmpresa(empresaId)</code>: Valida em tempo real se a empresa tem permissão de acesso.</li>
  </ul>

  <h3>📄 server/funcionarios.ts</h3>
  <p><strong>Responsabilidade:</strong> Gestão de colaboradores com regras de conformidade.</p>
  <ul>
    <li><code>validarCpf(cpf)</code>: Algoritmo oficial de dígitos verificadores mod 11.</li>
    <li><code>cidadePertenceUf(cidadeId, ufId)</code>: Valida se o município pertence ao estado informado.</li>
    <li><code>proximoCodigo(empresaId)</code>: Incrementa sequencialmente o código do colaborador (ex: <code>FUNC-001</code>).</li>
    <li><code>criarFuncionario()</code> e <code>atualizarFuncionario()</code>: Persistem dados com hash bcrypt para a senha.</li>
  </ul>

  <h3>📄 server/localidades.ts</h3>
  <p><strong>Responsabilidade:</strong> Consultas geográficas e enriquecimento de endereço.</p>
  <ul>
    <li><code>listarEstados()</code>: Busca os estados cadastrados.</li>
    <li><code>listarCidades(estadoId)</code>: Busca municípios no banco local ou faz lazy-load via API do IBGE.</li>
    <li><code>consultarCep(cep)</code>: Consulta o ViaCEP e localiza automaticamente os IDs internos de UF e Cidade.</li>
  </ul>

  <h3>📄 server/index.ts</h3>
  <p><strong>Responsabilidade:</strong> Servidor Express, injeção de middlewares e rotas REST.</p>
  <ul>
    <li><code>requireAuth</code>: Exige cookie de sessão válido.</li>
    <li><code>requireActiveLicense</code>: Bloqueia confeitarias suspensas ou com licença vencida com status <code>403</code>.</li>
    <li><code>requireAdminAuth</code>: Exige perfil <code>master</code> ou header <code>X-Admin-Api-Key</code>.</li>
    <li>Rotas públicas: <code>POST /api/auth/login</code> e <code>POST /api/auth/registrar</code>.</li>
    <li>Rotas do Painel Master: <code>GET/POST /api/admin/empresas</code>, <code>PATCH /api/admin/empresas/:id/status</code>, etc.</li>
    <li>Rotas operacionais: Dashboard, Funcionários, Mensagens e Localidades.</li>
  </ul>

  <h2>4. Frontend — Telas e Camada de Apresentação</h2>

  <h3>📄 src/api.ts</h3>
  <p>Cliente unificado com métodos assíncronos para todas as chamadas HTTP (<code>fetchAdminEmpresas</code>, <code>loginRequest</code>, <code>registrarConfeitariaApi</code>, etc.).</p>

  <h3>📄 src/pages/AdminPage.tsx</h3>
  <p>Painel Master exclusivo para o administrador. Permite buscar empresas, visualizar seriais, prorrogar licenças (+30 dias / +1 ano), bloquear empresas com registro de motivo e copiar a chave mestre de integração.</p>

  <h3>📄 src/pages/LoginPage.tsx</h3>
  <p>Interface de autenticação com suporte a login por e-mail/usuário, acesso rápido de demonstração e auto-cadastro para clientes piloto com 15 dias de teste grátis (Trial).</p>

  <h3>📄 src/pages/DashboardPage.tsx</h3>
  <p>Painel de controle com faturamento diário, mensal e anual, gráficos de barras de evolução temporal, análise de vendas por grupos de produtos e módulo de aniversariantes do dia com mensagem pronta para WhatsApp.</p>

  <h3>📄 src/pages/EmployeesPage.tsx</h3>
  <p>Gestão de funcionários com autopreenchimento de endereço por CEP, validação de CPF, filtro dinâmico de cidades por estado e botão de abertura de conversa no WhatsApp.</p>

  <div class="footer">
    <span>Doce Gestor — Documentação Técnica do Código</span>
    <span>Repositório: https://github.com/junin1737/confeitaria</span>
  </div>
</div>

</body>
</html>
"""

# Salva arquivos HTML na pasta Documentos
path_arq_html = os.path.join(doc_dir, "Arquitetura_do_Projeto.html")
path_cod_html = os.path.join(doc_dir, "Documentacao_do_Codigo.html")

with open(path_arq_html, "w", encoding="utf-8") as f:
    f.write(html_arquitetura)

with open(path_cod_html, "w", encoding="utf-8") as f:
    f.write(html_codigo)

print("HTMLs criados com sucesso.")

# Compilação para PDF via Edge headless
pdf_arq = os.path.abspath(os.path.join(doc_dir, "Arquitetura_do_Projeto.pdf"))
pdf_cod = os.path.abspath(os.path.join(doc_dir, "Documentacao_do_Codigo.pdf"))

def compile_pdf(html_path, pdf_path):
    cmd = [
        edge_exe,
        "--headless",
        "--disable-gpu",
        "--no-pdf-header-footer",
        f"--print-to-pdf={pdf_path}",
        os.path.abspath(html_path)
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode == 0 and os.path.exists(pdf_path):
        print(f"PDF gerado com sucesso: {pdf_path}")
    else:
        print(f"Erro ao gerar {pdf_path}: {res.stderr}")

compile_pdf(path_arq_html, pdf_arq)
compile_pdf(path_cod_html, pdf_cod)
