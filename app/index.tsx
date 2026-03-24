import { FontAwesome } from '@expo/vector-icons'; // Importação dos ícones
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
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
  white: '#FFFFFF',
};

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleLogin = () => {
    if (!email || !senha) {
      return Alert.alert('Atenção', 'Preencha todos os campos.');
    }
    Alert.alert('Sucesso', 'Autenticando...');
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor={COLORS.dark} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topAccent} />

        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/images/chef_logo_new.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.brandName}>SeuChefe</Text>
          <Text style={styles.brandTag}>GOURMET</Text>
        </View>

        <Text style={styles.subtitulo}>
          Acesse sua conta para gerenciar seus chefs.
        </Text>

        <Text style={styles.label}>E-MAIL</Text>
        <View style={styles.inputWrapper}>
          <Text style={styles.inputIcon}>✉️</Text>
          <TextInput
            style={styles.input}
            placeholder="seu.email@exemplo.com"
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
            placeholder="Digite sua senha"
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
          style={styles.forgotContainer}
          onPress={() => router.push('/recuperar-senha')}
        >
          <Text style={styles.forgotText}>Esqueceu a senha?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.botao}
          onPress={handleLogin}
          activeOpacity={0.85}
        >
          <Text style={styles.textoBotao}>ENTRAR</Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>ou acesse com</Text>
          <View style={styles.dividerLine} />
        </View>

        {}
        <View style={styles.socialRow}>
          <TouchableOpacity style={styles.socialBtn}>
            <FontAwesome name="google" size={18} color={COLORS.cream} />
            <Text style={styles.socialText}>Google</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.socialBtn}>
            <FontAwesome name="apple" size={20} color={COLORS.cream} />
            <Text style={styles.socialText}>Apple</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.registerRow}>
          <Text style={styles.registerText}>Não possui conta? </Text>
          <TouchableOpacity onPress={() => router.push('/cadastro')}>
            <Text style={styles.registerLink}>Cadastre-se</Text>
          </TouchableOpacity>
        </View>
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
    paddingBottom: 40,
  },
  topAccent: {
    height: 4,
    backgroundColor: COLORS.primary,
    marginHorizontal: -28,
    marginBottom: 36,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoImage: {
    width: 120,
    height: 120,
  },
  brandName: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.primary,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  brandTag: {
    fontSize: 12,
    color: COLORS.white,
    letterSpacing: 4,
    marginTop: 2,
  },
  subtitulo: {
    fontSize: 14,
    color: COLORS.muted,
    marginBottom: 32,
    textAlign: 'center',
  },
  label: {
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
    marginBottom: 18,
    height: 54,
  },
  inputIcon: {
    fontSize: 16,
    marginRight: 10,
    color: COLORS.hint,
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
  forgotContainer: {
    alignSelf: 'flex-end',
    marginBottom: 28,
    marginTop: -8,
  },
  forgotText: {
    fontSize: 13,
    color: COLORS.muted,
    textDecorationLine: 'underline',
  },
  botao: {
    height: 52,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  textoBotao: {
    color: COLORS.dark,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    fontSize: 11,
    color: COLORS.hint,
    textTransform: 'uppercase',
  },
  socialRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  socialBtn: {
    flex: 1,
    height: 48,
    backgroundColor: COLORS.dark,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    flexDirection: 'row', 
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10, 
  },
  socialText: {
    fontSize: 14,
    color: COLORS.cream, 
    fontWeight: '600',
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    fontSize: 14,
    color: COLORS.muted,
  },
  registerLink: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
});