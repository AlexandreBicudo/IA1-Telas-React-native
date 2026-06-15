import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useColors } from '@/components/theme-context';
import { GoldButton, Panel, ScreenGradient } from '@/components/ui-gourmet';
import { GSpacing, brandFont, type Palette } from '@/constants/gourmet-theme';
import {
  pickAndUploadVerificationDoc,
  submitVerification,
} from '@/services/verificationService';

type Step = 'rg' | 'selfie' | 'review' | 'sent';

export default function VerificacaoChefScreen() {
  const router = useRouter();
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  const [step, setStep] = useState<Step>('rg');
  const [rgUrl, setRgUrl] = useState<string | null>(null);
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handlePickDoc = async (type: 'rg' | 'selfie') => {
    try {
      setUploading(true);
      const url = await pickAndUploadVerificationDoc(type);
      if (!url) return;
      if (type === 'rg') setRgUrl(url);
      else setSelfieUrl(url);
    } catch (e) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível carregar o documento.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!rgUrl || !selfieUrl) return;
    try {
      setSubmitting(true);
      await submitVerification(rgUrl, selfieUrl);
      setStep('sent');
    } catch (e) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível enviar os documentos.');
    } finally {
      setSubmitting(false);
    }
  };

  const STEPS: Step[] = ['rg', 'selfie', 'review'];
  const currentIdx = STEPS.indexOf(step === 'sent' ? 'review' : step);

  if (step === 'sent') {
    return (
      <ScreenGradient>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <FontAwesome name="chevron-left" size={18} color={c.cream} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>VERIFICAÇÃO</Text>
          <View style={{ width: 30 }} />
        </View>
        <View style={styles.sentContainer}>
          <View style={[styles.sentIcon, { backgroundColor: c.success + '20', borderColor: c.success }]}>
            <FontAwesome name="check" size={40} color={c.success} />
          </View>
          <Text style={[styles.sentTitle, { color: c.cream }]}>Documentos enviados!</Text>
          <Text style={[styles.sentBody, { color: c.muted }]}>
            Nossa equipe irá analisar seus documentos em até{' '}
            <Text style={{ color: c.primary, fontWeight: '700' }}>48 horas</Text>.
            Você será notificado quando a verificação for concluída.
          </Text>
          <GoldButton label="Voltar ao perfil" onPress={() => router.back()} style={{ width: '100%' }} />
        </View>
      </ScreenGradient>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScreenGradient style={styles.flex}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <FontAwesome name="chevron-left" size={18} color={c.cream} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>VERIFICAÇÃO</Text>
          <View style={{ width: 30 }} />
        </View>

        {/* Barra de progresso */}
        <View style={styles.progressBar}>
          {STEPS.map((s, idx) => {
            const done = idx < currentIdx;
            const active = idx === currentIdx;
            return (
              <React.Fragment key={s}>
                <View style={[styles.progressDot,
                  { backgroundColor: done || active ? c.primary : c.border,
                    borderColor: done || active ? c.primary : c.border }]}>
                  {done && <FontAwesome name="check" size={8} color={c.onPrimary} />}
                  {active && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.onPrimary }} />}
                </View>
                {idx < STEPS.length - 1 && (
                  <View style={[styles.progressLine, { backgroundColor: done ? c.primary : c.border }]} />
                )}
              </React.Fragment>
            );
          })}
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Passo 1 — RG */}
          {step === 'rg' && (
            <Panel style={styles.card}>
              <Text style={styles.stepLabel}>PASSO 1 DE 3</Text>
              <Text style={styles.stepTitle}>Documento de Identidade (RG)</Text>
              <Text style={styles.stepBody}>
                Envie uma foto clara do seu RG (frente). O documento deve estar legível e sem reflexos.
              </Text>

              {rgUrl ? (
                <View style={styles.docPreviewWrap}>
                  <Image source={{ uri: rgUrl }} style={styles.docPreview} resizeMode="cover" />
                  <TouchableOpacity
                    style={[styles.retakeBtn, { borderColor: c.border }]}
                    onPress={() => handlePickDoc('rg')}
                    disabled={uploading}
                  >
                    <FontAwesome name="refresh" size={13} color={c.muted} />
                    <Text style={[styles.retakeBtnText, { color: c.muted }]}>Trocar foto</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.uploadArea, { borderColor: c.border }]}
                  onPress={() => handlePickDoc('rg')}
                  disabled={uploading}
                  activeOpacity={0.7}
                >
                  {uploading ? (
                    <ActivityIndicator color={c.primary} />
                  ) : (
                    <>
                      <FontAwesome name="id-card-o" size={36} color={c.primary} />
                      <Text style={[styles.uploadLabel, { color: c.muted }]}>Toque para selecionar</Text>
                      <Text style={[styles.uploadHint, { color: c.hint }]}>Galeria ou câmera</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              <GoldButton
                label="Próximo"
                onPress={() => setStep('selfie')}
                disabled={!rgUrl || uploading}
                style={{ marginTop: 20 }}
              />
            </Panel>
          )}

          {/* Passo 2 — Selfie */}
          {step === 'selfie' && (
            <Panel style={styles.card}>
              <Text style={styles.stepLabel}>PASSO 2 DE 3</Text>
              <Text style={styles.stepTitle}>Selfie para verificação</Text>
              <Text style={styles.stepBody}>
                Tire uma selfie segurando o seu RG ao lado do rosto. Isso confirma que os documentos são seus.
              </Text>

              {selfieUrl ? (
                <View style={styles.docPreviewWrap}>
                  <Image source={{ uri: selfieUrl }} style={styles.docPreview} resizeMode="cover" />
                  <TouchableOpacity
                    style={[styles.retakeBtn, { borderColor: c.border }]}
                    onPress={() => handlePickDoc('selfie')}
                    disabled={uploading}
                  >
                    <FontAwesome name="refresh" size={13} color={c.muted} />
                    <Text style={[styles.retakeBtnText, { color: c.muted }]}>Tirar novamente</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.uploadArea, { borderColor: c.border }]}
                  onPress={() => handlePickDoc('selfie')}
                  disabled={uploading}
                  activeOpacity={0.7}
                >
                  {uploading ? (
                    <ActivityIndicator color={c.primary} />
                  ) : (
                    <>
                      <FontAwesome name="camera" size={36} color={c.primary} />
                      <Text style={[styles.uploadLabel, { color: c.muted }]}>Toque para abrir a câmera</Text>
                      <Text style={[styles.uploadHint, { color: c.hint }]}>Câmera frontal recomendada</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              <View style={styles.navRow}>
                <TouchableOpacity style={[styles.backStepBtn, { borderColor: c.border }]} onPress={() => setStep('rg')}>
                  <FontAwesome name="chevron-left" size={13} color={c.muted} />
                  <Text style={[styles.backStepText, { color: c.muted }]}>Voltar</Text>
                </TouchableOpacity>
                <GoldButton
                  label="Revisar"
                  onPress={() => setStep('review')}
                  disabled={!selfieUrl || uploading}
                  style={{ flex: 1 }}
                />
              </View>
            </Panel>
          )}

          {/* Passo 3 — Revisão */}
          {step === 'review' && (
            <Panel style={styles.card}>
              <Text style={styles.stepLabel}>PASSO 3 DE 3</Text>
              <Text style={styles.stepTitle}>Revisar e enviar</Text>
              <Text style={styles.stepBody}>
                Confirme as fotos antes de enviar. Após o envio, você receberá o resultado em até 48h.
              </Text>

              <View style={styles.reviewGrid}>
                <DocThumb label="Documento (RG)" uri={rgUrl!} onRetake={() => setStep('rg')} c={c} styles={styles} />
                <DocThumb label="Selfie" uri={selfieUrl!} onRetake={() => setStep('selfie')} c={c} styles={styles} />
              </View>

              <View style={[styles.notice, { backgroundColor: c.primary + '12', borderColor: c.primary + '40' }]}>
                <FontAwesome name="lock" size={12} color={c.primary} />
                <Text style={[styles.noticeText, { color: c.muted }]}>
                  Seus documentos são armazenados com segurança e usados apenas para verificação de identidade.
                </Text>
              </View>

              <View style={styles.navRow}>
                <TouchableOpacity style={[styles.backStepBtn, { borderColor: c.border }]} onPress={() => setStep('selfie')}>
                  <FontAwesome name="chevron-left" size={13} color={c.muted} />
                  <Text style={[styles.backStepText, { color: c.muted }]}>Voltar</Text>
                </TouchableOpacity>
                <GoldButton
                  label={submitting ? 'Enviando…' : 'Enviar documentos'}
                  onPress={handleSubmit}
                  disabled={submitting}
                  style={{ flex: 1 }}
                />
              </View>
              {submitting && <ActivityIndicator color={c.primary} style={{ marginTop: 12 }} />}
            </Panel>
          )}
        </ScrollView>
      </ScreenGradient>
    </KeyboardAvoidingView>
  );
}

function DocThumb({
  label, uri, onRetake, c, styles,
}: { label: string; uri: string; onRetake: () => void; c: Palette; styles: any }) {
  return (
    <View style={styles.thumbWrap}>
      <Image source={{ uri }} style={styles.thumb} resizeMode="cover" />
      <Text style={[styles.thumbLabel, { color: c.muted }]}>{label}</Text>
      <TouchableOpacity onPress={onRetake} hitSlop={8}>
        <Text style={[styles.thumbRetake, { color: c.primary }]}>Trocar</Text>
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    flex: { flex: 1 },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: GSpacing.screen,
      paddingTop: 16,
      paddingBottom: 12,
    },
    headerTitle: { fontSize: 13, letterSpacing: 3, fontWeight: '700', color: c.cream, fontFamily: brandFont },

    progressBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
      paddingHorizontal: 60,
    },
    progressDot: {
      width: 22, height: 22, borderRadius: 11,
      borderWidth: 1.5,
      alignItems: 'center', justifyContent: 'center',
    },
    progressLine: { flex: 1, height: 2, marginHorizontal: 6 },

    scroll: { paddingHorizontal: GSpacing.screen, paddingBottom: 32, paddingTop: 12 },

    card: { marginBottom: 16 },

    stepLabel: { fontSize: 10, color: c.primary, letterSpacing: 2, fontWeight: '700', marginBottom: 8 },
    stepTitle: { fontSize: 20, color: c.cream, fontWeight: '700', fontFamily: brandFont, marginBottom: 10 },
    stepBody: { fontSize: 14, color: c.muted, lineHeight: 22, marginBottom: 24 },

    uploadArea: {
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderRadius: GSpacing.radius,
      padding: 40,
      alignItems: 'center',
      gap: 10,
    },
    uploadLabel: { fontSize: 15, fontWeight: '600' },
    uploadHint: { fontSize: 13 },

    docPreviewWrap: { alignItems: 'center', gap: 10 },
    docPreview: {
      width: '100%',
      height: 200,
      borderRadius: GSpacing.radius,
      backgroundColor: c.border,
    },
    retakeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderRadius: 8,
      paddingVertical: 6,
      paddingHorizontal: 14,
    },
    retakeBtnText: { fontSize: 13 },

    navRow: { flexDirection: 'row', gap: 10, marginTop: 20, alignItems: 'center' },
    backStepBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
    backStepText: { fontSize: 13 },

    reviewGrid: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    thumbWrap: { flex: 1, alignItems: 'center', gap: 6 },
    thumb: { width: '100%', aspectRatio: 4 / 3, borderRadius: 10, backgroundColor: c.border },
    thumbLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
    thumbRetake: { fontSize: 12, fontWeight: '700' },

    notice: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      borderWidth: 1,
      borderRadius: 10,
      padding: 14,
      marginBottom: 4,
    },
    noticeText: { flex: 1, fontSize: 12, lineHeight: 18 },

    // Tela de sucesso
    sentContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: GSpacing.screen,
      gap: 20,
    },
    sentIcon: {
      width: 96, height: 96, borderRadius: 48,
      borderWidth: 2,
      alignItems: 'center', justifyContent: 'center',
    },
    sentTitle: { fontSize: 24, fontWeight: '700', fontFamily: brandFont, textAlign: 'center' },
    sentBody: { fontSize: 15, lineHeight: 24, textAlign: 'center' },
  });
