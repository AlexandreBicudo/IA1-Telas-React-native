import { FontAwesome } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter, type Href } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { GSpacing, brandFont, type Palette } from '@/constants/gourmet-theme';
import { AccentBar, ScreenGradient } from '@/components/ui-gourmet';
import { useColors, useTheme } from '@/components/theme-context';
import { authErrorMessage, signOut } from '@/services/authService';
import { activateChefProfile, getMyAccount, type MyAccount } from '@/services/profileService';

export default function PerfilScreen() {
  const router = useRouter();
  const c = useColors();
  const { mode, setMode } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  const [account, setAccount] = useState<MyAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getMyAccount().then((data) => {
      setAccount(data);
      setLoading(false);
    });
  }, []);

  useFocusEffect(load);

  const handleLogout = async () => {
    try {
      await signOut();
      router.replace('/');
    } catch (error) {
      Alert.alert('Erro ao sair', authErrorMessage(error));
    }
  };

  const handleActivate = async () => {
    try {
      setActivating(true);
      await activateChefProfile();
      router.push('/editar-perfil');
    } catch (error) {
      Alert.alert('Erro', authErrorMessage(error));
    } finally {
      setActivating(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.flex, styles.center]}>
        <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} />
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }

  if (!account) {
    return (
      <View style={[styles.flex, styles.center]}>
        <Text style={styles.empty}>Sessão não encontrada. Faça login novamente.</Text>
        <TouchableOpacity style={styles.linkBtn} onPress={() => router.replace('/')}>
          <Text style={styles.linkBtnText}>Ir para o login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScreenGradient>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <AccentBar style={styles.topAccent} />

        <View style={styles.hero}>
          <Avatar uri={account.avatarUrl} name={account.name || 'Usuário'} size={84} c={c} styles={styles} />
          <Text style={styles.greeting}>{getGreeting(account.name || 'você')}</Text>
          <Text style={styles.name}>{account.name || 'Usuário'}</Text>
          <Text style={styles.email}>{account.email}</Text>
        </View>

        <Text style={styles.sectionTitle}>Minha conta</Text>
        <ActionCard
          styles={styles}
          c={c}
          iconBg={c.surface}
          iconColor={c.primary}
          icon="user-circle-o"
          title="Editar dados pessoais"
          sub="Nome, e-mail e senha da sua conta."
          onPress={() => router.push('/editar-perfil')}
        />

        <Text style={styles.sectionTitle}>Contratar serviços</Text>
        <ActionCard
          styles={styles}
          c={c}
          iconBg={c.primary}
          iconColor={c.onPrimary}
          icon="search"
          title="Encontrar um chef"
          sub="Busque e contrate profissionais para seu evento."
          onPress={() => router.push('/catalogo')}
        />

        <Text style={styles.sectionTitle}>Meu serviço profissional</Text>
        {account.hasChefProfile ? (
          <>
            <ActionCard
              styles={styles}
              c={c}
              iconBg={c.accent}
              iconColor={c.onAccent}
              icon="pencil"
              title="Gerenciar meu serviço"
              sub="Especialidades, valor, portfólio e disponibilidade."
              onPress={() => router.push('/editar-perfil')}
            />
            {account.chefId && (
              <ActionCard
                styles={styles}
                c={c}
                iconBg={c.surface}
                iconColor={c.primary}
                icon="eye"
                title="Ver como apareço no feed"
                sub="Visualize seu perfil público no catálogo."
                onPress={() => router.push(`/chef/${account.chefId}` as Href)}
              />
            )}
          </>
        ) : (
          <ActionCard
            styles={styles}
            c={c}
            iconBg={c.accent}
            iconColor={c.onAccent}
            icon={activating ? undefined : 'plus'}
            loading={activating}
            title="Criar meu serviço"
            sub="Monte seu perfil profissional e apareça no catálogo."
            onPress={handleActivate}
          />
        )}

        {/* Aparência — tema claro/escuro */}
        <Text style={styles.sectionTitle}>Aparência</Text>
        <View style={styles.themeRow}>
          <ThemeOption styles={styles} c={c} active={mode === 'dark'} icon="moon-o" label="Escuro" onPress={() => setMode('dark')} />
          <ThemeOption styles={styles} c={c} active={mode === 'light'} icon="sun-o" label="Claro" onPress={() => setMode('light')} />
        </View>

        <TouchableOpacity style={styles.logout} onPress={handleLogout} activeOpacity={0.7}>
          <FontAwesome name="sign-out" size={15} color={c.muted} />
          <Text style={styles.logoutText}>Sair da conta</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenGradient>
  );
}

