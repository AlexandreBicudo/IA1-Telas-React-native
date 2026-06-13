/**
 * Paleta e tokens visuais do SeuChefe Gourmet ("Dark Gourmet / Elite").
 *
 * Centraliza a identidade visual que hoje está duplicada localmente em cada
 * tela de autenticação (constante `COLORS`). As telas novas devem importar
 * daqui para garantir consistência rigorosa com o app existente.
 */
import { Platform } from 'react-native';

export const GColors = {
  dark: '#0A0A0A', // Fundo principal (quase preto)
  card: '#1A1A1A', // Fundo de inputs / cards
  border: '#282828', // Bordas e divisores
  primary: '#C8A05F', // Dourado — marca, labels, botões, destaques
  cream: '#F8F8F0', // Texto principal claro / títulos
  muted: '#787878', // Texto secundário
  hint: '#444444', // Placeholders
  white: '#FFFFFF',
  // Tons de status (derivados, mantendo a sobriedade da paleta)
  success: '#5FA86E',
  warning: '#D7A53B',
  danger: '#B5564E',
} as const;

/** Fonte serifada usada na marca ("SeuChefe"). */
export const brandFont = Platform.OS === 'ios' ? 'Georgia' : 'serif';

/** Espaçamentos recorrentes nas telas (paddingHorizontal padrão = 28). */
export const GSpacing = {
  screen: 28,
  gap: 12,
  radius: 8,
  inputHeight: 54,
  buttonHeight: 52,
} as const;
