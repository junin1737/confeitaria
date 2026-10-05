/**
 * ============================================================================
 * PROJETO: Doce Gestor - Sistema de Gestão para Confeitarias
 * REPOSITÓRIO: https://github.com/junin1737/confeitaria
 * ARQUIVO: src/theme.ts
 * DESCRIÇÃO: Sistema de temas visuais, paletas temáticas de confeitaria e CSS vars.
 * ============================================================================
 * 
 * [DESIGN SYSTEM CUSTOMIZÁVEL]
 * O sistema oferece temas prontos inspirados no universo da confeitaria:
 * Terracota, Rosa Chá, Chocolate, Pistache, Lavanda, Caramelo, Oceano, Cereja, Café e Grafite.
 * As cores são dinamicamente injetadas em variáveis CSS (--c-primary, --c-bg, etc.)
 * e persistidas no localStorage do navegador para cada usuário.
 * ============================================================================
 */

/**
 * [CONTRATO: ThemeColors]
 * Tokens de cores semânticos do Design System.
 */
export type ThemeColors = {
  primary: string;
  primaryHover: string;
  primarySoft: string;
  background: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
  success: string;
  danger: string;
};

/**
 * [CAMPOS EDITÁVEIS NO PAINEL DE CONFIGURAÇÕES]
 */
export const THEME_COLOR_FIELDS: { key: keyof ThemeColors; label: string; hint: string }[] = [
  { key: "primary", label: "Cor principal", hint: "Botões, marca e destaques" },
  { key: "primaryHover", label: "Cor principal (hover)", hint: "Estado ao passar o mouse" },
  { key: "primarySoft", label: "Fundo suave", hint: "Menu ativo e ícones" },
  { key: "background", label: "Fundo da página", hint: "Área principal do sistema" },
  { key: "surface", label: "Superfície", hint: "Sidebar, cards e painéis" },
  { key: "text", label: "Texto principal", hint: "Títulos e conteúdo" },
  { key: "muted", label: "Texto secundário", hint: "Legendas e labels" },
  { key: "border", label: "Bordas", hint: "Divisórias e contornos" },
  { key: "success", label: "Positivo", hint: "Crescimento e status ok" },
  { key: "danger", label: "Atenção", hint: "Alertas e valores negativos" },
];

/**
 * [PRESETS TEMÁTICOS PRÉ-CONFIGURADOS]
 */
