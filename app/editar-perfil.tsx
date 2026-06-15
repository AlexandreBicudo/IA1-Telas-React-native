import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
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
import { authErrorMessage, updateEmail, updatePassword } from '@/services/authService';
import { getMyChefProfile } from '@/services/chefService';
import {
  addPortfolioItem,
  getMyAccount,
  removePortfolioItem,
  updateAvatarUrl,
  updateChefProfile,
  updateMyProfile,
  validateChefProfileForActivation,
  type PricingTier,
} from '@/services/profileService';
import { pickAndUploadAvatar, pickAndUploadPortfolioPhoto } from '@/services/storageService';
import type { PortfolioItem } from '@/types/database';

export default function EditarPerfilScreen() {
  const router = useRouter();
  const c = useColors();
  const { mode } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  // — Chef profile
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
  const [stateSigla, setStateSigla] = useState('');

  // — Dados pessoais
  const [fullName, setFullName] = useState('');
  const [currentEmail, setCurrentEmail] = useState('');

  // — Alterar e-mail
  const [showEmailChange, setShowEmailChange] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [passwordForEmail, setPasswordForEmail] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);

  // — Alterar senha
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // — Precificação dinâmica
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([]);
  const [showAddTier, setShowAddTier] = useState(false);
  const [tierMinDays, setTierMinDays] = useState('');
  const [tierMaxDays, setTierMaxDays] = useState('');
  const [tierRate, setTierRate] = useState('');

  // — Loading / saving
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
        setPricingTiers(chef.pricingTiers ?? []);
      }
      if (account) {
        if (account.avatarUrl) setAvatarUrl(account.avatarUrl);
        if (account.city) setCity(account.city);
        if (account.state) setStateSigla(account.state);
        setFullName(account.name ?? '');
        setCurrentEmail(account.email ?? '');
      }
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  // ─── Foto de perfil ───────────────────────────────────────────────────────

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

  // ─── Dados pessoais ───────────────────────────────────────────────────────

  const handleUpdateEmail = async () => {
    if (!newEmail.trim()) return Alert.alert('Atenção', 'Informe o novo e-mail.');
    if (!passwordForEmail) return Alert.alert('Atenção', 'Informe sua senha atual para confirmar.');
    try {
      setSavingEmail(true);
      await updateEmail(newEmail.trim(), passwordForEmail);
      setCurrentEmail(newEmail.trim());
      setNewEmail('');
      setPasswordForEmail('');
      setShowEmailChange(false);
      Alert.alert('E-mail atualizado', 'Verifique sua nova caixa de entrada para confirmar a alteração.');
    } catch (e) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível alterar o e-mail.');
    } finally {
      setSavingEmail(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword) return Alert.alert('Atenção', 'Informe sua senha atual.');
    if (!newPassword) return Alert.alert('Atenção', 'Informe a nova senha.');
    if (newPassword.length < 6) return Alert.alert('Atenção', 'A nova senha deve ter pelo menos 6 caracteres.');
    if (newPassword !== confirmPassword) return Alert.alert('Atenção', 'As senhas não coincidem.');
    try {
      setSavingPassword(true);
      await updatePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordChange(false);
      Alert.alert('Senha alterada', 'Sua senha foi atualizada com sucesso.');
    } catch (e) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível alterar a senha.');
    } finally {
      setSavingPassword(false);
    }
  };

  // ─── Visibilidade no catálogo ─────────────────────────────────────────────

  const handleToggleVisibility = async (val: boolean) => {
    if (val) {
      const missing = validateChefProfileForActivation({
        headline, bio, dailyRate: Number(dailyRate), yearsExperience: Number(yearsExperience),
        specialties, avatarUrl, city,
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
        isAvailable: val, specialties, pricingTiers,
      });
    } catch {
      setIsAvailable(!val);
      Alert.alert('Erro', 'Não foi possível atualizar a visibilidade.');
    }
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
    } finally {
      setUploadingPortfolio(false);
    }
  };

  const handleDeletePortfolioItem = (item: PortfolioItem) => {
    Alert.alert('Remover foto', `Remover "${item.title}" do portfólio?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover', style: 'destructive',
        onPress: async () => {
          await removePortfolioItem(item.id);
          setPortfolio((prev) => prev.filter((p) => p.id !== item.id));
        },
      },
    ]);
  };

  const toggleSpecialty = (s: string) =>
    setSpecialties((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  // ─── Tabela de preços ─────────────────────────────────────────────────────

  const handleAddTier = () => {
    const min = parseInt(tierMinDays, 10);
    const max = tierMaxDays.trim() === '' ? null : parseInt(tierMaxDays, 10);
    const rate = parseFloat(tierRate);
    if (!min || min < 1) return Alert.alert('Atenção', 'Informe o mínimo de dias válido.');
    if (max !== null && max < min) return Alert.alert('Atenção', 'O máximo de dias deve ser maior que o mínimo.');
    if (!rate || rate <= 0) return Alert.alert('Atenção', 'Informe o valor por dia válido.');
    const overlaps = pricingTiers.some(
      (t) =>
        (min >= t.minDays && (t.maxDays === null || min <= t.maxDays)) ||
        (max !== null && max >= t.minDays && (t.maxDays === null || max <= t.maxDays)),
    );
    if (overlaps) return Alert.alert('Conflito', 'Esta faixa de dias se sobrepõe a outra já cadastrada.');
    setPricingTiers((prev) =>
      [...prev, { minDays: min, maxDays: max, ratePerDay: rate }].sort((a, b) => a.minDays - b.minDays),
    );
    setTierMinDays(''); setTierMaxDays(''); setTierRate('');
    setShowAddTier(false);
  };

  const handleRemoveTier = (idx: number) => {
    Alert.alert('Remover faixa?', undefined, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => setPricingTiers((prev) => prev.filter((_, i) => i !== idx)) },
    ]);
  };

  // ─── Salvar tudo ──────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!chefId) return Alert.alert('Erro', 'Perfil profissional não encontrado.');
    if (!headline.trim()) return Alert.alert('Atenção', 'Informe um título profissional.');
    try {
      setSaving(true);
      await Promise.all([
        updateChefProfile(chefId, {
          headline: headline.trim(), bio: bio.trim(),
          dailyRate: Number(dailyRate) || 0, yearsExperience: Number(yearsExperience) || 0,
          isAvailable, specialties, pricingTiers,
        }),
        updateMyProfile({ fullName: fullName.trim(), city: city.trim(), state: stateSigla.trim() }),
      ]);
      Alert.alert('Pronto!', 'Perfil atualizado com sucesso.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (error) {
      Alert.alert('Erro ao salvar', authErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[styles.flex, styles.center]}>
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }

  const missingForActivation = chefId
    ? validateChefProfileForActivation({
        headline, bio, dailyRate: Number(dailyRate), yearsExperience: Number(yearsExperience),
        specialties, avatarUrl, city,
      })
    : [];

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Modal: Adicionar faixa de preço */}
      <Modal visible={showAddTier} transparent animationType="fade" onRequestClose={() => setShowAddTier(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[styles.modalTitle, { color: c.cream }]}>Nova faixa de preço</Text>
            <View style={styles.tierModalRow}>
              <View style={styles.tierModalField}>
                <Text style={styles.label}>DE (dias)</Text>
                <View style={styles.inputWrapper}>
                  <TextInput style={styles.input} placeholder="1" placeholderTextColor={c.hint}
                    value={tierMinDays} onChangeText={setTierMinDays} keyboardType="numeric" />
                </View>
              </View>
              <View style={styles.tierModalField}>
                <Text style={styles.label}>ATÉ (dias)</Text>
                <View style={styles.inputWrapper}>
                  <TextInput style={styles.input} placeholder="∞ (sem limite)" placeholderTextColor={c.hint}
                    value={tierMaxDays} onChangeText={setTierMaxDays} keyboardType="numeric" />
                </View>
              </View>
            </View>
            <Text style={styles.label}>VALOR POR DIA (R$)</Text>
            <View style={styles.inputWrapper}>
              <TextInput style={styles.input} placeholder="450" placeholderTextColor={c.hint}
                value={tierRate} onChangeText={setTierRate} keyboardType="numeric" />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { borderColor: c.border }]} onPress={() => setShowAddTier(false)}>
                <Text style={[styles.modalBtnText, { color: c.muted }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: c.primary, borderColor: c.primary }]} onPress={handleAddTier}>
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>Adicionar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <FontAwesome name="chevron-left" size={18} color={c.cream} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar perfil</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* ── Foto de perfil ── */}
        <View style={styles.photoRow}>
          <View style={styles.photoCircle}>
            {avatarUrl
              ? <Image source={{ uri: avatarUrl }} style={styles.photoImg} />
              : <FontAwesome name="user" size={28} color={c.hint} />}
          </View>
          <TouchableOpacity style={styles.photoBtn} onPress={handlePickPhoto} disabled={uploadingPhoto}>
            {uploadingPhoto
              ? <ActivityIndicator size="small" color={c.primary} />
              : <>
                  <FontAwesome name="camera" size={13} color={c.primary} />
                  <Text style={styles.photoBtnText}>{avatarUrl ? 'Alterar foto' : 'Adicionar foto'}</Text>
                </>}
          </TouchableOpacity>
        </View>

        {/* ── Dados pessoais ── */}
        <Text style={styles.sectionHeader}>DADOS PESSOAIS</Text>

        <Text style={styles.label}>NOME COMPLETO</Text>
        <View style={styles.inputWrapper}>
          <TextInput style={styles.input} placeholder="Seu nome completo" placeholderTextColor={c.hint}
            value={fullName} onChangeText={setFullName} />
        </View>

        <Text style={styles.subLabel}>E-mail atual: {currentEmail || '—'}</Text>

        {/* Alterar e-mail */}
        <TouchableOpacity style={styles.toggleRow} onPress={() => setShowEmailChange((v) => !v)} activeOpacity={0.7}>
          <FontAwesome name="envelope-o" size={13} color={c.primary} />
          <Text style={styles.toggleText}>Alterar e-mail</Text>
          <FontAwesome name={showEmailChange ? 'chevron-up' : 'chevron-down'} size={11} color={c.muted} />
        </TouchableOpacity>
        {showEmailChange && (
          <View style={styles.subSection}>
            <Text style={styles.label}>NOVO E-MAIL</Text>
            <View style={styles.inputWrapper}>
              <TextInput style={styles.input} placeholder="novo@email.com" placeholderTextColor={c.hint}
                value={newEmail} onChangeText={setNewEmail} keyboardType="email-address" autoCapitalize="none" />
            </View>
            <Text style={styles.label}>SENHA ATUAL (para confirmar)</Text>
            <View style={styles.inputWrapper}>
              <TextInput style={styles.input} placeholder="••••••••" placeholderTextColor={c.hint}
                value={passwordForEmail} onChangeText={setPasswordForEmail} secureTextEntry />
            </View>
            <TouchableOpacity style={[styles.subBtn, { backgroundColor: c.primary }]} onPress={handleUpdateEmail} disabled={savingEmail}>
              {savingEmail
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.subBtnText}>Confirmar alteração</Text>}
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
            <View style={styles.inputWrapper}>
              <TextInput style={styles.input} placeholder="••••••••" placeholderTextColor={c.hint}
                value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry />
            </View>
            <Text style={styles.label}>NOVA SENHA</Text>
            <View style={styles.inputWrapper}>
              <TextInput style={styles.input} placeholder="Mínimo 6 caracteres" placeholderTextColor={c.hint}
                value={newPassword} onChangeText={setNewPassword} secureTextEntry />
            </View>
            <Text style={styles.label}>CONFIRMAR NOVA SENHA</Text>
            <View style={styles.inputWrapper}>
              <TextInput style={styles.input} placeholder="••••••••" placeholderTextColor={c.hint}
                value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
            </View>
            {newPassword.length > 0 && newPassword !== confirmPassword && (
              <Text style={[styles.subLabel, { color: c.danger }]}>As senhas não coincidem.</Text>
            )}
            <TouchableOpacity style={[styles.subBtn, { backgroundColor: c.primary }]} onPress={handleUpdatePassword} disabled={savingPassword}>
              {savingPassword
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.subBtnText}>Confirmar nova senha</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* ── Perfil profissional (só quando tem chefId) ── */}
        {chefId && (
          <>
            <Text style={[styles.sectionHeader, { marginTop: 28 }]}>PERFIL PROFISSIONAL</Text>

            {/* Toggle de visibilidade */}
            <View style={[styles.visibilityCard, { borderColor: isAvailable ? c.success : c.border }]}>
              <View style={styles.visibilityTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.visibilityTitle}>VISIBILIDADE NO CATÁLOGO</Text>
                  <Text style={[styles.visibilityStatus, { color: isAvailable ? c.success : c.muted }]}>
                    {isAvailable ? 'Ativo — aparece na busca' : 'Inativo — não aparece na busca'}
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
                <View style={styles.inputWrapper}>
                  <TextInput style={styles.input} placeholder="São Paulo" placeholderTextColor={c.hint}
                    value={city} onChangeText={setCity} />
                </View>
              </View>
              <View style={styles.rowItem}>
                <Text style={styles.label}>UF</Text>
                <View style={styles.inputWrapper}>
                  <TextInput style={styles.input} placeholder="SP" placeholderTextColor={c.hint}
                    value={stateSigla} onChangeText={setStateSigla} maxLength={2} autoCapitalize="characters" />
                </View>
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.rowItem}>
                <Text style={styles.label}>DIÁRIA (R$)</Text>
                <View style={styles.inputWrapper}>
                  <TextInput style={styles.input} placeholder="480" placeholderTextColor={c.hint}
                    value={dailyRate} onChangeText={setDailyRate} keyboardType="numeric" />
                </View>
              </View>
              <View style={styles.rowItem}>
                <Text style={styles.label}>EXPERIÊNCIA (ANOS)</Text>
                <View style={styles.inputWrapper}>
                  <TextInput style={styles.input} placeholder="5" placeholderTextColor={c.hint}
                    value={yearsExperience} onChangeText={setYearsExperience} keyboardType="numeric" />
                </View>
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
                {uploadingPortfolio
                  ? <ActivityIndicator color={c.primary} />
                  : <>
                      <FontAwesome name="plus" size={22} color={c.primary} />
                      <Text style={styles.portfolioAddText}>Adicionar{'\n'}prato</Text>
                    </>}
              </TouchableOpacity>
            </ScrollView>

            {/* ── Tabela de preços dinâmica ── */}
            <Text style={[styles.sectionHeader, { marginTop: 28 }]}>PRECIFICAÇÃO POR FAIXA DE DIAS</Text>
            <Text style={styles.subLabel}>
              Configure descontos progressivos para atrair eventos mais longos. O valor padrão (diária acima) é usado quando não há faixa correspondente.
            </Text>

            {pricingTiers.length === 0 ? (
              <Text style={[styles.subLabel, { marginBottom: 12 }]}>Nenhuma faixa cadastrada — usando valor padrão da diária.</Text>
            ) : (
              pricingTiers.map((tier, idx) => (
                <View key={idx} style={styles.tierCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tierDays}>
                      {tier.minDays}{tier.maxDays !== null ? `–${tier.maxDays}` : '+'} dias
                    </Text>
                    <Text style={styles.tierRate}>R$ {tier.ratePerDay.toFixed(0)}/dia</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleRemoveTier(idx)} hitSlop={10}>
                    <FontAwesome name="trash-o" size={16} color={c.danger} />
                  </TouchableOpacity>
                </View>
              ))
            )}

            <TouchableOpacity style={styles.addTierBtn} onPress={() => setShowAddTier(true)}>
              <FontAwesome name="plus" size={13} color={c.primary} />
              <Text style={styles.addTierText}>Adicionar faixa de preço</Text>
            </TouchableOpacity>

            <GoldButton label="SALVAR PERFIL" onPress={handleSave} loading={saving} style={{ marginTop: 24 }} />
          </>
        )}

        {/* Salvar apenas dados pessoais (sem perfil chef) */}
        {!chefId && (
          <GoldButton
            label="SALVAR DADOS"
            onPress={async () => {
              try {
                setSaving(true);
                await updateMyProfile({ fullName: fullName.trim(), city: city.trim(), state: stateSigla.trim() });
                Alert.alert('Pronto!', 'Dados atualizados.', [{ text: 'OK', onPress: () => router.back() }]);
              } catch (e) {
                Alert.alert('Erro', authErrorMessage(e));
              } finally {
                setSaving(false);
              }
            }}
            loading={saving}
            style={{ marginTop: 24 }}
          />
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
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: GSpacing.screen, paddingTop: 20, paddingBottom: 8,
    },
    backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: c.cream, fontFamily: brandFont },
    scroll: { paddingHorizontal: GSpacing.screen, paddingBottom: 48, paddingTop: 12 },

    // Seção
    sectionHeader: {
      fontSize: 10, color: c.primary, letterSpacing: 2.5, fontWeight: '800',
      marginBottom: 16, marginTop: 4, borderBottomWidth: 1, borderBottomColor: c.border, paddingBottom: 8,
    },

    // Foto
    photoRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 },
    photoCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: c.card, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    photoImg: { width: '100%', height: '100%' },
    photoBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    photoBtnText: { color: c.primary, fontSize: 13, fontWeight: '600' },

    // Campos
    label: { fontSize: 10, color: c.primary, letterSpacing: 2, fontWeight: '600', marginBottom: 8 },
    subLabel: { fontSize: 12, color: c.muted, marginBottom: 12, lineHeight: 18 },
    inputWrapper: { backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: GSpacing.radius, paddingHorizontal: 16, marginBottom: 18, height: GSpacing.inputHeight, justifyContent: 'center' },
    textareaWrapper: { height: 110, paddingVertical: 12 },
    input: { fontSize: 15, color: c.cream },
    textarea: { height: '100%' },
    row: { flexDirection: 'row', gap: 12 },
    rowItem: { flex: 1 },

    // Toggle expandível
    toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, marginBottom: 4, borderWidth: 1, borderColor: c.border, borderRadius: 10, paddingHorizontal: 14, backgroundColor: c.card },
    toggleText: { flex: 1, fontSize: 14, color: c.cream, fontWeight: '600' },
    subSection: { backgroundColor: c.surface, borderRadius: 12, padding: 14, marginTop: 4, marginBottom: 12, borderWidth: 1, borderColor: c.border },
    subBtn: { borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
    subBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

    // Visibilidade
    visibilityCard: { borderWidth: 1.5, borderRadius: 12, padding: 14, marginBottom: 22 },
    visibilityTop: { flexDirection: 'row', alignItems: 'center' },
    visibilityTitle: { fontSize: 10, color: c.primary, letterSpacing: 2, fontWeight: '700' },
    visibilityStatus: { fontSize: 13, marginTop: 3, fontWeight: '600' },
    missingWrap: { borderTopWidth: 1, borderTopColor: c.border, marginTop: 12, paddingTop: 10 },
    missingTitle: { fontSize: 12, color: c.warning, fontWeight: '600', marginBottom: 6 },
    missingItem: { fontSize: 12, color: c.muted, lineHeight: 20 },

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

    // Tabela de preços
    tierCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 8 },
    tierDays: { fontSize: 14, fontWeight: '700', color: c.cream },
    tierRate: { fontSize: 13, color: c.primary, marginTop: 2 },
    addTierBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: c.primary, borderStyle: 'dashed', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16, marginTop: 4, justifyContent: 'center' },
    addTierText: { color: c.primary, fontWeight: '600', fontSize: 14 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    modalBox: { width: '100%', borderRadius: 16, borderWidth: 1, padding: 24 },
    modalTitle: { fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 20 },
    tierModalRow: { flexDirection: 'row', gap: 12 },
    tierModalField: { flex: 1 },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
    modalBtn: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
    modalBtnText: { fontSize: 14, fontWeight: '700' },
  });
