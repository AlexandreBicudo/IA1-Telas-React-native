import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';

async function uploadToAvatarsBucket(uri: string, path: string, mimeType: string): Promise<string> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Sessão expirada.');
  const file = new File(uri);
  const arrayBuffer = await file.arrayBuffer();
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, arrayBuffer, { contentType: mimeType, upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
}

async function uploadAvatarAsset(asset: ImagePicker.ImagePickerAsset): Promise<string> {
  const mimeType = asset.mimeType ?? 'image/jpeg';
  if (!isSupabaseConfigured) {
    return `https://randomuser.me/api/portraits/men/${Math.floor(Math.random() * 99)}.jpg`;
  }
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Sessão expirada.');
  const ext = mimeType === 'image/png' ? 'png' : 'jpg';
  return uploadToAvatarsBucket(asset.uri, `${auth.user.id}/avatar.${ext}`, mimeType);
}

async function pickFromGallery(): Promise<string | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') throw new Error('Permissão de galeria negada. Habilite nas configurações do dispositivo.');
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });
  if (result.canceled || !result.assets[0]) return null;
  return uploadAvatarAsset(result.assets[0]);
}

async function pickFromCamera(): Promise<string | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') throw new Error('Permissão de câmera negada. Habilite nas configurações do dispositivo.');
  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });
  if (result.canceled || !result.assets[0]) return null;
  return uploadAvatarAsset(result.assets[0]);
}

/** Abre diálogo para escolher galeria ou câmera, faz upload e retorna URL pública. */
export function pickAndUploadAvatar(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    Alert.alert(
      'Foto de perfil',
      'Escolha a origem da foto',
      [
        { text: 'Tirar selfie', onPress: () => pickFromCamera().then(resolve).catch(reject) },
        { text: 'Escolher da galeria', onPress: () => pickFromGallery().then(resolve).catch(reject) },
        { text: 'Cancelar', style: 'cancel', onPress: () => resolve(null) },
      ],
    );
  });
}

/** Abre a galeria, faz upload e devolve URL pública. Retorna null se cancelado. */
export async function pickAndUploadPortfolioPhoto(): Promise<string | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') throw new Error('Permissão de galeria negada.');

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 0.85,
  });
  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];
  const mimeType = asset.mimeType ?? 'image/jpeg';

  if (!isSupabaseConfigured) {
    return `https://loremflickr.com/400/300/food,gourmet?lock=${Math.floor(Math.random() * 99)}`;
  }

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Sessão expirada.');

  const ext = mimeType === 'image/png' ? 'png' : 'jpg';
  const path = `${auth.user.id}/portfolio/${Date.now()}.${ext}`;
  return uploadToAvatarsBucket(asset.uri, path, mimeType);
}
