/**
 * Upload de imagens para o Supabase Storage.
 * Em modo mock devolve um retrato aleatório sem fazer upload real.
 */
import * as ImagePicker from 'expo-image-picker';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';

/** Abre a galeria, faz upload e devolve a URL pública. Retorna null se cancelado. */
export async function pickAndUploadAvatar(): Promise<string | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') throw new Error('Permissão de galeria negada. Habilite nas configurações do dispositivo.');

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  if (result.canceled || !result.assets[0]) return null;

  const uri = result.assets[0].uri;

  if (!isSupabaseConfigured) {
    const n = Math.floor(Math.random() * 99);
    return `https://randomuser.me/api/portraits/men/${n}.jpg`;
  }

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Sessão expirada.');

  const path = `${auth.user.id}/avatar.jpg`;

  const response = await fetch(uri);
  const blob = await response.blob();

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, blob, { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  // Cache buster para forçar reload da imagem após atualização
  return `${data.publicUrl}?t=${Date.now()}`;
}
