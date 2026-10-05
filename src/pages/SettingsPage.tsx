/**
 * ============================================================================
 * PROJETO: Doce Gestor - Sistema de Gestão para Confeitarias
 * REPOSITÓRIO: https://github.com/junin1737/confeitaria
 * ARQUIVO: src/pages/SettingsPage.tsx
 * DESCRIÇÃO: Configurações visuais de tema, paletas de cores e templates de mensagens.
 * ============================================================================
 * 
 * [FUNCIONALIDADES DA TELA]
 * 1. Seleção e customização em tempo real de temas e cores da confeitaria.
 * 2. Editor de templates de mensagens de felicitação para clientes e funcionários.
 * ============================================================================
 */

import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import { fetchMensagens, saveMensagem, type Mensagem } from "../api";
import {
  DEFAULT_THEME,
  THEME_COLOR_FIELDS,
  THEME_PRESETS,
  presetIdFor,
  type ThemeColors,
} from "../theme";

type SettingsTab = "geral" | "mensagens";

function HexField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  return (
    <input
      className="color-hex"
      value={draft}
      onChange={(event) => {
        const next = event.target.value.trim();
        setDraft(next);
        if (/^#([0-9a-fA-F]{6})$/.test(next)) onChange(next.toLowerCase());
      }}
      spellCheck={false}
    />
  );
}

export function SettingsPage({
  colors,
  onColorsChange,
  onAction,
}: {
  colors: ThemeColors;
  onColorsChange: (colors: ThemeColors) => void;
  onAction: (message: string) => void;
}) {
  const [tab, setTab] = useState<SettingsTab>("geral");
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [loadingMensagens, setLoadingMensagens] = useState(false);
  const [savingKey, setSavingKey] = useState("");
  const activePreset = presetIdFor(colors);

  useEffect(() => {
    if (tab !== "mensagens") return;
    let active = true;
    setLoadingMensagens(true);
    fetchMensagens()
      .then((data) => {
        if (active) setMensagens(data.mensagens);
      })
      .catch((error) => onAction(error instanceof Error ? error.message : "Falha ao carregar mensagens"))
      .finally(() => {
        if (active) setLoadingMensagens(false);
      });
    return () => {
      active = false;
    };
  }, [tab]);

  function updateColor(key: keyof ThemeColors, value: string) {
    onColorsChange({ ...colors, [key]: value });
  }

  return (
    <>
      <section className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-dot" /> sistema
          </div>
          <h1>Configurações</h1>
          <p>Personalize a operação para o seu jeito de trabalhar.</p>
        </div>
      </section>

      <div className="settings-tabs">
        <button className={tab === "geral" ? "active" : ""} onClick={() => setTab("geral")}>
          Geral
        </button>
        <button className={tab === "mensagens" ? "active" : ""} onClick={() => setTab("mensagens")}>
          Mensagens
        </button>
        <button type="button" onClick={() => onAction("Aba Empresa entra na pr\u00f3xima etapa")}>
          Empresa
        </button>
        <button type="button" onClick={() => onAction("Aba Usu\u00e1rios entra na pr\u00f3xima etapa")}>
          Usu{"\u00e1rios"}
        </button>
        <button type="button" onClick={() => onAction("Aba Pagamentos entra na pr\u00f3xima etapa")}>
          Pagamentos
        </button>
      </div>

      {tab === "geral" ? (
        <section className="panel settings-panel">
        <div className="panel-heading">
          <div>
            <div className="section-kicker">Aparência</div>
            <h2>Cores e temas</h2>
          </div>
          <button
            className="button subtle"
            onClick={() => {
              onColorsChange(DEFAULT_THEME);
              onAction("Tema original restaurado");
            }}
          >
            <RotateCcw size={15} /> Restaurar original
          </button>
        </div>

        <p className="settings-copy">
          Escolha um dos 10 temas prontos ou ajuste cada cor. As mudanças valem para todo o sistema e ficam salvas neste
          navegador.
        </p>

        <div className="theme-grid">
          {THEME_PRESETS.map((preset) => {
            const selected = activePreset === preset.id;
            return (
              <button
                key={preset.id}
                className={`theme-card ${selected ? "selected" : ""}`}
                onClick={() => {
                  onColorsChange(preset.colors);
                  onAction(`Tema ${preset.name} aplicado`);
                }}
              >
                <span className="theme-swatches">
                  <i style={{ background: preset.colors.primary }} />
                  <i style={{ background: preset.colors.primarySoft }} />
                  <i style={{ background: preset.colors.background }} />
                  <i style={{ background: preset.colors.success }} />
                </span>
                <strong>{preset.name}</strong>
                <span>{preset.colors.primary}</span>
              </button>
            );
          })}
        </div>

        <div className="section-kicker settings-kicker">Cores editáveis</div>
        <div className="color-editor-grid">
          {THEME_COLOR_FIELDS.map((field) => (
            <label className="color-editor" key={field.key}>
              <span className="color-editor-preview" style={{ background: colors[field.key] }}>
                <input
                  type="color"
                  value={colors[field.key]}
                  onChange={(event) => updateColor(field.key, event.target.value)}
                  aria-label={field.label}
                />
              </span>
              <span>
                <strong>{field.label}</strong>
                <small>{field.hint}</small>
              </span>
              <HexField value={colors[field.key]} onChange={(value) => updateColor(field.key, value)} />
            </label>
          ))}
        </div>
      </section>
      ) : (
        <section className="panel settings-panel">
          <div className="panel-heading">
            <div>
              <div className="section-kicker">WhatsApp</div>
              <h2>Mensagens prontas</h2>
            </div>
          </div>
          <p className="settings-copy">
            Esses textos s{"\u00e3o"} usados nos atalhos do dia. Use {"{nome}"} e {"{empresa}"} para personalizar.
          </p>
          {loadingMensagens && mensagens.length === 0 ? (
            <p className="today-empty">Carregando mensagens...</p>
          ) : mensagens.length === 0 ? (
            <p className="today-empty">Nenhuma mensagem cadastrada.</p>
          ) : (
          <div className="message-editor-list">
            {mensagens.map((mensagem) => (
              <form
                key={mensagem.chave}
                className="message-editor"
                onSubmit={(event) => {
                  event.preventDefault();
                  const formData = new FormData(event.currentTarget);
                  setSavingKey(mensagem.chave);
                  void saveMensagem(
                    mensagem.chave,
                    String(formData.get("titulo") ?? ""),
                    String(formData.get("texto") ?? ""),
                  )
                    .then((saved) => {
                      setMensagens((current) =>
                        current.map((item) => (item.chave === saved.chave ? saved : item)),
                      );
                      onAction("Mensagem salva.");
                    })
                    .catch((error) => onAction(error instanceof Error ? error.message : "Falha ao salvar"))
                    .finally(() => setSavingKey(""));
                }}
              >
                <label>
                  <span>Nome</span>
                  <input name="titulo" defaultValue={mensagem.titulo} />
                </label>
                <label>
                  <span>Texto</span>
                  <textarea name="texto" rows={5} defaultValue={mensagem.texto} />
                </label>
                <button className="button primary" type="submit" disabled={savingKey === mensagem.chave}>
                  {savingKey === mensagem.chave ? "Salvando..." : "Salvar mensagem"}
                </button>
              </form>
            ))}
          </div>
          )}
        </section>
      )}
    </>
  );
}
