/**
 * Notificações push via Expo Push API.
 *
 * ATENÇÃO: push notifications NÃO funcionam no Expo Go a partir do SDK 53.
 * Funcionam normalmente no APK gerado pelo EAS Build.
 * Em Expo Go, todas as funções retornam silenciosamente.
 */
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';

// Expo Go (storeClient) não suporta push — evita o erro ao importar expo-notifications
const isExpoGo = Constants.executionEnvironment === 'storeClient';

/** Pede permissão e salva o Expo Push Token no perfil do usuário logado. */
export async function registerAndSaveToken(): Promise<void> {
  if (isExpoGo || !Device.isDevice) return;
  try {
    // Importação dinâmica: só carrega o módulo fora do Expo Go
    const Notifications = await import('expo-notifications');

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Agendamentos',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });

    if (!isSupabaseConfigured || !token) return;

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;

    await supabase.from('profiles').update({ push_token: token }).eq('id', auth.user.id);
  } catch {
    // Falha silenciosa
  }
}

/** Envia notificação push via Expo Push API (chamada HTTP direta, sem backend). */
export async function sendPushToToken(token: string, title: string, body: string): Promise<void> {
  if (!token || isExpoGo) return;
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'Accept-Encoding': 'gzip, deflate' },
      body: JSON.stringify({ to: token, title, body, sound: 'default', priority: 'high' }),
    });
  } catch {
    // Falha de rede silenciosa
  }
}

/** Busca o push_token de um usuário pelo profiles.id. */
export async function getPushToken(profileId: string): Promise<string | null> {
  if (!isSupabaseConfigured || isExpoGo) return null;
  const { data } = await supabase.from('profiles').select('push_token').eq('id', profileId).maybeSingle();
  return data?.push_token ?? null;
}

/** Busca o push_token do chef pelo chef_profiles.id. */
export async function getChefPushToken(chefProfilesId: string): Promise<string | null> {
  if (!isSupabaseConfigured || isExpoGo) return null;
  const { data } = await supabase
    .from('chef_profiles')
    .select('profile_id')
    .eq('id', chefProfilesId)
    .maybeSingle();
  if (!data?.profile_id) return null;
  return getPushToken(data.profile_id);
}
