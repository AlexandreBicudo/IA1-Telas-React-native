import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import { authErrorMessage, signUp } from '@/services/authService';
import type { UserRole } from '@/types/database';

const COLORS = {
  dark: '#0A0A0A',
  card: '#1A1A1A',
  border: '#282828',
  primary: '#C8A05F',
  cream: '#F8F8F0',
  muted: '#787878',
  hint: '#444444',
};

export default function CadastroScreen() {
  const router = useRouter();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [role, setRole] = useState<UserRole>('cliente');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCadastro = async () => {
    if (!nome || !email || !senha) {
      return Alert.alert('Atenção', 'Preencha todos os campos.');
    }
    try {
      setLoading(true);
      const result = await signUp({
        email: email.trim(),
        password: senha,
        fullName: nome.trim(),
        role,
      });
      if (!result.mock && !result.session) {
        // Confirmação de e-mail ativada: não há sessão ainda.
        Alert.alert(
          'Quase lá!',
          'Enviamos um e-mail de confirmação. Confirme para acessar sua conta.',
          [{ text: 'OK', onPress: () => router.back() }],
        );
        return;
      }
      router.replace('/catalogo');
    } catch (error) {
      Alert.alert('Erro no cadastro', authErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <Image
          source={require('../assets/images/chef_logo_new.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
        <Text style={styles.titulo}>Junte-se à Elite</Text>
        <Text style={styles.subtitulo}>Crie sua conta SeuChefe Gourmet.</Text>

        {/* Seleção de papel */}
        <Text style={styles.label}>EU SOU</Text>
        <View style={styles.roleRow}>
          <TouchableOpacity
            style={[styles.roleBtn, role === 'cliente' && styles.roleBtnActive]}
            onPress={() => setRole('cliente')}
            activeOpacity={0.85}
          >
            <Text style={[styles.roleText, role === 'cliente' && styles.roleTextActive]}>
              Cliente
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleBtn, role === 'chef' && styles.roleBtnActive]}
            onPress={() => setRole('chef')}
            activeOpacity={0.85}
          >
            <Text style={[styles.roleText, role === 'chef' && styles.roleTextActive]}>
              Chef / Cozinheiro
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>NOME COMPLETO</Text>
        <View style={styles.inputWrapper}>
          <Text style={styles.inputIcon}>👤</Text>
          <TextInput
            style={styles.input}
            placeholder="Chef Claude Troisgros"
            placeholderTextColor={COLORS.hint}
            value={nome}
            onChangeText={setNome}
          />
        </View>

        <Text style={styles.label}>E-MAIL</Text>
        <View style={styles.inputWrapper}>
          <Text style={styles.inputIcon}>✉️</Text>
          <TextInput
            style={styles.input}
            placeholder="seu@email.com"
            placeholderTextColor={COLORS.hint}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <Text style={styles.label}>SENHA</Text>
        <View style={styles.inputWrapper}>
          <Text style={styles.inputIcon}>🔒</Text>
          <TextInput
            style={styles.input}
            placeholder="Crie uma senha forte"
            placeholderTextColor={COLORS.hint}
            value={senha}
            onChangeText={setSenha}
            secureTextEntry={!showPass}
          />
          <TouchableOpacity onPress={() => setShowPass(!showPass)}>
            <Text style={styles.showPass}>{showPass ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.botao, loading && styles.botaoDisabled]}
          onPress={handleCadastro}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.dark} />
          ) : (
            <Text style={styles.textoBotao}>CADASTRAR</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>
            Já tem conta? Voltar ao Login
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: COLORS.dark,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 60,
    paddingBottom: 40,
  },
  logoImage: {
    width: 80,
    height: 80,
    alignSelf: 'center',
    marginBottom: 20,
  },
  titulo: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.cream,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitulo: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
    marginBottom: 32,
  },
  label: {
    fontSize: 10,
    color: COLORS.primary,
    letterSpacing: 2,
    marginBottom: 8,
    fontWeight: '600',
  },
  roleRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  roleBtn: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  roleText: {
    fontSize: 13,
    color: COLORS.muted,
    fontWeight: '600',
  },
  roleTextActive: {
    color: COLORS.dark,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 18,
    height: 54,
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
    marginTop: 10,
  },
  botaoDisabled: {
    opacity: 0.6,
  },
  textoBotao: {
    color: COLORS.dark,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
  },
  backButton: {
    alignItems: 'center',
    marginTop: 20,
  },
  backButtonText: {
    color: COLORS.primary,
    fontWeight: '500',
  },
});
