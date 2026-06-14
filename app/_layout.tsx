import { Stack } from 'expo-router';
import { useEffect } from 'react';

import { ThemeProvider } from '@/components/theme-context';
import { registerAndSaveToken } from '@/services/notificationService';

export default function RootLayout() {
  useEffect(() => {
    registerAndSaveToken();
  }, []);

  return (
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="cadastro" />
        <Stack.Screen name="recuperar-senha" />
        <Stack.Screen name="nova-senha" />
        <Stack.Screen name="confirmado" />
        <Stack.Screen name="editar-perfil" />
        <Stack.Screen name="chef/[id]" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </ThemeProvider>
  );
}
