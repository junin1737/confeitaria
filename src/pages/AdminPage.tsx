/**
 * ============================================================================
 * PROJETO: Doce Gestor - Sistema de Gestão para Confeitarias
 * REPOSITÓRIO: https://github.com/junin1737/confeitaria
 * ARQUIVO: src/pages/AdminPage.tsx
 * DESCRIÇÃO: Painel Master de administração de confeitarias e controle de licenças.
 * ============================================================================
 * 
 * [RECURSOS DO PAINEL MASTER]
 * 1. Indicadores em tempo real de confeitarias ativas, trials e bloqueadas.
 * 2. Visualização e cópia rápida de chaves seriais (DG-XXXX-YYYY-2026).
 * 3. Ações rápidas de 1 clique: +30 Dias, +1 Ano, Bloquear Acesso e Novo Serial.
 * 4. Modal de cadastro manual de novas confeitarias.
 * 5. Aba dedicada com documentação e chave de API para integração externa.
 * ============================================================================
 */

import { useEffect, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Copy,
  KeyRound,
  Lock,
  MessageCircle,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Unlock,
  Users,
  FileText,
  X,
  MapPin,
} from "lucide-react";
import {
  alterarStatusEmpresaApi,
  criarEmpresaAdminApi,
  fetchAdminEmpresas,
  prorrogarLicencaEmpresaApi,
  renovarSerialEmpresaApi,
  type EmpresaAdminDto,
} from "../api";

