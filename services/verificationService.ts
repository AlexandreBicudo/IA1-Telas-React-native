import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { VerificationStatus } from '@/types/database';

export interface VerificationRecord {
  id: string;
  chefId: string;
  rgUrl: string;
  cpfUrl: string | null;
  selfieUrl: string;
  status: VerificationStatus;
  notes: string | null;
  submittedAt: string;
  reviewedAt: string | null;
}

const MOCK_RECORD: VerificationRecord = {
  id: 'verif-mock-1',
  chefId: 'chef-001',
  rgUrl: 'https://placekitten.com/400/300',
  cpfUrl: null,
  selfieUrl: 'https://randomuser.me/api/portraits/men/32.jpg',
  status: 'pendente',
  notes: null,
  submittedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  reviewedAt: null,
};

/** Retorna o status de verificação do chef logado, ou null se nunca enviou. */
export async function getMyVerificationStatus(): Promise<VerificationRecord | null> {
  if (!isSupabaseConfigured) return null;

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data: myChef } = await supabase
    .from('chef_profiles')
    .select('id')
    .eq('profile_id', auth.user.id)
    .maybeSingle();
  if (!myChef) return null;

  const { data } = await supabase
    .from('chef_verifications')
    .select('*')
    .eq('chef_id', myChef.id)
    .maybeSingle();
  if (!data) return null;

  return {
    id: data.id,
    chefId: data.chef_id,
    rgUrl: data.rg_url,
    cpfUrl: data.cpf_url ?? null,
    selfieUrl: data.selfie_url,
    status: data.status,
    notes: data.notes ?? null,
    submittedAt: data.submitted_at,
    reviewedAt: data.reviewed_at ?? null,
  };
}

/** Envia a solicitação de verificação com as URLs dos documentos já carregados. */
export async function submitVerification(
  rgUrl: string,
  selfieUrl: string,
  cpfUrl?: string,
): Promise<void> {
  if (!isSupabaseConfigured) {
    await new Promise((r) => setTimeout(r, 800));
    return;
  }

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Sessão expirada. Faça login novamente.');

  const { data: myChef } = await supabase
    .from('chef_profiles')
    .select('id')
    .eq('profile_id', auth.user.id)
    .maybeSingle();
  if (!myChef) throw new Error('Perfil de chef não encontrado.');

  // Upsert para permitir reenvio em caso de rejeição
  const { error } = await supabase.from('chef_verifications').upsert(
    {
      chef_id: myChef.id,
      rg_url: rgUrl,
      cpf_url: cpfUrl ?? null,
      selfie_url: selfieUrl,
      status: 'pendente',
      notes: null,
      submitted_at: new Date().toISOString(),
      reviewed_at: null,
    },
    { onConflict: 'chef_id' },
  );
  if (error) throw error;
}

/** Faz upload de um documento de verificação no bucket privado e retorna a URL assinada. */
export async function uploadVerificationDoc(
  type: 'rg' | 'cpf' | 'selfie',
  uri: string,
  mimeType = 'image/jpeg',
): Promise<string> {
  if (!isSupabaseConfigured) {
    await new Promise((r) => setTimeout(r, 600));
    return `https://randomuser.me/api/portraits/men/${Math.floor(Math.random() * 50)}.jpg`;
  }

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Sessão expirada.');

  const ext = mimeType === 'image/png' ? 'png' : 'jpg';
  const path = `${auth.user.id}/${type}_${Date.now()}.${ext}`;
  const file = new File(uri);
  const arrayBuffer = await file.arrayBuffer();

  const { error } = await supabase.storage
    .from('verification-docs')
    .upload(path, arrayBuffer, { contentType: mimeType, upsert: true });
  if (error) throw error;

  // Bucket privado → URL assinada com validade de 10 anos
  const { data: signed } = await supabase.storage
    .from('verification-docs')
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
  if (!signed?.signedUrl) throw new Error('Não foi possível gerar URL do documento.');

  return signed.signedUrl;
}

/** Lança a câmera ou galeria, faz upload e retorna a URL assinada. */
export async function pickAndUploadVerificationDoc(
  type: 'rg' | 'cpf' | 'selfie',
): Promise<string | null> {
  const useFrontCamera = type === 'selfie';

  if (useFrontCamera) {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') throw new Error('Permissão de câmera negada.');
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.85,
      cameraType: ImagePicker.CameraType.front,
    });
    if (result.canceled || !result.assets[0]) return null;
    const asset = result.assets[0];
    return uploadVerificationDoc(type, asset.uri, asset.mimeType ?? 'image/jpeg');
  }

  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') throw new Error('Permissão de galeria negada.');
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.85,
  });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  return uploadVerificationDoc(type, asset.uri, asset.mimeType ?? 'image/jpeg');
}

// Exporta o mock apenas para testes do modo offline
export { MOCK_RECORD };
