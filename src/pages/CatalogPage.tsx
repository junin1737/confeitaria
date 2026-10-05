/**
 * ============================================================================
 * PROJETO: Doce Gestor - Sistema de Gestão para Confeitarias
 * REPOSITÓRIO: https://github.com/junin1737/confeitaria
 * ARQUIVO: src/pages/CatalogPage.tsx
 * DESCRIÇÃO: FASE 1 — Fichas Técnicas, Engenharia de Custos e Gestão de Insumos.
 * ============================================================================
 * 
 * [FUNCIONALIDADES IMPLEMENTADAS]
 * 1. Gestão de Insumos e Estoque com conversão de compras (Kg/g, L/ml, Un).
 * 2. Cálculo automático de custos invisíveis (gás/energia) e mão de obra da confeiteira.
 * 3. Precificação Inteligente com sugestão de preço e cálculo de margem real.
 * 4. Efeito cascata: alterações em ingredientes refletem nas receitas em tempo real.
 * 5. Indicadores visuais de margem saudável (> 50%), regular (30-50%) ou perigosa (< 30%).
 * ============================================================================
 */

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  ChefHat,
  Clock,
  DollarSign,
  Edit2,
  Package,
  Plus,
  RefreshCw,
  Scale,
  Search,
  Sparkles,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import {
  deleteInsumo,
  deleteReceita,
  fetchInsumos,
  fetchReceitas,
  saveInsumo,
  saveReceita,
  type Insumo,
  type Receita,
  type ReceitaInput,
} from "../api";