export const THEME_PRESETS: { id: string; name: string; colors: ThemeColors }[] = [
  {
    id: "terracota",
    name: "Terracota",
    colors: {
      primary: "#c96852",
      primaryHover: "#b95c48",
      primarySoft: "#faede8",
      background: "#f7f7f5",
      surface: "#fffdfb",
      text: "#342d2a",
      muted: "#817670",
      border: "#eee9e4",
      success: "#568c77",
      danger: "#bd6a6a",
    },
  },
  {
    id: "rosa-cha",
    name: "Rosa chá",
    colors: {
      primary: "#c45c78",
      primaryHover: "#b04e69",
      primarySoft: "#fae8ee",
      background: "#f8f5f6",
      surface: "#fffdfd",
      text: "#35282c",
      muted: "#8a7278",
      border: "#efe4e7",
      success: "#5b8f78",
      danger: "#c45c78",
    },
  },
  {
    id: "chocolate",
    name: "Chocolate",
    colors: {
      primary: "#8b5e3c",
      primaryHover: "#754d31",
      primarySoft: "#f4ebe3",
      background: "#f6f2ee",
      surface: "#fffbf8",
      text: "#32261d",
      muted: "#7d6b5c",
      border: "#ebe3db",
      success: "#5e8a6a",
      danger: "#b56a55",
    },
  },
  {
    id: "pistache",
    name: "Pistache",
    colors: {
      primary: "#5f8f6a",
      primaryHover: "#4f7a59",
      primarySoft: "#e7f2ea",
      background: "#f4f7f5",
      surface: "#fbfdfb",
      text: "#243028",
      muted: "#6d7c71",
      border: "#e2ebe4",
      success: "#5f8f6a",
      danger: "#c0726a",
    },
  },
  {
    id: "lavanda",
    name: "Lavanda",
    colors: {
      primary: "#7b6aa8",
      primaryHover: "#685890",
      primarySoft: "#efeaf8",
      background: "#f6f5f8",
      surface: "#fdfcff",
      text: "#2d2838",
      muted: "#7a7388",
      border: "#e8e4ef",
      success: "#5e8f7a",
      danger: "#b86a7a",
    },
  },
  {
    id: "caramelo",
    name: "Caramelo",
    colors: {
      primary: "#c4894a",
      primaryHover: "#b0783c",
      primarySoft: "#f8eedf",
      background: "#f7f4ef",
      surface: "#fffdf9",
      text: "#352a1f",
      muted: "#86745f",
      border: "#eee6da",
      success: "#6a8f62",
      danger: "#c46d55",
    },
  },
  {
    id: "oceano",
    name: "Oceano",
    colors: {
      primary: "#4f7c9b",
      primaryHover: "#3f6884",
      primarySoft: "#e7f0f6",
      background: "#f4f7f8",
      surface: "#fbfdfe",
      text: "#243038",
      muted: "#6a7a84",
      border: "#e1e8ed",
      success: "#4f8f78",
      danger: "#c06570",
    },
  },
  {
    id: "cereja",
    name: "Cereja",
    colors: {
      primary: "#b4454a",
      primaryHover: "#9c393e",
      primarySoft: "#f8e6e7",
      background: "#f8f4f4",
      surface: "#fffbfb",
      text: "#362424",
      muted: "#866a6a",
      border: "#efe3e3",
      success: "#5a8a6e",
      danger: "#b4454a",
    },
  },
  {
    id: "cafe",
    name: "Café",
    colors: {
      primary: "#6f4e37",
      primaryHover: "#5c3f2c",
      primarySoft: "#efe6df",
      background: "#f5f1ed",
      surface: "#fbf8f5",
      text: "#2c241e",
      muted: "#7a6b60",
      border: "#e8e0d8",
      success: "#5d8068",
      danger: "#a85c4e",
    },
  },
  {
    id: "grafite",
    name: "Grafite",
    colors: {
      primary: "#5c5c5c",
      primaryHover: "#4a4a4a",
      primarySoft: "#ececec",
      background: "#f5f5f5",
      surface: "#fcfcfc",
      text: "#2a2a2a",
      muted: "#767676",
      border: "#e6e6e6",
      success: "#5a8a72",
      danger: "#b06060",
    },
  },
];

export const DEFAULT_THEME = THEME_PRESETS[0].colors;
const STORAGE_KEY = "doce-gestor-theme";

/**
 * [FUNÇÃO: colorsToCssVars]
 * Transforma o objeto tipado ThemeColors no mapa de variáveis CSS nativas.
 */
export function colorsToCssVars(colors: ThemeColors): Record<string, string> {
  return {
    "--c-primary": colors.primary,
    "--c-primary-hover": colors.primaryHover,
    "--c-primary-soft": colors.primarySoft,
    "--c-bg": colors.background,
    "--c-surface": colors.surface,
    "--c-text": colors.text,
    "--c-muted": colors.muted,
    "--c-border": colors.border,
    "--c-success": colors.success,
    "--c-danger": colors.danger,
  };
}

/**
 * [FUNÇÃO: applyTheme]
 * Aplica diretamente no documento HTML (:root) as variáveis CSS calculadas.
 */
export function applyTheme(colors: ThemeColors) {
  const root = document.documentElement;
  const vars = colorsToCssVars(colors);
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
}

/**
 * [FUNÇÃO: loadSavedTheme]
 * Carrega o tema gravado no localStorage ou retorna o padrão Terracota.
 */
export function loadSavedTheme(): ThemeColors {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_THEME;
    const parsed = JSON.parse(raw) as Partial<ThemeColors>;
    return { ...DEFAULT_THEME, ...parsed };
  } catch {
    return DEFAULT_THEME;
  }
}

/**
 * [FUNÇÃO: saveTheme]
 * Persiste a configuração de cores no localStorage.
 */
export function saveTheme(colors: ThemeColors) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(colors));
}

/**
 * [FUNÇÃO: presetIdFor]
 * Identifica qual preset pré-configurado corresponde exatamente às cores atuais.
 */
export function presetIdFor(colors: ThemeColors) {
  return THEME_PRESETS.find((preset) =>
    (Object.keys(preset.colors) as (keyof ThemeColors)[]).every((key) => preset.colors[key] === colors[key]),
  )?.id;
}
