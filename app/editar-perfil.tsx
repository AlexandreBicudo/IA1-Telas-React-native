import { FontAwesome } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  LayoutChangeEvent,
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

import { GSpacing, GShadow, brandFont, type Palette } from '@/constants/gourmet-theme';
import { GoldButton } from '@/components/ui-gourmet';
import { useColors, useTheme } from '@/components/theme-context';
import { SPECIALTIES } from '@/constants/specialties';
import { authErrorMessage, updateEmail, updatePassword } from '@/services/authService';
import { getMyChefProfile } from '@/services/chefService';
import { getMyVerificationStatus, type VerificationRecord } from '@/services/verificationService';
import {
  addPortfolioItem,
  getMyAccount,
  removePortfolioItem,
  saveExperiences,
  updateAvatarUrl,
  updateChefProfile,
  updateMyProfile,
  validateChefProfileForActivation,
  type ExperienceEdit,
  type PricingTier,
} from '@/services/profileService';
import {
  pickAndUploadAvatar,
  pickAndUploadPortfolioPhoto,
  pickAndUploadProfessionalAvatar,
} from '@/services/storageService';
import type { PortfolioItem } from '@/types/database';

export default function EditarPerfilScreen() {
  const router = useRouter();
  const { section } = useLocalSearchParams<{ section?: string }>();
  const c = useColors();
  const { mode } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const scrollRef = useRef<ScrollView>(null);
  const proSectionY = useRef<number>(0);

  // ─── Conta pessoal ────────────────────────────────────────────────────────
  const [fullName, setFullName] = useState('');
  const [currentEmail, setCurrentEmail] = useState('');
  const [personalAvatarUrl, setPersonalAvatarUrl] = useState<string | null>(null);

  const [showEmailChange, setShowEmailChange] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [passwordForEmail, setPasswordForEmail] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);

  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // ─── Perfil profissional ──────────────────────────────────────────────────
  const [chefId, setChefId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');         // vulgo/nome artístico
  const [professionalAvatarUrl, setProfessionalAvatarUrl] = useState<string | null>(null);
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [dailyRate, setDailyRate] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [isAvailable, setIsAvailable] = useState(false);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [experiences, setExperiences] = useState<ExperienceEdit[]>([]);
  const [city, setCity] = useState('');
  const [stateSigla, setStateSigla] = useState('');
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([]);

  // ─── Modal de faixa de preço ──────────────────────────────────────────────
  const [showAddTier, setShowAddTier] = useState(false);
  const [tierMinDays, setTierMinDays] = useState('');
  const [tierMaxDays, setTierMaxDays] = useState('');
  const [tierRate, setTierRate] = useState('');

  const [verificationRecord, setVerificationRecord] = useState<VerificationRecord | null | undefined>(undefined);

  // ─── Estado ───────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPersonal, setUploadingPersonal] = useState(false);
  const [uploadingPro, setUploadingPro] = useState(false);
  const [uploadingPortfolio, setUploadingPortfolio] = useState(false);

  useEffect(() => {
    if (!loading && section === 'profissional' && proSectionY.current > 0) {
      setTimeout(() => scrollRef.current?.scrollTo({ y: proSectionY.current - 16, animated: true }), 150);
    }
  }, [loading, section]);

  useEffect(() => {
    let active = true;
    getMyVerificationStatus().then((v) => { if (active) setVerificationRecord(v); });
    Promise.all([getMyChefProfile(), getMyAccount()]).then(([chef, account]) => {
      if (!active) return;
      if (account) {
        setFullName(account.name ?? '');
        setCurrentEmail(account.email ?? '');
        setPersonalAvatarUrl(account.avatarUrl ?? null);
        if (account.city) setCity(account.city);
        if (account.state) setStateSigla(account.state);
      }
      if (chef) {
        setChefId(chef.id);
        setDisplayName((chef as any).displayName ?? '');
        setProfessionalAvatarUrl((chef as any).professionalAvatarUrl ?? null);
        setHeadline(chef.headline ?? '');
        setBio(chef.bio ?? '');
        setDailyRate(chef.dailyRate ? String(chef.dailyRate) : '');
        setYearsExperience(chef.yearsExperience ? String(chef.yearsExperience) : '');
        setIsAvailable(chef.isAvailable);
        setSpecialties(chef.specialties);
        setPortfolio(chef.portfolio ?? []);
        setPricingTiers(chef.pricingTiers ?? []);
        setExperiences(
          (chef.experiences ?? []).map((e) => ({
            id: e.id,
            restaurant_name: e.restaurant_name,
            role: e.role,
            start_date: e.start_date ? e.start_date.substring(0, 4) : '',
            end_date: e.end_date ? e.end_date.substring(0, 4) : null,
          })),
        );
      }
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  // ─── Fotos ────────────────────────────────────────────────────────────────

  const handlePickPersonalPhoto = async () => {
    try {
      setUploadingPersonal(true);
      const url = await pickAndUploadAvatar();
      if (!url) return;
      await updateAvatarUrl(url);
      setPersonalAvatarUrl(url);
    } catch (e) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível atualizar a foto.');
    } finally {
      setUploadingPersonal(false);
    }
  };

  const handlePickProfessionalPhoto = async () => {
    try {
      setUploadingPro(true);
      const url = await pickAndUploadProfessionalAvatar();
      if (!url) return;
      setProfessionalAvatarUrl(url);
    } catch (e) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível atualizar a foto.');
    } finally {
      setUploadingPro(false);
    }
  };

  // ─── E-mail e senha ───────────────────────────────────────────────────────

  const handleUpdateEmail = async () => {
    if (!newEmail.trim()) return Alert.alert('Atenção', 'Informe o novo e-mail.');
    if (!passwordForEmail) return Alert.alert('Atenção', 'Informe sua senha atual para confirmar.');
    try {
      setSavingEmail(true);
      await updateEmail(newEmail.trim(), passwordForEmail);
      setCurrentEmail(newEmail.trim()); setNewEmail(''); setPasswordForEmail(''); setShowEmailChange(false);
      Alert.alert('E-mail atualizado', 'Verifique sua nova caixa de entrada para confirmar a alteração.');
    } catch (e) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível alterar o e-mail.');
    } finally { setSavingEmail(false); }
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword) return Alert.alert('Atenção', 'Informe sua senha atual.');
    if (!newPassword || newPassword.length < 6) return Alert.alert('Atenção', 'A nova senha deve ter pelo menos 6 caracteres.');
    if (newPassword !== confirmPassword) return Alert.alert('Atenção', 'As senhas não coincidem.');
    try {
      setSavingPassword(true);
      await updatePassword(currentPassword, newPassword);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setShowPasswordChange(false);
      Alert.alert('Senha alterada', 'Sua senha foi atualizada com sucesso.');
    } catch (e) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível alterar a senha.');
    } finally { setSavingPassword(false); }
  };

  // ─── Visibilidade ─────────────────────────────────────────────────────────

  const handleToggleVisibility = async (val: boolean) => {
    if (val) {
      const missing = validateChefProfileForActivation({
        headline, bio, dailyRate: Number(dailyRate), yearsExperience: Number(yearsExperience),
        specialties, avatarUrl: professionalAvatarUrl ?? personalAvatarUrl, city,
      });
      if (missing.length > 0) {
        Alert.alert('Perfil incompleto', `Para aparecer no catálogo, preencha:\n\n• ${missing.join('\n• ')}`);
        return;
      }
    }
    setIsAvailable(val);
    if (!chefId) return;
    try {
      await updateChefProfile(chefId, {
        headline: headline.trim(), bio: bio.trim(),
        dailyRate: Number(dailyRate) || 0, yearsExperience: Number(yearsExperience) || 0,
        isAvailable: val, specialties, pricingTiers, displayName: displayName.trim(),
        professionalAvatarUrl: professionalAvatarUrl ?? undefined,
      });
    } catch { setIsAvailable(!val); Alert.alert('Erro', 'Não foi possível atualizar a visibilidade.'); }
  };

  // ─── Portfólio ────────────────────────────────────────────────────────────

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
    } finally { setUploadingPortfolio(false); }
  };

  const handleDeletePortfolioItem = (item: PortfolioItem) => {
    Alert.alert('Remover foto', `Remover "${item.title}" do portfólio?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: async () => {
        await removePortfolioItem(item.id);
        setPortfolio((prev) => prev.filter((p) => p.id !== item.id));
      }},
    ]);
  };

  const toggleSpecialty = (s: string) =>
    setSpecialties((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);

  // ─── Tabela de preços ─────────────────────────────────────────────────────

  const handleAddTier = () => {
    const min = parseInt(tierMinDays, 10);
    const max = tierMaxDays.trim() === '' ? null : parseInt(tierMaxDays, 10);
    const rate = parseFloat(tierRate);
    if (!min || min < 1) return Alert.alert('Atenção', 'Informe o mínimo de dias válido.');
    if (max !== null && max < min) return Alert.alert('Atenção', 'O máximo deve ser maior que o mínimo.');
    if (!rate || rate <= 0) return Alert.alert('Atenção', 'Informe o valor por dia válido.');
    const overlaps = pricingTiers.some((t) =>
      (min >= t.minDays && (t.maxDays === null || min <= t.maxDays)) ||
      (max !== null && max >= t.minDays && (t.maxDays === null || max <= t.maxDays)),
    );
    if (overlaps) return Alert.alert('Conflito', 'Esta faixa se sobrepõe a outra já cadastrada.');
    setPricingTiers((prev) =>
      [...prev, { minDays: min, maxDays: max, ratePerDay: rate }].sort((a, b) => a.minDays - b.minDays),
    );
    setTierMinDays(''); setTierMaxDays(''); setTierRate(''); setShowAddTier(false);
  };

  const handleRemoveTier = (idx: number) => {
    Alert.alert('Remover faixa?', undefined, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => setPricingTiers((prev) => prev.filter((_, i) => i !== idx)) },
    ]);
  };

  // ─── Salvar ───────────────────────────────────────────────────────────────

  const handleSaveAccount = async () => {
    try {
      setSaving(true);
      await updateMyProfile({ fullName: fullName.trim(), city: city.trim(), state: stateSigla.trim() });
      Alert.alert('Pronto!', 'Dados da conta atualizados.');
    } catch (e) {
      Alert.alert('Erro', authErrorMessage(e));
    } finally { setSaving(false); }
  };

  const handleSaveProfessional = async () => {
    if (!chefId) return;
    if (!headline.trim()) return Alert.alert('Atenção', 'Informe um título profissional.');
    try {
      setSaving(true);
      await Promise.all([
        updateChefProfile(chefId, {
          headline: headline.trim(), bio: bio.trim(),
          dailyRate: Number(dailyRate) || 0, yearsExperience: Number(yearsExperience) || 0,
          isAvailable, specialties, pricingTiers,
          displayName: displayName.trim(),
          professionalAvatarUrl: professionalAvatarUrl ?? undefined,
        }),
        updateMyProfile({ fullName: fullName.trim(), city: city.trim(), state: stateSigla.trim() }),
        saveExperiences(chefId, experiences),
      ]);
      Alert.alert('Pronto!', 'Perfil profissional atualizado.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e) {
      Alert.alert('Erro ao salvar', authErrorMessage(e));
    } finally { setSaving(false); }
  };

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return <View style={[styles.flex, styles.center]}><ActivityIndicator color={c.primary} /></View>;
  }

  const missingForActivation = chefId ? validateChefProfileForActivation({
    headline, bio, dailyRate: Number(dailyRate), yearsExperience: Number(yearsExperience),
    specialties, avatarUrl: professionalAvatarUrl ?? personalAvatarUrl, city,
  }) : [];

  const firstName = fullName.split(' ')[0] || 'você';

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Modal: faixa de preço */}
      <Modal visible={showAddTier} transparent animationType="fade" onRequestClose={() => setShowAddTier(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={styles.modalTitle}>Nova faixa de preço</Text>
            <View style={styles.row}>
              <View style={styles.rowItem}>
                <Text style={styles.label}>DE (dias)</Text>
                <View style={styles.inputWrapper}><TextInput style={styles.input} placeholder="1" placeholderTextColor={c.hint}
                  value={tierMinDays} onChangeText={setTierMinDays} keyboardType="numeric" /></View>
              </View>
              <View style={styles.rowItem}>
                <Text style={styles.label}>ATÉ (∞ = sem limite)</Text>
                <View style={styles.inputWrapper}><TextInput style={styles.input} placeholder="—" placeholderTextColor={c.hint}
                  value={tierMaxDays} onChangeText={setTierMaxDays} keyboardType="numeric" /></View>
              </View>
            </View>
            <Text style={styles.label}>VALOR POR DIA (R$)</Text>
            <View style={styles.inputWrapper}><TextInput style={styles.input} placeholder="450" placeholderTextColor={c.hint}
              value={tierRate} onChangeText={setTierRate} keyboardType="numeric" /></View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { borderColor: c.border }]} onPress={() => setShowAddTier(false)}>
                <Text style={[styles.modalBtnText, { color: c.muted }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: c.primary, borderColor: c.primary }]} onPress={handleAddTier}>
                <Text style={[styles.modalBtnText, { color: c.onPrimary }]}>Adicionar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <FontAwesome name="chevron-left" size={18} color={c.cream} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {section === 'conta' ? 'Minha conta' : section === 'profissional' ? 'Perfil profissional' : 'Editar perfil'}
        </Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* ══════════════════════════════════════════
            SEÇÃO 1 — MINHA CONTA (oculta quando veio de "Gerenciar serviço")
            Dados de acesso ao app, nome e foto pessoal.
            Usados em saudações: "Bom dia, {firstName}!"
        ══════════════════════════════════════════ */}
        {section !== 'profissional' && <View style={[styles.sectionCard, { borderColor: c.primary + '50' }]}>
          <View style={styles.sectionCardHeader}>
            <View style={[styles.sectionCardIcon, { backgroundColor: c.primary + '20' }]}>
              <FontAwesome name="user-circle-o" size={16} color={c.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionCardTitle}>MINHA CONTA</Text>
              <Text style={styles.sectionCardSub}>Dados de acesso e identidade no app</Text>
            </View>
          </View>

          {/* Avatar pessoal */}
          <View style={styles.avatarRow}>
            <View style={styles.avatarCircle}>
              {personalAvatarUrl
                ? <Image source={{ uri: personalAvatarUrl }} style={styles.avatarImg} />
                : <FontAwesome name="user" size={28} color={c.hint} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.avatarLabel}>Foto pessoal</Text>
              <Text style={styles.avatarSub}>Usada em mensagens do app e saudações</Text>
              <TouchableOpacity style={styles.avatarBtn} onPress={handlePickPersonalPhoto} disabled={uploadingPersonal}>
                {uploadingPersonal
                  ? <ActivityIndicator size="small" color={c.primary} />
                  : <><FontAwesome name="camera" size={12} color={c.primary} /><Text style={styles.avatarBtnText}>{personalAvatarUrl ? 'Alterar' : 'Adicionar foto'}</Text></>}
              </TouchableOpacity>
            </View>
          </View>

          {/* Preview de saudação */}
          <View style={styles.greetingPreview}>
            <FontAwesome name="sun-o" size={12} color={c.warning} />
            <Text style={styles.greetingText}>
              Pré-visualização: <Text style={{ color: c.cream, fontWeight: '700' }}>"Bom dia, {firstName}! 👋"</Text>
            </Text>
          </View>

          <Text style={styles.label}>NOME COMPLETO</Text>
          <View style={styles.inputWrapper}>
            <TextInput style={styles.input} placeholder="Seu nome completo" placeholderTextColor={c.hint}
              value={fullName} onChangeText={setFullName} />
          </View>

          <Text style={[styles.subLabel, { marginBottom: 8 }]}>E-mail: <Text style={{ color: c.cream }}>{currentEmail || '—'}</Text></Text>

          {/* Alterar e-mail */}
          <TouchableOpacity style={styles.toggleRow} onPress={() => setShowEmailChange((v) => !v)} activeOpacity={0.7}>
            <FontAwesome name="envelope-o" size={13} color={c.primary} />
            <Text style={styles.toggleText}>Alterar e-mail</Text>
            <FontAwesome name={showEmailChange ? 'chevron-up' : 'chevron-down'} size={11} color={c.muted} />
          </TouchableOpacity>
          {showEmailChange && (
            <View style={styles.subSection}>
              <Text style={styles.label}>NOVO E-MAIL</Text>
              <View style={styles.inputWrapper}><TextInput style={styles.input} placeholder="novo@email.com" placeholderTextColor={c.hint}
                value={newEmail} onChangeText={setNewEmail} keyboardType="email-address" autoCapitalize="none" /></View>
              <Text style={styles.label}>SENHA ATUAL (para confirmar)</Text>
              <View style={styles.inputWrapper}><TextInput style={styles.input} placeholder="••••••••" placeholderTextColor={c.hint}
                value={passwordForEmail} onChangeText={setPasswordForEmail} secureTextEntry /></View>
              <TouchableOpacity style={[styles.subBtn, { backgroundColor: c.primary }]} onPress={handleUpdateEmail} disabled={savingEmail}>
                {savingEmail ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.subBtnText}>Confirmar alteração</Text>}
              </TouchableOpacity>
            </View>
          )}

          {/* Alterar senha */}
          <TouchableOpacity style={[styles.toggleRow, { marginTop: 4 }]} onPress={() => setShowPasswordChange((v) => !v)} activeOpacity={0.7}>
            <FontAwesome name="lock" size={13} color={c.primary} />
            <Text style={styles.toggleText}>Alterar senha</Text>
            <FontAwesome name={showPasswordChange ? 'chevron-up' : 'chevron-down'} size={11} color={c.muted} />
          </TouchableOpacity>
          {showPasswordChange && (
            <View style={styles.subSection}>
              <Text style={styles.label}>SENHA ATUAL</Text>
              <View style={styles.inputWrapper}><TextInput style={styles.input} placeholder="••••••••" placeholderTextColor={c.hint}
                value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry /></View>
              <Text style={styles.label}>NOVA SENHA</Text>
              <View style={styles.inputWrapper}><TextInput style={styles.input} placeholder="Mínimo 6 caracteres" placeholderTextColor={c.hint}
                value={newPassword} onChangeText={setNewPassword} secureTextEntry /></View>
              <Text style={styles.label}>CONFIRMAR NOVA SENHA</Text>
              <View style={styles.inputWrapper}><TextInput style={styles.input} placeholder="••••••••" placeholderTextColor={c.hint}
                value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry /></View>
              {newPassword.length > 0 && newPassword !== confirmPassword && (
                <Text style={[styles.subLabel, { color: c.danger }]}>As senhas não coincidem.</Text>
              )}
              <TouchableOpacity style={[styles.subBtn, { backgroundColor: c.primary }]} onPress={handleUpdatePassword} disabled={savingPassword}>
                {savingPassword ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.subBtnText}>Confirmar nova senha</Text>}
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={[styles.saveAccountBtn, saving && { opacity: 0.6 }]}
            onPress={handleSaveAccount} disabled={saving}
          >
            {saving ? <ActivityIndicator size="small" color={c.onPrimary} />
              : <Text style={[styles.saveAccountBtnText, { color: c.onPrimary }]}>Salvar dados da conta</Text>}
          </TouchableOpacity>
        </View>}

        {/* ══════════════════════════════════════════
            SEÇÃO 2 — PERFIL PROFISSIONAL
            Aparece publicamente no catálogo.
            Chef pode usar nome artístico (vulgo) e
            foto profissional diferente da pessoal.
        ══════════════════════════════════════════ */}
        {chefId && section !== 'conta' && (
          <View
            style={[styles.sectionCard, { borderColor: c.success + '50', marginTop: 20 }]}
            onLayout={(e: LayoutChangeEvent) => { proSectionY.current = e.nativeEvent.layout.y; }}
          >
            <View style={styles.sectionCardHeader}>
              <View style={[styles.sectionCardIcon, { backgroundColor: c.success + '20' }]}>
                <FontAwesome name="cutlery" size={15} color={c.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionCardTitle, { color: c.success }]}>PERFIL PROFISSIONAL</Text>
                <Text style={styles.sectionCardSub}>Aparece publicamente no catálogo para clientes</Text>
              </View>
            </View>

            {/* Foto profissional */}
            <View style={styles.avatarRow}>
              <View style={styles.avatarSquare}>
                {professionalAvatarUrl
                  ? <Image source={{ uri: professionalAvatarUrl }} style={styles.avatarImg} />
                  : <FontAwesome name="camera" size={24} color={c.hint} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.avatarLabel}>Foto profissional</Text>
                <Text style={styles.avatarSub}>Exibida no catálogo — pode ser diferente da foto pessoal</Text>
                <TouchableOpacity style={styles.avatarBtn} onPress={handlePickProfessionalPhoto} disabled={uploadingPro}>
                  {uploadingPro
                    ? <ActivityIndicator size="small" color={c.success} />
                    : <><FontAwesome name="camera" size={12} color={c.success} /><Text style={[styles.avatarBtnText, { color: c.success }]}>{professionalAvatarUrl ? 'Alterar' : 'Adicionar foto'}</Text></>}
                </TouchableOpacity>
              </View>
            </View>

            {/* Nome artístico / vulgo */}
            <Text style={styles.label}>NOME ARTÍSTICO / VULGO (opcional)</Text>
            <View style={styles.inputWrapper}>
              <TextInput style={styles.input} placeholder={`Padrão: "${firstName}" (nome da conta)`}
                placeholderTextColor={c.hint} value={displayName} onChangeText={setDisplayName} />
            </View>
            <Text style={[styles.subLabel, { marginBottom: 12 }]}>
              {displayName.trim()
                ? `Clientes verão: "${displayName.trim()}"`
                : `Clientes verão: "${fullName || 'seu nome de conta'}"`}
            </Text>

            {/* Toggle de visibilidade */}
            <View style={[styles.visibilityCard, { borderColor: isAvailable ? c.success : c.border }]}>
              <View style={styles.visibilityTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.visibilityTitle}>VISIBILIDADE NO CATÁLOGO</Text>
                  <Text style={[styles.visibilityStatus, { color: isAvailable ? c.success : c.muted }]}>
                    {isAvailable ? 'Ativo — clientes podem te contratar' : 'Inativo — não aparece na busca'}
                  </Text>
                </View>
                <Switch value={isAvailable} onValueChange={handleToggleVisibility}
                  trackColor={{ false: c.border, true: c.success }} thumbColor={isAvailable ? '#fff' : c.hint} />
              </View>
              {!isAvailable && missingForActivation.length > 0 && (
                <View style={styles.missingWrap}>
                  <Text style={styles.missingTitle}>Para ativar, preencha:</Text>
                  {missingForActivation.map((m) => <Text key={m} style={styles.missingItem}>• {m}</Text>)}
                </View>
              )}
            </View>

            <Text style={styles.label}>TÍTULO PROFISSIONAL</Text>
            <View style={styles.inputWrapper}>
              <TextInput style={styles.input} placeholder="Ex.: Subchef de cozinha francesa"
                placeholderTextColor={c.hint} value={headline} onChangeText={setHeadline} />
            </View>

            <Text style={styles.label}>SOBRE VOCÊ</Text>
            <View style={[styles.inputWrapper, styles.textareaWrapper]}>
              <TextInput style={[styles.input, styles.textarea]} placeholder="Conte sua experiência, estilo e diferenciais."
                placeholderTextColor={c.hint} value={bio} onChangeText={setBio} multiline textAlignVertical="top" />
            </View>

            <View style={styles.row}>
              <View style={[styles.rowItem, { flex: 2 }]}>
                <Text style={styles.label}>CIDADE</Text>
                <View style={styles.inputWrapper}><TextInput style={styles.input} placeholder="São Paulo"
                  placeholderTextColor={c.hint} value={city} onChangeText={setCity} /></View>
              </View>
              <View style={styles.rowItem}>
                <Text style={styles.label}>UF</Text>
                <View style={styles.inputWrapper}><TextInput style={styles.input} placeholder="SP"
                  placeholderTextColor={c.hint} value={stateSigla} onChangeText={setStateSigla} maxLength={2} autoCapitalize="characters" /></View>
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.rowItem}>
                <Text style={styles.label}>DIÁRIA (R$)</Text>
                <View style={styles.inputWrapper}><TextInput style={styles.input} placeholder="480"
                  placeholderTextColor={c.hint} value={dailyRate} onChangeText={setDailyRate} keyboardType="numeric" /></View>
              </View>
              <View style={styles.rowItem}>
                <Text style={styles.label}>EXPERIÊNCIA (ANOS)</Text>
                <View style={styles.inputWrapper}><TextInput style={styles.input} placeholder="5"
                  placeholderTextColor={c.hint} value={yearsExperience} onChangeText={setYearsExperience} keyboardType="numeric" /></View>
              </View>
            </View>

            <Text style={styles.label}>ESPECIALIDADES</Text>
            <View style={styles.chipsWrap}>
              {SPECIALTIES.map((s) => {
                const active = specialties.includes(s);
                return (
                  <TouchableOpacity key={s} style={[styles.chip, active && styles.chipActive]}
                    onPress={() => toggleSpecialty(s)} activeOpacity={0.8}>
                    <Text style={[styles.chipText, active && { color: c.onPrimary }]}>{s}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Portfólio */}
            <Text style={[styles.label, { marginTop: 8 }]}>PORTFÓLIO DE PRATOS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.portfolioScroll}
              contentContainerStyle={styles.portfolioContent}>
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
                {uploadingPortfolio ? <ActivityIndicator color={c.primary} />
                  : <><FontAwesome name="plus" size={22} color={c.primary} /><Text style={styles.portfolioAddText}>Adicionar{'\n'}prato</Text></>}
              </TouchableOpacity>
            </ScrollView>

            {/* Precificação dinâmica */}
            <Text style={[styles.label, { marginTop: 16 }]}>PRECIFICAÇÃO POR FAIXA DE DIAS</Text>
            <Text style={styles.subLabel}>
              Desconto progressivo para atrair eventos mais longos. Sem faixa correspondente, usa o valor padrão.
            </Text>
            {pricingTiers.length === 0
              ? <Text style={[styles.subLabel, { marginBottom: 12 }]}>Nenhuma faixa — usando diária padrão.</Text>
              : pricingTiers.map((tier, idx) => (
                <View key={idx} style={styles.tierCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tierDays}>{tier.minDays}{tier.maxDays !== null ? `–${tier.maxDays}` : '+'} dias</Text>
                    <Text style={styles.tierRate}>R$ {tier.ratePerDay.toFixed(0)}/dia</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleRemoveTier(idx)} hitSlop={10}>
                    <FontAwesome name="trash-o" size={16} color={c.danger} />
                  </TouchableOpacity>
                </View>
              ))
            }
            <TouchableOpacity style={styles.addTierBtn} onPress={() => setShowAddTier(true)}>
              <FontAwesome name="plus" size={13} color={c.primary} />
              <Text style={styles.addTierText}>Adicionar faixa de preço</Text>
            </TouchableOpacity>

            {/* Experiência em restaurantes */}
            <Text style={[styles.label, { marginTop: 20 }]}>EXPERIÊNCIA EM RESTAURANTES</Text>
            <Text style={styles.subLabel}>
              Histórico profissional que aumenta sua credibilidade no catálogo.
            </Text>

            {experiences.map((exp, idx) => (
              <View key={idx} style={styles.expCard}>
                <View style={styles.expCardHeader}>
                  <FontAwesome name="building-o" size={14} color={c.primary} />
                  <Text style={styles.expCardTitle} numberOfLines={1}>
                    {exp.restaurant_name || 'Novo restaurante'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setExperiences((prev) => prev.filter((_, i) => i !== idx))}
                    hitSlop={10}
                  >
                    <FontAwesome name="trash-o" size={15} color={c.danger} />
                  </TouchableOpacity>
                </View>

                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="Nome do restaurante / empresa"
                    placeholderTextColor={c.hint}
                    value={exp.restaurant_name}
                    onChangeText={(v) =>
                      setExperiences((prev) =>
                        prev.map((e, i) => (i === idx ? { ...e, restaurant_name: v } : e))
                      )
                    }
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="Cargo / função (ex.: Subchef)"
                    placeholderTextColor={c.hint}
                    value={exp.role}
                    onChangeText={(v) =>
                      setExperiences((prev) =>
                        prev.map((e, i) => (i === idx ? { ...e, role: v } : e))
                      )
                    }
                  />
                </View>

                <View style={styles.row}>
                  <View style={styles.rowItem}>
                    <Text style={styles.label}>DE (ano)</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={styles.input}
                        placeholder="2018"
                        placeholderTextColor={c.hint}
                        value={exp.start_date ?? ''}
                        keyboardType="numeric"
                        maxLength={4}
                        onChangeText={(v) =>
                          setExperiences((prev) =>
                            prev.map((e, i) => (i === idx ? { ...e, start_date: v } : e))
                          )
                        }
                      />
                    </View>
                  </View>
                  <View style={styles.rowItem}>
                    <Text style={styles.label}>ATÉ (vazio = atual)</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={styles.input}
                        placeholder="atual"
                        placeholderTextColor={c.hint}
                        value={exp.end_date ?? ''}
                        keyboardType="numeric"
                        maxLength={4}
                        onChangeText={(v) =>
                          setExperiences((prev) =>
                            prev.map((e, i) => (i === idx ? { ...e, end_date: v || null } : e))
                          )
                        }
                      />
                    </View>
                  </View>
                </View>
              </View>
            ))}

            <TouchableOpacity
              style={styles.addTierBtn}
              onPress={() =>
                setExperiences((prev) => [
                  ...prev,
                  { restaurant_name: '', role: '', start_date: '', end_date: null },
                ])
              }
            >
              <FontAwesome name="plus" size={13} color={c.primary} />
              <Text style={styles.addTierText}>Adicionar experiência</Text>
            </TouchableOpacity>

            {/* Card de verificação de identidade */}
            {verificationRecord !== undefined && (() => {
              const statusMap = {
                aprovado: { color: c.success, icon: 'check-circle' as const, label: 'Identidade verificada', body: 'Seu perfil exibe o selo de chef verificado no catálogo.' },
                pendente: { color: c.warning, icon: 'clock-o' as const, label: 'Verificação em análise', body: 'Documentos recebidos. Resultado em até 48 horas.' },
                rejeitado: { color: c.danger, icon: 'times-circle' as const, label: 'Verificação rejeitada', body: verificationRecord?.notes ?? 'Reenvie os documentos para nova análise.' },
              };
              const noRecord = !verificationRecord;
              const v = verificationRecord ? statusMap[verificationRecord.status] : null;
              return (
                <View style={[styles.verifCard, { borderColor: noRecord ? c.border : (v?.color ?? c.border) + '60' }]}>
                  <View style={styles.verifHeader}>
                    <FontAwesome name={noRecord ? 'shield' : (v?.icon ?? 'shield')} size={16} color={noRecord ? c.hint : v?.color} />
                    <Text style={[styles.verifTitle, { color: noRecord ? c.muted : v?.color }]}>
                      {noRecord ? 'Verificação de identidade' : v?.label}
                    </Text>
                  </View>
                  <Text style={[styles.verifBody, { color: c.muted }]}>
                    {noRecord
                      ? 'Verifique sua identidade para ganhar o selo "Chef Verificado" e aumentar a confiança dos clientes.'
                      : v?.body}
                  </Text>
                  {(noRecord || verificationRecord?.status === 'rejeitado') && (
                    <TouchableOpacity
                      style={[styles.verifBtn, { borderColor: noRecord ? c.primary : c.danger }]}
                      onPress={() => router.push('/verificacao-chef' as any)}
                      activeOpacity={0.8}
                    >
                      <FontAwesome name="arrow-right" size={12} color={noRecord ? c.primary : c.danger} />
                      <Text style={[styles.verifBtnText, { color: noRecord ? c.primary : c.danger }]}>
                        {noRecord ? 'Iniciar verificação' : 'Reenviar documentos'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })()}

            <GoldButton label="SALVAR PERFIL PROFISSIONAL" onPress={handleSaveProfessional} loading={saving} style={{ marginTop: 24 }} />
          </View>
        )}

        {/* Cliente sem perfil chef: só salvar conta */}
        {!chefId && (
          <View style={{ height: 24 }} />
        )}

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: c.dark },
    center: { alignItems: 'center', justifyContent: 'center' },

    header: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: GSpacing.screen, paddingTop: 16, paddingBottom: 12,
      backgroundColor: c.dark,
    },
    backBtn: { width: 28 },
    headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: c.cream, fontFamily: brandFont },
    scroll: { paddingHorizontal: GSpacing.screen, paddingBottom: 48, paddingTop: 8 },

    // Card de seção
    sectionCard: {
      backgroundColor: c.surface,
      borderRadius: GSpacing.radius + 2,
      borderWidth: 1.5,
      padding: 18,
      ...GShadow,
    },
    sectionCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
    sectionCardIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    sectionCardTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 2, color: c.primary },
    sectionCardSub: { fontSize: 12, color: c.muted, marginTop: 2 },

    // Avatar
    avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 },
    avatarCircle: {
      width: 64, height: 64, borderRadius: 32,
      backgroundColor: c.card, borderWidth: 1, borderColor: c.border,
      alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    },
    avatarSquare: {
      width: 64, height: 64, borderRadius: 12,
      backgroundColor: c.card, borderWidth: 1, borderColor: c.border,
      alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    },
    avatarImg: { width: '100%', height: '100%' },
    avatarLabel: { fontSize: 13, fontWeight: '700', color: c.cream },
    avatarSub: { fontSize: 11, color: c.muted, marginTop: 2, lineHeight: 15 },
    avatarBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
    avatarBtnText: { fontSize: 13, color: c.primary, fontWeight: '600' },

    // Preview de saudação
    greetingPreview: {
      flexDirection: 'row', alignItems: 'center', gap: 7,
      backgroundColor: c.warning + '15', borderRadius: 8,
      borderWidth: 1, borderColor: c.warning + '30',
      paddingHorizontal: 12, paddingVertical: 8, marginBottom: 16,
    },
    greetingText: { fontSize: 12, color: c.muted, flex: 1 },

    // Botão salvar conta
    saveAccountBtn: {
      backgroundColor: c.primary, borderRadius: 10,
      paddingVertical: 12, alignItems: 'center', marginTop: 16,
    },
    saveAccountBtnText: { fontSize: 14, fontWeight: '700', letterSpacing: 0.5 },

    // Campos
    label: { fontSize: 10, color: c.primary, letterSpacing: 2, fontWeight: '700', marginBottom: 6, marginTop: 14 },
    subLabel: { fontSize: 12, color: c.muted, lineHeight: 17 },
    inputWrapper: { borderWidth: 1, borderColor: c.border, borderRadius: 10, backgroundColor: c.card },
    input: { paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: c.cream, height: GSpacing.inputHeight },
    textareaWrapper: { height: 100 },
    textarea: { height: 90 },
    row: { flexDirection: 'row', gap: 12 },
    rowItem: { flex: 1 },

    // Seções expansíveis
    toggleRow: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: c.card, borderWidth: 1, borderColor: c.border,
      borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13,
    },
    toggleText: { flex: 1, fontSize: 14, color: c.cream, fontWeight: '600' },
    subSection: { backgroundColor: c.card, borderRadius: 10, padding: 14, marginTop: 4, borderWidth: 1, borderColor: c.border },
    subBtn: { borderRadius: 9, paddingVertical: 11, alignItems: 'center', marginTop: 10 },
    subBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

    // Visibilidade
    visibilityCard: {
      borderWidth: 1.5, borderRadius: 12, padding: 14, marginTop: 14, marginBottom: 4,
    },
    visibilityTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    visibilityTitle: { fontSize: 10, letterSpacing: 2, fontWeight: '700', color: c.primary },
    visibilityStatus: { fontSize: 13, marginTop: 3 },
    missingWrap: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: c.border },
    missingTitle: { fontSize: 12, color: c.warning, fontWeight: '600', marginBottom: 4 },
    missingItem: { fontSize: 12, color: c.muted },

    // Especialidades
    chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
    chip: {
      borderWidth: 1, borderColor: c.border, borderRadius: 20,
      paddingHorizontal: 14, paddingVertical: 8,
    },
    chipActive: { backgroundColor: c.primary, borderColor: c.primary },
    chipText: { fontSize: 13, color: c.muted, fontWeight: '500' },

    // Portfólio
    portfolioScroll: { marginBottom: 8 },
    portfolioContent: { gap: 12, paddingVertical: 4, paddingRight: 4 },
    portfolioItem: { width: 110 },
    portfolioThumb: { width: 110, height: 90, borderRadius: 10 },
    portfolioDelete: { position: 'absolute', top: 4, right: 4 },
    portfolioLabel: { fontSize: 11, color: c.muted, marginTop: 4 },
    portfolioAdd: {
      width: 110, height: 90, borderRadius: 10, borderWidth: 1.5, borderStyle: 'dashed',
      borderColor: c.primary, alignItems: 'center', justifyContent: 'center', gap: 6,
    },
    portfolioAddText: { fontSize: 11, color: c.primary, textAlign: 'center' },

    // Tabela de preços
    tierCard: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: c.card, borderWidth: 1, borderColor: c.border,
      borderRadius: 10, padding: 14, marginBottom: 8,
    },
    tierDays: { fontSize: 14, fontWeight: '700', color: c.cream },
    tierRate: { fontSize: 12, color: c.primary, marginTop: 2 },
    addTierBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      borderWidth: 1, borderColor: c.primary + '60', borderStyle: 'dashed',
      borderRadius: 10, paddingVertical: 11, justifyContent: 'center', marginTop: 4,
    },
    addTierText: { fontSize: 13, color: c.primary, fontWeight: '600' },

    // Experiência em restaurantes
    expCard: {
      backgroundColor: c.card, borderWidth: 1, borderColor: c.border,
      borderRadius: GSpacing.radius, padding: 14, marginBottom: 10, gap: 2,
    },
    expCardHeader: {
      flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4,
    },
    expCardTitle: { flex: 1, fontSize: 13, fontWeight: '600', color: c.cream },

    // Verificação
    verifCard: {
      borderWidth: 1.5, borderRadius: GSpacing.radius,
      padding: 16, marginTop: 24,
    },
    verifHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    verifTitle: { fontSize: 13, fontWeight: '700', flex: 1 },
    verifBody: { fontSize: 12, lineHeight: 18, marginBottom: 12 },
    verifBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      borderWidth: 1.5, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14,
      alignSelf: 'flex-start',
    },
    verifBtnText: { fontSize: 13, fontWeight: '700' },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: GSpacing.screen },
    modalBox: { width: '100%', borderRadius: 14, borderWidth: 1, padding: 20 },
    modalTitle: { fontSize: 16, fontWeight: '700', color: c.cream, marginBottom: 14, fontFamily: brandFont },
    modalActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
    modalBtn: { flex: 1, borderWidth: 1, borderRadius: 9, paddingVertical: 11, alignItems: 'center' },
    modalBtnText: { fontSize: 14, fontWeight: '700' },
  });
