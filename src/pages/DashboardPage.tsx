/**
 * ============================================================================
 * PROJETO: Doce Gestor - Sistema de Gestão para Confeitarias
 * REPOSITÓRIO: https://github.com/junin1737/confeitaria
 * ARQUIVO: src/pages/DashboardPage.tsx
 * DESCRIÇÃO: Painel analítico de desempenho financeiro, vendas por grupo e aniversários.
 * ============================================================================
 * 
 * [MÉTRICAS & INDICADORES EXIBIDOS]
 * 1. Faturamento diário, mensal e anual com comparativo percentual de evolução.
 * 2. Gráficos de barras de evolução histórica e sparklines de tendência.
 * 3. Distribuição de faturamento por grupos de confeitaria (Bolos, Tortas, Kits).
 * 4. Card interativo de aniversariantes do dia com template de mensagem pronto para WhatsApp.
 * ============================================================================
 */

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Archive,
  Cake,
  CalendarDays,
  CalendarRange,
  Clock,
  Download,
  Heart,
  LayoutDashboard,
  MoreHorizontal,
  Plus,
  Receipt,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  fetchDashboardHoje,
  fetchDashboardPeriodo,
  fetchDashboardResumo,
  iniciais,
  type Aniversariante,
  type GrupoVenda,
  type Mensagem,
  type PontoSerie,
  type ResumoPeriodo,
} from "../api";
import { RECENT_ORDERS } from "../data";
import type { PageKey } from "../data";
import { applyMessageTemplate, digits, WhatsAppIcon, whatsappUrl } from "../whatsapp";

type DashTab = "hoje" | "geral" | "periodo";

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function compactMoney(value: number) {
  if (value >= 1000) {
    return `R$ ${(value / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}k`;
  }
  return money(value);
}

function percent(value: number) {
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: 1 })}%`;
}

function signedPercent(value: number) {
  return `${value >= 0 ? "+" : "−"} ${percent(Math.abs(value))}`;
}

function localISODate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthStartISO() {
  const date = new Date();
  date.setDate(1);
  return localISODate(date);
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function todayLabel() {
  const now = new Date();
  const month = now.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
  return `Hoje · ${now.getDate()} ${month}`;
}

function monthLabel() {
  return `Este mês · ${new Date().toLocaleDateString("pt-BR", { month: "long" })}`;
}

function yearLabel() {
  return `Este ano · ${new Date().getFullYear()}`;
}

function polar(fraction: number, radius: number) {
  const angle = fraction * Math.PI * 2 - Math.PI / 2;
  return [50 + radius * Math.cos(angle), 50 + radius * Math.sin(angle)];
}

function mixGrupos(groups: GrupoVenda[]) {
  const merged = new Map<string, GrupoVenda>();
  for (const group of groups) {
    const nome = group.nome === "Bolos" || group.nome === "Tortas" ? "Bolos e tortas" : group.nome;
    const current = merged.get(nome);
    if (!current) {
      merged.set(nome, { ...group, nome, cor: nome === "Bolos e tortas" ? "#c96852" : group.cor });
      continue;
    }
    const valor = current.valor + group.valor;
    const custo = current.custo + group.custo;
    merged.set(nome, {
      ...current,
      valor,
      custo,
      pedidos: current.pedidos + group.pedidos,
      lucro: valor - custo,
      lucroPercent: valor > 0 ? ((valor - custo) / valor) * 100 : 0,
    });
  }
  const sorted = [...merged.values()].filter((group) => group.valor > 0).sort((a, b) => b.valor - a.valor);
  if (sorted.length <= 4) return sorted;
  const top = sorted.slice(0, 3);
  const rest = sorted.slice(3);
  const valor = rest.reduce((sum, group) => sum + group.valor, 0);
  const custo = rest.reduce((sum, group) => sum + group.custo, 0);
  const pedidos = rest.reduce((sum, group) => sum + group.pedidos, 0);
  return [
    ...top,
    {
      id: 0,
      nome: "Outros produtos",
      cor: "#8ba5c4",
      valor,
      custo,
      pedidos,
      lucro: valor - custo,
      lucroPercent: valor > 0 ? ((valor - custo) / valor) * 100 : 0,
    },
  ];
}

function pieSlices(groups: GrupoVenda[]) {
  const slices = groups.filter((group) => group.valor > 0);
  const total = slices.reduce((sum, group) => sum + group.valor, 0);
  let cursor = 0;
  return slices.map((group) => {
    const start = cursor;
    const fraction = total > 0 ? group.valor / total : 0;
    cursor += fraction;
    return { ...group, start, end: cursor, fraction };
  });
}

function PiePaths({ groups }: { groups: GrupoVenda[] }) {
  const paths = pieSlices(groups);
  return (
    <>
      {paths.map((slice) => {
        if (slice.fraction >= 0.999) {
          return <circle key={slice.id} cx="50" cy="50" r="40" fill={slice.cor} />;
        }
        const [x1, y1] = polar(slice.start, 40);
        const [x2, y2] = polar(slice.end, 40);
        const large = slice.fraction > 0.5 ? 1 : 0;
        return (
          <path
            key={slice.id}
            d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${large} 1 ${x2} ${y2} Z`}
            fill={slice.cor}
          />
        );
      })}
      <circle cx="50" cy="50" r="24" fill="var(--c-surface)" />
    </>
  );
}

