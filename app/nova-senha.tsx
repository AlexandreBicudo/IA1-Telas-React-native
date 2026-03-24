import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const COLORS = {
  dark: '#0A0A0A',
  card: '#1A1A1A',
  border: '#282828',
  primary: '#C8A05F',
  cream: '#F8F8F0',
  muted: '#787878',
  hint: '#444444',
};

export default function NovaSenhaScreen() {
  const router = useRouter();
  const [showPass1, setShowPass1] = useState(false);
  const [showPass2, setShowPass2] = useState(false);

  const handleSalvar = () => {
    Alert.alert('Sucesso', 'Senha alterada com sucesso!', [
      { text: 'OK', onPress: () => router.push('/') },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.container}>
        <Text style={styles.titulo}>Nova Senha</Text>
        <Text style={styles.subtitulo}>
          Crie uma nova senha de acesso seguro.
        </Text>

        <Text style={styles.label}>NOVA SENHA</Text>
        <View style={styles.inputWrapper}>
          <Text style={styles.inputIcon}>🔑</Text>
          <TextInput
            style={styles.input}
            placeholder="Sua nova senha"
            placeholderTextColor={COLORS.hint}
            secureTextEntry={!showPass1}
          />
          <TouchableOpacity onPress={() => setShowPass1(!showPass1)}>
            <Text style={styles.showPass}>{showPass1 ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>CONFIRMAR NOVA SENHA</Text>
        <View style={styles.inputWrapper}>
          <Text style={styles.inputIcon}>🔒</Text>
          <TextInput
            style={styles.input}
            placeholder="Repita a senha"
            placeholderTextColor={COLORS.hint}
            secureTextEntry={!showPass2}
          />
          <TouchableOpacity onPress={() => setShowPass2(!showPass2)}>
            <Text style={styles.showPass}>{showPass2 ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.botao} onPress={handleSalvar}>
          <Text style={styles.textoBotao}>REDEFINIR SENHA</Text>
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
  showPass: {
    fontSize: 16,
    paddingLeft: 8,
    color: COLORS.muted,
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
});