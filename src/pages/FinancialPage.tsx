/**
 * ============================================================================
 * PROJETO: Gestão com Sabor - Sistema de Gestão para Confeitarias
 * REPOSITÓRIO: https://github.com/junin1737/confeitaria
 * ARQUIVO: src/pages/FinancialPage.tsx
 * DESCRIÇÃO: Módulo Financeiro Completo integrado e multiempresa:
 *            - Plano de Contas (hierárquico por código, sintéticas vs analíticas)
 *            - Centros de Custo (ordenados A-Z com bloqueio de exclusão em uso)
 *            - Contas a Pagar (baixas totais/parciais em caixa/banco, integração compras)
 *            - Contas a Receber (baixas totais/parciais em caixa/banco, integração pedidos)
 *            - Caixa Diário (abertura, fechamento com conferência/diferença, sangria, suprimento)
 *            - Controle Bancário & Extrato (saldos calculados, transferências caixa <-> banco)
 * ============================================================================
 */

import { useEffect, useState, useMemo } from "react";
import {
  Wallet,
  TrendingDown,
  TrendingUp,
  Landmark,
  Layers,
  FolderTree,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  ArrowRightLeft,
  ArrowUpRight,
  ArrowDownLeft,
  Coins,
  X,
} from "lucide-react";
import {
  fetchPlanoContas,
  savePlanoConta,
  deletePlanoConta,
  fetchCentrosCusto,
  saveCentroCusto,
  deleteCentroCusto,
  fetchContasBancarias,
  saveContaBancaria,
  fetchTitulosPagar,
  saveTituloPagar,
  baixarTituloPagarApi,
  cancelarTituloPagarApi,
  fetchTitulosReceber,
  saveTituloReceber,
  baixarTituloReceberApi,
  cancelarTituloReceberApi,
  fetchCaixaAberto,
  fetchSaldoCaixa,
  abrirCaixaApi,
  fecharCaixaApi,
  lancarMovimentoCaixaApi,
  fetchMovimentacoes,
  transferirBancosApi,
  transferirCaixaBancoApi,
  fetchFornecedores,
  fetchClientes,
  type PlanoConta,
  type CentroCusto,
  type ContaBancaria,
  type TituloPagar,
  type TituloReceber,
  type Caixa,
  type MovimentacaoFinanceira,
  type Fornecedor,
  type Cliente,
} from "../api";

interface FinancialPageProps {
  onAction: (msg: string) => void;
}

type TabKey = "pagar" | "receber" | "caixa" | "bancos" | "plano_contas" | "centros_custo";

