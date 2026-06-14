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
import { getMyAccount, updateAvatarUrl, updateChefProfile } from '@/services/profileService';
import { pickAndUploadAvatar } from '@/services/storageService';

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
  const [isAvailable, setIsAvailable] = useState(true);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

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
      }
      if (account?.avatarUrl) setAvatarUrl(account.avatarUrl);
      setLoading(false);
    });
    return () => {
      active = false;
    };
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

  const toggleSpecialty = (s: string) =>
    setSpecialties((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const handleSave = async () => {
    if (!chefId) return Alert.alert('Erro', 'Perfil profissional não encontrado.');
    if (!headline.trim()) return Alert.alert('Atenção', 'Informe um título profissional.');
    try {
      setSaving(true);
      await updateChefProfile(chefId, {
        headline: headline.trim(),
        bio: bio.trim(),
        dailyRate: Number(dailyRate) || 0,
        yearsExperience: Number(yearsExperience) || 0,
        isAvailable,
        specialties,
      });
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

        <TouchableOpacity style={styles.availabilityToggle} onPress={() => setIsAvailable((v) => !v)} activeOpacity={0.8}>
          <View style={[styles.checkbox, isAvailable && styles.checkboxOn]}>
            {isAvailable && <FontAwesome name="check" size={11} color={c.onPrimary} />}
          </View>
          <Text style={styles.availabilityText}>Disponível para novos serviços</Text>
        </TouchableOpacity>

        <GoldButton label="SALVAR PERFIL" onPress={handleSave} loading={saving} />
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
    photoRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 },
    photoCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    photoImg: { width: '100%', height: '100%', borderRadius: 36 },
    photoBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    photoBtnText: { color: c.primary, fontSize: 13, fontWeight: '600' },
    label: { fontSize: 10, color: c.primary, letterSpacing: 2, fontWeight: '600', marginBottom: 8 },
    inputWrapper: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: GSpacing.radius,
      paddingHorizontal: 16,
      marginBottom: 18,
      height: GSpacing.inputHeight,
      justifyContent: 'center',
    },
    textareaWrapper: { height: 110, paddingVertical: 12 },
    input: { fontSize: 15, color: c.cream },
    textarea: { height: '100%' },
    row: { flexDirection: 'row', gap: 12 },
    rowItem: { flex: 1 },
    chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    chipActive: { backgroundColor: c.primary, borderColor: c.primary },
    chipText: { fontSize: 13, color: c.muted, fontWeight: '600' },
    availabilityToggle: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 28 },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 5,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxOn: { backgroundColor: c.primary, borderColor: c.primary },
    availabilityText: { fontSize: 14, color: c.cream },
  });