export function AdminPage() {
  const [empresas, setEmpresas] = useState<EmpresaAdminDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalNova, setModalNova] = useState(false);
  const [modalBloqueio, setModalBloqueio] = useState<EmpresaAdminDto | null>(null);
  const [modalFicha, setModalFicha] = useState<EmpresaAdminDto | null>(null);
  const [motivoBloqueio, setMotivoBloqueio] = useState("");
  const [copiadoSerial, setCopiadoSerial] = useState<string | null>(null);
  const [copiadoKey, setCopiadoKey] = useState(false);
  const [tab, setTab] = useState<"empresas" | "api">("empresas");

  // Form nova empresa
  const [formNome, setFormNome] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formTelefone, setFormTelefone] = useState("");
  const [formPlano, setFormPlano] = useState("mensal");
  const [formDias, setFormDias] = useState(30);
  const [formSenha, setFormSenha] = useState("123456");
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState("");

  const apiKeyExterna = "dg_master_secret_key_2026";

  async function carregar() {
    try {
      setLoading(true);
      const data = await fetchAdminEmpresas();
      setEmpresas(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  function copiarTexto(texto: string, tipo: "serial" | "key") {
    navigator.clipboard.writeText(texto);
    if (tipo === "serial") {
      setCopiadoSerial(texto);
      setTimeout(() => setCopiadoSerial(null), 2500);
    } else {
      setCopiadoKey(true);
      setTimeout(() => setCopiadoKey(false), 2500);
    }
  }

  async function handleCriarEmpresa(e: React.FormEvent) {
    e.preventDefault();
    setErroForm("");
    setSalvando(true);
    try {
      await criarEmpresaAdminApi({
        nome: formNome,
        email: formEmail,
        telefone: formTelefone || undefined,
        plano: formPlano,
        diasValidade: formDias,
        senhaAdmin: formSenha,
      });
      setModalNova(false);
      setFormNome("");
      setFormEmail("");
      setFormTelefone("");
      carregar();
    } catch (err) {
      setErroForm(err instanceof Error ? err.message : "Erro ao cadastrar empresa.");
    } finally {
      setSalvando(false);
    }
  }

  async function handleProrrogar(id: number, dias: number) {
    try {
      await prorrogarLicencaEmpresaApi(id, dias);
      carregar();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao prorrogar.");
    }
  }

  async function handleRenovarSerial(id: number) {
    if (!confirm("Deseja gerar uma nova chave serial para esta confeitaria?")) return;
    try {
      await renovarSerialEmpresaApi(id);
      carregar();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao renovar serial.");
    }
  }

  async function handleConfirmarBloqueio() {
    if (!modalBloqueio) return;
    try {
      await alterarStatusEmpresaApi(modalBloqueio.id, "bloqueada", motivoBloqueio || "Acesso suspenso pelo administrador.");
      setModalBloqueio(null);
      setMotivoBloqueio("");
      carregar();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao bloquear empresa.");
    }
  }

  async function handleReativar(id: number) {
    try {
      await alterarStatusEmpresaApi(id, "ativa", "", 30);
      carregar();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao reativar.");
    }
  }

  const filtradas = empresas.filter(
    (e) =>
      e.nome.toLowerCase().includes(search.toLowerCase()) ||
      (e.email && e.email.toLowerCase().includes(search.toLowerCase())) ||
      (e.serialKey && e.serialKey.toLowerCase().includes(search.toLowerCase())),
  );

  const ativasCount = empresas.filter((e) => e.status === "ativa").length;
  const trialCount = empresas.filter((e) => e.status === "trial").length;
  const bloqueadasCount = empresas.filter((e) => e.status === "bloqueada").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* CABEÇALHO */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--color-primary)", fontWeight: 700, fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px" }}>
            <ShieldCheck size={18} />
            PAINEL MASTER • CONTROLE DE LICENÇAS & MULTI-TENANT
          </div>
          <h1 style={{ fontSize: "26px", fontWeight: 800, marginTop: "4px", color: "#1f1b19" }}>
            Gestão das Confeitarias
          </h1>
          <p style={{ color: "#786d66", fontSize: "14px" }}>
            Controle de acesso, bloqueio/desbloqueio em tempo real e integração com seus painéis externos.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => setModalNova(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "var(--color-primary, #b33951)",
              color: "white",
              border: "none",
              borderRadius: "10px",
              padding: "10px 18px",
              fontWeight: 700,
              fontSize: "13px",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(179,57,81,0.25)",
            }}
          >
            <Plus size={18} />
            Nova Confeitaria
          </button>
        </div>
      </div>

      {/* CARDS RESUMO */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
        <div style={{ background: "white", padding: "18px 20px", borderRadius: "14px", border: "1px solid #ebdcd5", display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ width: "46px", height: "46px", borderRadius: "12px", background: "#e8f5e9", color: "#2e7d32", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Building2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#82756d" }}>Confeitarias Ativas</div>
            <div style={{ fontSize: "24px", fontWeight: 800, color: "#1f1b19" }}>{ativasCount}</div>
          </div>
        </div>

        <div style={{ background: "white", padding: "18px 20px", borderRadius: "14px", border: "1px solid #ebdcd5", display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ width: "46px", height: "46px", borderRadius: "12px", background: "#fff8e1", color: "#f57f17", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <KeyRound size={24} />
          </div>
          <div>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#82756d" }}>Em Teste (Trial)</div>
            <div style={{ fontSize: "24px", fontWeight: 800, color: "#1f1b19" }}>{trialCount}</div>
          </div>
        </div>

        <div style={{ background: "white", padding: "18px 20px", borderRadius: "14px", border: "1px solid #ebdcd5", display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ width: "46px", height: "46px", borderRadius: "12px", background: "#ffebee", color: "#c62828", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Lock size={24} />
          </div>
          <div>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#82756d" }}>Bloqueadas / Inadimplentes</div>
            <div style={{ fontSize: "24px", fontWeight: 800, color: "#1f1b19" }}>{bloqueadasCount}</div>
          </div>
        </div>

        <div style={{ background: "white", padding: "18px 20px", borderRadius: "14px", border: "1px solid #ebdcd5", display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ width: "46px", height: "46px", borderRadius: "12px", background: "#ede7f6", color: "#512da8", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Users size={24} />
          </div>
          <div>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#82756d" }}>Total Cadastradas</div>
            <div style={{ fontSize: "24px", fontWeight: 800, color: "#1f1b19" }}>{empresas.length}</div>
          </div>
        </div>
      </div>

      {/* ABAS */}
      <div style={{ display: "flex", gap: "10px", borderBottom: "2px solid #ebdcd5", paddingBottom: "2px" }}>
        <button
          onClick={() => setTab("empresas")}
          style={{
            background: "none",
            border: "none",
            padding: "8px 16px",
            fontWeight: 700,
            fontSize: "14px",
            cursor: "pointer",
            borderBottom: tab === "empresas" ? "3px solid var(--color-primary, #b33951)" : "3px solid transparent",
            color: tab === "empresas" ? "var(--color-primary, #b33951)" : "#82756d",
          }}
        >
          Confeitarias Cadastradas ({empresas.length})
        </button>
        <button
          onClick={() => setTab("api")}
          style={{
            background: "none",
            border: "none",
            padding: "8px 16px",
            fontWeight: 700,
            fontSize: "14px",
            cursor: "pointer",
            borderBottom: tab === "api" ? "3px solid var(--color-primary, #b33951)" : "3px solid transparent",
            color: tab === "api" ? "var(--color-primary, #b33951)" : "#82756d",
          }}
        >
          ⚡ API & Integração com Outros Sistemas
        </button>
      </div>

      {tab === "empresas" && (
        <>
          {/* BUSCA */}
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <div style={{ position: "relative", flex: 1, maxWidth: "400px" }}>
              <Search size={18} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#a89b94" }} />
              <input
                type="text"
                placeholder="Buscar por nome, e-mail ou serial..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 14px 10px 38px",
                  borderRadius: "10px",
                  border: "1px solid #ebdcd5",
                  fontSize: "13px",
                  background: "white",
                  outline: "none",
                }}
              />
            </div>
            <button
              onClick={carregar}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "9px 14px",
                background: "white",
                border: "1px solid #ebdcd5",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: 600,
                color: "#6b5d56",
                cursor: "pointer",
              }}
            >
              <RefreshCw size={15} />
              Atualizar
            </button>
          </div>

          {/* LISTA DE EMPRESAS */}
          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#8a7d76" }}>Carregando dados das confeitarias...</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {filtradas.map((emp) => {
                const statusCor =
                  emp.status === "ativa"
                    ? { bg: "#e8f5e9", text: "#2e7d32", label: "Ativa" }
                    : emp.status === "trial"
                    ? { bg: "#fff8e1", text: "#f57f17", label: "Trial (Teste)" }
                    : emp.status === "bloqueada"
                    ? { bg: "#ffebee", text: "#c62828", label: "Bloqueada" }
                    : { bg: "#eeeeee", text: "#616161", label: "Expirada" };

                return (
                  <div
                    key={emp.id}
                    style={{
                      background: "white",
                      borderRadius: "14px",
                      border: "1px solid #ebdcd5",
                      padding: "20px 24px",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "14px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <h3 style={{ fontSize: "17px", fontWeight: 800, color: "#1f1b19" }}>{emp.nome}</h3>
                          <span
                            style={{
                              background: statusCor.bg,
                              color: statusCor.text,
                              fontSize: "11px",
                              fontWeight: 800,
                              padding: "3px 10px",
                              borderRadius: "20px",
                              textTransform: "uppercase",
                            }}
                          >
                            {statusCor.label}
                          </span>
                          <span style={{ fontSize: "11px", color: "#9c8f87", fontWeight: 600 }}>Plano: {emp.plano.toUpperCase()}</span>
                        </div>
                        <div style={{ display: "flex", gap: "16px", marginTop: "4px", fontSize: "13px", color: "#6b5e57", flexWrap: "wrap" }}>
                          <span>📧 {emp.email || "Sem e-mail cadastrado"}</span>
                          {emp.telefone && (
                            <a
                              href={`https://wa.me/55${emp.telefone.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ display: "flex", alignItems: "center", gap: "4px", color: "#25d366", fontWeight: 700, textDecoration: "none" }}
                            >
                              <MessageCircle size={14} /> WhatsApp ({emp.telefone})
                            </a>
                          )}
                          <span>ID: #{emp.id}</span>
                        </div>
                      </div>

                      {/* SERIAL & DIAS RESTANTES */}
                      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                        {emp.serialKey && (
                          <div style={{ background: "#fbf6f3", padding: "6px 12px", borderRadius: "8px", border: "1px solid #e8dbd4", display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "11px", color: "#8a7b74", fontWeight: 700 }}>SERIAL:</span>
                            <code style={{ fontSize: "12px", fontWeight: 800, color: "var(--color-primary, #b33951)" }}>{emp.serialKey}</code>
                            <button
                              onClick={() => copiarTexto(emp.serialKey!, "serial")}
                              title="Copiar Serial"
                              style={{ background: "none", border: "none", cursor: "pointer", color: "#8a7b74" }}
                            >
                              {copiadoSerial === emp.serialKey ? <CheckCircle2 size={15} color="#2e7d32" /> : <Copy size={15} />}
                            </button>
                          </div>
                        )}

                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: "11px", color: "#8a7b74", fontWeight: 600 }}>Vencimento</div>
                          <div style={{ fontSize: "13px", fontWeight: 800, color: emp.diasRestantes && emp.diasRestantes < 5 ? "#c62828" : "#2e7d32" }}>
                            {emp.plano === "vitalicio" ? (
                              "Vitalício"
                            ) : emp.diasRestantes !== null ? (
                              emp.diasRestantes >= 0 ? (
                                `${emp.diasRestantes} dias restantes`
                              ) : (
                                `Expirou há ${Math.abs(emp.diasRestantes)} dias`
                              )
                            ) : (
                              "Indefinido"
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* MOTIVO DE BLOQUEIO SE HOUVER */}
                    {emp.status === "bloqueada" && emp.motivoBloqueio && (
                      <div style={{ background: "#ffebee", border: "1px solid #ffcdd2", borderRadius: "8px", padding: "8px 14px", fontSize: "12px", color: "#c62828", display: "flex", alignItems: "center", gap: "8px" }}>
                        <ShieldAlert size={16} />
                        <strong>Motivo do Bloqueio:</strong> {emp.motivoBloqueio}
                      </div>
                    )}

                    {/* BARRA DE AÇÕES */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "12px", borderTop: "1px solid #f4eae5", flexWrap: "wrap", gap: "10px" }}>
                      <div style={{ fontSize: "12px", color: "#8a7b74" }}>
                        Colaboradores: <strong>{emp.totalFuncionarios}</strong> | Usuários: <strong>{emp.totalUsuarios}</strong>
                      </div>

                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                        <button
                          onClick={() => setModalFicha(emp)}
                          style={{
                            background: "#e0f2fe",
                            color: "#0369a1",
                            border: "1px solid #bae6fd",
                            borderRadius: "8px",
                            padding: "6px 12px",
                            fontSize: "12px",
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "5px",
                          }}
                        >
                          <FileText size={14} />
                          Ver Ficha Cadastral
                        </button>

                        <button
                          onClick={() => handleProrrogar(emp.id, 30)}
                          style={{
                            background: "#e8f5e9",
                            color: "#2e7d32",
                            border: "1px solid #c8e6c9",
                            borderRadius: "8px",
                            padding: "6px 12px",
                            fontSize: "12px",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          +30 Dias
                        </button>

                        <button
                          onClick={() => handleProrrogar(emp.id, 365)}
                          style={{
                            background: "#e8f5e9",
                            color: "#2e7d32",
                            border: "1px solid #c8e6c9",
                            borderRadius: "8px",
                            padding: "6px 12px",
                            fontSize: "12px",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          +1 Ano
                        </button>

                        <button
                          onClick={() => handleRenovarSerial(emp.id)}
                          style={{
                            background: "#ede7f6",
                            color: "#512da8",
                            border: "1px solid #d1c4e9",
                            borderRadius: "8px",
                            padding: "6px 12px",
                            fontSize: "12px",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          Novo Serial
                        </button>

                        {emp.status === "bloqueada" ? (
                          <button
                            onClick={() => handleReativar(emp.id)}
                            style={{
                              background: "#2e7d32",
                              color: "white",
                              border: "none",
                              borderRadius: "8px",
                              padding: "6px 14px",
                              fontSize: "12px",
                              fontWeight: 700,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            <Unlock size={14} />
                            Desbloquear Acesso
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setModalBloqueio(emp);
                              setMotivoBloqueio("");
                            }}
                            style={{
                              background: "#ffebee",
                              color: "#c62828",
                              border: "1px solid #ffcdd2",
                              borderRadius: "8px",
                              padding: "6px 14px",
                              fontSize: "12px",
                              fontWeight: 700,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            <Lock size={14} />
                            Bloquear Empresa
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ABA DE INTEGRAÇÃO API */}
      {tab === "api" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ background: "white", borderRadius: "14px", border: "1px solid #ebdcd5", padding: "24px" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#1f1b19", marginBottom: "8px" }}>
              Integração Externa (Para seu Painel Central)
            </h3>
            <p style={{ color: "#6b5d56", fontSize: "14px", lineHeight: "1.6" }}>
              Você pode controlar a liberação, bloqueio e criação de confeitarias diretamente pelo seu sistema central ou gateway de pagamento através de chamadas HTTP seguras com a <strong>Chave Mestre de API</strong>.
            </p>

            <div style={{ marginTop: "16px", background: "#faf4f0", padding: "16px", borderRadius: "10px", border: "1px solid #ebd8ce" }}>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "#78655d", marginBottom: "6px" }}>SUA CHAVE MESTRE DE INTEGRAÇÃO (ADMIN API KEY):</div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <code style={{ fontSize: "14px", fontWeight: 800, color: "var(--color-primary, #b33951)", background: "white", padding: "8px 12px", borderRadius: "6px", border: "1px solid #d4c2b8", flex: 1 }}>
                  {apiKeyExterna}
                </code>
                <button
                  onClick={() => copiarTexto(apiKeyExterna, "key")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "var(--color-primary, #b33951)",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    padding: "8px 14px",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {copiadoKey ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                  {copiadoKey ? "Copiada!" : "Copiar Chave"}
                </button>
              </div>
            </div>
          </div>

          <div style={{ background: "white", borderRadius: "14px", border: "1px solid #ebdcd5", padding: "24px" }}>
            <h4 style={{ fontSize: "16px", fontWeight: 800, color: "#1f1b19", marginBottom: "14px" }}>
              Endpoints Disponíveis para seu Painel Externo
            </h4>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ background: "#fbf9f8", border: "1px solid #eeded6", borderRadius: "10px", padding: "14px" }}>
                <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ background: "#e8f5e9", color: "#2e7d32", fontWeight: 800, fontSize: "11px", padding: "3px 8px", borderRadius: "6px" }}>PATCH</span>
                  <code style={{ fontWeight: 700, fontSize: "13px" }}>/api/admin/empresas/:id/status</code>
                  <span style={{ fontSize: "12px", color: "#7a6b63" }}>— Bloquear ou Ativar empresa</span>
                </div>
                <pre style={{ background: "#2b2523", color: "#f8f0ec", padding: "12px", borderRadius: "8px", fontSize: "12px", overflowX: "auto" }}>
{`// Header: X-Admin-Api-Key: ${apiKeyExterna}
// Body JSON:
{
  "status": "bloqueada", // ou "ativa"
  "motivo": "Fatura mensal pendente"
}`}
                </pre>
              </div>

              <div style={{ background: "#fbf9f8", border: "1px solid #eeded6", borderRadius: "10px", padding: "14px" }}>
                <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ background: "#e1f5fe", color: "#0288d1", fontWeight: 800, fontSize: "11px", padding: "3px 8px", borderRadius: "6px" }}>POST</span>
                  <code style={{ fontWeight: 700, fontSize: "13px" }}>/api/admin/empresas/:id/prorrogar</code>
                  <span style={{ fontSize: "12px", color: "#7a6b63" }}>— Renovar licença (+30 dias, +365 dias)</span>
                </div>
                <pre style={{ background: "#2b2523", color: "#f8f0ec", padding: "12px", borderRadius: "8px", fontSize: "12px", overflowX: "auto" }}>
{`// Header: X-Admin-Api-Key: ${apiKeyExterna}
// Body JSON:
{
  "dias": 30,
  "plano": "mensal"
}`}
                </pre>
              </div>

              <div style={{ background: "#fbf9f8", border: "1px solid #eeded6", borderRadius: "10px", padding: "14px" }}>
                <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ background: "#ede7f6", color: "#512da8", fontWeight: 800, fontSize: "11px", padding: "3px 8px", borderRadius: "6px" }}>GET</span>
                  <code style={{ fontWeight: 700, fontSize: "13px" }}>/api/admin/empresas</code>
                  <span style={{ fontSize: "12px", color: "#7a6b63" }}>— Listar todas as empresas com status e validade</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NOVA CONFEITARIA */}
      {modalNova && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <div style={{ background: "white", borderRadius: "16px", padding: "28px", width: "100%", maxWidth: "480px", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#1f1b19", marginBottom: "6px" }}>
              Cadastrar Nova Confeitaria
            </h3>
            <p style={{ color: "#786d66", fontSize: "13px", marginBottom: "18px" }}>
              Cria o ateliê, gera a chave serial e o acesso administrativo de início.
            </p>

            {erroForm && (
              <div style={{ background: "#ffebee", color: "#c62828", padding: "10px", borderRadius: "8px", fontSize: "12px", marginBottom: "14px" }}>
                {erroForm}
              </div>
            )}

            <form onSubmit={handleCriarEmpresa} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#4f4540", marginBottom: "4px" }}>Nome do Ateliê / Confeitaria *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Ateliê Doce Sabor"
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ebdcd5", fontSize: "13px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#4f4540", marginBottom: "4px" }}>E-mail da Confeiteira (Login) *</label>
                <input
                  type="email"
                  required
                  placeholder="contato@docesabor.com.br"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ebdcd5", fontSize: "13px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#4f4540", marginBottom: "4px" }}>WhatsApp / Telefone</label>
                <input
                  type="text"
                  placeholder="11999998888"
                  value={formTelefone}
                  onChange={(e) => setFormTelefone(e.target.value)}
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ebdcd5", fontSize: "13px" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#4f4540", marginBottom: "4px" }}>Plano</label>
                  <select
                    value={formPlano}
                    onChange={(e) => setFormPlano(e.target.value)}
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ebdcd5", fontSize: "13px" }}
                  >
                    <option value="trial">Trial (Teste)</option>
                    <option value="mensal">Mensal</option>
                    <option value="anual">Anual</option>
                    <option value="vitalicio">Vitalício</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#4f4540", marginBottom: "4px" }}>Dias de Acesso</label>
                  <input
                    type="number"
                    min="1"
                    value={formDias}
                    onChange={(e) => setFormDias(Number(e.target.value))}
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ebdcd5", fontSize: "13px" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#4f4540", marginBottom: "4px" }}>Senha Inicial</label>
                <input
                  type="text"
                  value={formSenha}
                  onChange={(e) => setFormSenha(e.target.value)}
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ebdcd5", fontSize: "13px" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "14px" }}>
                <button
                  type="button"
                  onClick={() => setModalNova(false)}
                  style={{ padding: "10px 16px", borderRadius: "8px", border: "1px solid #ebdcd5", background: "white", fontSize: "13px", cursor: "pointer" }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "8px",
                    border: "none",
                    background: "var(--color-primary, #b33951)",
                    color: "white",
                    fontWeight: 700,
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  {salvando ? "Criando..." : "Criar Confeitaria"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BLOQUEAR EMPRESA */}
      {modalBloqueio && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <div style={{ background: "white", borderRadius: "16px", padding: "26px", width: "100%", maxWidth: "440px" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#c62828", marginBottom: "6px", display: "flex", alignItems: "center", gap: "8px" }}>
              <ShieldAlert size={20} />
              Bloquear {modalBloqueio.nome}
            </h3>
            <p style={{ color: "#6b5d56", fontSize: "13px", marginBottom: "14px" }}>
              Ao bloquear, os usuários desta confeitaria não conseguirão mais acessar pedidos, finanças nem receitas até que você libere o acesso novamente.
            </p>

            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#4f4540", marginBottom: "4px" }}>
              Motivo do Bloqueio (Exibido para a confeiteira):
            </label>
            <input
              type="text"
              placeholder="Ex: Mensalidade de Outubro em atraso"
              value={motivoBloqueio}
              onChange={(e) => setMotivoBloqueio(e.target.value)}
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ebdcd5", fontSize: "13px", marginBottom: "18px" }}
            />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                onClick={() => setModalBloqueio(null)}
                style={{ padding: "8px 14px", borderRadius: "8px", border: "1px solid #ebdcd5", background: "white", fontSize: "13px", cursor: "pointer" }}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarBloqueio}
                style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: "#c62828", color: "white", fontWeight: 700, fontSize: "13px", cursor: "pointer" }}
              >
                Confirmar Bloqueio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VISUALIZAR FICHA CADASTRAL DA EMPRESA (USUÁRIO MASTER) */}
      {modalFicha && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "16px" }}>
          <div style={{ background: "white", borderRadius: "16px", maxWidth: "800px", width: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)", border: "1px solid #e2e8f0" }}>
            {/* TOPO MODAL */}
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc", borderTopLeftRadius: "16px", borderTopRightRadius: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#e0f2fe", color: "#0369a1", display: "grid", placeItems: "center" }}>
                  <Building2 size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: 800, margin: 0, color: "#1e293b" }}>
                    Ficha Cadastral • {modalFicha.nome}
                  </h3>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>
                    Visualização exclusiva do Usuário Master (Dados Fiscais & Contato)
                  </span>
                </div>
              </div>
              <button
                onClick={() => setModalFicha(null)}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "#94a3b8" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* CORPO MODAL */}
            <div style={{ padding: "20px 24px" }}>
              {/* DADOS PRINCIPAIS */}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "14px", marginBottom: "14px" }}>
                <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Razão Social</span>
                  <div style={{ fontSize: "14px", fontWeight: 800, color: "#1e293b", marginTop: "2px" }}>
                    {modalFicha.razaoSocial || modalFicha.nome}
                  </div>
                </div>
                <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Nome Fantasia</span>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b", marginTop: "2px" }}>
                    {modalFicha.nomeFantasia || modalFicha.nome}
                  </div>
                </div>
              </div>

              {/* CNPJ, IE, IM */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px", marginBottom: "14px" }}>
                <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>CNPJ / CPF</span>
                  <div style={{ fontSize: "13px", fontWeight: 800, color: "#0369a1", marginTop: "2px" }}>
                    {modalFicha.cnpj || modalFicha.documento || "Não informado"}
                  </div>
                </div>
                <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Inscrição Estadual (IE)</span>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#334155", marginTop: "2px" }}>
                    {modalFicha.inscricaoEstadual || "Isento / Não inf."}
                  </div>
                </div>
                <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Inscrição Municipal</span>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#334155", marginTop: "2px" }}>
                    {modalFicha.inscricaoMunicipal || "Não informada"}
                  </div>
                </div>
              </div>

              {/* RESPONSÁVEL & CONTATOS */}
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: "14px", marginBottom: "14px" }}>
                <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Responsável</span>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#334155", marginTop: "2px" }}>
                    {modalFicha.responsavel || "Não informado"}
                  </div>
                </div>
                <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Telefone / Celular</span>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#334155", marginTop: "2px" }}>
                    {modalFicha.celular || modalFicha.telefone || "Não informado"}
                  </div>
                </div>
                <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>E-mail</span>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#334155", marginTop: "2px" }}>
                    {modalFicha.email || "Não informado"}
                  </div>
                </div>
              </div>

              {/* ENDEREÇO COMPLETO */}
              <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "10px", border: "1px solid #e2e8f0", marginBottom: "14px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "4px" }}>
                  <MapPin size={13} /> Endereço Completo
                </span>
                <div style={{ fontSize: "13px", color: "#1e293b", marginTop: "4px", lineHeight: "1.5" }}>
                  {modalFicha.logradouro ? (
                    <>
                      <strong>{modalFicha.tipoLogradouro || "Rua"} {modalFicha.logradouro}</strong>, nº {modalFicha.numero || "S/N"} {modalFicha.complemento ? `(${modalFicha.complemento})` : ""}
                      <br />
                      Bairro: {modalFicha.bairro || "-"} • {modalFicha.municipio || "-"}/{modalFicha.uf || "-"} • CEP: {modalFicha.cep || "-"}
                    </>
                  ) : (
                    <span style={{ color: "#94a3b8" }}>Endereço não cadastrado.</span>
                  )}
                </div>
              </div>

              {/* ATIVIDADE & TRIBUTAÇÃO */}
              <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", gap: "14px" }}>
                <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Ramo / Atividade</span>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#334155", marginTop: "2px" }}>
                    {modalFicha.ramoAtividade || "Não informado"} {modalFicha.cnae ? `(CNAE: ${modalFicha.cnae})` : ""}
                  </div>
                </div>
                <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Optante Simples</span>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: modalFicha.optanteSimples === "Sim" ? "#16a34a" : "#dc2626", marginTop: "2px" }}>
                    {modalFicha.optanteSimples || "Sim"}
                  </div>
                </div>
                <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Regime Tributário</span>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#334155", marginTop: "2px" }}>
                    {modalFicha.regimeTributario || "Normal"}
                  </div>
                </div>
              </div>
            </div>

            {/* RODAPÉ MODAL */}
            <div style={{ padding: "14px 20px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end", background: "#f8fafc", borderBottomLeftRadius: "16px", borderBottomRightRadius: "16px" }}>
              <button
                onClick={() => setModalFicha(null)}
                style={{ padding: "8px 18px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "white", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
              >
                Fechar Ficha
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
