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
    setLoading(true);
    try {
      const session = await registrarConfeitariaApi({
        nomeAtelie,
        email: login,
        senha,
        telefone,
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
          <div className="brand-mark">
            <Cake size={18} strokeWidth={2.4} />
          </div>
          <div>
            <strong>Gestão com Sabor</strong>
            <span>gestão inteligente</span>
          </div>
        </div>
        <div className="login-hero-copy">
          <div className="eyebrow">
            <span className="eyebrow-dot" /> seu ateliê, no controle
          </div>
          <h1>
            Mais tempo para criar.
            <em> Mais clareza para crescer.</em>
          </h1>
          <p>
            Organize pedidos, produção, estoque e compras em um só lugar — do jeitinho que o seu
            negócio precisa.
          </p>
        </div>
        <div className="login-hero-photo">
          <img src="/login-hero.png" alt="Seleção de bolos, doces e tartes do ateliê" />
          <span>Feito para encantar cada detalhe importa</span>
        </div>
        <blockquote>O seu talento merece uma gestão tão cuidadosa quanto o seu trabalho.</blockquote>
        <div className="login-hero-foot">
          <small>© {new Date().getFullYear()} Gestão com Sabor</small>
          <small>
            <ShieldCheck size={12} /> seus dados estão protegidos
          </small>
        </div>
      </aside>

      <main className="login-panel">
        <form className="login-form" onSubmit={handleSubmit}>
          {modo === "login" ? (
            <>
              <div className="eyebrow">Bem-vinda de volta</div>
              <h2>Acesse sua conta</h2>
              <p>Entre para acompanhar o seu ateliê.</p>
            </>
          ) : (
            <>
              <div className="eyebrow" style={{ color: "var(--color-primary, #b33951)" }}>
                ✨ Teste Grátis de 15 Dias
              </div>
              <h2>Cadastre seu Ateliê</h2>
              <p>Crie sua conta para gerenciar receitas e encomendas.</p>
            </>
          )}

          {modo === "cadastro" && (
            <label className="login-field">
              <span>Nome do seu Ateliê ou Confeitaria *</span>
              <input
                required
                value={nomeAtelie}
                onChange={(event) => setNomeAtelie(event.target.value)}
                placeholder="Ex: Ateliê Doce Afeto"
              />
            </label>
          )}

          <label className="login-field">
            <span>{modo === "cadastro" ? "Seu E-mail principal *" : "Usuário ou e-mail"}</span>
            <input
              autoComplete="username"
              required
              value={login}
              onChange={(event) => setLogin(event.target.value)}
              placeholder={modo === "cadastro" ? "seuemail@exemplo.com" : "Master"}
            />
          </label>

          {modo === "cadastro" && (
            <label className="login-field">
              <span>WhatsApp para contato</span>
              <input
                value={telefone}
                onChange={(event) => setTelefone(event.target.value)}
                placeholder="11999998888"
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