function ActionCard({
  styles,
  c,
  iconBg,
  iconColor,
  icon,
  title,
  sub,
  onPress,
  loading,
}: {
  styles: ReturnType<typeof makeStyles>;
  c: Palette;
  iconBg: string;
  iconColor: string;
  icon?: React.ComponentProps<typeof FontAwesome>['name'];
  title: string;
  sub: string;
  onPress: () => void;
  loading?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.actionCard} activeOpacity={0.85} onPress={onPress} disabled={loading}>
      <View style={[styles.actionIcon, { backgroundColor: iconBg }]}>
        {loading ? (
          <ActivityIndicator color={iconColor} />
        ) : (
          icon && <FontAwesome name={icon} size={17} color={iconColor} />
        )}
      </View>
      <View style={styles.actionTextWrap}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSub}>{sub}</Text>
      </View>
      <FontAwesome name="chevron-right" size={14} color={c.muted} />
    </TouchableOpacity>
  );
}

function ThemeOption({
  styles,
  c,
  active,
  icon,
  label,
  onPress,
}: {
  styles: ReturnType<typeof makeStyles>;
  c: Palette;
  active: boolean;
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.themeOption, active && styles.themeOptionActive]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <FontAwesome name={icon} size={16} color={active ? c.onPrimary : c.muted} />
      <Text style={[styles.themeOptionText, active && { color: c.onPrimary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Avatar({
  uri,
  name,
  size,
  c,
  styles,
}: {
  uri?: string | null;
  name: string;
  size: number;
  c: Palette;
  styles: ReturnType<typeof makeStyles>;
}) {
  const dim = { width: size, height: size, borderRadius: size / 2 };
  if (uri) return <Image source={{ uri }} style={[styles.avatar, dim]} resizeMode="cover" />;
  return (
    <View style={[styles.avatar, dim]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.34, color: c.primary }]}>{getInitials(name)}</Text>
    </View>
  );
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase();
}

function getGreeting(name: string) {
  const firstName = name.split(' ')[0];
  const hour = new Date().getHours();
  if (hour < 12) return `Bom dia, ${firstName}! 👋`;
  if (hour < 18) return `Boa tarde, ${firstName}! 👋`;
  return `Boa noite, ${firstName}! 👋`;
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: c.dark },
    center: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: GSpacing.screen },
    empty: { color: c.muted, fontSize: 14, textAlign: 'center' },
    linkBtn: { marginTop: 16 },
    linkBtnText: { color: c.primary, fontWeight: '600' },
    scroll: { paddingHorizontal: GSpacing.screen, paddingBottom: 40 },
    topAccent: { marginHorizontal: -GSpacing.screen, marginBottom: 28 },
    hero: { alignItems: 'center' },
    avatar: {
      backgroundColor: c.card,
      borderWidth: 2,
      borderColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarText: { fontWeight: '700', fontFamily: brandFont },
    greeting: { fontSize: 13, color: c.primary, fontWeight: '600', marginTop: 14 },
    name: { fontSize: 22, fontWeight: '700', color: c.cream, marginTop: 4 },
    email: { fontSize: 13, color: c.muted, marginTop: 4 },
    sectionTitle: {
      fontSize: 11,
      color: c.primary,
      letterSpacing: 2,
      fontWeight: '600',
      textTransform: 'uppercase',
      marginTop: 28,
      marginBottom: 14,
    },
    actionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: GSpacing.radius,
      padding: 14,
      marginBottom: 12,
    },
    actionIcon: { width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    actionTextWrap: { flex: 1 },
    actionTitle: { fontSize: 15, fontWeight: '700', color: c.cream },
    actionSub: { fontSize: 12, color: c.muted, marginTop: 2, lineHeight: 16 },
    themeRow: { flexDirection: 'row', gap: 12 },
    themeOption: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      height: 50,
      borderRadius: GSpacing.radius,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    themeOptionActive: { backgroundColor: c.primary, borderColor: c.primary },
    themeOptionText: { fontSize: 14, fontWeight: '600', color: c.muted },
    logout: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 28,
      paddingVertical: 12,
    },
    logoutText: { fontSize: 14, color: c.muted, fontWeight: '600' },
  });
