/**
 * Sistema de temas do SeuChefe Gourmet.
 *
 * Dois temas selecionáveis pelo usuário (alternados no menu):
 *  - "dark"  → Editorial Noir (near-black quente + dourado + marfim)
 *  - "light" → Linen (off-white editorial + dourado + tinta)
 *
 * Estilo limpo guiado por fotografia (referências: Airbnb, fine dining,
 * Spotify/Notion para neutros) — sem efeitos pesados.
 *
 * As chaves são SEMÂNTICAS e iguais nos dois temas:
 *  dark = fundo · surface/card = superfícies · cream = texto principal ·
 *  muted = texto secundário · hint = placeholder · primary = acento dourado ·
 *  accent = CTA de destaque · onPrimary/onAccent = texto sobre os botões.
 */
import { Platform } from 'react-native';

export interface Palette {
  dark: string;
  surface: string;
  card: string;
  border: string;
  primary: string;
  accent: string;
  onPrimary: string;
  onAccent: string;
  cream: string;
  muted: string;
  hint: string;
  white: string;
  success: string;
  warning: string;
  danger: string;
}

export const darkColors: Palette = {
  dark: '#0F0F12', // fundo (near-black quente)
  surface: '#16161A', // fundo intermediário
  card: '#1B1B20', // cards / inputs
  border: '#2A2A30', // bordas
  primary: '#C9A24A', // dourado
  accent: '#B07B2E', // dourado profundo (CTA destaque)
  onPrimary: '#1A1407', // texto sobre botão dourado
  onAccent: '#1A1407', // texto sobre botão de destaque
  cream: '#F5F0EB', // texto principal (marfim quente)
  muted: '#A1A1AA', // texto secundário
  hint: '#6B6B72', // placeholders
  white: '#FFFFFF',
  success: '#5FB98A',
  warning: '#D9A441',
  danger: '#D9655B',
};

export const lightColors: Palette = {
  dark: '#F4EEE6', // fundo (off-white quente / linen)
  surface: '#FFFFFF', // superfície
  card: '#FBF7F1', // cards / inputs
  border: '#E6DCCF', // bordas
  primary: '#B07B2E', // dourado (mais escuro p/ contraste no claro)
  accent: '#1F1B16', // tinta (CTA de destaque no claro)
  onPrimary: '#FFFFFF', // texto sobre botão dourado
  onAccent: '#F4EEE6', // texto sobre botão tinta
  cream: '#1F1B16', // texto principal (tinta)
  muted: '#8A7E70', // texto secundário
  hint: '#B6A892', // placeholders
  white: '#FFFFFF',
  success: '#2E8B6B',
  warning: '#B5862E',
  danger: '#C0503F',
};

export type ThemeMode = 'dark' | 'light';

export const PALETTES: Record<ThemeMode, Palette> = {
  dark: darkColors,
  light: lightColors,
};

/**
 * Alias estático = tema escuro. Usado pelas telas de pré-login (entrada da
 * marca, sempre dark) e como fallback. As telas internas usam useColors().
 */
export const GColors = darkColors;

/** Sombra suave para elevar cards (sutil, estilo clean). */
export const GShadow = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.18,
  shadowRadius: 10,
  elevation: 4,
} as const;

/** Fonte serifada usada na marca ("SeuChefe"). */
export const brandFont = Platform.OS === 'ios' ? 'Georgia' : 'serif';

/** Espaçamentos recorrentes nas telas. */
export const GSpacing = {
  screen: 22,
  gap: 12,
  radius: 14,
  inputHeight: 54,
  buttonHeight: 52,
} as const;
