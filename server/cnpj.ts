/**
 * ============================================================================
 * PROJETO: Gestão com Sabor - Sistema de Gestão para Confeitarias
 * REPOSITÓRIO: https://github.com/junin1737/confeitaria
 * ARQUIVO: server/cnpj.ts
 * DESCRIÇÃO: Serviço de Consulta e Preenchimento Automático de CNPJ.
 *            Consome fontes públicas seguras (publica.cnpj.ws com fallback BrasilAPI)
 *            e mapeia todos os campos da Ficha Cadastral: Razão Social, Fantasia,
 *            Responsável/Sócio, Logradouro, Bairro, CEP, Cidade, UF, Telefones,
 *            E-mail, CNAE, Inscrição Estadual, Simples Nacional e MEI.
 * ============================================================================
 */

export type CnpjData = {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  responsavel: string;
  cep: string;
  tipoLogradouro: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  uf: string;
  municipio: string;
  dddTelefone: string;
  telefone: string;
  dddCelular: string;
  celular: string;
  email: string;
  ramoAtividade: string;
  cnae: string;
  inscricaoEstadual: string;
  optanteSimples: "Sim" | "Não";
  regimeTributario: "Normal" | "Microempreendedor Individual - MEI" | "Excedido o sublimite do estado";
};

export async function consultarCnpj(cnpjParam: string): Promise<{ ok: boolean; dados?: CnpjData; erro?: string }> {
  const digits = cnpjParam.replace(/\D/g, "");
  if (digits.length !== 14) {
    return { ok: false, erro: "Informe um CNPJ válido com 14 dígitos numéricos." };
  }

  // 1. Primeira tentativa: publica.cnpj.ws (retorna dados cadastrais completos, CNAE, simples e IE)
  try {
    const res = await fetch(`https://publica.cnpj.ws/cnpj/${digits}`, {
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      const d = await res.json();
      const estab = d.estabelecimento || {};
      const simples = d.simples || {};
      const ieList = estab.inscricoes_estaduais || [];
      const ieAtiva = ieList.find((i: any) => i.ativo) || ieList[0];

      // Formata logradouro
      const tipoLog = estab.tipo_logradouro ? String(estab.tipo_logradouro).trim() : "Rua";
      let logr = estab.logradouro ? String(estab.logradouro).trim() : "";
      if (logr.toLowerCase().startsWith(tipoLog.toLowerCase() + " ")) {
        logr = logr.slice(tipoLog.length).trim();
      }

      // Regime Tributário
      let regime: CnpjData["regimeTributario"] = "Normal";
      if (simples.mei === "Sim") {
        regime = "Microempreendedor Individual - MEI";
      }

      // Responsável
      let resp = "";
      if (d.socios && d.socios.length > 0) {
        resp = String(d.socios[0]?.nome || "");
      } else if (d.razao_social) {
        // Se for empresário individual, remove o CPF do final da razão social
        resp = String(d.razao_social).replace(/\d+$/, "").trim();
      }

      const dados: CnpjData = {
        cnpj: digits,
        razaoSocial: String(d.razao_social || "").trim(),
        nomeFantasia: String(estab.nome_fantasia || d.razao_social || "").trim(),
        responsavel: resp,
        cep: estab.cep ? String(estab.cep).replace(/\D/g, "") : "",
        tipoLogradouro: tipoLog || "Rua",
        logradouro: logr,
        numero: estab.numero ? String(estab.numero).trim() : "",
        complemento: estab.complemento ? String(estab.complemento).trim() : "",
        bairro: estab.bairro ? String(estab.bairro).trim() : "",
        uf: estab.estado?.sigla ? String(estab.estado.sigla).trim() : "",
        municipio: estab.cidade?.nome ? String(estab.cidade.nome).trim() : "",
        dddTelefone: estab.ddd1 ? String(estab.ddd1).trim() : "",
        telefone: estab.telefone1 ? String(estab.telefone1).trim() : "",
        dddCelular: estab.ddd2 ? String(estab.ddd2).trim() : (estab.ddd1 ? String(estab.ddd1).trim() : ""),
        celular: estab.telefone2 ? String(estab.telefone2).trim() : "",
        email: estab.email ? String(estab.email).toLowerCase().trim() : "",
        ramoAtividade: estab.atividade_principal?.descricao ? String(estab.atividade_principal.descricao).trim() : "",
        cnae: estab.atividade_principal?.id ? String(estab.atividade_principal.id).replace(/\D/g, "") : "",
        inscricaoEstadual: ieAtiva?.inscricao_estadual ? String(ieAtiva.inscricao_estadual).trim() : "",
        optanteSimples: simples.simples === "Sim" ? "Sim" : "Não",
        regimeTributario: regime,
      };

      return { ok: true, dados };
    }
  } catch (e) {
    console.warn("[CNPJ] Falha ao consultar publica.cnpj.ws, tentando fallback...", e);
  }

  // 2. Fallback: BrasilAPI
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`, {
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      const d = await res.json();
      const dados: CnpjData = {
        cnpj: digits,
        razaoSocial: String(d.razao_social || "").trim(),
        nomeFantasia: String(d.nome_fantasia || d.razao_social || "").trim(),
        responsavel: (d.qsa && d.qsa[0]?.nome_socio) ? String(d.qsa[0].nome_socio).trim() : String(d.razao_social || "").replace(/\d+$/, "").trim(),
        cep: d.cep ? String(d.cep).replace(/\D/g, "") : "",
        tipoLogradouro: d.descricao_tipo_de_logradouro ? String(d.descricao_tipo_de_logradouro).trim() : "Rua",
        logradouro: d.logradouro ? String(d.logradouro).trim() : "",
        numero: d.numero ? String(d.numero).trim() : "",
        complemento: d.complemento ? String(d.complemento).trim() : "",
        bairro: d.bairro ? String(d.bairro).trim() : "",
        uf: d.uf ? String(d.uf).trim() : "",
        municipio: d.municipio ? String(d.municipio).trim() : "",
        dddTelefone: d.ddd_telefone_1 ? String(d.ddd_telefone_1).slice(0, 2) : "",
        telefone: d.ddd_telefone_1 ? String(d.ddd_telefone_1).slice(2) : "",
        dddCelular: d.ddd_telefone_2 ? String(d.ddd_telefone_2).slice(0, 2) : "",
        celular: d.ddd_telefone_2 ? String(d.ddd_telefone_2).slice(2) : "",
        email: d.email ? String(d.email).toLowerCase().trim() : "",
        ramoAtividade: d.cnae_fiscal_descricao ? String(d.cnae_fiscal_descricao).trim() : "",
        cnae: d.cnae_fiscal ? String(d.cnae_fiscal) : "",
        inscricaoEstadual: "",
        optanteSimples: d.opcao_pelo_simples ? "Sim" : "Não",
        regimeTributario: d.opcao_pelo_mei ? "Microempreendedor Individual - MEI" : "Normal",
      };

      return { ok: true, dados };
    }
  } catch (e: any) {
    return { ok: false, erro: "Não foi possível consultar os dados do CNPJ: " + e?.message };
  }

  return { ok: false, erro: "CNPJ não localizado nas bases da Receita Federal." };
}