function PieChart({ groups }: { groups: GrupoVenda[] }) {
  const total = groups.reduce((sum, group) => sum + group.valor, 0);
  if (total <= 0) {
    return <div className="pie-empty">Sem vendas neste período para montar o gráfico.</div>;
  }
  return (
    <svg className="pie-svg" viewBox="0 0 100 100" aria-label="Vendas por grupo de produto">
      <PiePaths groups={groups} />
    </svg>
  );
}

function DonutChart({ groups, total }: { groups: GrupoVenda[]; total: number }) {
  if (total <= 0) {
    return <div className="pie-empty">Sem vendas neste período para montar o gráfico.</div>;
  }
  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 100 100" aria-label="Vendas por grupo de produto">
        <PiePaths groups={groups} />
      </svg>
      <div className="donut-center">
        <strong>{compactMoney(total)}</strong>
        <span>vendas totais</span>
      </div>
    </div>
  );
}

function Spark({ values, tone }: { values: number[]; tone: "peach" | "blue" | "mint" }) {
  const bars = values.slice(-6);
  const max = Math.max(...bars, 1);
  return (
    <div className={`period-spark ${tone}`} aria-hidden>
      {bars.map((value, index) => (
        <i key={index} style={{ height: `${16 + (value / max) * 26}px` }} />
      ))}
    </div>
  );
}

function PeriodCard({
  label,
  resumo,
  delta,
  spark,
  icon,
  tone,
}: {
  label: string;
  resumo: ResumoPeriodo;
  delta: number | null;
  spark: number[];
  icon: ReactNode;
  tone: "peach" | "blue" | "mint";
}) {
  return (
    <article className="period-card">
      <header>
        <span>{label}</span>
        <i className="period-card-icon">{icon}</i>
      </header>
      <strong>{money(resumo.valor)}</strong>
      <footer>
        <em>{resumo.pedidos} pedidos</em>
        {delta == null ? null : (
          <small className={delta >= 0 ? "positive" : "negative"}>
            {delta >= 0 ? <TrendingUp size={12} /> : null}
            {signedPercent(delta)}
          </small>
        )}
      </footer>
      <Spark values={spark} tone={tone} />
    </article>
  );
}

