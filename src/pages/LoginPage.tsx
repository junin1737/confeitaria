/**
 * ============================================================================
 * PROJETO: Doce Gestor - Sistema de Gestão para Confeitarias
 * REPOSITÓRIO: https://github.com/junin1737/confeitaria
 * ARQUIVO: src/pages/LoginPage.tsx
 * DESCRIÇÃO: Tela de Login e Auto-Cadastro (Self-Service) de Confeitarias Piloto.
 * ============================================================================
 * 
 * [FUNCIONALIDADES DA TELA]
 * 1. Alternância fluida entre 'Entrar na Conta' e 'Cadastrar meu Ateliê'.
 * 2. Auto-cadastro com 15 dias de teste grátis (Trial) e login automático.
 * 3. Botão de demonstração rápida para acesso do usuário Master.
 * 4. Design split-screen moderno com identidade visual acolhedora para confeitarias.
 * ============================================================================
 */

import { useState, type FormEvent } from "react";
import { ArrowRight, Cake, Eye, EyeOff, ShieldCheck, Sparkles, UserPlus } from "lucide-react";
import { loginRequest, registrarConfeitariaApi, type UsuarioSessao } from "../api";

export function LoginPage({ onLoggedIn }: { onLoggedIn: (usuario: UsuarioSessao) => void }) {
  const [modo, setModo] = useState<"login" | "cadastro">("login");
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [nomeAtelie, setNomeAtelie] = useState("");
  const [telefone, setTelefone] = useState("");
  const [lembrar, setLembrar] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  async function entrar(usuario: string, password: string) {
    setErro("");
    setLoading(true);
    try {
      const session = await loginRequest(usuario, password, lembrar);
      onLoggedIn(session);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
  }

  async function cadastrar(e: FormEvent) {
    e.preventDefault();
    setErro("");

    if (!nomeCompleto.trim()) {
      setErro("Informe o seu nome completo.");
      return;
    }
    if (!nomeAtelie.trim()) {
      setErro("Informe o nome do seu ateliê ou confeitaria.");
      return;
    }
    if (!login.trim() || !login.includes("@")) {
      setErro("Informe um e-mail válido para o login.");
      return;
    }
    if (!telefone.trim()) {
      setErro("Informe o seu telefone/WhatsApp de contato.");
      return;
    }
    if (senha.length < 4) {
      setErro("A senha deve ter no mínimo 4 caracteres.");
      return;
    }

    setLoading(true);
    try {
      const session = await registrarConfeitariaApi({
        nomeCompleto: nomeCompleto.trim(),
        nomeAtelie: nomeAtelie.trim(),
        email: login.trim().toLowerCase(),
        telefone: telefone.trim(),
        senha,
      });
      if (session) {
        onLoggedIn(session);
      } else {
        setModo("login");
        alert("Conta criada com sucesso! Faça login com seu e-mail e senha.");
      }
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível criar a conta.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (modo === "login") {
      void entrar(login, senha);
    } else {
      void cadastrar(event);
    }
  }

  return (
    <div className="login-split">
      <aside className="login-hero">
        <div className="login-hero-brand">
          <div className="brand-mark-sabor">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 19.7778H22L12 2ZM12 6.22222L17.5556 16.4444H6.44444L12 6.22222Z" opacity="0.9" />
              <path d="M12 9L7.5 17H16.5L12 9Z" />
            </svg>
          </div>
          <strong className="brand-title-sabor">Gestão com Sabor</strong>
        </div>

        <div className="login-hero-copy">
          <div className="eyebrow-sabor">
            <span className="eyebrow-line" /> SEU NEGÓCIO NO CONTROLE
          </div>
          <h1 className="login-hero-title">
            Mais tempo para criar.<br />
            Mais clareza para crescer.
          </h1>
          <p className="login-hero-subtitle">
            Organize pedidos, produção, estoque e compras em um só lugar<br className="hide-mobile" />
            — do jeitinho que o seu negócio precisa.
          </p>
        </div>

        {/* Três fotos representativas do negócio culinário / confeitaria / pizzaria */}
        <div className="login-hero-gallery">
          <div className="gallery-card">
            <img src="/login-card-pizza.jpg" alt="Pizzaria e forno a lenha" />
          </div>
          <div className="gallery-card">
            <img src="/login-card-salgados.jpg" alt="Salgados e pães artesanais" />
          </div>
          <div className="gallery-card">
            <img src="/login-card-confeitaria.jpg" alt="Bolos decorados e confeitaria fina" />
          </div>
        </div>

        {/* Badge pílula centralizada */}
        <div className="login-hero-badge-wrap">
          <span className="login-pill-badge">
            Da receita à entrega: controle total
          </span>
        </div>

        <div className="login-hero-quote-block">
          <blockquote>O seu talento merece uma gestão tão cuidadosa quanto o seu trabalho.</blockquote>
        </div>
      </aside>

      <main className="login-panel">
        <form className="login-form" onSubmit={handleSubmit}>
          {modo === "login" ? (
            <>
              <div className="login-form-eyebrow">BEM-VINDO DE VOLTA</div>
              <h2>Acesse sua conta</h2>
              <p>Entre para gerenciar sua produção e vendas.</p>
            </>
          ) : (
            <>
              <div className="eyebrow" style={{ color: "var(--color-primary, #b33951)" }}>
                ✨ Teste Grátis de 15 Dias
              </div>
              <h2>Cadastre seu Negócio</h2>
              <p>Crie sua conta para gerenciar receitas, produção e vendas.</p>
            </>
          )}

          {modo === "cadastro" && (
            <>
              <label className="login-field">
                <span>Seu Nome Completo *</span>
                <input
                  required
                  value={nomeCompleto}
                  onChange={(event) => setNomeCompleto(event.target.value)}
                  placeholder="Ex: Maria da Silva Oliveira"
                />
              </label>

              <label className="login-field">
                <span>Nome do seu Ateliê ou Confeitaria *</span>
                <input
                  required
                  value={nomeAtelie}
                  onChange={(event) => setNomeAtelie(event.target.value)}
                  placeholder="Ex: Ateliê Doce Afeto"
                />
              </label>
            </>
          )}

          <label className="login-field">
            <span>{modo === "cadastro" ? "Seu E-mail principal (usado no login) *" : "E-mail ou Usuário *"}</span>
            <input
              type="text"
              autoComplete="username"
              required
              value={login}
              onChange={(event) => setLogin(event.target.value)}
              placeholder={modo === "cadastro" ? "seuemail@exemplo.com" : "seuemail@exemplo.com ou Master"}
            />
          </label>

          {modo === "cadastro" && (
            <label className="login-field">
              <span>WhatsApp / Telefone para contato *</span>
              <input
                required
                value={telefone}
                onChange={(event) => setTelefone(event.target.value)}
                placeholder="(11) 99999-8888"
              />
            </label>
          )}

          <label className="login-field">
            <span>{modo === "cadastro" ? "Crie uma Senha *" : "Senha"}</span>
            <div className="login-password">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete={modo === "cadastro" ? "new-password" : "current-password"}
                required
                value={senha}
                onChange={(event) => setSenha(event.target.value)}
                placeholder="••••••••"
              />
              <button
                type="button"
                className="icon-button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>

          {modo === "login" && (
            <div className="login-row">
              <label className="login-check">
                <input type="checkbox" checked={lembrar} onChange={(event) => setLembrar(event.target.checked)} />
                Lembrar de mim
              </label>
              <button
                type="button"
                className="text-button"
                onClick={() => setErro("Recuperação de senha entra na próxima etapa.")}
              >
                Esqueci minha senha
              </button>
            </div>
          )}

          {erro ? <div className="login-error">{erro}</div> : null}

          <button className="button primary login-submit" type="submit" disabled={loading}>
            {loading ? (
              "Processando..."
            ) : modo === "login" ? (
              <>
                Entrar na plataforma
                <ArrowRight size={16} />
              </>
            ) : (
              <>
                Criar Conta do Ateliê
                <UserPlus size={16} />
              </>
            )}
          </button>

          {modo === "login" ? (
            <>
              <div className="login-divider">
                <span>Ou</span>
              </div>

              <button
                type="button"
                className="button secondary login-submit"
                disabled={loading}
                onClick={() => void entrar("Master", "1737")}
              >
                <Sparkles size={16} />
                Entrar como Master
              </button>

              <p className="login-signup">
                Ainda não tem conta?{" "}
                <button
                  type="button"
                  style={{ background: "none", border: "none", color: "var(--color-primary, #b33951)", fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}
                  onClick={() => {
                    setModo("cadastro");
                    setErro("");
                  }}
                >
                  Criar conta grátis
                </button>
              </p>
            </>
          ) : (
            <p className="login-signup">
              Já possui uma conta?{" "}
              <button
                type="button"
                style={{ background: "none", border: "none", color: "var(--color-primary, #b33951)", fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}
                onClick={() => {
                  setModo("login");
                  setErro("");
                }}
              >
                Fazer login
              </button>
            </p>
          )}
        </form>
        <div className="login-panel-foot">
          <small>
            <ShieldCheck size={12} /> Ambiente seguro com isolamento de dados
          </small>
          <small>Termos e privacidade</small>
        </div>
      </main>
    </div>
  );
}