export function FinancialPage({ onAction }: FinancialPageProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("pagar");
  const [carregando, setCarregando] = useState(true);

  // Dados Compartilhados
  const [planoContas, setPlanoContas] = useState<PlanoConta[]>([]);
  const [centrosCusto, setCentrosCusto] = useState<CentroCusto[]>([]);
  const [contasBancarias, setContasBancarias] = useState<ContaBancaria[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);

  // Dados das Abas
  const [titulosPagar, setTitulosPagar] = useState<TituloPagar[]>([]);
  const [titulosReceber, setTitulosReceber] = useState<TituloReceber[]>([]);
  const [caixaAberto, setCaixaAberto] = useState<Caixa | null>(null);
  const [caixaSaldo, setCaixaSaldo] = useState<any>(null);
  const [movimentacoesCaixaHoje, setMovimentacoesCaixaHoje] = useState<MovimentacaoFinanceira[]>([]);
  const [extrato, setExtrato] = useState<MovimentacaoFinanceira[]>([]);

  // Filtros Gerais
  const [buscaPagar, setBuscaPagar] = useState("");
  const [filtroStatusPagar, setFiltroStatusPagar] = useState<string>("todos");
  const [buscaReceber, setBuscaReceber] = useState("");
  const [filtroStatusReceber, setFiltroStatusReceber] = useState<string>("todos");
  const [filtroContaExtrato, setFiltroContaExtrato] = useState<string>("todas");
  const [dataInicioExtrato, setDataInicioExtrato] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split("T")[0];
  });
  const [dataFimExtrato, setDataFimExtrato] = useState<string>(() => new Date().toISOString().split("T")[0]);

  // Modais de Controle
  const [modalNovoPagar, setModalNovoPagar] = useState(false);
  const [modalNovoReceber, setModalNovoReceber] = useState(false);
  const [modalBaixa, setModalBaixa] = useState<{ tipo: "pagar" | "receber"; titulo: any } | null>(null);
  const [modalAbrirCaixa, setModalAbrirCaixa] = useState(false);
  const [modalFecharCaixa, setModalFecharCaixa] = useState(false);
  const [modalLancamentoCaixa, setModalLancamentoCaixa] = useState<"entrada" | "saida" | "sangria" | "suprimento" | null>(null);
  const [modalNovaContaBancaria, setModalNovaContaBancaria] = useState(false);
  const [modalTransferencia, setModalTransferencia] = useState(false);
  const [modalPlanoConta, setModalPlanoConta] = useState<PlanoConta | null>(null);
  const [modalNovoPlanoConta, setModalNovoPlanoConta] = useState(false);
  const [modalCentroCusto, setModalCentroCusto] = useState<CentroCusto | null>(null);
  const [modalNovoCentroCusto, setModalNovoCentroCusto] = useState(false);

  // Estados de Formulários de Baixa
  const [baixaData, setBaixaData] = useState(new Date().toISOString().split("T")[0]);
  const [baixaValor, setBaixaValor] = useState<number>(0);
  const [baixaJuros, setBaixaJuros] = useState<number>(0);
  const [baixaDesconto, setBaixaDesconto] = useState<number>(0);
  const [baixaDestinoTipo, setBaixaDestinoTipo] = useState<"caixa" | "banco">("caixa");
  const [baixaContaBancariaId, setBaixaContaBancariaId] = useState<number | null>(null);

  // Formulário Novo Título a Pagar
  const [formPagarFornecId, setFormPagarFornecId] = useState<number | null>(null);
  const [formPagarDescricao, setFormPagarDescricao] = useState("");
  const [formPagarPlanoId, setFormPagarPlanoId] = useState<number | null>(null);
  const [formPagarCentroId, setFormPagarCentroId] = useState<number | null>(null);
  const [formPagarValor, setFormPagarValor] = useState<number>(0);
  const [formPagarVencimento, setFormPagarVencimento] = useState(new Date().toISOString().split("T")[0]);
  const [formPagarForma, setFormPagarForma] = useState<string>("boleto");

  // Formulário Novo Título a Receber
  const [formReceberClienteId, setFormReceberClienteId] = useState<number | null>(null);
  const [formReceberDescricao, setFormReceberDescricao] = useState("");
  const [formReceberPlanoId, setFormReceberPlanoId] = useState<number | null>(null);
  const [formReceberCentroId, setFormReceberCentroId] = useState<number | null>(null);
  const [formReceberValor, setFormReceberValor] = useState<number>(0);
  const [formReceberVencimento, setFormReceberVencimento] = useState(new Date().toISOString().split("T")[0]);
  const [formReceberForma, setFormReceberForma] = useState<string>("pix");

  // Formulário de Caixa
  const [saldoAberturaInput, setSaldoAberturaInput] = useState<number>(0);
  const [saldoFechamentoInput, setSaldoFechamentoInput] = useState<number>(0);
  const [obsFechamentoInput, setObsFechamentoInput] = useState("");
  const [valorLancCaixa, setValorLancCaixa] = useState<number>(0);
  const [descLancCaixa, setDescLancCaixa] = useState("");
  const [planoLancCaixa, setPlanoLancCaixa] = useState<number | null>(null);
  const [centroLancCaixa, setCentroLancCaixa] = useState<number | null>(null);

  // Formulário Nova Conta Bancária
  const [formBancoNome, setFormBancoNome] = useState("");
  const [formAgencia, setFormAgencia] = useState("");
  const [formNumConta, setFormNumConta] = useState("");
  const [formTipoConta, setFormTipoConta] = useState<"corrente" | "poupanca" | "pagamento" | "investimento">("corrente");
  const [formSaldoInicial, setFormSaldoInicial] = useState<number>(0);

  // Formulário Transferência
  const [transfTipoOperacao, setTransfTipoOperacao] = useState<"bancos" | "caixa_para_banco" | "banco_para_caixa">("bancos");
  const [transfBancoOrigemId, setTransfBancoOrigemId] = useState<number | null>(null);
  const [transfBancoDestinoId, setTransfBancoDestinoId] = useState<number | null>(null);
  const [transfValor, setTransfValor] = useState<number>(0);
  const [transfData, setTransfData] = useState(new Date().toISOString().split("T")[0]);
  const [transfDescricao, setTransfDescricao] = useState("");

  // Formulário Plano de Contas
  const [formPlanoCodigo, setFormPlanoCodigo] = useState("");
  const [formPlanoNome, setFormPlanoNome] = useState("");
  const [formPlanoTipo, setFormPlanoTipo] = useState<"receita" | "despesa">("despesa");
  const [formPlanoPaiId, setFormPlanoPaiId] = useState<number | null>(null);
  const [formPlanoTipoConta, setFormPlanoTipoConta] = useState<"sintetica" | "analitica">("analitica");

  // Formulário Centro de Custo
  const [formCcCodigo, setFormCcCodigo] = useState("");
  const [formCcNome, setFormCcNome] = useState("");
  const [formCcDescricao, setFormCcDescricao] = useState("");

  // Carregar dados gerais
  const carregarTudo = async () => {
    try {
      setCarregando(true);
      const [
        planos,
        centros,
        bancos,
        fornec,
        cli,
        pagar,
        receber,
        cxAberto,
        movs,
      ] = await Promise.all([
        fetchPlanoContas(),
        fetchCentrosCusto(),
        fetchContasBancarias(),
        fetchFornecedores(),
        fetchClientes(),
        fetchTitulosPagar(),
        fetchTitulosReceber(),
        fetchCaixaAberto(),
        fetchMovimentacoes({ dataInicio: dataInicioExtrato, dataFim: dataFimExtrato }),
      ]);

      setPlanoContas(planos);
      setCentrosCusto(centros);
      setContasBancarias(bancos);
      setFornecedores(fornec);
      setClientes(cli);
      setTitulosPagar(pagar);
      setTitulosReceber(receber);
      setCaixaAberto(cxAberto);
      setExtrato(movs);

      if (cxAberto) {
        const saldoCx = await fetchSaldoCaixa(cxAberto.id);
        setCaixaSaldo(saldoCx);
        const movsHoje = await fetchMovimentacoes({ caixaId: cxAberto.id });
        setMovimentacoesCaixaHoje(movsHoje);
      } else {
        setCaixaSaldo(null);
        setMovimentacoesCaixaHoje([]);
      }
    } catch (err: any) {
      onAction("Erro ao carregar dados financeiros: " + err.message);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarTudo();
  }, []);

  // Recarregar Extrato quando alterar filtros
  useEffect(() => {
    const params: any = { dataInicio: dataInicioExtrato, dataFim: dataFimExtrato };
    if (filtroContaExtrato !== "todas") {
      params.contaBancariaId = Number(filtroContaExtrato);
    }
    fetchMovimentacoes(params)
      .then(setExtrato)
      .catch((err) => console.error("Erro ao filtrar extrato:", err));
  }, [filtroContaExtrato, dataInicioExtrato, dataFimExtrato]);

  // Listas analíticas filtradas
  const contasDespesaAnaliticas = useMemo(
    () => planoContas.filter((c) => c.tipo === "despesa" && (c.tipoConta === "analitica" || !c.tipoConta) && c.ativo),
    [planoContas]
  );
  const contasReceitaAnaliticas = useMemo(
    () => planoContas.filter((c) => c.tipo === "receita" && (c.tipoConta === "analitica" || !c.tipoConta) && c.ativo),
    [planoContas]
  );
  const contasSinteticas = useMemo(
    () => planoContas.filter((c) => c.tipoConta === "sintetica"),
    [planoContas]
  );

  // Filtragem de Títulos a Pagar
  const titulosPagarFiltrados = useMemo(() => {
    return titulosPagar.filter((t) => {
      const matchStatus = filtroStatusPagar === "todos" || t.status === filtroStatusPagar;
      const matchBusca =
        !buscaPagar.trim() ||
        t.descricao.toLowerCase().includes(buscaPagar.toLowerCase()) ||
        (t.fornecedorNome && t.fornecedorNome.toLowerCase().includes(buscaPagar.toLowerCase()));
      return matchStatus && matchBusca;
    });
  }, [titulosPagar, filtroStatusPagar, buscaPagar]);

  // Totais Pagar
  const totaisPagar = useMemo(() => {
    let aberto = 0;
    let pago = 0;
    for (const t of titulosPagar) {
      if (t.status === "aberto" || t.status === "pago_parcial") {
        aberto += t.saldoRestante;
      }
      if (t.status === "pago" || t.status === "pago_parcial") {
        pago += t.valorPago;
      }
    }
    return { aberto, pago };
  }, [titulosPagar]);

  // Filtragem de Títulos a Receber
  const titulosReceberFiltrados = useMemo(() => {
    return titulosReceber.filter((t) => {
      const matchStatus = filtroStatusReceber === "todos" || t.status === filtroStatusReceber;
      const matchBusca =
        !buscaReceber.trim() ||
        t.descricao.toLowerCase().includes(buscaReceber.toLowerCase()) ||
        (t.clienteNome && t.clienteNome.toLowerCase().includes(buscaReceber.toLowerCase()));
      return matchStatus && matchBusca;
    });
  }, [titulosReceber, filtroStatusReceber, buscaReceber]);

  // Totais Receber
  const totaisReceber = useMemo(() => {
    let aberto = 0;
    let recebido = 0;
    for (const t of titulosReceber) {
      if (t.status === "aberto" || t.status === "pago_parcial") {
        aberto += t.saldoRestante;
      }
      if (t.status === "pago" || t.status === "pago_parcial") {
        recebido += t.valorRecebido;
      }
    }
    return { aberto, recebido };
  }, [titulosReceber]);

  // Saldo Total Bancos
  const totalBancos = useMemo(() => {
    return contasBancarias.reduce((acc, b) => acc + (b.saldoAtual || 0), 0);
  }, [contasBancarias]);

  // --- HANDLERS: CONTAS A PAGAR ---
  const handleAbrirModalBaixaPagar = (titulo: TituloPagar) => {
    setModalBaixa({ tipo: "pagar", titulo });
    setBaixaData(new Date().toISOString().split("T")[0]);
    setBaixaValor(titulo.saldoRestante);
    setBaixaJuros(0);
    setBaixaDesconto(0);
    setBaixaDestinoTipo(caixaAberto ? "caixa" : "banco");
    setBaixaContaBancariaId(contasBancarias[0]?.id ?? null);
  };

  const handleConfirmarBaixaPagar = async () => {
    if (!modalBaixa || modalBaixa.tipo !== "pagar") return;
    if (baixaValor <= 0) {
      alert("Informe um valor de baixa maior que zero.");
      return;
    }
    if (baixaDestinoTipo === "banco" && !baixaContaBancariaId) {
      alert("Selecione a conta bancária para saída.");
      return;
    }
    if (baixaDestinoTipo === "caixa" && !caixaAberto) {
      alert("Não há caixa aberto para registrar a saída em dinheiro.");
      return;
    }

    try {
      await baixarTituloPagarApi(modalBaixa.titulo.id, {
        dataBaixa: baixaData,
        valorBaixa: baixaValor,
        jurosMulta: baixaJuros,
        desconto: baixaDesconto,
        contaDestinoTipo: baixaDestinoTipo,
        caixaId: baixaDestinoTipo === "caixa" ? caixaAberto?.id : undefined,
        contaBancariaId: baixaDestinoTipo === "banco" ? baixaContaBancariaId! : undefined,
      });

      onAction(`Baixa de R$ ${baixaValor.toFixed(2)} confirmada no título a pagar #${modalBaixa.titulo.id}!`);
      setModalBaixa(null);
      await carregarTudo();
    } catch (err: any) {
      alert("Erro ao baixar título: " + err.message);
    }
  };

  const handleCancelarPagar = async (titulo: TituloPagar) => {
    if (!confirm(`Deseja cancelar o título a pagar "${titulo.descricao}"?`)) return;
    try {
      await cancelarTituloPagarApi(titulo.id);
      onAction(`Título a pagar #${titulo.id} cancelado com sucesso.`);
      await carregarTudo();
    } catch (err: any) {
      alert("Erro ao cancelar título: " + err.message);
    }
  };

  const handleSalvarNovoPagar = async () => {
    if (!formPagarDescricao.trim() || formPagarValor <= 0) {
      alert("Informe a descrição e o valor do título.");
      return;
    }
    if (!formPagarPlanoId) {
      alert("Selecione a conta analítica de despesa no plano de contas.");
      return;
    }

    try {
      await saveTituloPagar({
        fornecedorId: formPagarFornecId,
        descricao: formPagarDescricao.trim(),
        planoContasId: formPagarPlanoId,
        centroCustoId: formPagarCentroId,
        valorOriginal: formPagarValor,
        vencimento: formPagarVencimento,
        formaPagamento: formPagarForma,
      });

      onAction("Título a pagar cadastrado com sucesso!");
      setModalNovoPagar(false);
      setFormPagarDescricao("");
      setFormPagarValor(0);
      await carregarTudo();
    } catch (err: any) {
      alert("Erro ao salvar título a pagar: " + err.message);
    }
  };

  // --- HANDLERS: CONTAS A RECEBER ---
  const handleAbrirModalBaixaReceber = (titulo: TituloReceber) => {
    setModalBaixa({ tipo: "receber", titulo });
    setBaixaData(new Date().toISOString().split("T")[0]);
    setBaixaValor(titulo.saldoRestante);
    setBaixaJuros(0);
    setBaixaDesconto(0);
    setBaixaDestinoTipo(caixaAberto ? "caixa" : "banco");
    setBaixaContaBancariaId(contasBancarias[0]?.id ?? null);
  };

  const handleConfirmarBaixaReceber = async () => {
    if (!modalBaixa || modalBaixa.tipo !== "receber") return;
    if (baixaValor <= 0) {
      alert("Informe um valor de recebimento maior que zero.");
      return;
    }
    if (baixaDestinoTipo === "banco" && !baixaContaBancariaId) {
      alert("Selecione a conta bancária para recebimento.");
      return;
    }
    if (baixaDestinoTipo === "caixa" && !caixaAberto) {
      alert("Não há caixa aberto para registrar o recebimento em dinheiro.");
      return;
    }

    try {
      await baixarTituloReceberApi(modalBaixa.titulo.id, {
        dataBaixa: baixaData,
        valorBaixa: baixaValor,
        jurosMulta: baixaJuros,
        desconto: baixaDesconto,
        contaDestinoTipo: baixaDestinoTipo,
        caixaId: baixaDestinoTipo === "caixa" ? caixaAberto?.id : undefined,
        contaBancariaId: baixaDestinoTipo === "banco" ? baixaContaBancariaId! : undefined,
      });

      onAction(`Recebimento de R$ ${baixaValor.toFixed(2)} registrado no título #${modalBaixa.titulo.id}!`);
      setModalBaixa(null);
      await carregarTudo();
    } catch (err: any) {
      alert("Erro ao baixar título: " + err.message);
    }
  };

  const handleCancelarReceber = async (titulo: TituloReceber) => {
    if (!confirm(`Deseja cancelar o título a receber "${titulo.descricao}"?`)) return;
    try {
      await cancelarTituloReceberApi(titulo.id);
      onAction(`Título a receber #${titulo.id} cancelado com sucesso.`);
      await carregarTudo();
    } catch (err: any) {
      alert("Erro ao cancelar título: " + err.message);
    }
  };

  const handleSalvarNovoReceber = async () => {
    if (!formReceberDescricao.trim() || formReceberValor <= 0) {
      alert("Informe a descrição e o valor do título.");
      return;
    }
    if (!formReceberPlanoId) {
      alert("Selecione a conta analítica de receita no plano de contas.");
      return;
    }

    try {
      await saveTituloReceber({
        clienteId: formReceberClienteId,
        descricao: formReceberDescricao.trim(),
        planoContasId: formReceberPlanoId,
        centroCustoId: formReceberCentroId,
        valorOriginal: formReceberValor,
        vencimento: formReceberVencimento,
        formaPagamento: formReceberForma,
      });

      onAction("Título a receber cadastrado com sucesso!");
      setModalNovoReceber(false);
      setFormReceberDescricao("");
      setFormReceberValor(0);
      await carregarTudo();
    } catch (err: any) {
      alert("Erro ao salvar título a receber: " + err.message);
    }
  };

  // --- HANDLERS: CAIXA ---
  const handleAbrirCaixa = async () => {
    try {
      await abrirCaixaApi(saldoAberturaInput);
      onAction(`Caixa aberto com sucesso com saldo inicial de R$ ${saldoAberturaInput.toFixed(2)}!`);
      setModalAbrirCaixa(false);
      setSaldoAberturaInput(0);
      await carregarTudo();
    } catch (err: any) {
      alert("Erro ao abrir caixa: " + err.message);
    }
  };

  const handleFecharCaixa = async () => {
    if (!caixaAberto) return;
    try {
      const resp = await fecharCaixaApi(caixaAberto.id, saldoFechamentoInput, obsFechamentoInput);

      const dif = resp.diferenca;
      let msgDif = "Conferência bateu perfeitamente!";
      if (dif > 0) msgDif = `Sobra de caixa de R$ ${dif.toFixed(2)}.`;
      if (dif < 0) msgDif = `Falta de caixa de R$ ${Math.abs(dif).toFixed(2)}.`;

      onAction(`Caixa fechado com sucesso! ${msgDif}`);
      setModalFecharCaixa(false);
      setSaldoFechamentoInput(0);
      setObsFechamentoInput("");
      await carregarTudo();
    } catch (err: any) {
      alert("Erro ao fechar caixa: " + err.message);
    }
  };

  const handleConfirmarLancamentoCaixa = async () => {
    if (!modalLancamentoCaixa || !caixaAberto) return;
    if (valorLancCaixa <= 0) {
      alert("Informe um valor maior que zero.");
      return;
    }
    if ((modalLancamentoCaixa === "entrada" || modalLancamentoCaixa === "saida") && !planoLancCaixa) {
      alert("Selecione o plano de contas analítico correspondente.");
      return;
    }

    try {
      await lancarMovimentoCaixaApi({
        caixaId: caixaAberto.id,
        tipo: modalLancamentoCaixa,
        valor: valorLancCaixa,
        descricao: descLancCaixa || modalLancamentoCaixa.toUpperCase(),
        planoContasId: planoLancCaixa,
        centroCustoId: centroLancCaixa,
      });

      onAction(`Operação de ${modalLancamentoCaixa} registrada no caixa com sucesso!`);
      setModalLancamentoCaixa(null);
      setValorLancCaixa(0);
      setDescLancCaixa("");
      setPlanoLancCaixa(null);
      setCentroLancCaixa(null);
      await carregarTudo();
    } catch (err: any) {
      alert("Erro na operação de caixa: " + err.message);
    }
  };

  // --- HANDLERS: CONTROLE BANCÁRIO & TRANSFERÊNCIA ---
  const handleSalvarContaBancaria = async () => {
    if (!formBancoNome.trim() || !formNumConta.trim()) {
      alert("Informe a descrição/banco e o número da conta.");
      return;
    }
    try {
      await saveContaBancaria({
        banco: formBancoNome.trim(),
        agencia: formAgencia.trim() || undefined,
        conta: formNumConta.trim(),
        tipo: formTipoConta,
        saldoInicial: formSaldoInicial,
      });
      onAction("Conta bancária cadastrada com sucesso!");
      setModalNovaContaBancaria(false);
      setFormBancoNome("");
      setFormAgencia("");
      setFormNumConta("");
      setFormSaldoInicial(0);
      await carregarTudo();
    } catch (err: any) {
      alert("Erro ao salvar conta bancária: " + err.message);
    }
  };

  const handleExecutarTransferencia = async () => {
    if (transfValor <= 0) {
      alert("Informe um valor válido para transferência.");
      return;
    }

    try {
      if (transfTipoOperacao === "bancos") {
        if (!transfBancoOrigemId || !transfBancoDestinoId) {
          alert("Selecione os bancos de origem e destino.");
          return;
        }
        if (transfBancoOrigemId === transfBancoDestinoId) {
          alert("A conta bancária de origem e destino não podem ser iguais.");
          return;
        }
        await transferirBancosApi({
          contaOrigemId: transfBancoOrigemId,
          contaDestinoId: transfBancoDestinoId,
          valor: transfValor,
          dataMovimento: transfData,
          descricao: transfDescricao.trim() || "Transferência entre bancos",
        });
      } else {
        if (!caixaAberto) {
          alert("O caixa diário está fechado. Abra o caixa para realizar transferências com a gaveta.");
          return;
        }
        if (!transfBancoDestinoId) {
          alert("Selecione a conta bancária.");
          return;
        }
        await transferirCaixaBancoApi({
          sentido: transfTipoOperacao === "caixa_para_banco" ? "caixa_para_banco" : "banco_para_caixa",
          caixaId: caixaAberto.id,
          contaBancariaId: transfBancoDestinoId,
          valor: transfValor,
          dataMovimento: transfData,
          descricao: transfDescricao.trim() || "Transferência caixa-banco",
        });
      }

      onAction(`Transferência de R$ ${transfValor.toFixed(2)} efetuada com sucesso!`);
      setModalTransferencia(false);
      setTransfValor(0);
      setTransfDescricao("");
      await carregarTudo();
    } catch (err: any) {
      alert("Erro ao transferir valores: " + err.message);
    }
  };

  // --- HANDLERS: PLANO DE CONTAS ---
  const handleSalvarPlanoConta = async () => {
    if (!formPlanoCodigo.trim() || !formPlanoNome.trim()) {
      alert("Informe o código e o nome da conta.");
      return;
    }
    try {
      await savePlanoConta({
        id: modalPlanoConta?.id,
        codigo: formPlanoCodigo.trim(),
        nome: formPlanoNome.trim(),
        tipo: formPlanoTipo,
        contaPaiId: formPlanoPaiId,
        tipoConta: formPlanoTipoConta,
        ativo: true,
      });

      onAction(`Conta contábil ${formPlanoCodigo} salva com sucesso!`);
      setModalNovoPlanoConta(false);
      setModalPlanoConta(null);
      setFormPlanoCodigo("");
      setFormPlanoNome("");
      setFormPlanoPaiId(null);
      setFormPlanoTipoConta("analitica");
      await carregarTudo();
    } catch (err: any) {
      alert("Erro ao salvar conta: " + err.message);
    }
  };

  const handleExcluirPlanoConta = async (conta: PlanoConta) => {
    if (!confirm(`Deseja excluir ou inativar a conta "${conta.codigo} - ${conta.nome}"?`)) return;
    try {
      await deletePlanoConta(conta.id);
      onAction(`Conta ${conta.codigo} excluída/inativada com sucesso.`);
      await carregarTudo();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // --- HANDLERS: CENTROS DE CUSTO ---
  const handleSalvarCentroCusto = async () => {
    if (!formCcNome.trim()) {
      alert("Informe o nome do centro de custo.");
      return;
    }
    try {
      await saveCentroCusto({
        id: modalCentroCusto?.id,
        codigo: formCcCodigo.trim() || "CC",
        nome: formCcNome.trim(),
        descricao: formCcDescricao.trim() || undefined,
        ativo: true,
      });

      onAction("Centro de custo salvo com sucesso!");
      setModalNovoCentroCusto(false);
      setModalCentroCusto(null);
      setFormCcCodigo("");
      setFormCcNome("");
      setFormCcDescricao("");
      await carregarTudo();
    } catch (err: any) {
      alert("Erro ao salvar centro de custo: " + err.message);
    }
  };

  const handleExcluirCentroCusto = async (cc: CentroCusto) => {
    if (!confirm(`Deseja excluir o centro de custo "${cc.nome}"?`)) return;
    try {
      await deleteCentroCusto(cc.id);
      onAction(`Centro de custo "${cc.nome}" excluído/inativado com sucesso.`);
      await carregarTudo();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const saldoCaixaAtual = caixaSaldo?.saldoCalculado ?? (caixaAberto ? Number(caixaAberto.saldoInicial) : 0);

  return (
    <div className="financial-page" style={{ padding: "1.5rem" }}>
      {/* CABEÇALHO DA PÁGINA */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <span
            style={{
              color: "#059669",
              fontWeight: 700,
              fontSize: "0.8rem",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            <Wallet size={16} /> Gestão Financeira Integrada
          </span>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, margin: "0.25rem 0", color: "#1e293b" }}>
            Painel Financeiro
          </h1>
          <p style={{ margin: 0, color: "#64748b", fontSize: "0.95rem" }}>
            Controle de fluxo de caixa, contas a pagar e receber, bancos, plano de contas e centros de custo.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            type="button"
            className="button secondary"
            onClick={carregarTudo}
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            <RefreshCw size={16} /> Atualizar
          </button>
        </div>
      </div>

      {/* CARDS DE RESUMO GERAL */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1rem",
          marginBottom: "1.75rem",
        }}
      >
        <div className="panel" style={{ padding: "1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: "#fee2e2", color: "#dc2626", display: "grid", placeItems: "center" }}>
            <TrendingDown size={24} />
          </div>
          <div>
            <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700 }}>A PAGAR (ABERTO)</span>
            <h3 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 800, color: "#dc2626" }}>
              R$ {totaisPagar.aberto.toFixed(2)}
            </h3>
          </div>
        </div>

        <div className="panel" style={{ padding: "1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: "#dcfce7", color: "#16a34a", display: "grid", placeItems: "center" }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700 }}>A RECEBER (ABERTO)</span>
            <h3 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 800, color: "#16a34a" }}>
              R$ {totaisReceber.aberto.toFixed(2)}
            </h3>
          </div>
        </div>

        <div className="panel" style={{ padding: "1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: "#e0e7ff", color: "#4f46e5", display: "grid", placeItems: "center" }}>
            <Coins size={24} />
          </div>
          <div>
            <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700 }}>CAIXA DINHEIRO</span>
            <h3 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 800, color: "#4f46e5" }}>
              R$ {saldoCaixaAtual.toFixed(2)}
            </h3>
            <span style={{ fontSize: "0.7rem", color: caixaAberto ? "#16a34a" : "#dc2626", fontWeight: 700 }}>
              {caixaAberto ? "● Caixa Aberto" : "○ Caixa Fechado"}
            </span>
          </div>
        </div>

        <div className="panel" style={{ padding: "1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: "#fef3c7", color: "#d97706", display: "grid", placeItems: "center" }}>
            <Landmark size={24} />
          </div>
          <div>
            <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700 }}>SALDO BANCÁRIO</span>
            <h3 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 800, color: "#d97706" }}>
              R$ {totalBancos.toFixed(2)}
            </h3>
            <span style={{ fontSize: "0.7rem", color: "#64748b" }}>
              {contasBancarias.length} conta(s)
            </span>
          </div>
        </div>
      </div>

      {/* NAVEGAÇÃO ENTRE ABAS */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          borderBottom: "2px solid #e2e8f0",
          marginBottom: "1.5rem",
          overflowX: "auto",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("pagar")}
          style={{
            padding: "0.75rem 1.25rem",
            background: "transparent",
            border: "none",
            borderBottom: activeTab === "pagar" ? "3px solid #dc2626" : "3px solid transparent",
            color: activeTab === "pagar" ? "#dc2626" : "#64748b",
            fontWeight: activeTab === "pagar" ? 800 : 600,
            cursor: "pointer",
            fontSize: "0.95rem",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            marginBottom: -2,
          }}
        >
          <TrendingDown size={18} /> Contas a Pagar ({titulosPagar.filter((t) => t.status === "aberto" || t.status === "pago_parcial").length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("receber")}
          style={{
            padding: "0.75rem 1.25rem",
            background: "transparent",
            border: "none",
            borderBottom: activeTab === "receber" ? "3px solid #16a34a" : "3px solid transparent",
            color: activeTab === "receber" ? "#16a34a" : "#64748b",
            fontWeight: activeTab === "receber" ? 800 : 600,
            cursor: "pointer",
            fontSize: "0.95rem",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            marginBottom: -2,
          }}
        >
          <TrendingUp size={18} /> Contas a Receber ({titulosReceber.filter((t) => t.status === "aberto" || t.status === "pago_parcial").length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("caixa")}
          style={{
            padding: "0.75rem 1.25rem",
            background: "transparent",
            border: "none",
            borderBottom: activeTab === "caixa" ? "3px solid #4f46e5" : "3px solid transparent",
            color: activeTab === "caixa" ? "#4f46e5" : "#64748b",
            fontWeight: activeTab === "caixa" ? 800 : 600,
            cursor: "pointer",
            fontSize: "0.95rem",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            marginBottom: -2,
          }}
        >
          <Coins size={18} /> Frente de Caixa
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("bancos")}
          style={{
            padding: "0.75rem 1.25rem",
            background: "transparent",
            border: "none",
            borderBottom: activeTab === "bancos" ? "3px solid #d97706" : "3px solid transparent",
            color: activeTab === "bancos" ? "#d97706" : "#64748b",
            fontWeight: activeTab === "bancos" ? 800 : 600,
            cursor: "pointer",
            fontSize: "0.95rem",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            marginBottom: -2,
          }}
        >
          <Landmark size={18} /> Bancos & Extrato
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("plano_contas")}
          style={{
            padding: "0.75rem 1.25rem",
            background: "transparent",
            border: "none",
            borderBottom: activeTab === "plano_contas" ? "3px solid #2563eb" : "3px solid transparent",
            color: activeTab === "plano_contas" ? "#2563eb" : "#64748b",
            fontWeight: activeTab === "plano_contas" ? 800 : 600,
            cursor: "pointer",
            fontSize: "0.95rem",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            marginBottom: -2,
          }}
        >
          <FolderTree size={18} /> Plano de Contas
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("centros_custo")}
          style={{
            padding: "0.75rem 1.25rem",
            background: "transparent",
            border: "none",
            borderBottom: activeTab === "centros_custo" ? "3px solid #0891b2" : "3px solid transparent",
            color: activeTab === "centros_custo" ? "#0891b2" : "#64748b",
            fontWeight: activeTab === "centros_custo" ? 800 : 600,
            cursor: "pointer",
            fontSize: "0.95rem",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            marginBottom: -2,
          }}
        >
          <Layers size={18} /> Centros de Custo
        </button>
      </div>

      {/* CONTEÚDO DAS ABAS */}
      {carregando ? (
        <div style={{ padding: "4rem", textAlign: "center", color: "#94a3b8" }}>Carregando dados financeiros...</div>
      ) : (
        <>
          {/* ============================================================== */}
          {/* ABA 1: CONTAS A PAGAR */}
          {/* ============================================================== */}
          {activeTab === "pagar" && (
            <div className="panel" style={{ padding: "1.5rem" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "1.25rem",
                  flexWrap: "wrap",
                  gap: "1rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                  <div style={{ position: "relative", width: 260 }}>
                    <Search size={16} style={{ position: "absolute", left: 12, top: 12, color: "#94a3b8" }} />
                    <input
                      type="text"
                      placeholder="Buscar por descrição ou fornecedor..."
                      value={buscaPagar}
                      onChange={(e) => setBuscaPagar(e.target.value)}
                      style={{ width: "100%", padding: "0.55rem 0.75rem 0.55rem 2.25rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                    />
                  </div>

                  <select
                    value={filtroStatusPagar}
                    onChange={(e) => setFiltroStatusPagar(e.target.value)}
                    style={{ padding: "0.55rem 0.75rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.85rem", background: "#fff" }}
                  >
                    <option value="todos">Todos os Status</option>
                    <option value="aberto">Em Aberto</option>
                    <option value="pago_parcial">Pago Parcial</option>
                    <option value="pago">Quitado / Pago</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>

                <button
                  type="button"
                  className="button primary"
                  onClick={() => {
                    setFormPagarFornecId(fornecedores[0]?.id ?? null);
                    setFormPagarPlanoId(contasDespesaAnaliticas[0]?.id ?? null);
                    setFormPagarCentroId(centrosCusto[0]?.id ?? null);
                    setModalNovoPagar(true);
                  }}
                  style={{
                    background: "#dc2626",
                    color: "#fff",
                    border: "none",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                  }}
                >
                  <Plus size={16} /> Novo Título a Pagar
                </button>
              </div>

              {titulosPagarFiltrados.length === 0 ? (
                <div style={{ padding: "3rem", textAlign: "center", background: "#f8fafc", borderRadius: 12, border: "1px dashed #cbd5e1" }}>
                  <TrendingDown size={36} style={{ color: "#94a3b8", marginBottom: "0.5rem" }} />
                  <p style={{ fontWeight: 700, color: "#334155", margin: 0 }}>Nenhum título a pagar encontrado.</p>
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid #e2e8f0", color: "#475569" }}>
                        <th style={{ padding: "0.65rem" }}>#</th>
                        <th style={{ padding: "0.65rem" }}>Vencimento</th>
                        <th style={{ padding: "0.65rem" }}>Descrição / Fornecedor</th>
                        <th style={{ padding: "0.65rem" }}>Classificação Contábil</th>
                        <th style={{ padding: "0.65rem", textAlign: "right" }}>Valor Original</th>
                        <th style={{ padding: "0.65rem", textAlign: "right" }}>Saldo Aberto</th>
                        <th style={{ padding: "0.65rem" }}>Status</th>
                        <th style={{ padding: "0.65rem", textAlign: "center" }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {titulosPagarFiltrados.map((t) => {
                        const isAberto = t.status === "aberto" || t.status === "pago_parcial";
                        return (
                          <tr key={t.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "0.65rem", fontWeight: 700, color: "#64748b" }}>#{t.id}</td>
                            <td style={{ padding: "0.65rem", fontWeight: 700, color: "#1e293b" }}>
                              {t.vencimento ? new Date(t.vencimento + "T00:00:00").toLocaleDateString("pt-BR") : "-"}
                            </td>
                            <td style={{ padding: "0.65rem" }}>
                              <div style={{ fontWeight: 700, color: "#1e293b" }}>{t.descricao}</div>
                              <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                                {t.fornecedorNome || "Sem fornecedor vinculado"}
                                {t.compraId && (
                                  <span style={{ marginLeft: "0.4rem", color: "#2563eb", fontWeight: 600 }}>[Entrada NF-e]</span>
                                )}
                              </div>
                            </td>
                            <td style={{ padding: "0.65rem", fontSize: "0.8rem", color: "#475569" }}>
                              <div>{t.planoContasNome || "-"}</div>
                              {t.centroCustoNome && <div style={{ color: "#0891b2", fontWeight: 600 }}>{t.centroCustoNome}</div>}
                            </td>
                            <td style={{ padding: "0.65rem", textAlign: "right", color: "#475569" }}>
                              R$ {Number(t.valorOriginal).toFixed(2)}
                            </td>
                            <td style={{ padding: "0.65rem", textAlign: "right", fontWeight: 700, color: isAberto ? "#dc2626" : "#64748b" }}>
                              R$ {Number(t.saldoRestante).toFixed(2)}
                            </td>
                            <td style={{ padding: "0.65rem" }}>
                              <span
                                style={{
                                  display: "inline-block",
                                  padding: "0.2rem 0.6rem",
                                  borderRadius: 9999,
                                  fontSize: "0.75rem",
                                  fontWeight: 700,
                                  background:
                                    t.status === "pago"
                                      ? "#dcfce7"
                                      : t.status === "cancelado"
                                      ? "#fee2e2"
                                      : t.status === "pago_parcial"
                                      ? "#fef3c7"
                                      : "#ffedd5",
                                  color:
                                    t.status === "pago"
                                      ? "#16a34a"
                                      : t.status === "cancelado"
                                      ? "#dc2626"
                                      : t.status === "pago_parcial"
                                      ? "#d97706"
                                      : "#c2410c",
                                }}
                              >
                                {t.status === "pago"
                                  ? "Pago"
                                  : t.status === "pago_parcial"
                                  ? "Parcial"
                                  : t.status === "cancelado"
                                  ? "Cancelado"
                                  : "Aberto"}
                              </span>
                            </td>
                            <td style={{ padding: "0.65rem", textAlign: "center" }}>
                              {isAberto && (
                                <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center" }}>
                                  <button
                                    type="button"
                                    onClick={() => handleAbrirModalBaixaPagar(t)}
                                    title="Pagar / Baixar título"
                                    style={{
                                      padding: "0.3rem 0.6rem",
                                      borderRadius: 6,
                                      border: "none",
                                      background: "#16a34a",
                                      color: "#fff",
                                      fontSize: "0.75rem",
                                      fontWeight: 700,
                                      cursor: "pointer",
                                    }}
                                  >
                                    Pagar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleCancelarPagar(t)}
                                    title="Cancelar título"
                                    style={{
                                      padding: "0.3rem 0.5rem",
                                      borderRadius: 6,
                                      border: "1px solid #fecaca",
                                      background: "#fff",
                                      color: "#dc2626",
                                      fontSize: "0.75rem",
                                      fontWeight: 700,
                                      cursor: "pointer",
                                    }}
                                  >
                                    <X size={13} />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* ABA 2: CONTAS A RECEBER */}
          {/* ============================================================== */}
          {activeTab === "receber" && (
            <div className="panel" style={{ padding: "1.5rem" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "1.25rem",
                  flexWrap: "wrap",
                  gap: "1rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                  <div style={{ position: "relative", width: 260 }}>
                    <Search size={16} style={{ position: "absolute", left: 12, top: 12, color: "#94a3b8" }} />
                    <input
                      type="text"
                      placeholder="Buscar por descrição ou cliente..."
                      value={buscaReceber}
                      onChange={(e) => setBuscaReceber(e.target.value)}
                      style={{ width: "100%", padding: "0.55rem 0.75rem 0.55rem 2.25rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                    />
                  </div>

                  <select
                    value={filtroStatusReceber}
                    onChange={(e) => setFiltroStatusReceber(e.target.value)}
                    style={{ padding: "0.55rem 0.75rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.85rem", background: "#fff" }}
                  >
                    <option value="todos">Todos os Status</option>
                    <option value="aberto">Em Aberto</option>
                    <option value="pago_parcial">Pago Parcial</option>
                    <option value="pago">Quitado / Recebido</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>

                <button
                  type="button"
                  className="button primary"
                  onClick={() => {
                    setFormReceberClienteId(clientes[0]?.id ?? null);
                    setFormReceberPlanoId(contasReceitaAnaliticas[0]?.id ?? null);
                    setFormReceberCentroId(centrosCusto[0]?.id ?? null);
                    setModalNovoReceber(true);
                  }}
                  style={{
                    background: "#16a34a",
                    color: "#fff",
                    border: "none",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                  }}
                >
                  <Plus size={16} /> Novo Título a Receber
                </button>
              </div>

              {titulosReceberFiltrados.length === 0 ? (
                <div style={{ padding: "3rem", textAlign: "center", background: "#f8fafc", borderRadius: 12, border: "1px dashed #cbd5e1" }}>
                  <TrendingUp size={36} style={{ color: "#94a3b8", marginBottom: "0.5rem" }} />
                  <p style={{ fontWeight: 700, color: "#334155", margin: 0 }}>Nenhum título a receber encontrado.</p>
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid #e2e8f0", color: "#475569" }}>
                        <th style={{ padding: "0.65rem" }}>#</th>
                        <th style={{ padding: "0.65rem" }}>Vencimento</th>
                        <th style={{ padding: "0.65rem" }}>Descrição / Cliente</th>
                        <th style={{ padding: "0.65rem" }}>Classificação Contábil</th>
                        <th style={{ padding: "0.65rem", textAlign: "right" }}>Valor Original</th>
                        <th style={{ padding: "0.65rem", textAlign: "right" }}>Saldo Aberto</th>
                        <th style={{ padding: "0.65rem" }}>Status</th>
                        <th style={{ padding: "0.65rem", textAlign: "center" }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {titulosReceberFiltrados.map((t) => {
                        const isAberto = t.status === "aberto" || t.status === "pago_parcial";
                        return (
                          <tr key={t.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "0.65rem", fontWeight: 700, color: "#64748b" }}>#{t.id}</td>
                            <td style={{ padding: "0.65rem", fontWeight: 700, color: "#1e293b" }}>
                              {t.vencimento ? new Date(t.vencimento + "T00:00:00").toLocaleDateString("pt-BR") : "-"}
                            </td>
                            <td style={{ padding: "0.65rem" }}>
                              <div style={{ fontWeight: 700, color: "#1e293b" }}>{t.descricao}</div>
                              <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                                {t.clienteNome || "Sem cliente vinculado"}
                                {t.pedidoId && (
                                  <span style={{ marginLeft: "0.4rem", color: "#16a34a", fontWeight: 600 }}>[Pedido Aprovado]</span>
                                )}
                              </div>
                            </td>
                            <td style={{ padding: "0.65rem", fontSize: "0.8rem", color: "#475569" }}>
                              <div>{t.planoContasNome || "-"}</div>
                              {t.centroCustoNome && <div style={{ color: "#0891b2", fontWeight: 600 }}>{t.centroCustoNome}</div>}
                            </td>
                            <td style={{ padding: "0.65rem", textAlign: "right", color: "#475569" }}>
                              R$ {Number(t.valorOriginal).toFixed(2)}
                            </td>
                            <td style={{ padding: "0.65rem", textAlign: "right", fontWeight: 700, color: isAberto ? "#16a34a" : "#64748b" }}>
                              R$ {Number(t.saldoRestante).toFixed(2)}
                            </td>
                            <td style={{ padding: "0.65rem" }}>
                              <span
                                style={{
                                  display: "inline-block",
                                  padding: "0.2rem 0.6rem",
                                  borderRadius: 9999,
                                  fontSize: "0.75rem",
                                  fontWeight: 700,
                                  background:
                                    t.status === "pago"
                                      ? "#dcfce7"
                                      : t.status === "cancelado"
                                      ? "#fee2e2"
                                      : t.status === "pago_parcial"
                                      ? "#fef3c7"
                                      : "#ffedd5",
                                  color:
                                    t.status === "pago"
                                      ? "#16a34a"
                                      : t.status === "cancelado"
                                      ? "#dc2626"
                                      : t.status === "pago_parcial"
                                      ? "#d97706"
                                      : "#c2410c",
                                }}
                              >
                                {t.status === "pago"
                                  ? "Recebido"
                                  : t.status === "pago_parcial"
                                  ? "Parcial"
                                  : t.status === "cancelado"
                                  ? "Cancelado"
                                  : "Aberto"}
                              </span>
                            </td>
                            <td style={{ padding: "0.65rem", textAlign: "center" }}>
                              {isAberto && (
                                <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center" }}>
                                  <button
                                    type="button"
                                    onClick={() => handleAbrirModalBaixaReceber(t)}
                                    title="Receber / Baixar título"
                                    style={{
                                      padding: "0.3rem 0.6rem",
                                      borderRadius: 6,
                                      border: "none",
                                      background: "#16a34a",
                                      color: "#fff",
                                      fontSize: "0.75rem",
                                      fontWeight: 700,
                                      cursor: "pointer",
                                    }}
                                  >
                                    Receber
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleCancelarReceber(t)}
                                    title="Cancelar título"
                                    style={{
                                      padding: "0.3rem 0.5rem",
                                      borderRadius: 6,
                                      border: "1px solid #fecaca",
                                      background: "#fff",
                                      color: "#dc2626",
                                      fontSize: "0.75rem",
                                      fontWeight: 700,
                                      cursor: "pointer",
                                    }}
                                  >
                                    <X size={13} />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* ABA 3: FRENTE DE CAIXA */}
          {/* ============================================================== */}
          {activeTab === "caixa" && (
            <div style={{ display: "grid", gap: "1.5rem" }}>
              {/* STATUS DO CAIXA */}
              <div
                className="panel"
                style={{
                  padding: "1.5rem",
                  background: caixaAberto ? "#f0fdf4" : "#fef2f2",
                  border: caixaAberto ? "1px solid #bbf7d0" : "1px solid #fecaca",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "1rem",
                }}
              >
                <div>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      fontWeight: 800,
                      fontSize: "0.85rem",
                      color: caixaAberto ? "#16a34a" : "#dc2626",
                      textTransform: "uppercase",
                    }}
                  >
                    {caixaAberto ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                    {caixaAberto ? "Caixa Aberto" : "Caixa Fechado"}
                  </span>
                  <h2 style={{ margin: "0.25rem 0", fontSize: "1.5rem", fontWeight: 800, color: "#1e293b" }}>
                    Saldo Atual: R$ {saldoCaixaAtual.toFixed(2)}
                  </h2>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
                    {caixaAberto
                      ? `Aberto em ${new Date(caixaAberto.dataAbertura).toLocaleString("pt-BR")} com saldo inicial de R$ ${Number(caixaAberto.saldoInicial).toFixed(2)}`
                      : "Abra o caixa do dia para registrar vendas em dinheiro, sangrias e suprimentos."}
                  </p>
                </div>

                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                  {!caixaAberto ? (
                    <button
                      type="button"
                      className="button primary"
                      onClick={() => setModalAbrirCaixa(true)}
                      style={{ background: "#16a34a", color: "#fff", border: "none", fontWeight: 700 }}
                    >
                      <Plus size={16} /> Abrir Caixa do Dia
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="button secondary"
                        onClick={() => {
                          setModalLancamentoCaixa("entrada");
                          setValorLancCaixa(0);
                          setPlanoLancCaixa(contasReceitaAnaliticas[0]?.id ?? null);
                        }}
                      >
                        <ArrowDownLeft size={16} /> + Entrada
                      </button>
                      <button
                        type="button"
                        className="button secondary"
                        onClick={() => {
                          setModalLancamentoCaixa("saida");
                          setValorLancCaixa(0);
                          setPlanoLancCaixa(contasDespesaAnaliticas[0]?.id ?? null);
                        }}
                      >
                        <ArrowUpRight size={16} /> - Saída
                      </button>
                      <button
                        type="button"
                        className="button secondary"
                        onClick={() => {
                          setModalLancamentoCaixa("suprimento");
                          setValorLancCaixa(0);
                        }}
                      >
                        Suprimento (Troco)
                      </button>
                      <button
                        type="button"
                        className="button secondary"
                        onClick={() => {
                          setModalLancamentoCaixa("sangria");
                          setValorLancCaixa(0);
                        }}
                      >
                        Sangria (Retirada)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSaldoFechamentoInput(saldoCaixaAtual);
                          setModalFecharCaixa(true);
                        }}
                        style={{
                          background: "#dc2626",
                          color: "#fff",
                          border: "none",
                          padding: "0.55rem 1rem",
                          borderRadius: 8,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Fechar Caixa
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* MOVIMENTAÇÕES DE CAIXA */}
              <div className="panel" style={{ padding: "1.5rem" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: "0 0 1rem 0", color: "#1e293b" }}>
                  Movimentações do Caixa de Hoje
                </h3>

                {movimentacoesCaixaHoje.length === 0 ? (
                  <div style={{ padding: "2.5rem", textAlign: "center", color: "#94a3b8", background: "#f8fafc", borderRadius: 8 }}>
                    Nenhuma movimentação registrada no caixa hoje ainda.
                  </div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
                      <thead>
                        <tr style={{ borderBottom: "2px solid #e2e8f0", color: "#475569" }}>
                          <th style={{ padding: "0.65rem" }}>Horário</th>
                          <th style={{ padding: "0.65rem" }}>Tipo</th>
                          <th style={{ padding: "0.65rem" }}>Descrição / Justificativa</th>
                          <th style={{ padding: "0.65rem" }}>Classificação Contábil</th>
                          <th style={{ padding: "0.65rem", textAlign: "right" }}>Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {movimentacoesCaixaHoje.map((m) => {
                          const isEntrada = m.tipo === "receita";
                          return (
                            <tr key={m.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                              <td style={{ padding: "0.65rem", color: "#64748b" }}>
                                {new Date(m.dataMovimento).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                              </td>
                              <td style={{ padding: "0.65rem" }}>
                                <span
                                  style={{
                                    display: "inline-block",
                                    padding: "0.2rem 0.5rem",
                                    borderRadius: 6,
                                    fontSize: "0.75rem",
                                    fontWeight: 700,
                                    background: isEntrada ? "#dcfce7" : "#fee2e2",
                                    color: isEntrada ? "#16a34a" : "#dc2626",
                                    textTransform: "uppercase",
                                  }}
                                >
                                  {m.origem || m.tipo}
                                </span>
                              </td>
                              <td style={{ padding: "0.65rem", fontWeight: 600, color: "#1e293b" }}>
                                {m.descricao}
                              </td>
                              <td style={{ padding: "0.65rem", fontSize: "0.8rem", color: "#64748b" }}>
                                {m.planoContasNome || "-"}
                              </td>
                              <td style={{ padding: "0.65rem", textAlign: "right", fontWeight: 800, color: isEntrada ? "#16a34a" : "#dc2626" }}>
                                {isEntrada ? "+" : "-"} R$ {Number(m.valorLiquido || m.valor).toFixed(2)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* ABA 4: BANCOS & EXTRATO */}
          {/* ============================================================== */}
          {activeTab === "bancos" && (
            <div style={{ display: "grid", gap: "1.5rem" }}>
              {/* CONTAS BANCÁRIAS */}
              <div className="panel" style={{ padding: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "1rem" }}>
                  <div>
                    <h3 style={{ fontSize: "1.15rem", fontWeight: 800, margin: 0, color: "#1e293b" }}>
                      Contas Bancárias & Carteiras Digitais
                    </h3>
                    <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
                      Gerencie suas contas de bancos tradicionais, cooperativas e carteiras digitais (PIX).
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: "0.75rem" }}>
                    <button
                      type="button"
                      className="button secondary"
                      onClick={() => setModalTransferencia(true)}
                      style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
                    >
                      <ArrowRightLeft size={16} /> Transferência
                    </button>
                    <button
                      type="button"
                      className="button primary"
                      onClick={() => setModalNovaContaBancaria(true)}
                      style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
                    >
                      <Plus size={16} /> Nova Conta Bancária
                    </button>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem" }}>
                  {contasBancarias.map((b) => (
                    <div
                      key={b.id}
                      style={{
                        padding: "1.25rem",
                        borderRadius: 12,
                        border: "1px solid #e2e8f0",
                        background: "#f8fafc",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.25rem" }}>
                          <Landmark size={18} style={{ color: "#2563eb" }} />
                          <strong style={{ fontSize: "0.95rem", color: "#1e293b" }}>{b.banco}</strong>
                        </div>
                        <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                          Ag: {b.agencia || "0001"} | C/C: {b.conta || "-"}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "capitalize", marginTop: "0.2rem" }}>
                          Tipo: {b.tipo}
                        </div>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Saldo Atual</span>
                        <div style={{ fontSize: "1.2rem", fontWeight: 800, color: Number(b.saldoAtual) >= 0 ? "#16a34a" : "#dc2626" }}>
                          R$ {Number(b.saldoAtual || 0).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* EXTRATO BANCÁRIO & MOVIMENTAÇÕES */}
              <div className="panel" style={{ padding: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "1rem" }}>
                  <div>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0, color: "#1e293b" }}>
                      Extrato de Movimentações
                    </h3>
                    <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
                      Histórico cronológico de lançamentos, baixas e transferências com saldo consolidado.
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                    <select
                      value={filtroContaExtrato}
                      onChange={(e) => setFiltroContaExtrato(e.target.value)}
                      style={{ padding: "0.5rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.85rem", background: "#fff" }}
                    >
                      <option value="todas">Todas as Contas</option>
                      {contasBancarias.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.banco} ({b.conta})
                        </option>
                      ))}
                    </select>

                    <input
                      type="date"
                      value={dataInicioExtrato}
                      onChange={(e) => setDataInicioExtrato(e.target.value)}
                      style={{ padding: "0.5rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                    />
                    <span style={{ color: "#64748b", fontSize: "0.8rem" }}>até</span>
                    <input
                      type="date"
                      value={dataFimExtrato}
                      onChange={(e) => setDataFimExtrato(e.target.value)}
                      style={{ padding: "0.5rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                    />
                  </div>
                </div>

                {extrato.length === 0 ? (
                  <div style={{ padding: "2.5rem", textAlign: "center", color: "#94a3b8", background: "#f8fafc", borderRadius: 8 }}>
                    Nenhuma movimentação bancária registrada neste período.
                  </div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
                      <thead>
                        <tr style={{ borderBottom: "2px solid #e2e8f0", color: "#475569" }}>
                          <th style={{ padding: "0.65rem" }}>Data</th>
                          <th style={{ padding: "0.65rem" }}>Conta</th>
                          <th style={{ padding: "0.65rem" }}>Descrição / Origem</th>
                          <th style={{ padding: "0.65rem" }}>Classificação</th>
                          <th style={{ padding: "0.65rem", textAlign: "right" }}>Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {extrato.map((it) => {
                          const isCredito = it.tipo === "receita";
                          return (
                            <tr key={it.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                              <td style={{ padding: "0.65rem", color: "#475569" }}>
                                {new Date(it.dataMovimento).toLocaleDateString("pt-BR")}
                              </td>
                              <td style={{ padding: "0.65rem", fontWeight: 600, color: "#1e293b" }}>
                                {it.contaBancariaNome || (it.caixaId ? "Caixa Dinheiro" : "Geral")}
                              </td>
                              <td style={{ padding: "0.65rem" }}>
                                <div style={{ fontWeight: 600, color: "#1e293b" }}>{it.descricao}</div>
                                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                                  Origem: {it.origem}
                                </div>
                              </td>
                              <td style={{ padding: "0.65rem", fontSize: "0.8rem", color: "#64748b" }}>
                                {it.planoContasNome || "-"}
                              </td>
                              <td style={{ padding: "0.65rem", textAlign: "right", fontWeight: 800, color: isCredito ? "#16a34a" : "#dc2626" }}>
                                {isCredito ? "+" : "-"} R$ {Number(it.valorLiquido || it.valor).toFixed(2)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* ABA 5: PLANO DE CONTAS */}
          {/* ============================================================== */}
          {activeTab === "plano_contas" && (
            <div className="panel" style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "1rem" }}>
                <div>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 800, margin: 0, color: "#1e293b" }}>
                    Estrutura do Plano de Contas
                  </h3>
                  <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
                    Estrutura contábil hierárquica. Contas sintéticas agrupam categorias; contas analíticas recebem lançamentos.
                  </span>
                </div>

                <button
                  type="button"
                  className="button primary"
                  onClick={() => {
                    setModalPlanoConta(null);
                    setFormPlanoCodigo("");
                    setFormPlanoNome("");
                    setFormPlanoTipo("despesa");
                    setFormPlanoPaiId(null);
                    setFormPlanoTipoConta("analitica");
                    setModalNovoPlanoConta(true);
                  }}
                  style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
                >
                  <Plus size={16} /> Nova Conta
                </button>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #e2e8f0", color: "#475569" }}>
                      <th style={{ padding: "0.65rem" }}>Código</th>
                      <th style={{ padding: "0.65rem" }}>Nome da Conta</th>
                      <th style={{ padding: "0.65rem" }}>Tipo</th>
                      <th style={{ padding: "0.65rem" }}>Natureza</th>
                      <th style={{ padding: "0.65rem" }}>Status</th>
                      <th style={{ padding: "0.65rem", textAlign: "center" }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {planoContas.map((c) => {
                      const nivel = (c.codigo.match(/\./g) || []).length;
                      const isSintetica = c.tipoConta === "sintetica";
                      return (
                        <tr
                          key={c.id}
                          style={{
                            borderBottom: "1px solid #f1f5f9",
                            background: isSintetica ? "#f8fafc" : "#fff",
                            opacity: c.ativo ? 1 : 0.5,
                          }}
                        >
                          <td style={{ padding: "0.65rem", fontWeight: isSintetica ? 800 : 600, color: "#1e293b" }}>
                            <span style={{ marginLeft: `${nivel * 1.2}rem` }}>{c.codigo}</span>
                          </td>
                          <td style={{ padding: "0.65rem", fontWeight: isSintetica ? 800 : 500, color: "#1e293b" }}>
                            <span style={{ marginLeft: `${nivel * 1.2}rem` }}>
                              {isSintetica ? "📁 " : "📄 "}
                              {c.nome}
                            </span>
                          </td>
                          <td style={{ padding: "0.65rem" }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "0.15rem 0.5rem",
                                borderRadius: 6,
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                background: c.tipo === "receita" ? "#dcfce7" : "#fee2e2",
                                color: c.tipo === "receita" ? "#16a34a" : "#dc2626",
                                textTransform: "capitalize",
                              }}
                            >
                              {c.tipo}
                            </span>
                          </td>
                          <td style={{ padding: "0.65rem", fontSize: "0.75rem", color: "#64748b" }}>
                            {isSintetica ? (
                              <strong style={{ color: "#475569" }}>Sintética (Agrupadora)</strong>
                            ) : (
                              <span style={{ color: "#2563eb", fontWeight: 600 }}>Analítica (Lançamentos)</span>
                            )}
                          </td>
                          <td style={{ padding: "0.65rem" }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "0.15rem 0.5rem",
                                borderRadius: 9999,
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                background: c.ativo ? "#dcfce7" : "#fee2e2",
                                color: c.ativo ? "#16a34a" : "#dc2626",
                              }}
                            >
                              {c.ativo ? "Ativo" : "Inativo"}
                            </span>
                          </td>
                          <td style={{ padding: "0.65rem", textAlign: "center" }}>
                            <div style={{ display: "flex", gap: "0.3rem", justifyContent: "center" }}>
                              {isSintetica && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setModalPlanoConta(null);
                                    setFormPlanoCodigo(`${c.codigo}.`);
                                    setFormPlanoNome("");
                                    setFormPlanoTipo(c.tipo);
                                    setFormPlanoPaiId(c.id);
                                    setFormPlanoTipoConta("analitica");
                                    setModalNovoPlanoConta(true);
                                  }}
                                  title="Adicionar conta filha"
                                  style={{
                                    padding: "0.25rem 0.5rem",
                                    borderRadius: 6,
                                    border: "1px solid #cbd5e1",
                                    background: "#fff",
                                    fontSize: "0.75rem",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                  }}
                                >
                                  + Filha
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleExcluirPlanoConta(c)}
                                title="Excluir ou inativar conta"
                                style={{
                                  padding: "0.25rem 0.4rem",
                                  borderRadius: 6,
                                  border: "1px solid #fecaca",
                                  background: "#fef2f2",
                                  color: "#dc2626",
                                  fontSize: "0.75rem",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                }}
                              >
                                <X size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* ABA 6: CENTROS DE CUSTO */}
          {/* ============================================================== */}
          {activeTab === "centros_custo" && (
            <div className="panel" style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "1rem" }}>
                <div>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 800, margin: 0, color: "#1e293b" }}>
                    Centros de Custo (Ordem Alfabética)
                  </h3>
                  <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
                    Segmentação dos custos e receitas da confeitaria por setor ou canal de venda.
                  </span>
                </div>

                <button
                  type="button"
                  className="button primary"
                  onClick={() => {
                    setModalCentroCusto(null);
                    setFormCcCodigo("");
                    setFormCcNome("");
                    setFormCcDescricao("");
                    setModalNovoCentroCusto(true);
                  }}
                  style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
                >
                  <Plus size={16} /> Novo Centro de Custo
                </button>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #e2e8f0", color: "#475569" }}>
                      <th style={{ padding: "0.65rem" }}>Código</th>
                      <th style={{ padding: "0.65rem" }}>Nome do Centro de Custo</th>
                      <th style={{ padding: "0.65rem" }}>Descrição</th>
                      <th style={{ padding: "0.65rem" }}>Status</th>
                      <th style={{ padding: "0.65rem", textAlign: "center" }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {centrosCusto.map((cc) => (
                      <tr key={cc.id} style={{ borderBottom: "1px solid #f1f5f9", opacity: cc.ativo ? 1 : 0.5 }}>
                        <td style={{ padding: "0.65rem", fontWeight: 700, color: "#64748b" }}>{cc.codigo || "-"}</td>
                        <td style={{ padding: "0.65rem", fontWeight: 700, color: "#1e293b" }}>{cc.nome}</td>
                        <td style={{ padding: "0.65rem", color: "#64748b" }}>{cc.descricao || "-"}</td>
                        <td style={{ padding: "0.65rem" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "0.15rem 0.5rem",
                              borderRadius: 9999,
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              background: cc.ativo ? "#dcfce7" : "#fee2e2",
                              color: cc.ativo ? "#16a34a" : "#dc2626",
                            }}
                          >
                            {cc.ativo ? "Ativo" : "Inativo"}
                          </span>
                        </td>
                        <td style={{ padding: "0.65rem", textAlign: "center" }}>
                          <button
                            type="button"
                            onClick={() => handleExcluirCentroCusto(cc)}
                            title="Excluir ou inativar centro de custo"
                            style={{
                              padding: "0.25rem 0.5rem",
                              borderRadius: 6,
                              border: "1px solid #fecaca",
                              background: "#fef2f2",
                              color: "#dc2626",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            <X size={14} /> Excluir
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ============================================================== */}
      {/* MODAL: BAIXA DE TÍTULO (A PAGAR OU A RECEBER) */}
      {/* ============================================================== */}
      {modalBaixa && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              maxWidth: 500,
              width: "100%",
              padding: "1.5rem",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "#1e293b" }}>
                {modalBaixa.tipo === "pagar" ? "Baixa de Conta a Pagar" : "Recebimento de Título"}
              </h3>
              <button
                type="button"
                onClick={() => setModalBaixa(null)}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "#94a3b8" }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ background: "#f8fafc", padding: "0.75rem", borderRadius: 8, marginBottom: "1rem", fontSize: "0.85rem" }}>
              <div><strong>Título:</strong> #{modalBaixa.titulo.id} - {modalBaixa.titulo.descricao}</div>
              <div><strong>Saldo Atual em Aberto:</strong> R$ {Number(modalBaixa.titulo.saldoRestante).toFixed(2)}</div>
            </div>

            <div style={{ display: "grid", gap: "0.75rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: "0.25rem" }}>
                  Data da Operação *
                </label>
                <input
                  type="date"
                  value={baixaData}
                  onChange={(e) => setBaixaData(e.target.value)}
                  style={{ width: "100%", padding: "0.55rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: "0.25rem" }}>
                  Valor da Baixa (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={baixaValor}
                  onChange={(e) => setBaixaValor(Number(e.target.value))}
                  style={{ width: "100%", padding: "0.55rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.9rem", fontWeight: 700 }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "0.25rem" }}>
                    Juros / Multa (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={baixaJuros}
                    onChange={(e) => setBaixaJuros(Number(e.target.value))}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "0.25rem" }}>
                    Desconto (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={baixaDesconto}
                    onChange={(e) => setBaixaDesconto(Number(e.target.value))}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: "0.25rem" }}>
                  {modalBaixa.tipo === "pagar" ? "Conta de Saída do Dinheiro" : "Conta de Entrada do Dinheiro"}
                </label>
                <select
                  value={baixaDestinoTipo}
                  onChange={(e) => setBaixaDestinoTipo(e.target.value as any)}
                  style={{ width: "100%", padding: "0.55rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.85rem", background: "#fff", marginBottom: "0.5rem" }}
                >
                  <option value="caixa">Caixa Dinheiro {caixaAberto ? "(Aberto)" : "(Fechado)"}</option>
                  <option value="banco">Conta Bancária / PIX / Boleto</option>
                </select>

                {baixaDestinoTipo === "banco" && (
                  <select
                    value={baixaContaBancariaId ?? ""}
                    onChange={(e) => setBaixaContaBancariaId(e.target.value ? Number(e.target.value) : null)}
                    style={{ width: "100%", padding: "0.55rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.85rem", background: "#fff" }}
                  >
                    <option value="">Selecione a conta bancária...</option>
                    {contasBancarias.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.banco} ({b.conta}) - Saldo: R$ {Number(b.saldoAtual).toFixed(2)}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem" }}>
              <button
                type="button"
                className="button secondary"
                onClick={() => setModalBaixa(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="button primary"
                onClick={modalBaixa.tipo === "pagar" ? handleConfirmarBaixaPagar : handleConfirmarBaixaReceber}
                style={{
                  background: modalBaixa.tipo === "pagar" ? "#dc2626" : "#16a34a",
                  color: "#fff",
                  border: "none",
                  fontWeight: 700,
                }}
              >
                Confirmar Baixa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: NOVO TÍTULO A PAGAR */}
      {/* ============================================================== */}
      {modalNovoPagar && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              maxWidth: 550,
              width: "100%",
              padding: "1.5rem",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "#1e293b" }}>
                Novo Título a Pagar (Despesa)
              </h3>
              <button
                type="button"
                onClick={() => setModalNovoPagar(false)}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "#94a3b8" }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: "grid", gap: "0.75rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: "0.25rem" }}>
                  Fornecedor
                </label>
                <select
                  value={formPagarFornecId ?? ""}
                  onChange={(e) => setFormPagarFornecId(e.target.value ? Number(e.target.value) : null)}
                  style={{ width: "100%", padding: "0.55rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.85rem", background: "#fff" }}
                >
                  <option value="">Sem fornecedor vinculado</option>
                  {fornecedores.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.razaoSocial}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: "0.25rem" }}>
                  Descrição da Despesa *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Aluguel do imóvel, Conta de Luz..."
                  value={formPagarDescricao}
                  onChange={(e) => setFormPagarDescricao(e.target.value)}
                  style={{ width: "100%", padding: "0.55rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: "0.25rem" }}>
                    Plano de Contas *
                  </label>
                  <select
                    value={formPagarPlanoId ?? ""}
                    onChange={(e) => setFormPagarPlanoId(e.target.value ? Number(e.target.value) : null)}
                    style={{ width: "100%", padding: "0.55rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.85rem", background: "#fff" }}
                  >
                    <option value="">Selecione...</option>
                    {contasDespesaAnaliticas.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.codigo} - {c.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: "0.25rem" }}>
                    Centro de Custo
                  </label>
                  <select
                    value={formPagarCentroId ?? ""}
                    onChange={(e) => setFormPagarCentroId(e.target.value ? Number(e.target.value) : null)}
                    style={{ width: "100%", padding: "0.55rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.85rem", background: "#fff" }}
                  >
                    <option value="">Nenhum / Geral</option>
                    {centrosCusto.map((cc) => (
                      <option key={cc.id} value={cc.id}>
                        {cc.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: "0.25rem" }}>
                    Valor Total (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formPagarValor}
                    onChange={(e) => setFormPagarValor(Number(e.target.value))}
                    style={{ width: "100%", padding: "0.55rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.85rem", fontWeight: 700 }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: "0.25rem" }}>
                    1º Vencimento *
                  </label>
                  <input
                    type="date"
                    value={formPagarVencimento}
                    onChange={(e) => setFormPagarVencimento(e.target.value)}
                    style={{ width: "100%", padding: "0.55rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: "0.25rem" }}>
                  Forma de Pagamento
                </label>
                <select
                  value={formPagarForma}
                  onChange={(e) => setFormPagarForma(e.target.value)}
                  style={{ width: "100%", padding: "0.5rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.85rem", background: "#fff" }}
                >
                  <option value="boleto">Boleto</option>
                  <option value="pix">PIX</option>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="transferencia">Transferência</option>
                  <option value="cartao_credito">Cartão</option>
                </select>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem" }}>
              <button type="button" className="button secondary" onClick={() => setModalNovoPagar(false)}>
                Cancelar
              </button>
              <button
                type="button"
                className="button primary"
                onClick={handleSalvarNovoPagar}
                style={{ background: "#dc2626", color: "#fff", border: "none", fontWeight: 700 }}
              >
                Salvar Título a Pagar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: NOVO TÍTULO A RECEBER */}
      {/* ============================================================== */}
      {modalNovoReceber && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              maxWidth: 550,
              width: "100%",
              padding: "1.5rem",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "#1e293b" }}>
                Novo Título a Receber (Receita)
              </h3>
              <button
                type="button"
                onClick={() => setModalNovoReceber(false)}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "#94a3b8" }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: "grid", gap: "0.75rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: "0.25rem" }}>
                  Cliente
                </label>
                <select
                  value={formReceberClienteId ?? ""}
                  onChange={(e) => setFormReceberClienteId(e.target.value ? Number(e.target.value) : null)}
                  style={{ width: "100%", padding: "0.55rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.85rem", background: "#fff" }}
                >
                  <option value="">Sem cliente vinculado</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: "0.25rem" }}>
                  Descrição da Receita *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Encomenda especial de casamento, Venda corporativa..."
                  value={formReceberDescricao}
                  onChange={(e) => setFormReceberDescricao(e.target.value)}
                  style={{ width: "100%", padding: "0.55rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: "0.25rem" }}>
                    Plano de Contas *
                  </label>
                  <select
                    value={formReceberPlanoId ?? ""}
                    onChange={(e) => setFormReceberPlanoId(e.target.value ? Number(e.target.value) : null)}
                    style={{ width: "100%", padding: "0.55rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.85rem", background: "#fff" }}
                  >
                    <option value="">Selecione...</option>
                    {contasReceitaAnaliticas.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.codigo} - {c.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: "0.25rem" }}>
                    Centro de Custo
                  </label>
                  <select
                    value={formReceberCentroId ?? ""}
                    onChange={(e) => setFormReceberCentroId(e.target.value ? Number(e.target.value) : null)}
                    style={{ width: "100%", padding: "0.55rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.85rem", background: "#fff" }}
                  >
                    <option value="">Nenhum / Geral</option>
                    {centrosCusto.map((cc) => (
                      <option key={cc.id} value={cc.id}>
                        {cc.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: "0.25rem" }}>
                    Valor Total (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formReceberValor}
                    onChange={(e) => setFormReceberValor(Number(e.target.value))}
                    style={{ width: "100%", padding: "0.55rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.85rem", fontWeight: 700 }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: "0.25rem" }}>
                    1º Vencimento *
                  </label>
                  <input
                    type="date"
                    value={formReceberVencimento}
                    onChange={(e) => setFormReceberVencimento(e.target.value)}
                    style={{ width: "100%", padding: "0.55rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: "0.25rem" }}>
                  Forma de Pagamento
                </label>
                <select
                  value={formReceberForma}
                  onChange={(e) => setFormReceberForma(e.target.value)}
                  style={{ width: "100%", padding: "0.5rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.85rem", background: "#fff" }}
                >
                  <option value="pix">PIX</option>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="cartao_credito">Cartão de Crédito</option>
                  <option value="cartao_debito">Cartão de Débito</option>
                  <option value="boleto">Boleto</option>
                </select>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem" }}>
              <button type="button" className="button secondary" onClick={() => setModalNovoReceber(false)}>
                Cancelar
              </button>
              <button
                type="button"
                className="button primary"
                onClick={handleSalvarNovoReceber}
                style={{ background: "#16a34a", color: "#fff", border: "none", fontWeight: 700 }}
              >
                Salvar Título a Receber
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: ABRIR CAIXA */}
      {/* ============================================================== */}
      {modalAbrirCaixa && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem",
          }}
        >
          <div style={{ background: "#fff", borderRadius: 16, maxWidth: 420, width: "100%", padding: "1.5rem" }}>
            <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.15rem", fontWeight: 800, color: "#1e293b" }}>
              Abertura de Caixa Diário
            </h3>
            <p style={{ margin: "0 0 1rem 0", fontSize: "0.85rem", color: "#64748b" }}>
              Informe o valor em dinheiro do troco inicial na gaveta para começar as operações.
            </p>
            <div style={{ marginBottom: "1.25rem" }}>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: "0.25rem" }}>
                Saldo Inicial / Troco (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={saldoAberturaInput}
                onChange={(e) => setSaldoAberturaInput(Number(e.target.value))}
                style={{ width: "100%", padding: "0.6rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "1.1rem", fontWeight: 800 }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button type="button" className="button secondary" onClick={() => setModalAbrirCaixa(false)}>
                Cancelar
              </button>
              <button type="button" className="button primary" onClick={handleAbrirCaixa} style={{ background: "#16a34a", color: "#fff", border: "none", fontWeight: 700 }}>
                Confirmar Abertura
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: FECHAR CAIXA */}
      {/* ============================================================== */}
      {modalFecharCaixa && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem",
          }}
        >
          <div style={{ background: "#fff", borderRadius: 16, maxWidth: 450, width: "100%", padding: "1.5rem" }}>
            <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.15rem", fontWeight: 800, color: "#dc2626" }}>
              Fechamento e Conferência de Caixa
            </h3>
            <p style={{ margin: "0 0 1rem 0", fontSize: "0.85rem", color: "#64748b" }}>
              Conte o dinheiro físico na gaveta e informe abaixo para apuração de sobras ou faltas.
            </p>

            <div style={{ background: "#f8fafc", padding: "0.75rem", borderRadius: 8, marginBottom: "1rem" }}>
              <div style={{ fontSize: "0.85rem", color: "#64748b" }}>Saldo Esperado pelo Sistema:</div>
              <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "#1e293b" }}>
                R$ {saldoCaixaAtual.toFixed(2)}
              </div>
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: "0.25rem" }}>
                Saldo em Dinheiro Contado na Gaveta (R$) *
              </label>
              <input
                type="number"
                step="0.01"
                value={saldoFechamentoInput}
                onChange={(e) => setSaldoFechamentoInput(Number(e.target.value))}
                style={{ width: "100%", padding: "0.6rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "1.1rem", fontWeight: 800 }}
              />
            </div>

            {/* Diferença em tempo real */}
            <div
              style={{
                padding: "0.6rem 0.8rem",
                borderRadius: 8,
                marginBottom: "1rem",
                fontSize: "0.85rem",
                fontWeight: 700,
                background:
                  saldoFechamentoInput - saldoCaixaAtual === 0
                    ? "#dcfce7"
                    : saldoFechamentoInput - saldoCaixaAtual > 0
                    ? "#fef3c7"
                    : "#fee2e2",
                color:
                  saldoFechamentoInput - saldoCaixaAtual === 0
                    ? "#16a34a"
                    : saldoFechamentoInput - saldoCaixaAtual > 0
                    ? "#d97706"
                    : "#dc2626",
              }}
            >
              Diferença Apurada: R$ {(saldoFechamentoInput - saldoCaixaAtual).toFixed(2)}
              {saldoFechamentoInput - saldoCaixaAtual === 0
                ? " (Conferência exata!)"
                : saldoFechamentoInput - saldoCaixaAtual > 0
                ? " (Sobra de caixa)"
                : " (Falta de caixa)"}
            </div>

            <div style={{ marginBottom: "1.25rem" }}>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: "0.25rem" }}>
                Observações do Operador
              </label>
              <input
                type="text"
                placeholder="Ex: Tudo conferido..."
                value={obsFechamentoInput}
                onChange={(e) => setObsFechamentoInput(e.target.value)}
                style={{ width: "100%", padding: "0.55rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button type="button" className="button secondary" onClick={() => setModalFecharCaixa(false)}>
                Cancelar
              </button>
              <button type="button" className="button primary" onClick={handleFecharCaixa} style={{ background: "#dc2626", color: "#fff", border: "none", fontWeight: 700 }}>
                Encerrar Caixa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: LANÇAMENTO AVULSO NO CAIXA (ENTRADA, SAÍDA, SANGRIA, SUPRIMENTO) */}
      {/* ============================================================== */}
      {modalLancamentoCaixa && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem",
          }}
        >
          <div style={{ background: "#fff", borderRadius: 16, maxWidth: 450, width: "100%", padding: "1.5rem" }}>
            <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.15rem", fontWeight: 800, color: "#1e293b", textTransform: "capitalize" }}>
              Operação de Caixa: {modalLancamentoCaixa}
            </h3>

            <div style={{ display: "grid", gap: "0.75rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: "0.25rem" }}>
                  Valor (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={valorLancCaixa}
                  onChange={(e) => setValorLancCaixa(Number(e.target.value))}
                  style={{ width: "100%", padding: "0.55rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "1rem", fontWeight: 700 }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: "0.25rem" }}>
                  Descrição / Motivo *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Compra emergencial de fermento, Retirada para cofre..."
                  value={descLancCaixa}
                  onChange={(e) => setDescLancCaixa(e.target.value)}
                  style={{ width: "100%", padding: "0.55rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                />
              </div>

              {(modalLancamentoCaixa === "entrada" || modalLancamentoCaixa === "saida") && (
                <>
                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: "0.25rem" }}>
                      Plano de Contas *
                    </label>
                    <select
                      value={planoLancCaixa ?? ""}
                      onChange={(e) => setPlanoLancCaixa(e.target.value ? Number(e.target.value) : null)}
                      style={{ width: "100%", padding: "0.55rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.85rem", background: "#fff" }}
                    >
                      <option value="">Selecione a conta analítica...</option>
                      {(modalLancamentoCaixa === "entrada" ? contasReceitaAnaliticas : contasDespesaAnaliticas).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.codigo} - {c.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: "0.25rem" }}>
                      Centro de Custo
                    </label>
                    <select
                      value={centroLancCaixa ?? ""}
                      onChange={(e) => setCentroLancCaixa(e.target.value ? Number(e.target.value) : null)}
                      style={{ width: "100%", padding: "0.55rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.85rem", background: "#fff" }}
                    >
                      <option value="">Nenhum / Geral</option>
                      {centrosCusto.map((cc) => (
                        <option key={cc.id} value={cc.id}>
                          {cc.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem" }}>
              <button type="button" className="button secondary" onClick={() => setModalLancamentoCaixa(null)}>
                Cancelar
              </button>
              <button
                type="button"
                className="button primary"
                onClick={handleConfirmarLancamentoCaixa}
                style={{
                  background: modalLancamentoCaixa === "entrada" || modalLancamentoCaixa === "suprimento" ? "#16a34a" : "#dc2626",
                  color: "#fff",
                  border: "none",
                  fontWeight: 700,
                }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: NOVA CONTA BANCÁRIA */}
      {/* ============================================================== */}
      {modalNovaContaBancaria && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem",
          }}
        >
          <div style={{ background: "#fff", borderRadius: 16, maxWidth: 450, width: "100%", padding: "1.5rem" }}>
            <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.15rem", fontWeight: 800, color: "#1e293b" }}>
              Cadastrar Conta Bancária
            </h3>

            <div style={{ display: "grid", gap: "0.75rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: "0.25rem" }}>
                  Banco / Nome da Carteira *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Itaú Empresas, Nubank PJ, Carteira PIX..."
                  value={formBancoNome}
                  onChange={(e) => setFormBancoNome(e.target.value)}
                  style={{ width: "100%", padding: "0.55rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: "0.25rem" }}>
                    Tipo de Conta
                  </label>
                  <select
                    value={formTipoConta}
                    onChange={(e) => setFormTipoConta(e.target.value as any)}
                    style={{ width: "100%", padding: "0.55rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.85rem", background: "#fff" }}
                  >
                    <option value="corrente">Corrente</option>
                    <option value="poupanca">Poupança</option>
                    <option value="pagamento">Pagamento / PIX</option>
                    <option value="investimento">Investimento</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: "0.25rem" }}>
                    Agência
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 0001"
                    value={formAgencia}
                    onChange={(e) => setFormAgencia(e.target.value)}
                    style={{ width: "100%", padding: "0.55rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: "0.25rem" }}>
                    Número da Conta *
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 12345-6"
                    value={formNumConta}
                    onChange={(e) => setFormNumConta(e.target.value)}
                    style={{ width: "100%", padding: "0.55rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: "0.25rem" }}>
                    Saldo Inicial (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formSaldoInicial}
                    onChange={(e) => setFormSaldoInicial(Number(e.target.value))}
                    style={{ width: "100%", padding: "0.55rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.85rem", fontWeight: 700 }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem" }}>
              <button type="button" className="button secondary" onClick={() => setModalNovaContaBancaria(false)}>
                Cancelar
              </button>
              <button type="button" className="button primary" onClick={handleSalvarContaBancaria} style={{ fontWeight: 700 }}>
                Salvar Conta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: TRANSFERÊNCIA ENTRE CONTAS OU CAIXA <-> BANCO */}
      {/* ============================================================== */}
      {modalTransferencia && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem",
          }}
        >
          <div style={{ background: "#fff", borderRadius: 16, maxWidth: 480, width: "100%", padding: "1.5rem" }}>
            <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.15rem", fontWeight: 800, color: "#1e293b" }}>
              Transferência de Recursos
            </h3>
            <p style={{ margin: "0 0 1rem 0", fontSize: "0.85rem", color: "#64748b" }}>
              Transfira recursos entre contas bancárias ou entre caixa e banco sem gerar receita ou despesa.
            </p>

            <div style={{ display: "grid", gap: "0.75rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: "0.25rem" }}>
                  Tipo de Transferência *
                </label>
                <select
                  value={transfTipoOperacao}
                  onChange={(e) => setTransfTipoOperacao(e.target.value as any)}
                  style={{ width: "100%", padding: "0.55rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.85rem", background: "#fff" }}
                >
                  <option value="bancos">Entre Contas Bancárias (Banco A → Banco B)</option>
                  <option value="caixa_para_banco">Depósito (Caixa Gaveta → Banco)</option>
                  <option value="banco_para_caixa">Saque / Troco (Banco → Caixa Gaveta)</option>
                </select>
              </div>

              {transfTipoOperacao === "bancos" ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: "0.25rem" }}>
                      Origem (Saída) *
                    </label>
                    <select
                      value={transfBancoOrigemId ?? ""}
                      onChange={(e) => setTransfBancoOrigemId(e.target.value ? Number(e.target.value) : null)}
                      style={{ width: "100%", padding: "0.55rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.85rem", background: "#fff" }}
                    >
                      <option value="">Selecione...</option>
                      {contasBancarias.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.banco} ({b.conta})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: "0.25rem" }}>
                      Destino (Entrada) *
                    </label>
                    <select
                      value={transfBancoDestinoId ?? ""}
                      onChange={(e) => setTransfBancoDestinoId(e.target.value ? Number(e.target.value) : null)}
                      style={{ width: "100%", padding: "0.55rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.85rem", background: "#fff" }}
                    >
                      <option value="">Selecione...</option>
                      {contasBancarias.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.banco} ({b.conta})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: "0.25rem" }}>
                    Conta Bancária Envolvida *
                  </label>
                  <select
                    value={transfBancoDestinoId ?? ""}
                    onChange={(e) => setTransfBancoDestinoId(e.target.value ? Number(e.target.value) : null)}
                    style={{ width: "100%", padding: "0.55rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.85rem", background: "#fff" }}
                  >
                    <option value="">Selecione a conta bancária...</option>
                    {contasBancarias.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.banco} ({b.conta})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: "0.25rem" }}>
                    Valor (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={transfValor}
                    onChange={(e) => setTransfValor(Number(e.target.value))}
                    style={{ width: "100%", padding: "0.55rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "1rem", fontWeight: 800 }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: "0.25rem" }}>
                    Data *
                  </label>
                  <input
                    type="date"
                    value={transfData}
                    onChange={(e) => setTransfData(e.target.value)}
                    style={{ width: "100%", padding: "0.55rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: "0.25rem" }}>
                  Descrição / Motivo
                </label>
                <input
                  type="text"
                  placeholder="Ex: Depósito de fechamento do caixa, Transferência de reserva..."
                  value={transfDescricao}
                  onChange={(e) => setTransfDescricao(e.target.value)}
                  style={{ width: "100%", padding: "0.55rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem" }}>
              <button type="button" className="button secondary" onClick={() => setModalTransferencia(false)}>
                Cancelar
              </button>
              <button type="button" className="button primary" onClick={handleExecutarTransferencia} style={{ fontWeight: 700 }}>
                Efetuar Transferência
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: NOVO PLANO DE CONTAS */}
      {/* ============================================================== */}
      {modalNovoPlanoConta && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem",
          }}
        >
          <div style={{ background: "#fff", borderRadius: 16, maxWidth: 450, width: "100%", padding: "1.5rem" }}>
            <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.15rem", fontWeight: 800, color: "#1e293b" }}>
              {modalPlanoConta ? "Editar Conta Contábil" : "Nova Conta no Plano de Contas"}
            </h3>

            <div style={{ display: "grid", gap: "0.75rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: "0.25rem" }}>
                  Tipo da Conta *
                </label>
                <select
                  value={formPlanoTipo}
                  onChange={(e) => setFormPlanoTipo(e.target.value as any)}
                  style={{ width: "100%", padding: "0.55rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.85rem", background: "#fff" }}
                >
                  <option value="despesa">Despesa (Custos / Despesas)</option>
                  <option value="receita">Receita (Vendas / Outras Entradas)</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: "0.25rem" }}>
                  Conta Pai (Agrupadora)
                </label>
                <select
                  value={formPlanoPaiId ?? ""}
                  onChange={(e) => {
                    const id = e.target.value ? Number(e.target.value) : null;
                    setFormPlanoPaiId(id);
                    if (id) {
                      const pai = planoContas.find((p) => p.id === id);
                      if (pai && !formPlanoCodigo) {
                        setFormPlanoCodigo(`${pai.codigo}.`);
                      }
                    }
                  }}
                  style={{ width: "100%", padding: "0.55rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.85rem", background: "#fff" }}
                >
                  <option value="">Nenhuma (Conta Raiz)</option>
                  {contasSinteticas.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.codigo} - {s.nome} ({s.tipo})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "0.5rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: "0.25rem" }}>
                    Código *
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 2.1.05"
                    value={formPlanoCodigo}
                    onChange={(e) => setFormPlanoCodigo(e.target.value)}
                    style={{ width: "100%", padding: "0.55rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.85rem", fontWeight: 700 }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: "0.25rem" }}>
                    Nome da Conta *
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Embalagens para Delivery"
                    value={formPlanoNome}
                    onChange={(e) => setFormPlanoNome(e.target.value)}
                    style={{ width: "100%", padding: "0.55rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: "0.25rem" }}>
                  Natureza da Conta
                </label>
                <select
                  value={formPlanoTipoConta}
                  onChange={(e) => setFormPlanoTipoConta(e.target.value as any)}
                  style={{ width: "100%", padding: "0.55rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.85rem", background: "#fff" }}
                >
                  <option value="analitica">Analítica (Recebe Lançamentos Diretos)</option>
                  <option value="sintetica">Sintética (Apenas Agrupa Subcontas)</option>
                </select>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem" }}>
              <button type="button" className="button secondary" onClick={() => setModalNovoPlanoConta(false)}>
                Cancelar
              </button>
              <button type="button" className="button primary" onClick={handleSalvarPlanoConta} style={{ fontWeight: 700 }}>
                Salvar Conta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: NOVO CENTRO DE CUSTO */}
      {/* ============================================================== */}
      {modalNovoCentroCusto && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem",
          }}
        >
          <div style={{ background: "#fff", borderRadius: 16, maxWidth: 450, width: "100%", padding: "1.5rem" }}>
            <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.15rem", fontWeight: 800, color: "#1e293b" }}>
              {modalCentroCusto ? "Editar Centro de Custo" : "Novo Centro de Custo"}
            </h3>

            <div style={{ display: "grid", gap: "0.75rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "0.5rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: "0.25rem" }}>
                    Código
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: CC-01"
                    value={formCcCodigo}
                    onChange={(e) => setFormCcCodigo(e.target.value)}
                    style={{ width: "100%", padding: "0.55rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: "0.25rem" }}>
                    Nome *
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Produção, Loja Balcão..."
                    value={formCcNome}
                    onChange={(e) => setFormCcNome(e.target.value)}
                    style={{ width: "100%", padding: "0.55rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: "0.25rem" }}>
                  Descrição / Finalidade
                </label>
                <input
                  type="text"
                  placeholder="Ex: Custos e despesas da cozinha e fabricação..."
                  value={formCcDescricao}
                  onChange={(e) => setFormCcDescricao(e.target.value)}
                  style={{ width: "100%", padding: "0.55rem", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem" }}>
              <button type="button" className="button secondary" onClick={() => setModalNovoCentroCusto(false)}>
                Cancelar
              </button>
              <button type="button" className="button primary" onClick={handleSalvarCentroCusto} style={{ fontWeight: 700 }}>
                Salvar Centro de Custo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
