/**
 * ============================================================================
 * PROJETO: Doce Gestor - Sistema de Gestão para Confeitarias
 * REPOSITÓRIO: https://github.com/junin1737/confeitaria
 * ARQUIVO: src/pages/AppPages.tsx
 * DESCRIÇÃO: Telas de apoio, resumos de evolução de colaboradores e placeholders.
 * ============================================================================
 */

import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Cake,
  ChefHat,
  CircleDollarSign,
  ClipboardList,
  Clock,
  CreditCard,
  FileText,
  Heart,
  Package,
  Settings,
  ShoppingCart,
  Sparkles,
  Store,
  TrendingUp,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import { EVOLUTION_BARS } from "../data";

export function EmployeeSummary({ onAction }: { onAction: (message: string) => void }) {
  return (
    <div className="employee-summary">
      <div className="detail-stat-grid">
        <div>
          <span>Salário fixo</span>
          <strong>R$ 2.400,00</strong>
          <small>vigente desde jan/24</small>
        </div>
        <div>
          <span>Comissões no mês</span>
          <strong>R$ 320,40</strong>
          <small className="positive">+12,4% vs. mês anterior</small>
        </div>
        <div>
          <span>Vendas atribuídas</span>
          <strong>R$ 8.420,00</strong>
          <small>32 vendas no período</small>
        </div>
      </div>
      <div className="detail-sections">
        <div className="subpanel">
          <div className="subpanel-head">
            <div>
              <div className="section-kicker">Configuração variável</div>
              <h3>Comissões por pagamento</h3>
            </div>
            <button className="text-button" onClick={() => onAction("Configuração de comissões aberta")}>
              Configurar <TrendingUp size={13} />
            </button>
          </div>
          <p className="subpanel-note">Regras vigentes para vendas atribuídas a Beatriz.</p>
          <div className="commission-list">
            <div>
              <span>
                <CreditCard size={15} /> Cartão
              </span>
              <strong>2,0%</strong>
              <small>desde 01 jan 2024</small>
            </div>
            <div>
              <span>
                <CircleDollarSign size={15} /> PIX
              </span>
              <strong>3,0%</strong>
              <small>desde 01 jan 2024</small>
            </div>
            <div>
              <span>
                <CircleDollarSign size={15} /> Dinheiro
              </span>
              <strong>5,0%</strong>
              <small>desde 01 jan 2024</small>
            </div>
          </div>
        </div>
        <div className="subpanel">
          <div className="subpanel-head">
            <div>
              <div className="section-kicker">Descontos ativos</div>
              <h3>Descontos do funcionário</h3>
            </div>
            <button className="text-button" onClick={() => onAction("Descontos do funcionário abertos")}>
              Gerenciar <TrendingUp size={13} />
            </button>
          </div>
          <div className="discount-row">
            <div className="discount-icon">
              <FileText size={15} />
            </div>
            <div>
              <strong>Vale-transporte</strong>
              <span>Vigente até 31 dez 2024</span>
            </div>
            <b>− R$ 180,00</b>
          </div>
          <div className="discount-row">
            <div className="discount-icon">
              <Heart size={15} />
            </div>
            <div>
              <strong>Plano de saúde</strong>
              <span>Vigente desde 01 fev 2024</span>
            </div>
            <b>− R$ 120,00</b>
          </div>
        </div>
      </div>
      <div className="history-strip">
        <div className="history-icon">
          <Clock size={16} />
        </div>
        <div>
          <strong>Histórico preservado</strong>
          <span>Alterações futuras não modificam vendas ou folhas já fechadas.</span>
        </div>
        <button className="text-button" onClick={() => onAction("Histórico completo aberto")}>
          Ver histórico <TrendingUp size={13} />
        </button>
      </div>
    </div>
  );
}