export function CatalogPage() {
  const [tab, setTab] = useState<"receitas" | "insumos">("receitas");
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [receitas, setReceitas] = useState<Receita[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState<string>("todos");

  // Modais
  const [modalInsumoAberto, setModalInsumoAberto] = useState(false);
  const [insumoEdicao, setInsumoEdicao] = useState<Insumo | null>(null);

  const [modalReceitaAberto, setModalReceitaAberto] = useState(false);
  const [receitaEdicao, setReceitaEdicao] = useState<Receita | null>(null);
  const [receitaDetalhe, setReceitaDetalhe] = useState<Receita | null>(null);

  // Mensagens e feedback
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);

  // Carregar dados
  const carregarDados = async () => {
    setLoading(true);
    try {
      const [listaInsumos, listaReceitas] = await Promise.all([
        fetchInsumos(),
        fetchReceitas(),
      ]);
      setInsumos(listaInsumos);
      setReceitas(listaReceitas);
    } catch (err: any) {
      setMensagemErro(err?.message || "Erro ao carregar dados do catálogo");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const dispararSucesso = (msg: string) => {
    setMensagemSucesso(msg);
    setTimeout(() => setMensagemSucesso(null), 4000);
  };

  // Exclusão de insumo
  const handleExcluirInsumo = async (insumo: Insumo) => {
    if (!confirm(`Deseja realmente excluir o insumo "${insumo.nome}"?`)) return;
    try {
      await deleteInsumo(insumo.id);
      dispararSucesso("Insumo excluído com sucesso!");
      carregarDados();
    } catch (err: any) {
      alert(err.message || "Não foi possível excluir o insumo.");
    }
  };

  // Exclusão de receita
  const handleExcluirReceita = async (rec: Receita) => {
    if (!confirm(`Deseja realmente excluir a ficha técnica "${rec.nome}"?`)) return;
    try {
      await deleteReceita(rec.id);
      dispararSucesso("Ficha técnica excluída com sucesso!");
      carregarDados();
    } catch (err: any) {
      alert(err.message || "Não foi possível excluir a receita.");
    }
  };

  // Filtros
  const insumosFiltrados = insumos.filter((item) => {
    const bateTexto =
      item.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (item.marca && item.marca.toLowerCase().includes(busca.toLowerCase()));
    const bateCat = filtroCategoria === "todos" || item.categoria === filtroCategoria;
    return bateTexto && bateCat;
  });

  const receitasFiltradas = receitas.filter((rec) => {
    return rec.nome.toLowerCase().includes(busca.toLowerCase());
  });

  // Métricas agregadas
  const totalReceitas = receitas.length;
  const margemMedia =
    receitas.length > 0
      ? Math.round(
          receitas.reduce((acc, r) => acc + (r.margemRealPercentual || 0), 0) /
            receitas.length
        )
      : 0;
  const insumosBaixoEstoque = insumos.filter(
    (i) => i.estoqueMinimo > 0 && i.estoqueAtual <= i.estoqueMinimo
  ).length;

  return (
    <div className="space-y-6">
      {/* Alertas flutuantes */}
      {mensagemSucesso && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-sm animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-medium text-sm">{mensagemSucesso}</span>
        </div>
      )}

      {mensagemErro && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 shadow-sm">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <span className="font-medium text-sm">{mensagemErro}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-stone-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-amber-700 bg-amber-100/80 rounded-full">
              Fase 1 • Custos & Fichas Técnicas
            </span>
          </div>
          <h1 className="text-2xl font-bold text-stone-900 mt-1">
            Cardápio, Receitas & Insumos
          </h1>
          <p className="text-sm text-stone-500 mt-0.5">
            Formação precisa de preços de venda, custos de mão de obra e insumos com efeito cascata.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => carregarDados()}
            disabled={loading}
            className="p-2.5 text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors"
            title="Atualizar dados"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          {tab === "receitas" ? (
            <button
              onClick={() => {
                setReceitaEdicao(null);
                setModalReceitaAberto(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nova Ficha Técnica
            </button>
          ) : (
            <button
              onClick={() => {
                setInsumoEdicao(null);
                setModalInsumoAberto(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              Novo Insumo / Ingrediente
            </button>
          )}
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-stone-400">
              Fichas Cadastradas
            </p>
            <p className="text-2xl font-bold text-stone-900 mt-1">{totalReceitas}</p>
            <p className="text-xs text-stone-500 mt-0.5">Com precificação ativa</p>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <ChefHat className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-stone-400">
              Margem Média Real
            </p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{margemMedia}%</p>
            <p className="text-xs text-stone-500 mt-0.5">Sobre o preço praticado</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-stone-400">
              Estoque de Insumos
            </p>
            <p className="text-2xl font-bold text-stone-900 mt-1">{insumos.length}</p>
            <p className="text-xs text-amber-600 mt-0.5 font-medium">
              {insumosBaixoEstoque > 0
                ? `${insumosBaixoEstoque} insumo(s) em nível crítico`
                : "Todos em nível regular"}
            </p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Boxes className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Abas e Filtros */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Navegação por Abas */}
        <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl self-start">
          <button
            onClick={() => setTab("receitas")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === "receitas"
                ? "bg-white text-stone-900 shadow-xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <ChefHat className="w-4 h-4 text-rose-500" />
            Fichas Técnicas & Receitas ({receitas.length})
          </button>
          <button
            onClick={() => setTab("insumos")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === "insumos"
                ? "bg-white text-stone-900 shadow-xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <Package className="w-4 h-4 text-amber-500" />
            Insumos & Matérias-Primas ({insumos.length})
          </button>
        </div>

        {/* Campo de Busca & Filtro */}
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={
                tab === "receitas"
                  ? "Buscar receita ou produto..."
                  : "Buscar ingrediente, marca ou embalagem..."
              }
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>

          {tab === "insumos" && (
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              className="px-3 py-2 bg-white border border-stone-200 rounded-xl text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            >
              <option value="todos">Todas Categorias</option>
              <option value="ingrediente">Ingredientes</option>
              <option value="embalagem">Embalagens</option>
              <option value="decoracao">Decoração</option>
              <option value="outro">Outros</option>
            </select>
          )}
        </div>
      </div>

      {/* =========================================================================
          ABA 1: FICHAS TÉCNICAS E PRECIFICAÇÃO
          ========================================================================= */}
      {tab === "receitas" && (
        <div className="space-y-4">
          {receitasFiltradas.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
              <ChefHat className="w-12 h-12 text-stone-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-stone-800">
                Nenhuma ficha técnica encontrada
              </h3>
              <p className="text-sm text-stone-500 max-w-md mx-auto mt-1">
                Cadastre suas receitas para calcular automaticamente o custo real por unidade,
                incluindo mão de obra e custos invisíveis.
              </p>
              <button
                onClick={() => {
                  setReceitaEdicao(null);
                  setModalReceitaAberto(true);
                }}
                className="mt-4 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Criar Primeira Ficha Técnica
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {receitasFiltradas.map((rec) => {
                const margemSaudavel = rec.margemRealPercentual >= 50;
                const margemRegular =
                  rec.margemRealPercentual >= 30 && rec.margemRealPercentual < 50;

                return (
                  <div
                    key={rec.id}
                    className="bg-white rounded-2xl border border-stone-200/90 shadow-xs hover:shadow-md transition-shadow flex flex-col overflow-hidden"
                  >
                    {/* Header do Card */}
                    <div className="p-5 border-b border-stone-100 flex-1">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-stone-100 text-stone-600">
                          {rec.grupoNome || "Confeitaria"}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                            margemSaudavel
                              ? "bg-emerald-100 text-emerald-800"
                              : margemRegular
                              ? "bg-amber-100 text-amber-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {rec.margemRealPercentual}% Margem Real
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-stone-900 line-clamp-1">
                        {rec.nome}
                      </h3>
                      {rec.descricao && (
                        <p className="text-xs text-stone-500 line-clamp-2 mt-1">
                          {rec.descricao}
                        </p>
                      )}

                      {/* Dados de Rendimento e Tempo */}
                      <div className="flex items-center gap-4 text-xs text-stone-500 mt-3 pt-3 border-t border-stone-100">
                        <div className="flex items-center gap-1.5">
                          <Scale className="w-3.5 h-3.5 text-stone-400" />
                          <span>
                            Rende: <strong>{rec.rendimentoQuantidade} {rec.rendimentoUnidade}</strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-stone-400" />
                          <span>{rec.tempoPreparoMinutos} min</span>
                        </div>
                      </div>

                      {/* Decomposição de Custos */}
                      <div className="mt-4 p-3 bg-stone-50 rounded-xl space-y-1.5 text-xs">
                        <div className="flex justify-between text-stone-600">
                          <span>Insumos ({rec.itens?.length || 0} itens):</span>
                          <span className="font-medium text-stone-800">
                            R$ {rec.custoInsumos.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between text-stone-600">
                          <span>Mão de Obra ({rec.tempoPreparoMinutos} min):</span>
                          <span className="font-medium text-stone-800">
                            R$ {rec.custoMaoDeObra.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between text-stone-600">
                          <span>Custos Fixos ({rec.percentualCustosFixos}%):</span>
                          <span className="font-medium text-stone-800">
                            R$ {rec.custoFixos.toFixed(2)}
                          </span>
                        </div>
                        <div className="pt-1.5 border-t border-stone-200 flex justify-between font-bold text-stone-900 text-sm">
                          <span>Custo de Produção Total:</span>
                          <span>R$ {rec.custoTotalProducao.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-stone-500 text-[11px]">
                          <span>Custo por unidade ({rec.rendimentoUnidade}):</span>
                          <span className="font-semibold text-stone-700">
                            R$ {rec.custoPorUnidade.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Preços e Ações */}
                    <div className="p-4 bg-stone-50/50 flex items-center justify-between">
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-stone-400 font-medium">
                          Preço Praticado
                        </p>
                        <p className="text-xl font-extrabold text-stone-900">
                          R$ {rec.precoVenda.toFixed(2)}
                        </p>
                        <p className="text-[11px] text-emerald-600 font-medium">
                          Lucro: R$ {rec.lucroRealPorUnidade.toFixed(2)} / un
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setReceitaDetalhe(rec)}
                          className="px-2.5 py-1.5 bg-stone-200/80 hover:bg-stone-300 text-stone-700 rounded-lg text-xs font-semibold transition-colors"
                          title="Ver Ficha Técnica Completa"
                        >
                          Ver Ficha
                        </button>
                        <button
                          onClick={() => {
                            setReceitaEdicao(rec);
                            setModalReceitaAberto(true);
                          }}
                          className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-200 rounded-lg transition-colors"
                          title="Editar Ficha"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleExcluirReceita(rec)}
                          className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Excluir Ficha"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          ABA 2: INSUMOS E MATÉRIAS-PRIMAS
          ========================================================================= */}
      {tab === "insumos" && (
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-stone-600">
              <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-400 border-b border-stone-200">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Insumo / Marca</th>
                  <th className="py-3.5 px-4 font-semibold">Categoria</th>
                  <th className="py-3.5 px-4 font-semibold">Compra & Embalagem</th>
                  <th className="py-3.5 px-4 font-semibold">Preço Pago</th>
                  <th className="py-3.5 px-4 font-semibold">Custo Unitário (Base)</th>
                  <th className="py-3.5 px-4 font-semibold">Estoque Atual</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {insumosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-stone-400">
                      Nenhum insumo encontrado para os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  insumosFiltrados.map((item) => {
                    const baixoEstoque =
                      item.estoqueMinimo > 0 && item.estoqueAtual <= item.estoqueMinimo;

                    return (
                      <tr key={item.id} className="hover:bg-stone-50/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-stone-900">{item.nome}</p>
                          {item.marca && (
                            <p className="text-xs text-stone-400">Marca: {item.marca}</p>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 text-xs font-semibold rounded-md ${
                              item.categoria === "ingrediente"
                                ? "bg-amber-100/70 text-amber-800"
                                : item.categoria === "embalagem"
                                ? "bg-blue-100/70 text-blue-800"
                                : item.categoria === "decoracao"
                                ? "bg-purple-100/70 text-purple-800"
                                : "bg-stone-100 text-stone-700"
                            }`}
                          >
                            {item.categoria}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-stone-800">
                          {item.quantidadeEmbalagem} {item.unidadeCompra}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-stone-900">
                          R$ {item.precoCompra.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-medium text-rose-700">
                          R$ {item.custoUnitario.toFixed(4)} / {item.unidadeMedida}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-semibold ${
                                baixoEstoque ? "text-rose-600 font-bold" : "text-stone-800"
                              }`}
                            >
                              {item.estoqueAtual} {item.unidadeMedida}
                            </span>
                            {baixoEstoque && (
                              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-800 rounded">
                                Repor!
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                setInsumoEdicao(item);
                                setModalInsumoAberto(true);
                              }}
                              className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
                              title="Editar Insumo"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleExcluirInsumo(item)}
                              className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Excluir Insumo"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: CADASTRO / EDIÇÃO DE INSUMO
          ========================================================================= */}
      {modalInsumoAberto && (
        <ModalInsumo
          insumo={insumoEdicao}
          onClose={() => setModalInsumoAberto(false)}
          onSalvo={(msg) => {
            setModalInsumoAberto(false);
            dispararSucesso(msg);
            carregarDados();
          }}
        />
      )}

      {/* =========================================================================
          MODAL: CONSTRUTOR DE FICHA TÉCNICA (RECEITA & PRECIFICAÇÃO)
          ========================================================================= */}
      {modalReceitaAberto && (
        <ModalReceita
          receita={receitaEdicao}
          insumos={insumos}
          onClose={() => setModalReceitaAberto(false)}
          onSalvo={(msg) => {
            setModalReceitaAberto(false);
            dispararSucesso(msg);
            carregarDados();
          }}
        />
      )}

      {/* =========================================================================
          MODAL: VISUALIZAÇÃO DETALHADA DA FICHA TÉCNICA
          ========================================================================= */}
      {receitaDetalhe && (
        <ModalDetalheFicha
          receita={receitaDetalhe}
          onClose={() => setReceitaDetalhe(null)}
          onEditar={() => {
            setReceitaEdicao(receitaDetalhe);
            setReceitaDetalhe(null);
            setModalReceitaAberto(true);
          }}
        />
      )}
    </div>
  );
}

/**
 * ============================================================================
 * [COMPONENTE: ModalInsumo]
 * Criação e edição de ingredientes com conversão de embalagem em tempo real.
 * ============================================================================
 */
function ModalInsumo({
  insumo,
  onClose,
  onSalvo,
}: {
  insumo: Insumo | null;
  onClose: () => void;
  onSalvo: (msg: string) => void;
}) {
  const [nome, setNome] = useState(insumo?.nome || "");
  const [categoria, setCategoria] = useState<Insumo["categoria"]>(
    insumo?.categoria || "ingrediente"
  );
  const [marca, setMarca] = useState(insumo?.marca || "");
  const [unidadeCompra, setUnidadeCompra] = useState<Insumo["unidadeCompra"]>(
    insumo?.unidadeCompra || "g"
  );
  const [unidadeMedida, setUnidadeMedida] = useState<Insumo["unidadeMedida"]>(
    insumo?.unidadeMedida || "g"
  );
  const [quantidadeEmbalagem, setQuantidadeEmbalagem] = useState<number>(
    insumo?.quantidadeEmbalagem || 1000
  );
  const [precoCompra, setPrecoCompra] = useState<number>(insumo?.precoCompra || 10);
  const [estoqueAtual, setEstoqueAtual] = useState<number>(insumo?.estoqueAtual || 0);
  const [estoqueMinimo, setEstoqueMinimo] = useState<number>(insumo?.estoqueMinimo || 0);
  const [salvando, setSalvando] = useState(false);

  // Pré-visualização do custo unitário
  let custoUnitarioPreview = 0;
  if (quantidadeEmbalagem > 0 && precoCompra > 0) {
    if (unidadeCompra === "kg" && unidadeMedida === "g") {
      custoUnitarioPreview = precoCompra / (quantidadeEmbalagem * 1000);
    } else if (unidadeCompra === "l" && unidadeMedida === "ml") {
      custoUnitarioPreview = precoCompra / (quantidadeEmbalagem * 1000);
    } else {
      custoUnitarioPreview = precoCompra / quantidadeEmbalagem;
    }
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return alert("Informe o nome do insumo.");
    if (quantidadeEmbalagem <= 0) return alert("Quantidade da embalagem deve ser maior que zero.");
    if (precoCompra <= 0) return alert("Preço de compra deve ser maior que zero.");

    setSalvando(true);
    try {
      await saveInsumo({
        id: insumo?.id,
        nome,
        categoria,
        marca: marca.trim() || undefined,
        unidadeCompra,
        unidadeMedida,
        quantidadeEmbalagem,
        precoCompra,
        estoqueAtual,
        estoqueMinimo,
      });
      onSalvo(insumo ? "Insumo atualizado com sucesso!" : "Novo insumo cadastrado com sucesso!");
    } catch (err: any) {
      alert(err.message || "Erro ao salvar insumo.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-stone-200 overflow-hidden animate-scale-in">
        <div className="flex items-center justify-between p-5 border-b border-stone-100 bg-stone-50/60">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-600" />
            <h2 className="font-bold text-stone-900 text-lg">
              {insumo ? "Editar Insumo" : "Novo Insumo / Ingrediente"}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 text-stone-400 hover:text-stone-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSalvar} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1">
              Nome do Insumo *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Leite Condensado 395g, Farinha de Trigo..."
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full px-3.5 py-2 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1">
                Categoria
              </label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value as any)}
                className="w-full px-3.5 py-2 border border-stone-200 rounded-xl text-sm bg-white"
              >
                <option value="ingrediente">Ingrediente</option>
                <option value="embalagem">Embalagem</option>
                <option value="decoracao">Decoração</option>
                <option value="outro">Outro</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1">
                Marca / Fornecedor
              </label>
              <input
                type="text"
                placeholder="Ex: Nestlé, Callebaut..."
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
                className="w-full px-3.5 py-2 border border-stone-200 rounded-xl text-sm"
              >
              </input>
            </div>
          </div>

          <div className="p-4 bg-amber-50/70 rounded-xl border border-amber-200/60 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900">
              Conversão de Embalagem & Preço Pago
            </h4>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-amber-800 mb-1">
                  Qtd Embalagem
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.001"
                  required
                  value={quantidadeEmbalagem}
                  onChange={(e) => setQuantidadeEmbalagem(Number(e.target.value))}
                  className="w-full px-3 py-1.5 border border-amber-200 rounded-lg text-sm bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-amber-800 mb-1">
                  Unid. Compra
                </label>
                <select
                  value={unidadeCompra}
                  onChange={(e) => {
                    const u = e.target.value as any;
                    setUnidadeCompra(u);
                    if (u === "kg") setUnidadeMedida("g");
                    else if (u === "l") setUnidadeMedida("ml");
                    else setUnidadeMedida(u);
                  }}
                  className="w-full px-3 py-1.5 border border-amber-200 rounded-lg text-sm bg-white"
                >
                  <option value="g">gramas (g)</option>
                  <option value="kg">quilos (kg)</option>
                  <option value="ml">mililitros (ml)</option>
                  <option value="l">litros (L)</option>
                  <option value="un">unidades (un)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-amber-800 mb-1">
                  Preço Pago (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={precoCompra}
                  onChange={(e) => setPrecoCompra(Number(e.target.value))}
                  className="w-full px-3 py-1.5 border border-amber-200 rounded-lg text-sm bg-white font-bold text-stone-900"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-amber-200/80 flex items-center justify-between text-xs text-amber-900">
              <span>Custo base na receita:</span>
              <span className="font-mono font-bold text-amber-950 text-sm">
                R$ {custoUnitarioPreview.toFixed(4)} / {unidadeMedida}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1">
                Estoque Atual ({unidadeMedida})
              </label>
              <input
                type="number"
                step="any"
                value={estoqueAtual}
                onChange={(e) => setEstoqueAtual(Number(e.target.value))}
                className="w-full px-3.5 py-2 border border-stone-200 rounded-xl text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1">
                Estoque Mínimo ({unidadeMedida})
              </label>
              <input
                type="number"
                step="any"
                value={estoqueMinimo}
                onChange={(e) => setEstoqueMinimo(Number(e.target.value))}
                className="w-full px-3.5 py-2 border border-stone-200 rounded-xl text-sm"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-stone-600 hover:text-stone-900 font-semibold text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-semibold text-sm shadow-xs transition-colors"
            >
              {salvando ? "Salvando..." : insumo ? "Salvar Alterações" : "Cadastrar Insumo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * ============================================================================
 * [COMPONENTE: ModalReceita]
 * Construtor completo de Ficha Técnica, Engenharia de Custos e Precificação.
 * ============================================================================
 */
function ModalReceita({
  receita,
  insumos,
  onClose,
  onSalvo,
}: {
  receita: Receita | null;
  insumos: Insumo[];
  onClose: () => void;
  onSalvo: (msg: string) => void;
}) {
  const [nome, setNome] = useState(receita?.nome || "");
  const [descricao, setDescricao] = useState(receita?.descricao || "");
  const [rendimentoQtd, setRendimentoQtd] = useState<number>(
    receita?.rendimentoQuantidade || 1
  );
  const [rendimentoUnidade, setRendimentoUnidade] = useState<string>(
    receita?.rendimentoUnidade || "unidade"
  );
  const [tempoPreparoMinutos, setTempoPreparoMinutos] = useState<number>(
    receita?.tempoPreparoMinutos || 60
  );
  const [custoHoraTrabalho, setCustoHoraTrabalho] = useState<number>(
    receita?.custoHoraTrabalho ?? 20
  );
  const [percentualCustosFixos, setPercentualCustosFixos] = useState<number>(
    receita?.percentualCustosFixos ?? 15
  );
  const [margemLucroDesejada, setMargemLucroDesejada] = useState<number>(
    receita?.margemLucroDesejada ?? 100
  );
  const [precoVendaPraticado, setPrecoVendaPraticado] = useState<number>(
    receita?.precoVenda || 0
  );
  const [modoPreparo, setModoPreparo] = useState(receita?.modoPreparo || "");

  // Lista de itens da receita
  const [itens, setItens] = useState<
    { insumoId: number; quantidade: number; unidade: string }[]
  >(
    receita?.itens?.map((it) => ({
      insumoId: it.insumoId,
      quantidade: it.quantidade,
      unidade: it.unidade,
    })) || []
  );

  const [salvando, setSalvando] = useState(false);

  // Adicionar linha de ingrediente
  const handleAdicionarIngrediente = () => {
    if (insumos.length === 0) return alert("Cadastre insumos primeiro!");
    const primeiro = insumos[0];
    setItens([
      ...itens,
      {
        insumoId: primeiro.id,
        quantidade: primeiro.unidadeMedida === "un" ? 1 : 100,
        unidade: primeiro.unidadeMedida,
      },
    ]);
  };

  const handleRemoverIngrediente = (index: number) => {
    setItens(itens.filter((_, i) => i !== index));
  };

  const handleAlterarItem = (index: number, campo: string, valor: any) => {
    const novos = [...itens];
    const itemAtual = { ...novos[index], [campo]: valor };

    if (campo === "insumoId") {
      const insumoSel = insumos.find((i) => i.id === Number(valor));
      if (insumoSel) {
        itemAtual.unidade = insumoSel.unidadeMedida;
      }
    }

    novos[index] = itemAtual;
    setItens(novos);
  };

  // Cálculo das métricas em tempo real no cliente
  const custoInsumosTotal = itens.reduce((acc, it) => {
    const ins = insumos.find((i) => i.id === Number(it.insumoId));
    if (!ins) return acc;
    return acc + Number(it.quantidade) * Number(ins.custoUnitario);
  }, 0);

  const custoMaoDeObra = (tempoPreparoMinutos / 60) * custoHoraTrabalho;
  const custoDiretoTotal = custoInsumosTotal + custoMaoDeObra;
  const custoFixosIndiretos = custoDiretoTotal * (percentualCustosFixos / 100);
  const custoTotalProducao = custoDiretoTotal + custoFixosIndiretos;
  const rendimentoValido = Math.max(1, rendimentoQtd);
  const custoPorUnidade = custoTotalProducao / rendimentoValido;

  const precoSugeridoTotal = custoTotalProducao * (1 + margemLucroDesejada / 100);
  const precoSugeridoPorUnidade = precoSugeridoTotal / rendimentoValido;

  const precoCobrado = precoVendaPraticado > 0 ? precoVendaPraticado : precoSugeridoPorUnidade;
  const lucroRealPorUnidade = precoCobrado - custoPorUnidade;
  const margemLucroRealPercent =
    custoPorUnidade > 0
      ? Math.round((lucroRealPorUnidade / custoPorUnidade) * 100)
      : 0;

  // Sincroniza precoVenda sugerido se for receita nova e estiver em zero
  useEffect(() => {
    if (!receita && precoVendaPraticado === 0 && precoSugeridoPorUnidade > 0) {
      setPrecoVendaPraticado(Math.round(precoSugeridoPorUnidade * 100) / 100);
    }
  }, [precoSugeridoPorUnidade]);

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return alert("Informe o nome da receita.");
    if (itens.length === 0) return alert("Adicione pelo menos um ingrediente ou embalagem.");

    setSalvando(true);
    try {
      const payload: ReceitaInput = {
        id: receita?.id,
        nome,
        descricao,
        rendimentoQuantidade: rendimentoValido,
        rendimentoUnidade,
        tempoPreparoMinutos,
        custoHoraTrabalho,
        percentualCustosFixos,
        margemLucroDesejada,
        precoVenda: precoCobrado,
        modoPreparo,
        status: "ativo",
        itens,
      };

      await saveReceita(payload);
      onSalvo(
        receita
          ? "Ficha técnica atualizada com sucesso!"
          : "Ficha técnica cadastrada com sucesso!"
      );
    } catch (err: any) {
      alert(err.message || "Erro ao salvar receita.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-stone-200 overflow-hidden my-8 animate-scale-in">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-5 border-b border-stone-100 bg-stone-50/70">
          <div className="flex items-center gap-2">
            <ChefHat className="w-5 h-5 text-rose-600" />
            <h2 className="font-bold text-stone-900 text-lg">
              {receita ? "Editar Ficha Técnica & Precificação" : "Nova Ficha Técnica & Precificação"}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 text-stone-400 hover:text-stone-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSalvar} className="p-6 space-y-6">
          {/* Seção 1: Identificação Básica */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1">
                Nome da Receita / Produto *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Bolo Vulcão Ninho c/ Nutella, Cento de Brigadeiro..."
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full px-3.5 py-2 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500/20"
              />
              <input
                type="text"
                placeholder="Breve descrição comercial do doce ou bolo (opcional)..."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="w-full px-3.5 py-1.5 mt-2 border border-stone-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500/20 text-stone-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1">
                Rendimento
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  required
                  value={rendimentoQtd}
                  onChange={(e) => setRendimentoQtd(Number(e.target.value))}
                  className="w-20 px-3 py-2 border border-stone-200 rounded-xl text-sm text-center font-bold"
                />
                <input
                  type="text"
                  placeholder="Ex: unidades, bolo 20cm"
                  value={rendimentoUnidade}
                  onChange={(e) => setRendimentoUnidade(e.target.value)}
                  className="flex-1 px-3 py-2 border border-stone-200 rounded-xl text-sm"
                />
              </div>
            </div>
          </div>

          {/* Seção 2: Ingredientes e Insumos da Receita */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <Boxes className="w-4 h-4 text-amber-600" />
                Ingredientes & Embalagens Utilizados
              </h3>
              <button
                type="button"
                onClick={handleAdicionarIngrediente}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar Ingrediente
              </button>
            </div>

            {itens.length === 0 ? (
              <div className="p-6 bg-stone-50 rounded-xl border border-dashed border-stone-200 text-center text-sm text-stone-500">
                Nenhum ingrediente adicionado. Clique no botão acima para adicionar a farinha, chocolate, embalagens, etc.
              </div>
            ) : (
              <div className="border border-stone-200 rounded-xl overflow-hidden divide-y divide-stone-100">
                {itens.map((item, index) => {
                  const insumoSel = insumos.find((i) => i.id === Number(item.insumoId));
                  const custoItem = insumoSel
                    ? Number(item.quantidade) * Number(insumoSel.custoUnitario)
                    : 0;

                  return (
                    <div
                      key={index}
                      className="p-3 bg-white flex flex-col sm:flex-row items-center gap-3 hover:bg-stone-50/50"
                    >
                      {/* Seleção do insumo */}
                      <div className="flex-1 w-full">
                        <select
                          value={item.insumoId}
                          onChange={(e) =>
                            handleAlterarItem(index, "insumoId", Number(e.target.value))
                          }
                          className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white"
                        >
                          {insumos.map((i) => (
                            <option key={i.id} value={i.id}>
                              {i.nome} ({i.categoria}) — R$ {i.custoUnitario.toFixed(4)}/{i.unidadeMedida}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Quantidade */}
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <input
                          type="number"
                          step="any"
                          min="0.001"
                          required
                          value={item.quantidade}
                          onChange={(e) =>
                            handleAlterarItem(index, "quantidade", Number(e.target.value))
                          }
                          className="w-24 px-3 py-2 border border-stone-200 rounded-lg text-sm text-right font-medium"
                        />
                        <span className="text-xs font-semibold text-stone-500 w-8">
                          {item.unidade}
                        </span>
                      </div>

                      {/* Custo proporcional calculado */}
                      <div className="w-28 text-right font-mono text-sm font-bold text-stone-900">
                        R$ {custoItem.toFixed(2)}
                      </div>

                      {/* Remover */}
                      <button
                        type="button"
                        onClick={() => handleRemoverIngrediente(index)}
                        className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Seção 3: Parâmetros de Tempo & Custos Invisíveis */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-stone-50 rounded-xl border border-stone-200">
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-stone-400" />
                Tempo de Preparo (Minutos)
              </label>
              <input
                type="number"
                min="0"
                value={tempoPreparoMinutos}
                onChange={(e) => setTempoPreparoMinutos(Number(e.target.value))}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white font-medium"
              />
              <p className="text-[11px] text-stone-400 mt-0.5">Tempo da confeiteira na produção</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-stone-400" />
                Sua Hora de Trabalho (R$/hora)
              </label>
              <input
                type="number"
                step="0.50"
                min="0"
                value={custoHoraTrabalho}
                onChange={(e) => setCustoHoraTrabalho(Number(e.target.value))}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white font-medium"
              />
              <p className="text-[11px] text-stone-400 mt-0.5">Quanto vale 1h do seu trabalho</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-stone-400" />
                Custos Fixos / Invisíveis (%)
              </label>
              <input
                type="number"
                min="0"
                value={percentualCustosFixos}
                onChange={(e) => setPercentualCustosFixos(Number(e.target.value))}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white font-medium"
              />
              <p className="text-[11px] text-stone-400 mt-0.5">Gás, energia, água e produtos de limpeza</p>
            </div>
          </div>

          {/* Seção 4: Painel Inteligente de Precificação & Margens */}
          <div className="p-5 bg-gradient-to-br from-rose-50/80 via-white to-amber-50/50 rounded-2xl border border-rose-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-rose-600" />
                Formação do Preço de Venda
              </h4>
              <span className="text-xs text-stone-500">Engenharia de Custos em Tempo Real</span>
            </div>

            {/* Linhas de Custo */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-white rounded-xl border border-stone-200/70">
                <span className="text-stone-400 block font-medium">Insumos Diretos</span>
                <span className="text-base font-bold text-stone-900 mt-0.5 block">
                  R$ {custoInsumosTotal.toFixed(2)}
                </span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-stone-200/70">
                <span className="text-stone-400 block font-medium">Mão de Obra ({tempoPreparoMinutos}m)</span>
                <span className="text-base font-bold text-stone-900 mt-0.5 block">
                  R$ {custoMaoDeObra.toFixed(2)}
                </span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-stone-200/70">
                <span className="text-stone-400 block font-medium">Custos Fixos ({percentualCustosFixos}%)</span>
                <span className="text-base font-bold text-stone-900 mt-0.5 block">
                  R$ {custoFixosIndiretos.toFixed(2)}
                </span>
              </div>
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                <span className="text-rose-700 block font-semibold">Custo de Produção / Unid.</span>
                <span className="text-base font-bold text-rose-900 mt-0.5 block">
                  R$ {custoPorUnidade.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Simulação de Preço Sugerido vs Preço Real */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-rose-100">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Margem de Lucro Desejada (%)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={margemLucroDesejada}
                    onChange={(e) => setMargemLucroDesejada(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm font-bold bg-white"
                  />
                  <span className="text-xs text-stone-400">%</span>
                </div>
                <p className="text-[11px] text-stone-500 mt-1">
                  Preço sugerido: <strong>R$ {precoSugeridoPorUnidade.toFixed(2)}</strong>
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Preço que você vai cobrar (R$) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-stone-400">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.50"
                    min="0"
                    required
                    value={precoCobrado}
                    onChange={(e) => setPrecoVendaPraticado(Number(e.target.value))}
                    className="w-full pl-9 pr-3 py-2 border-2 border-rose-500 rounded-xl text-base font-extrabold text-stone-900 bg-white focus:outline-none"
                  />
                </div>
                <p className="text-[11px] text-stone-500 mt-1">Valor visível no cardápio</p>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col justify-center">
                <span className="text-xs font-semibold text-emerald-800">
                  Seu Lucro Real por {rendimentoUnidade}:
                </span>
                <span className="text-xl font-extrabold text-emerald-700 mt-0.5">
                  R$ {lucroRealPorUnidade.toFixed(2)}
                </span>
                <span className="text-xs font-bold text-emerald-900 mt-0.5">
                  Margem Líquida Real: {margemLucroRealPercent}%
                </span>
              </div>
            </div>
          </div>

          {/* Seção 5: Modo de Preparo / Notas Técnicas */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1">
              Modo de Preparo / Instruções Técnicas
            </label>
            <textarea
              rows={3}
              placeholder="Descreva o passo a passo de preparo, tempo de forno, ponto do doce..."
              value={modoPreparo}
              onChange={(e) => setModoPreparo(e.target.value)}
              className="w-full px-3.5 py-2 border border-stone-200 rounded-xl text-sm"
            />
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-stone-600 hover:text-stone-900 font-semibold text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold text-sm shadow-xs transition-colors flex items-center gap-2"
            >
              {salvando ? "Salvando Ficha..." : receita ? "Salvar Alterações" : "Salvar Ficha Técnica"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * ============================================================================
 * [COMPONENTE: ModalDetalheFicha]
 * Visualização e impressão de ficha técnica completa para cozinha e produção.
 * ============================================================================
 */
function ModalDetalheFicha({
  receita,
  onClose,
  onEditar,
}: {
  receita: Receita;
  onClose: () => void;
  onEditar: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-stone-200 overflow-hidden my-8 animate-scale-in">
        <div className="flex items-center justify-between p-5 border-b border-stone-100 bg-rose-50/50">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-700">
              Ficha Técnica de Produção
            </span>
            <h2 className="text-xl font-bold text-stone-900">{receita.nome}</h2>
          </div>
          <button onClick={onClose} className="p-1 text-stone-400 hover:text-stone-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Informações Gerais */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-stone-50 rounded-xl">
              <span className="text-xs text-stone-400 block font-medium">Rendimento</span>
              <span className="text-sm font-bold text-stone-900 mt-1 block">
                {receita.rendimentoQuantidade} {receita.rendimentoUnidade}
              </span>
            </div>
            <div className="p-3 bg-stone-50 rounded-xl">
              <span className="text-xs text-stone-400 block font-medium">Tempo de Preparo</span>
              <span className="text-sm font-bold text-stone-900 mt-1 block">
                {receita.tempoPreparoMinutos} min
              </span>
            </div>
            <div className="p-3 bg-stone-50 rounded-xl">
              <span className="text-xs text-stone-400 block font-medium">Preço de Venda</span>
              <span className="text-sm font-bold text-rose-700 mt-1 block">
                R$ {receita.precoVenda.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Ingredientes */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
              Ingredientes & Proporções
            </h4>
            <div className="border border-stone-200 rounded-xl overflow-hidden divide-y divide-stone-100 text-sm">
              {receita.itens?.map((it, idx) => (
                <div key={idx} className="p-3 flex items-center justify-between">
                  <span className="font-semibold text-stone-800">{it.insumoNome}</span>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="font-medium text-stone-600">
                      {it.quantidade} {it.unidade}
                    </span>
                    <span className="font-mono text-stone-900 font-bold w-20 text-right">
                      R$ {it.custoTotalItem.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Modo de Preparo */}
          {receita.modoPreparo && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
                Modo de Preparo
              </h4>
              <div className="p-4 bg-stone-50 rounded-xl text-sm text-stone-700 whitespace-pre-line leading-relaxed">
                {receita.modoPreparo}
              </div>
            </div>
          )}

          {/* Ações */}
          <div className="flex items-center justify-between pt-4 border-t border-stone-100">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-sm font-semibold transition-colors"
            >
              Imprimir Ficha
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-stone-600 hover:text-stone-900 font-semibold text-sm"
              >
                Fechar
              </button>
              <button
                onClick={onEditar}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                Editar Ficha
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
