import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { GColors, GSpacing, brandFont } from '@/constants/gourmet-theme';

/**
 * Tela aberta pelo link de confirmação de e-mail (deep link seuchefe://confirmado).
 * Quando o usuário chega aqui, o Supabase já confirmou o e-mail no servidor.
 */
export default function ConfirmadoScreen() {
  const router = useRouter();

  return (
    <View style={styles.flex}>
      <StatusBar barStyle="light-content" backgroundColor={GColors.dark} />
      <View style={styles.topAccent} />
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <FontAwesome name="check" size={40} color={GColors.dark} />
        </View>

        <Text style={styles.brandName}>SeuChefe</Text>
        <Text style={styles.brandTag}>GOURMET</Text>

        <Text style={styles.title}>E-mail confirmado!</Text>
        <Text style={styles.subtitle}>
          Sua conta foi verificada com sucesso. Agora é só entrar e descobrir os melhores chefs.
        </Text>

        <TouchableOpacity
          style={styles.botao}
          onPress={() => router.replace('/')}
          activeOpacity={0.85}
        >
          <Text style={styles.textoBotao}>IR PARA O LOGIN</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: GColors.dark,
  },
  topAccent: {
    height: 4,
    backgroundColor: GColors.primary,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: GSpacing.screen,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: GColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  brandName: {
    fontSize: 24,
    fontWeight: '700',
    color: GColors.primary,
    fontFamily: brandFont,
  },
  brandTag: {
    fontSize: 10,
    color: GColors.cream,
    letterSpacing: 4,
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: GColors.cream,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: GColors.muted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 36,
    paddingHorizontal: 10,
  },
  botao: {
    height: GSpacing.buttonHeight,
    backgroundColor: GColors.primary,
    borderRadius: GSpacing.radius,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  textoBotao: {
    color: GColors.dark,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
  },
});
