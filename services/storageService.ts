/**
 * Upload de imagens para o Supabase Storage (bucket "avatars").
 *
 * Usa expo-file-system (SDK 54) File.arrayBuffer() — método mais confiável
 * em React Native do que fetch().blob() para uploads no Supabase.
 *
 * Em modo mock devolve um retrato de exemplo sem fazer upload real.
 */
import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';

/** Abre a galeria, faz upload e devolve a URL pública. Retorna null se cancelado. */
export async function pickAndUploadAvatar(): Promise<string | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Permissão de galeria negada. Habilite nas configurações do dispositivo.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];
  const mimeType = asset.mimeType ?? 'image/jpeg';

  // Mock: devolve retrato aleatório sem upload real
  if (!isSupabaseConfigured) {
    const n = Math.floor(Math.random() * 99);
    return `https://randomuser.me/api/portraits/men/${n}.jpg`;
  }

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Sessão expirada.');

  const ext = mimeType === 'image/png' ? 'png' : 'jpg';
  const path = `${auth.user.id}/avatar.${ext}`;

  // Lê o arquivo local como ArrayBuffer — mais confiável que fetch().blob() no RN
  const file = new File(asset.uri);
  const arrayBuffer = await file.arrayBuffer();

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, arrayBuffer, { contentType: mimeType, upsert: true });

  if (error) throw error;

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  // Cache buster para forçar reload da imagem após substituição
  return `${data.publicUrl}?t=${Date.now()}`;
}