function SalesChart({ series }: { series: PontoSerie[] }) {
  const values = series.map((point) => point.valor);
  const max = Math.max(...values, 1);
  const last = series[series.length - 1];
  const points = values
    .map((value, index) => {
      const x = series.length === 1 ? 50 : (index / (series.length - 1)) * 100;
      const y = 100 - (value / max) * 82 - 5;
      return `${x},${y}`;
    })
    .join(" ");
  const topLabels = [max, max * 0.66, max * 0.33, 0].map((value) =>
    value >= 1000 ? `${Math.round(value / 1000)}k` : `${Math.round(value)}`,
  );

  return (
    <div className="sales-chart">
      <div className="chart-y">
        {topLabels.map((label, index) => (
          <span key={`${label}-${index}`}>{label}</span>
        ))}
      </div>
      <div className="chart-core">
        <div className="chart-grid-lines">
          <i />
          <i />
          <i />
          <i />
        </div>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Gráfico de vendas">
          <defs>
            <linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="var(--c-primary)" stopOpacity="0.26" />
              <stop offset="1" stopColor="var(--c-primary)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon points={`0,100 ${points} 100,100`} fill="url(#chartFill)" />
          <polyline
            points={points}
            fill="none"
            stroke="var(--c-primary)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {last ? (
          <>
            <div className="chart-tooltip">
              <span>{last.label}</span>
              <strong>{money(last.valor)}</strong>
            </div>
            <div className="chart-dot" style={{ left: "100%", top: "0%" }} />
          </>
        ) : null}
        <div className="chart-x">
          {series.map((point) => (
            <span key={point.chave}>{point.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function GroupProfitCard({ group, share }: { group: GrupoVenda; share: number }) {
  return (
    <article className="group-profit-card">
      <header>
        <i style={{ background: group.cor }} />
        <div>
          <strong>{group.nome}</strong>
          <span>{percent(share)} das vendas</span>
        </div>
      </header>
      <dl>
        <div>
          <dt>Valor vendido</dt>
          <dd>{money(group.valor)}</dd>
        </div>
        <div>
          <dt>Custo</dt>
          <dd>{money(group.custo)}</dd>
        </div>
        <div>
          <dt>% de lucro</dt>
          <dd className={group.lucroPercent >= 0 ? "positive" : "attention"}>{percent(group.lucroPercent)}</dd>
        </div>
      </dl>
    </article>
  );
}

export function DashboardPage({
  onAction,
  onNavigate,
  userName,
}: {
  onAction: (message: string) => void;
  onNavigate: (page: PageKey) => void;
  userName: string;
}) {
  const [tab, setTab] = useState<DashTab>("geral");
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [dia, setDia] = useState<ResumoPeriodo | null>(null);
  const [mes, setMes] = useState<ResumoPeriodo | null>(null);
  const [ano, setAno] = useState<ResumoPeriodo | null>(null);
  const [variacoes, setVariacoes] = useState({ dia: null as number | null, mes: null as number | null, ano: null as number | null });
  const [sparks, setSparks] = useState({ dia: [] as number[], mes: [] as number[], ano: [] as number[] });
  const [gruposAno, setGruposAno] = useState<GrupoVenda[]>([]);
  const [serieMensal, setSerieMensal] = useState<PontoSerie[]>([]);
  const [de, setDe] = useState(monthStartISO);
  const [ate, setAte] = useState(localISODate);
  const [customResumo, setCustomResumo] = useState<ResumoPeriodo | null>(null);
  const [customGrupos, setCustomGrupos] = useState<GrupoVenda[]>([]);
  const [customLoading, setCustomLoading] = useState(false);
  const [hojeLoading, setHojeLoading] = useState(false);
  const [aniversariantes, setAniversariantes] = useState<Aniversariante[]>([]);
  const [mensagemAniversario, setMensagemAniversario] = useState<Mensagem | null>(null);
  const [empresaNome, setEmpresaNome] = useState("");

  useEffect(() => {
    let active = true;
    fetchDashboardResumo()
      .then((data) => {
        if (!active) return;
        setDia(data.dia);
        setMes(data.mes);
        setAno(data.ano);
        setVariacoes(data.variacao);
        setSparks(data.sparks);
        setGruposAno(data.gruposAno);
        setSerieMensal(data.serieMensal);
        setErro("");
      })
      .catch((error) => {
        if (!active) return;
        setErro(error instanceof Error ? error.message : "Não foi possível carregar o dashboard.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function loadPeriodo(from = de, to = ate) {
    setCustomLoading(true);
    try {
      const data = await fetchDashboardPeriodo(from, to);
      setCustomResumo(data.resumo);
      setCustomGrupos(data.grupos);
      setErro("");
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível carregar o período.");
    } finally {
      setCustomLoading(false);
    }
  }

  useEffect(() => {
    if (tab !== "hoje") return;
    let active = true;
    setHojeLoading(true);
    fetchDashboardHoje()
      .then((data) => {
        if (!active) return;
        setAniversariantes(data.aniversariantes);
        setMensagemAniversario(data.mensagemAniversario);
        setEmpresaNome(data.empresaNome);
        setErro("");
      })
      .catch((error) => {
        if (active) setErro(error instanceof Error ? error.message : "N\u00e3o foi poss\u00edvel carregar o dia.");
      })
      .finally(() => {
        if (active) setHojeLoading(false);
      });
    return () => {
      active = false;
    };
  }, [tab]);

  useEffect(() => {
    if (tab !== "periodo") return;
    void loadPeriodo();
  }, [tab]);

  const mix = useMemo(() => mixGrupos(gruposAno), [gruposAno]);
  const mixTotal = mix.reduce((sum, group) => sum + group.valor, 0);
  const customTotal = useMemo(
    () => customGrupos.reduce((sum, group) => sum + group.valor, 0),
    [customGrupos],
  );
  const serieTotal = serieMensal.reduce((sum, point) => sum + point.valor, 0);
  const serieCrescimento =
    serieMensal.length > 1 ? ((serieMensal.at(-1)!.valor - serieMensal[0].valor) / Math.max(serieMensal[0].valor, 1)) * 100 : 0;
  const meta = 25000;
  const metaPercent = mes ? Math.min(100, (mes.valor / meta) * 100) : 0;
  const metaFalta = mes ? Math.max(0, meta - mes.valor) : meta;

  return (
    <>
      <section className="page-heading dashboard-heading">
        <div>
          <h1>
            {greeting()}, {userName} <span>✦</span>
          </h1>
          <p>Entenda o ritmo do seu ateliê e tome decisões com mais clareza.</p>
        </div>
        <div className="heading-actions">
          <button className="button secondary" onClick={() => onAction("Relatório exportado para demonstração")}>
            <Download size={16} /> Exportar relatório
          </button>
          <button className="button primary" onClick={() => onAction("Novo pedido pronto para ser preenchido")}>
            <Plus size={17} /> Novo pedido
          </button>
        </div>
      </section>

      <div className="dash-tabs-row">
        <div className="dash-tabs">
          <button className={tab === "geral" ? "active" : ""} onClick={() => setTab("geral")}>
            <LayoutDashboard size={14} /> Resumo geral
          </button>
          <button className={tab === "hoje" ? "active" : ""} onClick={() => setTab("hoje")}>
            <Cake size={14} /> Hoje & Aniversários
          </button>
          <button
            className={tab === "periodo" ? "active" : ""}
            onClick={() => {
              setTab("periodo");
              if (!customResumo) setCustomLoading(true);
            }}
          >
            Períodos personalizáveis
          </button>
        </div>
        <span className="demo-tag">Dados demonstrativos</span>
      </div>

      {erro ? <div className="login-error dash-error">{erro}</div> : null}

      {tab === "hoje" ? (
        hojeLoading ? (
          <div className="dash-loading">Carregando o dia...</div>
        ) : (
          <section className="content-grid today-grid">
            <div className="panel birthday-panel">
              <div className="panel-heading">
                <div>
                  <div className="section-kicker">Celebrar</div>
                  <h2>Aniversariantes do dia</h2>
                </div>
                <span className="birthday-count">{aniversariantes.length}</span>
              </div>
              {aniversariantes.length === 0 ? (
                <p className="today-empty">Nenhum aniversariante na equipe hoje.</p>
              ) : (
                <ul className="birthday-list">
                  {aniversariantes.map((pessoa) => {
                    const celularOk = digits(pessoa.celular).length >= 10;
                    const texto = applyMessageTemplate(mensagemAniversario?.texto ?? "", {
                      nome: pessoa.nome.split(/\s+/)[0] ?? pessoa.nome,
                      empresa: empresaNome,
                    });
                    return (
                      <li key={pessoa.id}>
                        <div className={`employee-avatar ${pessoa.id % 3 === 0 ? "coral" : pessoa.id % 3 === 1 ? "sage" : "lavender"}`}>
                          {iniciais(pessoa.nome)}
                        </div>
                        <div className="birthday-copy">
                          <strong>{pessoa.nome}</strong>
                          <span>
                            {pessoa.idade} anos
                            {pessoa.origem === "funcionario" ? " · equipe" : ""}
                          </span>
                        </div>
                        {celularOk ? (
                          <a
                            className="whatsapp-fab"
                            href={whatsappUrl(pessoa.celular, texto)}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`Parabenizar ${pessoa.nome} no WhatsApp`}
                            title="Enviar mensagem de anivers\u00e1rio"
                          >
                            <WhatsAppIcon size={16} />
                          </a>
                        ) : (
                          <span className="whatsapp-fab is-disabled" title="Sem celular cadastrado">
                            <WhatsAppIcon size={16} />
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>
        )
      ) : null}

      {tab === "geral" ? (
        loading || !dia || !mes || !ano ? (
          <div className="dash-loading">Carregando resumo do ateliê...</div>
        ) : (
          <>
            <section className="stat-grid dash-summary-grid">
              <PeriodCard
                label={todayLabel()}
                resumo={dia}
                delta={variacoes.dia}
                spark={sparks.dia}
                tone="peach"
                icon={<Clock size={14} />}
              />
              <PeriodCard
                label={monthLabel()}
                resumo={mes}
                delta={variacoes.mes}
                spark={sparks.mes}
                tone="blue"
                icon={<CalendarDays size={14} />}
              />
              <PeriodCard
                label={yearLabel()}
                resumo={ano}
                delta={variacoes.ano}
                spark={sparks.ano}
                tone="mint"
                icon={<Archive size={14} />}
              />
            </section>

            <section className="content-grid top-grid">
              <div className="panel sales-panel">
                <div className="panel-heading">
                  <div>
                    <div className="section-kicker">Desempenho financeiro</div>
                    <h2>Vendas ao longo do tempo</h2>
                  </div>
                  <button className="select-pill" onClick={() => onAction("Período alterado: últimos 12 meses")}>
                    Últimos 12 meses
                  </button>
                </div>
                <div className="chart-summary">
                  <strong>{money(serieTotal)}</strong>
                  <span className={serieCrescimento >= 0 ? "positive" : "negative"}>
                    <TrendingUp size={14} /> {signedPercent(serieCrescimento)}
                  </span>
                  <small>crescimento acumulado</small>
                </div>
                <SalesChart series={serieMensal} />
              </div>

              <div className="panel mix-panel">
                <div className="panel-heading">
                  <div>
                    <div className="section-kicker">Mix de produtos</div>
                    <h2>Vendas por grupo</h2>
                  </div>
                  <button className="round-action" onClick={() => onNavigate("relatorios")} aria-label="Abrir relatórios">
                    <TrendingUp size={16} />
                  </button>
                </div>
                <DonutChart groups={mix} total={mixTotal} />
                <ul className="mix-legend">
                  {mix.map((group) => (
                    <li key={group.id || group.nome}>
                      <span className="mix-name">
                        <i style={{ background: group.cor }} />
                        {group.nome}
                      </span>
                      <strong>{mixTotal > 0 ? percent((group.valor / mixTotal) * 100) : "0,0%"}</strong>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="content-grid bottom-grid">
              <div className="panel orders-panel">
                <div className="panel-heading">
                  <div>
                    <div className="section-kicker">Acompanhe de perto</div>
                    <h2>Pedidos recentes</h2>
                  </div>
                  <button className="text-button" onClick={() => onNavigate("pedidos")}>
                    Ver todos <TrendingUp size={14} />
                  </button>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Pedido</th>
                        <th>Cliente</th>
                        <th>Entrega / retirada</th>
                        <th>Valor</th>
                        <th>Status</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {RECENT_ORDERS.map((order) => (
                        <tr key={order.id}>
                          <td>
                            <strong className="order-id">{order.id}</strong>
                            <span className="table-sub">{order.product}</span>
                          </td>
                          <td>{order.client}</td>
                          <td>
                            <span className="date-cell">
                              <Clock size={13} />
                              {order.date}
                            </span>
                          </td>
                          <td>
                            <strong>{order.value}</strong>
                          </td>
                          <td>
                            <span className={`status status-${order.tone}`}>
                              <i />
                              {order.status}
                            </span>
                          </td>
                          <td>
                            <button className="table-more" onClick={() => onAction(`Detalhes do pedido ${order.id}`)}>
                              <MoreHorizontal size={17} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="panel insights-panel">
                <div className="panel-heading">
                  <div>
                    <div className="section-kicker">Visão rápida</div>
                    <h2>Indicadores do mês</h2>
                  </div>
                  <button className="round-action" onClick={() => onNavigate("relatorios")}>
                    <TrendingUp size={16} />
                  </button>
                </div>
                <div className="insight-item">
                  <div className="insight-icon peach">
                    <Receipt size={17} />
                  </div>
                  <div className="insight-copy">
                    <span>Ticket médio</span>
                    <strong>{money(mes.ticket)}</strong>
                  </div>
                  <span className="positive">+8,2%</span>
                </div>
                <div className="insight-item">
                  <div className="insight-icon lilac">
                    <Heart size={17} />
                  </div>
                  <div className="insight-copy">
                    <span>Clientes recorrentes</span>
                    <strong>68%</strong>
                  </div>
                  <span className="positive">+4,6%</span>
                </div>
                <div className="insight-item">
                  <div className="insight-icon mint">
                    <Wallet size={17} />
                  </div>
                  <div className="insight-copy">
                    <span>Margem média</span>
                    <strong>{percent(mes.lucroPercent)}</strong>
                  </div>
                  <span className={mes.lucroPercent >= 40 ? "positive" : "negative"}>
                    {mes.lucroPercent >= 40 ? "+0,8%" : "−1,3%"}
                  </span>
                </div>
                <div className="goal-box">
                  <div>
                    <span>Meta de vendas</span>
                    <strong>{money(meta)}</strong>
                  </div>
                  <span className="goal-percent">{percent(metaPercent)}</span>
                  <div className="goal-track">
                    <i style={{ width: `${metaPercent}%` }} />
                  </div>
                  <small>
                    {metaFalta > 0 ? `Faltam ${money(metaFalta)} para alcançar a meta` : "Meta do mês alcançada"}
                  </small>
                </div>
              </div>
            </section>
          </>
        )
      ) : tab === "periodo" ? (
        customLoading && !customResumo ? (
        <div className="dash-loading">Carregando o período escolhido...</div>
      ) : (
        <>
          <section className="panel period-filter">
            <div>
              <div className="section-kicker">Recorte livre</div>
              <h2>Escolha o período</h2>
            </div>
            <form
              className="period-fields"
              onSubmit={(event) => {
                event.preventDefault();
                void loadPeriodo();
              }}
            >
              <label>
                <span>De</span>
                <input type="date" value={de} onChange={(event) => setDe(event.target.value)} />
              </label>
              <label>
                <span>Até</span>
                <input type="date" value={ate} onChange={(event) => setAte(event.target.value)} />
              </label>
              <button className="button primary" type="submit" disabled={customLoading}>
                <CalendarRange size={16} />
                {customLoading ? "Atualizando..." : "Aplicar período"}
              </button>
            </form>
          </section>

          {customResumo ? (
            <section className="stat-grid dash-summary-grid">
              <article className="stat-card dash-summary-card">
                <div className="stat-icon coral">
                  <Wallet size={18} />
                </div>
                <div className="stat-copy">
                  <span>Vendas no período</span>
                  <strong>{money(customResumo.valor)}</strong>
                  <small>
                    {customResumo.pedidos} pedidos · ticket {money(customResumo.ticket)}
                  </small>
                </div>
              </article>
              <article className="stat-card dash-summary-card">
                <div className="stat-icon amber">
                  <Receipt size={18} />
                </div>
                <div className="stat-copy">
                  <span>Custo no período</span>
                  <strong>{money(customResumo.custo)}</strong>
                  <small>insumos e produção atribuídos</small>
                </div>
              </article>
              <article className="stat-card dash-summary-card">
                <div className="stat-icon blue">
                  <TrendingUp size={18} />
                </div>
                <div className="stat-copy">
                  <span>Lucro no período</span>
                  <strong>{money(customResumo.lucro)}</strong>
                  <small className={customResumo.lucro >= 0 ? "positive" : "attention"}>
                    margem de {percent(customResumo.lucroPercent)}
                  </small>
                </div>
              </article>
            </section>
          ) : null}

          <section className="content-grid pie-grid custom-period-grid">
            <div className="panel pie-panel">
              <div className="panel-heading">
                <div>
                  <div className="section-kicker">Participação</div>
                  <h2>Vendas por grupo</h2>
                </div>
              </div>
              <PieChart groups={customGrupos} />
            </div>
            <div className="group-profit-list">
              {customGrupos.map((group) => (
                <GroupProfitCard
                  key={group.id}
                  group={group}
                  share={customTotal > 0 ? (group.valor / customTotal) * 100 : 0}
                />
              ))}
            </div>
          </section>
        </>
        )
      ) : null}
    </>
  );
}
