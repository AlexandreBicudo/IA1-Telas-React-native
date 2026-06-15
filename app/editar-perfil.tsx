import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { GSpacing, brandFont, type Palette } from '@/constants/gourmet-theme';
import { GoldButton } from '@/components/ui-gourmet';
import { useColors, useTheme } from '@/components/theme-context';
import { SPECIALTIES } from '@/constants/specialties';
import { authErrorMessage } from '@/services/authService';
import { getMyChefProfile } from '@/services/chefService';
import {
  addPortfolioItem,
  getMyAccount,
  removePortfolioItem,
  updateAvatarUrl,
  updateChefProfile,
  updateMyProfile,
  validateChefProfileForActivation,
} from '@/services/profileService';
import { pickAndUploadAvatar, pickAndUploadPortfolioPhoto } from '@/services/storageService';
import type { PortfolioItem } from '@/types/database';

export default function EditarPerfilScreen() {
  const router = useRouter();
  const c = useColors();
  const { mode } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  const [chefId, setChefId] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [dailyRate, setDailyRate] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [isAvailable, setIsAvailable] = useState(false);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingPortfolio, setUploadingPortfolio] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([getMyChefProfile(), getMyAccount()]).then(([chef, account]) => {
      if (!active) return;
      if (chef) {
        setChefId(chef.id);
        setHeadline(chef.headline ?? '');
        setBio(chef.bio ?? '');
        setDailyRate(chef.dailyRate ? String(chef.dailyRate) : '');
        setYearsExperience(chef.yearsExperience ? String(chef.yearsExperience) : '');
        setIsAvailable(chef.isAvailable);
        setSpecialties(chef.specialties);
        setPortfolio(chef.portfolio ?? []);
      }
      if (account?.avatarUrl) setAvatarUrl(account.avatarUrl);
      if (account?.city) setCity(account.city);
      if (account?.state) setState(account.state);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const handlePickPhoto = async () => {
    try {
      setUploadingPhoto(true);
      const url = await pickAndUploadAvatar();
      if (!url) return;
      await updateAvatarUrl(url);
      setAvatarUrl(url);
    } catch (e) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível atualizar a foto.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleToggleVisibility = async (val: boolean) => {
    if (val) {
      const missing = validateChefProfileForActivation({
        headline,
        bio,
        dailyRate: Number(dailyRate),
        yearsExperience: Number(yearsExperience),
        specialties,
        avatarUrl,
        city,
      });
      if (missing.length > 0) {
        Alert.alert(
          'Perfil incompleto',
          `Para aparecer no catálogo, preencha:\n\n• ${missing.join('\n• ')}`,
        );
        return;
      }
    }
    setIsAvailable(val);
    if (!chefId) return;
    try {
      await updateChefProfile(chefId, {
        headline: headline.trim(),
        bio: bio.trim(),
        dailyRate: Number(dailyRate) || 0,
        yearsExperience: Number(yearsExperience) || 0,
        isAvailable: val,
        specialties,
      });
    } catch {
      setIsAvailable(!val);
      Alert.alert('Erro', 'Não foi possível atualizar a visibilidade.');
    }
  };

  const handleAddPortfolioPhoto = async () => {
    if (!chefId) return;
    try {
      setUploadingPortfolio(true);
      const url = await pickAndUploadPortfolioPhoto();
      if (!url) return;
      const title = `Prato ${portfolio.length + 1}`;
      await addPortfolioItem(chefId, url, title);
      setPortfolio((prev) => [...prev, { id: `local-${Date.now()}`, chef_id: chefId, image_url: url, title } as PortfolioItem]);
    } catch (e) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível adicionar a foto.');
    } finally {
      setUploadingPortfolio(false);
    }
  };

  const handleDeletePortfolioItem = (item: PortfolioItem) => {
    Alert.alert('Remover foto', `Remover "${item.title}" do portfólio?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          await removePortfolioItem(item.id);
          setPortfolio((prev) => prev.filter((p) => p.id !== item.id));
        },
      },
    ]);
  };

  const toggleSpecialty = (s: string) =>
    setSpecialties((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const handleSave = async () => {
    if (!chefId) return Alert.alert('Erro', 'Perfil profissional não encontrado.');
    if (!headline.trim()) return Alert.alert('Atenção', 'Informe um título profissional.');
    try {
      setSaving(true);
      await Promise.all([
        updateChefProfile(chefId, {
          headline: headline.trim(),
          bio: bio.trim(),
          dailyRate: Number(dailyRate) || 0,
          yearsExperience: Number(yearsExperience) || 0,
          isAvailable,
          specialties,
        }),
        updateMyProfile({ city: city.trim(), state: state.trim() }),
      ]);
      Alert.alert('Pronto!', 'Perfil atualizado com sucesso.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (error) {
      Alert.alert('Erro ao salvar', authErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.flex, styles.center]}>
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }

  const missingForActivation = validateChefProfileForActivation({
    headline, bio, dailyRate: Number(dailyRate), yearsExperience: Number(yearsExperience), specialties, avatarUrl, city,
  });

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <FontAwesome name="chevron-left" size={18} color={c.cream} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar perfil</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Foto de perfil */}
        <View style={styles.photoRow}>
          <View style={styles.photoCircle}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.photoImg} />
            ) : (
              <FontAwesome name="user" size={28} color={c.hint} />
            )}
          </View>
          <TouchableOpacity style={styles.photoBtn} onPress={handlePickPhoto} disabled={uploadingPhoto}>
            {uploadingPhoto ? (
              <ActivityIndicator size="small" color={c.primary} />
            ) : (
              <>
                <FontAwesome name="camera" size={13} color={c.primary} />
                <Text style={styles.photoBtnText}>{avatarUrl ? 'Alterar foto' : 'Adicionar foto'}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Toggle de visibilidade */}
        <View style={[styles.visibilityCard, { borderColor: isAvailable ? c.success : c.border }]}>
          <View style={styles.visibilityTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.visibilityTitle}>VISIBILIDADE NO CATÁLOGO</Text>
              <Text style={[styles.visibilityStatus, { color: isAvailable ? c.success : c.muted }]}>
                {isAvailable ? 'Ativo — aparece na busca' : 'Inativo — não aparece na busca'}
              </Text>
            </View>
            <Switch
              value={isAvailable}
              onValueChange={handleToggleVisibility}
              trackColor={{ false: c.border, true: c.success }}
              thumbColor={isAvailable ? '#fff' : c.hint}
            />
          </View>
          {!isAvailable && missingForActivation.length > 0 && (
            <View style={styles.missingWrap}>
              <Text style={styles.missingTitle}>Para ativar, preencha:</Text>
              {missingForActivation.map((m) => (
                <Text key={m} style={styles.missingItem}>• {m}</Text>
              ))}
            </View>
          )}
        </View>

        {/* Campos de perfil */}
        <Text style={styles.label}>TÍTULO PROFISSIONAL</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Ex.: Subchef de cozinha francesa"
            placeholderTextColor={c.hint}
            value={headline}
            onChangeText={setHeadline}
          />
        </View>

        <Text style={styles.label}>SOBRE VOCÊ</Text>
        <View style={[styles.inputWrapper, styles.textareaWrapper]}>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="Conte sua experiência, estilo e diferenciais."
            placeholderTextColor={c.hint}
            value={bio}
            onChangeText={setBio}
            multiline
            textAlignVertical="top"
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.rowItem, { flex: 2 }]}>
            <Text style={styles.label}>CIDADE</Text>
            <View style={styles.inputWrapper}>
              <TextInput style={styles.input} placeholder="São Paulo" placeholderTextColor={c.hint} value={city} onChangeText={setCity} />
            </View>
          </View>
          <View style={styles.rowItem}>
            <Text style={styles.label}>UF</Text>
            <View style={styles.inputWrapper}>
              <TextInput style={styles.input} placeholder="SP" placeholderTextColor={c.hint} value={state} onChangeText={setState} maxLength={2} autoCapitalize="characters" />
            </View>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.rowItem}>
            <Text style={styles.label}>DIÁRIA (R$)</Text>
            <View style={styles.inputWrapper}>
              <TextInput style={styles.input} placeholder="480" placeholderTextColor={c.hint} value={dailyRate} onChangeText={setDailyRate} keyboardType="numeric" />
            </View>
          </View>
          <View style={styles.rowItem}>
            <Text style={styles.label}>EXPERIÊNCIA (ANOS)</Text>
            <View style={styles.inputWrapper}>
              <TextInput style={styles.input} placeholder="5" placeholderTextColor={c.hint} value={yearsExperience} onChangeText={setYearsExperience} keyboardType="numeric" />
            </View>
          </View>
        </View>

        <Text style={styles.label}>ESPECIALIDADES</Text>
        <View style={styles.chipsWrap}>
          {SPECIALTIES.map((s) => {
            const active = specialties.includes(s);
            return (
              <TouchableOpacity key={s} style={[styles.chip, active && styles.chipActive]} onPress={() => toggleSpecialty(s)} activeOpacity={0.8}>
                <Text style={[styles.chipText, active && { color: c.onPrimary }]}>{s}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Portfólio de pratos */}
        <Text style={[styles.label, { marginTop: 8 }]}>PORTFÓLIO DE PRATOS</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.portfolioScroll} contentContainerStyle={styles.portfolioContent}>
          {portfolio.map((item) => (
            <View key={item.id} style={styles.portfolioItem}>
              <Image source={{ uri: item.image_url }} style={styles.portfolioThumb} resizeMode="cover" />
              <TouchableOpacity style={styles.portfolioDelete} onPress={() => handleDeletePortfolioItem(item)}>
                <FontAwesome name="times-circle" size={20} color={c.danger} />
              </TouchableOpacity>
              <Text style={styles.portfolioLabel} numberOfLines={1}>{item.title}</Text>
            </View>
          ))}
          <TouchableOpacity style={styles.portfolioAdd} onPress={handleAddPortfolioPhoto} disabled={uploadingPortfolio}>
            {uploadingPortfolio ? (
              <ActivityIndicator color={c.primary} />
            ) : (
              <>
                <FontAwesome name="plus" size={22} color={c.primary} />
                <Text style={styles.portfolioAddText}>Adicionar{'\n'}prato</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>

        <GoldButton label="SALVAR PERFIL" onPress={handleSave} loading={saving} style={{ marginTop: 24 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: c.dark },
    center: { alignItems: 'center', justifyContent: 'center' },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: GSpacing.screen,
      paddingTop: 20,
      paddingBottom: 8,
    },
    backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: c.cream, fontFamily: brandFont },
    scroll: { paddingHorizontal: GSpacing.screen, paddingBottom: 48, paddingTop: 12 },
    // Foto
    photoRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
    photoCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: c.card, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    photoImg: { width: '100%', height: '100%' },
    photoBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    photoBtnText: { color: c.primary, fontSize: 13, fontWeight: '600' },
    // Visibilidade
    visibilityCard: { borderWidth: 1.5, borderRadius: 12, padding: 14, marginBottom: 22 },
    visibilityTop: { flexDirection: 'row', alignItems: 'center' },
    visibilityTitle: { fontSize: 10, color: c.primary, letterSpacing: 2, fontWeight: '700' },
    visibilityStatus: { fontSize: 13, marginTop: 3, fontWeight: '600' },
    missingWrap: { borderTopWidth: 1, borderTopColor: c.border, marginTop: 12, paddingTop: 10 },
    missingTitle: { fontSize: 12, color: c.warning, fontWeight: '600', marginBottom: 6 },
    missingItem: { fontSize: 12, color: c.muted, lineHeight: 20 },
    // Campos
    label: { fontSize: 10, color: c.primary, letterSpacing: 2, fontWeight: '600', marginBottom: 8 },
    inputWrapper: { backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: GSpacing.radius, paddingHorizontal: 16, marginBottom: 18, height: GSpacing.inputHeight, justifyContent: 'center' },
    textareaWrapper: { height: 110, paddingVertical: 12 },
    input: { fontSize: 15, color: c.cream },
    textarea: { height: '100%' },
    row: { flexDirection: 'row', gap: 12 },
    rowItem: { flex: 1 },
    // Especialidades
    chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: c.border, backgroundColor: c.card },
    chipActive: { backgroundColor: c.primary, borderColor: c.primary },
    chipText: { fontSize: 13, color: c.muted, fontWeight: '600' },
    // Portfólio
    portfolioScroll: { marginBottom: 8 },
    portfolioContent: { gap: 12, paddingVertical: 4 },
    portfolioItem: { width: 110 },
    portfolioThumb: { width: 110, height: 110, borderRadius: 10, backgroundColor: c.card },
    portfolioDelete: { position: 'absolute', top: -6, right: -6, backgroundColor: c.dark, borderRadius: 10 },
    portfolioLabel: { fontSize: 11, color: c.muted, marginTop: 6, textAlign: 'center' },
    portfolioAdd: { width: 110, height: 110, borderRadius: 10, borderWidth: 1.5, borderColor: c.primary, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 8 },
    portfolioAddText: { fontSize: 12, color: c.primary, textAlign: 'center', fontWeight: '600' },
  });
