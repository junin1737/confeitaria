import os
import subprocess

html_content = """<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Doce Gestor — Apresentação Executiva & Cronograma Piloto</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #b33951;
      --primary-light: #fbebee;
      --primary-dark: #821f32;
      --secondary: #8c533e;
      --accent: #d4954a;
      --accent-light: #fef7ed;
      --dark: #231c19;
      --muted: #6b6059;
      --border: #eddcd2;
      --bg-page: #fbf9f7;
      --card-bg: #ffffff;
      --success: #2e7d32;
      --success-light: #e8f5e9;
      --info: #0288d1;
      --info-light: #e1f5fe;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
      background-color: #2b2523;
      color: var(--dark);
      line-height: 1.5;
      padding: 20px 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 30px;
    }

    .slide {
      width: 1200px;
      min-height: 675px;
      background: var(--bg-page);
      border-radius: 16px;
      box-shadow: 0 15px 35px rgba(0,0,0,0.3);
      padding: 48px 56px;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      page-break-after: always;
      break-after: page;
    }

    .slide-header {
      margin-bottom: 24px;
    }

    .category-tag {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: var(--accent);
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .slide-title {
      font-family: 'Playfair Display', serif;
      font-size: 30px;
      font-weight: 700;
      color: var(--dark);
      line-height: 1.2;
    }

    .slide-subtitle {
      font-size: 14px;
      color: var(--muted);
      margin-top: 4px;
    }

    /* SLIDE 1: CAPA */
    .slide-cover {
      background: linear-gradient(135deg, #b33951 0%, #821f32 100%);
      color: #ffffff;
      justify-content: center;
      align-items: center;
      text-align: center;
      padding: 60px;
    }

    .cover-card {
      background: #ffffff;
      color: var(--dark);
      padding: 50px 60px;
      border-radius: 20px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.25);
      border: 3px solid var(--accent);
      max-width: 980px;
      width: 100%;
    }

    .badge-cover {
      display: inline-block;
      background: var(--accent-light);
      color: var(--accent);
      font-weight: 800;
      font-size: 12px;
      letter-spacing: 1.5px;
      padding: 6px 16px;
      border-radius: 30px;
      border: 1px solid var(--accent);
      margin-bottom: 16px;
      text-transform: uppercase;
    }

    .cover-title {
      font-family: 'Playfair Display', serif;
      font-size: 44px;
      font-weight: 700;
      color: var(--primary);
      margin-bottom: 12px;
    }

    .cover-desc {
      font-size: 18px;
      color: var(--secondary);
      font-weight: 500;
      margin-bottom: 28px;
    }

    .cover-bullets {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      text-align: left;
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px dashed var(--border);
    }

    .cover-bullet-item {
      background: var(--bg-page);
      padding: 16px;
      border-radius: 12px;
      border: 1px solid var(--border);
    }

    .cover-bullet-item h4 {
      font-size: 14px;
      color: var(--primary);
      margin-bottom: 6px;
    }

    .cover-bullet-item p {
      font-size: 12px;
      color: var(--muted);
      line-height: 1.4;
    }

    /* GRID LAYOUTS */
    .grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      flex: 1;
    }

    .grid-2 {
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      gap: 24px;
      flex: 1;
    }

    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 24px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.03);
      display: flex;
      flex-direction: column;
    }

    .card.highlight {
      border-left: 5px solid var(--primary);
    }

    .card.highlight-gold {
      border-left: 5px solid var(--accent);
    }

    .card.highlight-secondary {
      border-left: 5px solid var(--secondary);
    }

    .card-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--dark);
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .card-body {
      font-size: 13.5px;
      color: var(--muted);
      line-height: 1.6;
      flex: 1;
    }

    .card-body strong {
      color: var(--dark);
    }

    /* RECEITA / FICHA TÉCNICA */
    .recipe-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12.5px;
      margin: 12px 0;
    }

    .recipe-table th {
      background: #f4ece7;
      text-align: left;
      padding: 8px 10px;
      font-weight: 700;
      color: var(--secondary);
      border-bottom: 2px solid var(--border);
    }

    .recipe-table td {
      padding: 8px 10px;
      border-bottom: 1px solid #f2e9e4;
      color: var(--dark);
    }

    .recipe-table .mono {
      font-family: 'JetBrains Mono', monospace;
    }

    .calc-box {
      background: #faf4f0;
      border: 1px solid #e8d7cf;
      border-radius: 10px;
      padding: 14px 18px;
      margin-top: 10px;
    }

    .calc-row {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      margin-bottom: 4px;
    }

    .calc-row.total {
      font-size: 15px;
      font-weight: 800;
      color: var(--primary);
      border-top: 2px solid #e0c8be;
      padding-top: 8px;
      margin-top: 8px;
    }

    /* MOCKUP DO CELULAR */
    .phone-mockup {
      background: #ffffff;
      border: 8px solid #2b2523;
      border-radius: 28px;
      padding: 16px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.15);
      max-width: 330px;
      margin: 0 auto;
    }

    .phone-notch {
      width: 80px;
      height: 12px;
      background: #2b2523;
      border-radius: 10px;
      margin: 0 auto 12px;
    }

    .phone-header {
      text-align: center;
      border-bottom: 1px solid var(--border);
      padding-bottom: 10px;
      margin-bottom: 10px;
    }

    .phone-item {
      display: flex;
      gap: 10px;
      padding: 10px 0;
      border-bottom: 1px solid #f6eee9;
    }

    .phone-item-thumb {
      width: 50px;
      height: 50px;
      border-radius: 8px;
      background: var(--primary-light);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      flex-shrink: 0;
    }

    .phone-btn {
      background: #25d366;
      color: white;
      text-align: center;
      padding: 10px;
      border-radius: 10px;
      font-weight: 700;
      font-size: 12px;
      margin-top: 12px;
      display: block;
      box-shadow: 0 4px 10px rgba(37,211,102,0.3);
    }

    /* KANBAN */
    .kanban-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
      flex: 1;
    }

    .kanban-col {
      background: #f7f1ee;
      border-radius: 12px;
      padding: 14px;
      border: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .kanban-col-header {
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: flex;
      justify-content: space-between;
      color: var(--secondary);
    }

    .kanban-card {
      background: #ffffff;
      border-radius: 10px;
      padding: 12px;
      border: 1px solid #ebdcd5;
      box-shadow: 0 2px 6px rgba(0,0,0,0.04);
    }

    .kanban-tag {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      display: inline-block;
      margin-bottom: 6px;
    }

    .tag-sinal { background: var(--success-light); color: var(--success); }
    .tag-pend { background: #fff3e0; color: #e65100; }
    .tag-hora { background: var(--info-light); color: var(--info); }

    /* TIMELINE */
    .timeline-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      flex: 1;
    }

    .timeline-row {
      display: grid;
      grid-template-columns: 140px 240px 1fr;
      align-items: center;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 14px 20px;
      gap: 16px;
    }

    .timeline-badge {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      padding: 6px 12px;
      border-radius: 20px;
      text-align: center;
    }

    .badge-f0 { background: #ede7f6; color: #512da8; }
    .badge-f1 { background: var(--primary-light); color: var(--primary); }
    .badge-f2 { background: var(--accent-light); color: var(--accent); }
    .badge-f3 { background: var(--info-light); color: var(--info); }
    .badge-f4 { background: var(--success-light); color: var(--success); }

    .footer-note {
      font-size: 11px;
      color: var(--muted);
      margin-top: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid #f0e6e1;
      padding-top: 10px;
    }

    @media print {
      body {
        background: none;
        padding: 0;
        gap: 0;
      }
      .slide {
        box-shadow: none;
        border-radius: 0;
        margin: 0;
        width: 100vw;
        height: 100vh;
        min-height: 100vh;
        page-break-after: always;
      }
    }
  </style>
</head>
<body>

  <!-- SLIDE 1: CAPA -->
  <div class="slide slide-cover">
    <div class="cover-card">
      <div class="badge-cover">Engenharia de Software & Arquitetura de Produto</div>
      <h1 class="cover-title">Doce Gestor — Sistema Web Multiempresa</h1>
      <p class="cover-desc">Plataforma Especializada para Confeiteiras Caseiras e Negócios de Alimentação</p>
      
      <div class="cover-bullets">
        <div class="cover-bullet-item">
          <h4>🔒 Multi-Tenant & Licença</h4>
          <p>Acesso isolado por e-mail, proteção total de dados e controle de seriais/planos.</p>
        </div>
        <div class="cover-bullet-item">
          <h4>🎂 Ficha Técnica & Lucro</h4>
          <p>Fim do medo de prejuízo: cálculo automático por grama, custo fixo e margem de lucro.</p>
        </div>
        <div class="cover-bullet-item">
          <h4>📱 Cardápio & WhatsApp</h4>
          <p>Link de pedidos sem fricção que já gera o pedido montado no WhatsApp da confeitaria.</p>
        </div>
      </div>
    </div>
  </div>

  <!-- SLIDE 2: OPINIÃO DO ARQUITETO -->
  <div class="slide">
    <div class="slide-header">
      <div class="category-tag">Diagnóstico Técnico Estratégico</div>
      <h2 class="slide-title">Opinião Técnica 100% Honesta: Por Onde Começar?</h2>
      <p class="slide-subtitle">Como garantir a adesão imediata das clientes piloto sem cair nas armadilhas de ERPs genéricos</p>
    </div>

    <div class="grid-3">
      <div class="card highlight">
        <div class="card-title">1. A Realidade do Nicho Caseiro</div>
        <div class="card-body">
          A confeiteira que trabalha em casa atua com as <strong>mãos nas panelas e o olho no WhatsApp</strong>. Ela não tem tempo para preencher tabelas contábeis complexas.<br><br>
          Se o sistema exigir 20 telas burocráticas antes de entregar o primeiro resultado, ela vai abandonar o sistema e voltar para o caderno de papel. O sistema precisa entregar um <strong>"momento UAU"</strong> em menos de 5 minutos de uso.
        </div>
      </div>

      <div class="card highlight-gold">
        <div class="card-title">2. A Dor Nº 1: "Estou Tendo Lucro?"</div>
        <div class="card-body">
          Quase todas as confeiteiras precificam <strong>multiplicando os ingredientes por 3</strong> ou copiando o preço da concorrência.<br><br>
          Elas esquecem o gás, a luz, o cakeboard, a fita, a perda na panela e o valor da própria hora trabalhada. Quando o sistema calcula exatamente quanto sobra no bolso dela por cada bolo vendido, <strong>o sistema se torna indispensável</strong>.
        </div>
      </div>

      <div class="card highlight-secondary">
        <div class="card-title">3. Onde Encaixar o Código Atual?</div>
        <div class="card-body">
          O projeto já possui um módulo de <strong>Funcionários e Folha</strong> muito bem desenhado.<br><br>
          <strong>Veredito do Arquiteto:</strong> Para as clientes piloto caseiras (que trabalham sozinhas), Folha de Pagamento não é a prioridade do Dia 1. Devemos entregar primeiro <strong>Ficha Técnica + Cardápio com Link</strong>. O módulo de Funcionários entrará na Fase de Expansão (Fase 4/5).
        </div>
      </div>
    </div>

    <div class="footer-note">
      <span>Doce Gestor • Arquitetura & Cronograma</span>
      <span>Slide 2 de 8</span>
    </div>
  </div>

  <!-- SLIDE 3: ARQUITETURA MULTI-TENANT & LICENÇAS -->
  <div class="slide">
    <div class="slide-header">
      <div class="category-tag">Segurança & Modelo de Negócio</div>
      <h2 class="slide-title">Arquitetura Multi-Tenant & Sistema de Licenciamento</h2>
      <p class="slide-subtitle">Como isolar confeitarias concorrentes e monetizar a plataforma com controle de acesso</p>
    </div>

    <div class="grid-3">
      <div class="card highlight">
        <div class="card-title">Isolamento Absoluto por E-mail</div>
        <div class="card-body">
          • O <strong>e-mail</strong> é a chave de entrada da confeitaria.<br>
          • No cadastro, é criada automaticamente uma nova <code>tb_empresa</code> e o usuário administrador.<br>
          • <strong>Regra de Ouro:</strong> Todas as rotas e tabelas filtram estritamente por <code>empresa_id</code> no backend.<br>
          • Confeiteiras de uma mesma cidade utilizam o mesmo sistema sem jamais enxergar os preços ou clientes uma da outra.
        </div>
      </div>

      <div class="card highlight-gold">
        <div class="card-title">Controle por Serial & Validade</div>
        <div class="card-body">
          • Cada empresa possui campos de licença:<br>
          &nbsp;&nbsp;<code>tipo_plano</code> (Trial, Mensal, Anual)<br>
          &nbsp;&nbsp;<code>chave_serial</code> (Ex: DG-2026-X8F9)<br>
          &nbsp;&nbsp;<code>expira_em</code> (Data limite de acesso)<br>
          • <strong>Modo Trial:</strong> 15 dias gratuitos ao criar a conta.<br>
          • <strong>Ativação:</strong> Inserção de serial gerado pelo dono do software ou webhook de pagamento automático.
        </div>
      </div>

      <div class="card highlight-secondary">
        <div class="card-title">Banco Local ➔ Nuvem Turso</div>
        <div class="card-body">
          • O uso de <code>@libsql/client</code> é uma das melhores decisões de arquitetura do projeto.<br>
          • <strong>Hoje:</strong> Banco SQLite rápido rodando localmente no arquivo <code>doce-gestor.db</code> para você e as pilotos.<br>
          • <strong>Amanhã:</strong> Basta alterar uma única variável de ambiente (<code>DATABASE_URL</code>) para apontar para a nuvem da Turso, com zero refatoração de código SQL!
        </div>
      </div>
    </div>

    <div class="footer-note">
      <span>Doce Gestor • Arquitetura & Cronograma</span>
      <span>Slide 3 de 8</span>
    </div>
  </div>

  <!-- SLIDE 4: TELA 1 - FICHA TÉCNICA -->
  <div class="slide">
    <div class="slide-header">
      <div class="category-tag">Coração do Sistema • Tela 1</div>
      <h2 class="slide-title">Ficha Técnica Inteligente & Precificação Automática</h2>
      <p class="slide-subtitle">A tela que faz a confeiteira enxergar o lucro real e nunca mais vender no prejuízo</p>
    </div>

    <div class="grid-2">
      <!-- Mockup da Ficha Técnica -->
      <div class="card" style="padding: 18px;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid var(--border); padding-bottom: 8px;">
          <strong style="color: var(--primary); font-size: 15px;">🎂 Bolo Red Velvet com Ninho (1.8kg)</strong>
          <span style="background: var(--primary-light); color: var(--primary); font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 6px;">Receita Base #04</span>
        </div>

        <table class="recipe-table">
          <thead>
            <tr>
              <th>Ingrediente</th>
              <th>Uso</th>
              <th>Embalagem Comprada</th>
              <th style="text-align: right;">Custo Rateado</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Leite Condensado</td>
              <td class="mono">395g</td>
              <td>Lata 395g (R$ 6,50)</td>
              <td class="mono" style="text-align: right;">R$ 6,50</td>
            </tr>
            <tr>
              <td>Farinha de Trigo</td>
              <td class="mono">300g</td>
              <td>Pct 1000g (R$ 5,00)</td>
              <td class="mono" style="text-align: right;">R$ 1,50</td>
            </tr>
            <tr>
              <td>Cream Cheese</td>
              <td class="mono">250g</td>
              <td>Pote 300g (R$ 14,00)</td>
              <td class="mono" style="text-align: right;">R$ 11,66</td>
            </tr>
            <tr>
              <td>Manteiga Primeira Linha</td>
              <td class="mono">100g</td>
              <td>Tablete 200g (R$ 12,00)</td>
              <td class="mono" style="text-align: right;">R$ 6,00</td>
            </tr>
            <tr>
              <td>Cakeboard + Caixa Kraft</td>
              <td class="mono">1 un</td>
              <td>Unidade (R$ 4,50)</td>
              <td class="mono" style="text-align: right;">R$ 4,50</td>
            </tr>
          </tbody>
        </table>

        <div class="calc-box">
          <div class="calc-row"><span>Subtotal Ingredientes e Embalagem:</span> <strong class="mono">R$ 30,16</strong></div>
          <div class="calc-row"><span>Custos Invisíveis (Gás/Energia/Água - 15%):</span> <strong class="mono">R$ 4,52</strong></div>
          <div class="calc-row"><span>Mão de Obra da Confeiteira (1.5h a R$ 20/h):</span> <strong class="mono">R$ 30,00</strong></div>
          <div class="calc-row total">
            <span>CUSTO REAL TOTAL:</span>
            <span class="mono">R$ 64,68</span>
          </div>
          <div class="calc-row" style="margin-top: 6px; color: var(--success); font-weight: 700;">
            <span>Preço Sugerido (100% Margem de Lucro):</span>
            <span class="mono">R$ 129,36</span>
          </div>
        </div>
      </div>

      <!-- Explicação de Negócio -->
      <div class="card highlight-gold">
        <div class="card-title">Impacto Imediato na Confeitaria</div>
        <div class="card-body">
          <p style="margin-bottom: 14px;">
            <strong>1. Conversão Automática de Medidas:</strong><br>
            A confeiteira cadastra o saco de farinha de 5kg por R$ 22,00 e, na receita, ela só digita "350g". O sistema calcula a fração dos centavos sozinho.
          </p>
          <p style="margin-bottom: 14px;">
            <strong>2. Efeito Cascata Inteligente:</strong><br>
            Quando o leite condensado sobe de R$ 6,00 para R$ 7,50 no supermercado, ela altera o insumo uma única vez e <strong>TODOS os 30 bolos e brigadeiros são recalculados instantaneamente</strong>.
          </p>
          <p>
            <strong>3. Salário Garantido:</strong><br>
            A confeiteira aprende a separar o <em>salário dela por hora trabalhada</em> do <em>lucro da empresa</em>. Ela nunca mais tira dinheiro do próprio bolso para pagar contas de casa.
          </p>
        </div>
      </div>
    </div>

    <div class="footer-note">
      <span>Doce Gestor • Arquitetura & Cronograma</span>
      <span>Slide 4 de 8</span>
    </div>
  </div>

  <!-- SLIDE 5: TELA 2 - CARDÁPIO DIGITAL & WHATSAPP -->
  <div class="slide">
    <div class="slide-header">
      <div class="category-tag">Canal de Vendas • Tela 2</div>
      <h2 class="slide-title">Cardápio Digital Público & Pedido via Link WhatsApp</h2>
      <p class="slide-subtitle">Venda sem intermediários, sem taxas abusivas de delivery e com o pedido já organizado</p>
    </div>

    <div class="grid-2">
      <!-- Mockup do Celular -->
      <div>
        <div class="phone-mockup">
          <div class="phone-notch"></div>
          <div class="phone-header">
            <div style="font-size: 11px; color: var(--muted);">docegestor.com.br/atelie-doces</div>
            <div style="font-size: 14px; font-weight: 800; color: var(--primary); margin-top: 2px;">Ateliê Açúcar & Afeto</div>
            <div style="font-size: 10px; color: var(--muted);">Encomendas com 48h de antecedência</div>
          </div>

          <div style="font-size: 11px; font-weight: 700; color: var(--secondary); margin-bottom: 6px;">Bolos Vulcão & Caseiros</div>

          <div class="phone-item">
            <div class="phone-item-thumb">🎂</div>
            <div style="flex: 1;">
              <div style="font-size: 11px; font-weight: 700;">Vulcão Ninho c/ Nutella</div>
              <div style="font-size: 10px; color: var(--muted);">Massa fofinha de chocolate</div>
              <div style="font-size: 11px; font-weight: 800; color: var(--primary); margin-top: 2px;">R$ 65,00</div>
            </div>
            <div style="background: var(--primary); color: white; border-radius: 6px; padding: 4px 8px; font-size: 10px; height: fit-content;">+ Pedir</div>
          </div>

          <div class="phone-item">
            <div class="phone-item-thumb">🍓</div>
            <div style="flex: 1;">
              <div style="font-size: 11px; font-weight: 700;">Copo Felicidade Morango</div>
              <div style="font-size: 10px; color: var(--muted);">Brigadeiro branco e brownie</div>
              <div style="font-size: 11px; font-weight: 800; color: var(--primary); margin-top: 2px;">R$ 22,00</div>
            </div>
            <div style="background: var(--primary); color: white; border-radius: 6px; padding: 4px 8px; font-size: 10px; height: fit-content;">+ Pedir</div>
          </div>

          <a href="#" class="phone-btn">
            🟢 ENVIAR PEDIDO NO WHATSAPP (R$ 87,00)
          </a>
        </div>
      </div>

      <!-- Fluxo -->
      <div class="card highlight">
        <div class="card-title">Como o Fluxo Salva Horas da Confeiteira</div>
        <div class="card-body">
          <p style="margin-bottom: 14px;">
            <strong>1. Link na Bio e Status:</strong><br>
            A confeiteira adiciona <code>docegestor.com.br/seu-nome</code> no Instagram e envia aos clientes quando pedem o cardápio.
          </p>
          <p style="margin-bottom: 14px;">
            <strong>2. Zero Atrito para o Cliente Final:</strong><br>
            O cliente não precisa criar conta nem baixar aplicativo. Ele entra pelo navegador, escolhe sabores, adicionais, informa a data e clica para enviar.
          </p>
          <p style="margin-bottom: 14px;">
            <strong>3. Mensagem Pronta no WhatsApp:</strong><br>
            O WhatsApp abre automaticamente com a mensagem perfeita:<br>
            <code style="display:block; background:#f4f0ed; padding:8px; border-radius:6px; font-size:11px; margin-top:6px; color:#333;">
              *NOVO PEDIDO #104 - ATELIÊ AÇÚCAR & AFETO*<br>
              • 1x Vulcão Ninho c/ Nutella (R$ 65,00)<br>
              • 1x Copo Felicidade Morango (R$ 22,00)<br>
              *Total:* R$ 87,00<br>
              *Data Retirada:* Sábado 11/10 às 15h<br>
              *Cliente:* Mariana Silva (11 99999-9999)
            </code>
          </p>
          <p>
            <strong>4. Entrada no Painel de Pedidos:</strong><br>
            O pedido é registrado no banco da confeitaria instantaneamente como "Aguardando Confirmação do Sinal".
          </p>
        </div>
      </div>
    </div>

    <div class="footer-note">
      <span>Doce Gestor • Arquitetura & Cronograma</span>
      <span>Slide 5 de 8</span>
    </div>
  </div>

  <!-- SLIDE 6: TELA 3 - KANBAN DE ENCOMENDAS -->
  <div class="slide">
    <div class="slide-header">
      <div class="category-tag">Operação Diária • Tela 3</div>
      <h2 class="slide-title">Quadro de Encomendas & Agenda de Produção</h2>
      <p class="slide-subtitle">O fim das entregas esquecidas e do estresse com encomendas do fim de semana</p>
    </div>

    <div class="kanban-grid">
      <!-- Coluna 1 -->
      <div class="kanban-col">
        <div class="kanban-col-header">
          <span>📝 Orçamento</span>
          <span>1</span>
        </div>
        <div class="kanban-card">
          <span class="kanban-tag tag-pend">Aguardando Sinal</span>
          <div style="font-weight: 700; font-size: 13px;">#104 • Mariana Silva</div>
          <div style="font-size: 11px; color: var(--muted); margin: 4px 0;">Bolo 2kg Red Velvet</div>
          <div style="font-size: 11px; font-weight: 700; color: var(--primary);">Total: R$ 130,00</div>
          <div style="font-size: 10px; color: var(--muted); margin-top: 6px;">📅 Sábado 11/10 • 15:00</div>
          <button style="width:100%; border:none; background:#e8f5e9; color:#2e7d32; font-weight:700; font-size:10px; padding:4px; border-radius:4px; margin-top:6px; cursor:pointer;">Confirmar Sinal R$ 65</button>
        </div>
      </div>

      <!-- Coluna 2 -->
      <div class="kanban-col">
        <div class="kanban-col-header">
          <span>🧁 Confirmado</span>
          <span>2</span>
        </div>
        <div class="kanban-card">
          <span class="kanban-tag tag-sinal">Sinal 50% Pago</span>
          <div style="font-weight: 700; font-size: 13px;">#102 • Camila Lima</div>
          <div style="font-size: 11px; color: var(--muted); margin: 4px 0;">100 Brigadeiros Gourmet</div>
          <div style="font-size: 11px; font-weight: 700; color: var(--primary);">R$ 150 (Falta R$ 75)</div>
          <div style="font-size: 10px; color: var(--muted); margin-top: 6px;">📅 Sexta 10/10 • 18:00</div>
          <button style="width:100%; border:none; background:#ede7f6; color:#512da8; font-weight:700; font-size:10px; padding:4px; border-radius:4px; margin-top:6px; cursor:pointer;">Mover p/ Produção</button>
        </div>
      </div>

      <!-- Coluna 3 -->
      <div class="kanban-col">
        <div class="kanban-col-header">
          <span>🎂 Em Produção</span>
          <span>1</span>
        </div>
        <div class="kanban-card">
          <span class="kanban-tag tag-hora">Forno / Montagem</span>
          <div style="font-weight: 700; font-size: 13px;">#101 • Festa Lucas</div>
          <div style="font-size: 11px; color: var(--muted); margin: 4px 0;">Kit Festa 30 pessoas</div>
          <div style="font-size: 11px; font-weight: 700; color: var(--primary);">R$ 310 (Falta R$ 160)</div>
          <div style="font-size: 10px; color: var(--muted); margin-top: 6px;">📅 Sábado 11/10 • 10:00</div>
          <button style="width:100%; border:none; background:#e1f5fe; color:#0288d1; font-weight:700; font-size:10px; padding:4px; border-radius:4px; margin-top:6px; cursor:pointer;">Marcar como Pronto</button>
        </div>
      </div>

      <!-- Coluna 4 -->
      <div class="kanban-col">
        <div class="kanban-col-header">
          <span>✨ Pronto / Retirada</span>
          <span>1</span>
        </div>
        <div class="kanban-card">
          <span class="kanban-tag tag-sinal">Na Geladeira</span>
          <div style="font-weight: 700; font-size: 13px;">#099 • Carlos Mendes</div>
          <div style="font-size: 11px; color: var(--muted); margin: 4px 0;">2x Copos da Felicidade</div>
          <div style="font-size: 11px; font-weight: 700; color: var(--primary);">R$ 44,00 (Pago)</div>
          <div style="font-size: 10px; color: var(--muted); margin-top: 6px;">📅 Hoje • Retirada 19h</div>
          <button style="width:100%; border:none; background:#25d366; color:white; font-weight:700; font-size:10px; padding:4px; border-radius:4px; margin-top:6px; cursor:pointer;">Avisar no WhatsApp</button>
        </div>
      </div>
    </div>

    <div class="card highlight-gold" style="margin-top: 14px; padding: 14px 20px;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <strong style="color: var(--accent); font-size: 14px;">🛒 Super Recurso: Lista de Compras Consolidada da Semana</strong>
          <p style="font-size: 12px; color: var(--muted); margin-top: 2px;">
            O sistema lê todas as encomendas confirmadas para sexta, sábado e domingo e avisa: <em>"Você precisa de 12 latas de leite condensado, 3kg de chocolate nobre e 2 cakeboards de 25cm para as entregas desta semana."</em>
          </p>
        </div>
        <span style="background: var(--accent); color: white; font-size: 11px; font-weight: 700; padding: 6px 12px; border-radius: 8px;">Diferencial Exclusivo</span>
      </div>
    </div>

    <div class="footer-note">
      <span>Doce Gestor • Arquitetura & Cronograma</span>
      <span>Slide 6 de 8</span>
    </div>
  </div>

  <!-- SLIDE 7: CRONOGRAMA PASSO A PASSO -->
  <div class="slide">
    <div class="slide-header">
      <div class="category-tag">Planejamento de Engenharia</div>
      <h2 class="slide-title">Cronograma de Desenvolvimento Passo a Passo</h2>
      <p class="slide-subtitle">Sequência lógica de entrega para validação contínua com as clientes piloto</p>
    </div>

    <div class="timeline-list">
      <div class="timeline-row">
        <span class="timeline-badge badge-f0">FASE 0 • Semana 1</span>
        <div>
          <strong style="font-size: 13.5px;">Fundação & Multi-Tenant</strong>
          <div style="font-size: 11px; color: var(--muted);">Base de Segurança e Acesso</div>
        </div>
        <div style="font-size: 12.5px; color: var(--dark);">
          • Cadastro self-service da Confeitaria (Nome, E-mail, Senha, WhatsApp).<br>
          • Isolamento rigoroso de queries por <code>empresa_id</code> e controle de trial/serial de licença.
        </div>
      </div>

      <div class="timeline-row">
        <span class="timeline-badge badge-f1">FASE 1 • Semana 2</span>
        <div>
          <strong style="font-size: 13.5px;">Insumos & Precificação</strong>
          <div style="font-size: 11px; color: var(--muted);">O Maior Valor do Produto</div>
        </div>
        <div style="font-size: 12.5px; color: var(--dark);">
          • Cadastro de insumos com conversão de unidades (g, kg, ml, unidade).<br>
          • Ficha técnica com custos fixos (gás/energia) e precificação sugerida por margem de lucro.
        </div>
      </div>

      <div class="timeline-row">
        <span class="timeline-badge badge-f2">FASE 2 • Semana 3</span>
        <div>
          <strong style="font-size: 13.5px;">Cardápio Digital & Link</strong>
          <div style="font-size: 11px; color: var(--muted);">Geração de Receita p/ a Cliente</div>
        </div>
        <div style="font-size: 12.5px; color: var(--dark);">
          • Página pública responsiva de cardápio (<code>/cardapio/:slug</code>).<br>
          • Carrinho de compras simples sem cadastro prévio + envio 1-clique para o WhatsApp.
        </div>
      </div>

      <div class="timeline-row">
        <span class="timeline-badge badge-f3">FASE 3 • Semana 4</span>
        <div>
          <strong style="font-size: 13.5px;">Gestão de Encomendas</strong>
          <div style="font-size: 11px; color: var(--muted);">Organização da Rotina</div>
        </div>
        <div style="font-size: 12.5px; color: var(--dark);">
          • Quadro Kanban (Orçamento -> Produção -> Pronto -> Entregue).<br>
          • Alerta de sinal pago (50%) e Lista consolidada de compras da semana.
        </div>
      </div>

      <div class="timeline-row">
        <span class="timeline-badge badge-f4">FASE 4 • Semana 5</span>
        <div>
          <strong style="font-size: 13.5px;">Financeiro & Equipe</strong>
          <div style="font-size: 11px; color: var(--muted);">Conexão dos Módulos Prontos</div>
        </div>
        <div style="font-size: 12.5px; color: var(--dark);">
          • Fluxo de caixa e DRE simplificada (Faturamento x Custos x Lucro Líquido Real).<br>
          • Integração com o módulo já pronto de Funcionários, comissões por pagamento e folha.
        </div>
      </div>
    </div>

    <div class="footer-note">
      <span>Doce Gestor • Arquitetura & Cronograma</span>
      <span>Slide 7 de 8</span>
    </div>
  </div>

  <!-- SLIDE 8: ESTRATÉGIA COM CLIENTES PILOTO -->
  <div class="slide">
    <div class="slide-header">
      <div class="category-tag">Go-To-Market & Apresentação</div>
      <h2 class="slide-title">Roteiro de Demonstração para as Clientes Piloto</h2>
      <p class="slide-subtitle">Como conduzir a primeira conversa para transformar confeiteiras em fãs apaixonadas do sistema</p>
    </div>

    <div class="grid-3">
      <div class="card highlight">
        <div class="card-title">Passo 1: A Pergunta de Abertura</div>
        <div class="card-body">
          Inicie a conversa perguntando:<br>
          <em>"Quanto você gasta exatamente de ingredientes e gás para fazer o seu bolo que mais vende? Quanto sobra no seu bolso?"</em><br><br>
          Quase todas vão admitir que não sabem com precisão. É aí que você abre o sistema e mostra a <strong>Ficha Técnica Inteligente</strong> com a receita dela cadastrada em tempo real.
        </div>
      </div>

      <div class="card highlight-gold">
        <div class="card-title">Passo 2: O Teste do WhatsApp</div>
        <div class="card-body">
          Pegue o celular dela, abra o link do cardápio digital do ateliê dela e faça um pedido de teste.<br><br>
          Quando o WhatsApp dela apitar com o pedido pronto, discriminado com itens, adicionais, data e valor total, ela perceberá que <strong>nunca mais precisará perder 30 minutos digitando cardápio no chat</strong>.
        </div>
      </div>

      <div class="card highlight-secondary">
        <div class="card-title">Passo 3: A Proposta Piloto</div>
        <div class="card-body">
          Ofereça acesso gratuito durante o período piloto (30 a 60 dias) com uma única condição:<br><br>
          <strong>"Você só precisa me dar feedbacks semanais e usar o sistema na sua rotina real."</strong><br><br>
          Com esse ciclo rápido de feedback, quando o sistema for lançado comercialmente, ele já estará 100% aprovado e perfeito para o mercado.
        </div>
      </div>
    </div>

    <div class="footer-note">
      <span>Doce Gestor • Arquitetura & Cronograma</span>
      <span>Slide 8 de 8</span>
    </div>
  </div>

</body>
</html>
"""

html_path = os.path.join("Documentos", "apresentacao_slides.html")
with open(html_path, "w", encoding="utf-8") as f:
    f.write(html_content)

print(f"HTML dos slides criado em: {html_path}")

# Converter para PDF via Edge headless
edge_exe = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
pdf_path = os.path.join("Documentos", "DoceGestor_Apresentacao_Piloto.pdf")

abs_html = os.path.abspath(html_path)
abs_pdf = os.path.abspath(pdf_path)

cmd = [
    edge_exe,
    "--headless",
    "--disable-gpu",
    "--no-pdf-header-footer",
    f"--print-to-pdf={abs_pdf}",
    abs_html
]

print("Gerando PDF com Edge headless...")
res = subprocess.run(cmd, capture_output=True, text=True)
if res.returncode == 0 and os.path.exists(abs_pdf):
    print(f"PDF gerado com sucesso em: {abs_pdf}")
else:
    print(f"Erro ao gerar PDF: {res.stderr}")

