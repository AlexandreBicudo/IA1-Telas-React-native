/** Domínio de especialidades/culinárias usado nos filtros e nos perfis. */
export const SPECIALTIES = [
  'Francesa',
  'Italiana',
  'Japonesa',
  'Contemporânea',
  'Confeitaria',
  'Mediterrânea',
  'Brasileira',
  'Vegana',
  'Carnes',
  'Frutos do Mar',
] as const;

export type SpecialtyName = (typeof SPECIALTIES)[number];