export function EmployeeEvolution({
  period,
  setPeriod,
}: {
  period: string;
  setPeriod: (value: string) => void;
}) {
  const periods = ["Últimos 30 dias", "Últimos 3 meses", "Últimos 6 meses", "Último ano"];

  return (
    <div className="evolution-view">
      <div className="evolution-toolbar">
        <div>
          <div className="section-kicker">Performance individual</div>
          <h3>Acompanhe a evolução de Beatriz</h3>
        </div>
        <select value={period} onChange={(event) => setPeriod(event.target.value)}>
          {periods.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </div>
      <div className="evolution-cards">
        <div className="evo-card">
          <span>Vendas no período</span>
          <strong>R$ 42.860</strong>
          <small className="positive">
            <TrendingUp size={13} /> 14,8%
          </small>
        </div>
        <div className="evo-card">
          <span>Comissões geradas</span>
          <strong>R$ 1.684</strong>
          <small className="positive">
            <TrendingUp size={13} /> 9,2%
          </small>
        </div>
        <div className="evo-card">
          <span>Vendas com comissão</span>
          <strong>148</strong>
          <small>média de 24,6 / mês</small>
        </div>
      </div>
      <div className="panel inner-chart-panel">
        <div className="panel-heading">
          <div>
            <div className="section-kicker">Vendas atribuídas</div>
            <h2>Ritmo de vendas</h2>
          </div>
          <div className="legend">
            <i /> Vendas <i className="legend-commission" /> Comissões
          </div>
        </div>
        <div className="evolution-chart">
          <div className="evolution-bars">
            {EVOLUTION_BARS.map((value, index) => (
              <div className="bar-group" key={index}>
                <i style={{ height: `${value}%` }} />
                <b style={{ height: `${value * 0.56}%` }} />
              </div>
            ))}
          </div>
          <div className="chart-x">
            {["Abr", "Mai", "Jun", "Jul", "Ago", "Set"].map((month) => (
              <span key={month}>{month}</span>
            ))}
          </div>
        </div>
      </div>
      <div className="commission-detail">
        <div className="subpanel-head">
          <div>
            <div className="section-kicker">Detalhamento da folha</div>
            <h3>Comissões por venda</h3>
          </div>
          <span className="period-tag">{period}</span>
        </div>
        <div className="commission-table">
          <div>
            <span>Data</span>
            <span>Venda</span>
            <span>Pagamento</span>
            <span>Valor da venda</span>
            <span>Comissão</span>
          </div>
          <div>
            <strong>14 set 2024</strong>
            <span>#1042 · Bolo pistache</span>
            <span className="payment-tag pix">PIX</span>
            <span>R$ 390,00</span>
            <b>R$ 11,70</b>
          </div>
          <div>
            <strong>10 set 2024</strong>
            <span>#1038 · Kit festa</span>
            <span className="payment-tag card">Cartão</span>
            <span>R$ 680,00</span>
            <b>R$ 13,60</b>
          </div>
        </div>
      </div>
    </div>
  );
}

const PLACEHOLDER_ICONS: Record<string, LucideIcon> = {
  pedidos: ClipboardList,
  catalogo: Cake,
  producao: ChefHat,
  compras: ShoppingCart,
  estoque: Package,
  clientes: Users,
  fornecedores: Truck,
  financeiro: Wallet,
  relatorios: BarChart3,
  configuracoes: Settings,
};

export function PlaceholderPage({
  title,
  copy,
  eyebrow,
  items,
  iconKey,
  onAction,
}: {
  title: string;
  copy: string;
  eyebrow: string;
  items: string[];
  iconKey: string;
  onAction: (message: string) => void;
}) {
  const Icon = PLACEHOLDER_ICONS[iconKey] ?? Store;

  return (
    <section className="placeholder-page">
      <div className="placeholder-orb">
        <Icon size={34} />
      </div>
      <div className="eyebrow">
        <span className="eyebrow-dot" /> {eyebrow}
      </div>
      <h1>{title}</h1>
      <p>{copy}</p>
      <div className="placeholder-cards">
        {items.map((item, index) => (
          <div className="placeholder-card" key={item}>
            <div className={`placeholder-card-icon p-${index}`}>
              <Icon size={17} />
            </div>
            <strong>{item}</strong>
            <span>módulo de demonstração</span>
          </div>
        ))}
      </div>
      <button className="button primary" onClick={() => onAction(`Módulo ${title} pronto para detalhamento`)}>
        <Sparkles size={16} /> Explorar módulo
      </button>
      <small className="placeholder-note">
        Este esboço prioriza a arquitetura visual. Os módulos entram na próxima etapa.
      </small>
    </section>
  );
}
