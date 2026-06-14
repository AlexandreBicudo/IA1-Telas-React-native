import { useRouter } from 'expo-router';
import React from 'react';
import {
    Image,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const COLORS = {
  dark: '#0F0F12',
  card: '#1B1B20',
  border: '#2A2A30',
  primary: '#C9A24A',
  cream: '#F5F0EB',
  muted: '#A1A1AA',
  hint: '#6B6B72',
};

export default function RecuperarSenhaScreen() {
  const router = useRouter();

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.container}>
        <Image
          source={require('../assets/images/chef_logo_mark.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
        <Text style={styles.titulo}>Recuperar Acesso</Text>
        <Text style={styles.subtitulo}>
          Informe seu e-mail para receber o código de redefinição.
        </Text>

        <Text style={styles.label}>E-MAIL CADASTRADO</Text>
        <View style={styles.inputWrapper}>
          <Text style={styles.inputIcon}>✉️</Text>
          <TextInput
            style={styles.input}
            placeholder="seu.email@gourmet.com"
            placeholderTextColor={COLORS.hint}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity
          style={styles.botao}
          onPress={() => router.push('/nova-senha')}
        >
          <Text style={styles.textoBotao}>ENVIAR CÓDIGO</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>Voltar ao Login</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: COLORS.dark,
  },
  container: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: 90,
    height: 90,
    marginBottom: 20,
  },
  titulo: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.cream,
    marginBottom: 6,
  },
  subtitulo: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  label: {
    alignSelf: 'flex-start',
    fontSize: 10,
    color: COLORS.primary,
    letterSpacing: 2,
    marginBottom: 8,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 24,
    height: 54,
    width: '100%',
  },
  inputIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.cream,
    height: '100%',
  },
  botao: {
    height: 52,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  textoBotao: {
    color: COLORS.dark,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
  },
  backButton: {
    marginTop: 20,
    padding: 10,
  },
  backButtonText: {
    color: COLORS.muted,
    fontWeight: '500',
  },
});