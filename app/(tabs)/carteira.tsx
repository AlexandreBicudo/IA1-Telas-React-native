import { FontAwesome } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { GSpacing, GShadow, brandFont, type Palette } from '@/constants/gourmet-theme';
import { AccentBar, ScreenGradient } from '@/components/ui-gourmet';
import { useColors } from '@/components/theme-context';
import { getChefEarnings, type ChefEarningsSummary } from '@/services/bookingService';
import { getMyReceivedReviews, respondToReview, type Review } from '@/services/reviewService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtBRL(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtShort(n: number) {
  if (n >= 1000) return `R$ ${(n / 1000).toFixed(1).replace('.', ',')}k`;
  return `R$ ${n}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase();
}

function trendLabel(curr: number, prev: number) {
  if (prev === 0) return null;
  const pct = Math.round(((curr - prev) / prev) * 100);
  return { pct, up: pct >= 0 };
}

// ─── Gráfico de barras ────────────────────────────────────────────────────────

const BAR_HEIGHT = 120;

function BarChart({ data, c }: { data: { label: string; value: number }[]; c: Palette }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: BAR_HEIGHT + 28 }}>
      {data.map((d, i) => {
        const barH = Math.max((d.value / max) * BAR_HEIGHT, d.value > 0 ? 6 : 2);
        const isCurrent = i === data.length - 1;
        return (
          <View key={i} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
            {isCurrent && d.value > 0 && (
              <Text style={{ fontSize: 10, color: c.primary, fontWeight: '700' }}>
                {fmtShort(d.value)}
              </Text>
            )}
            <View style={{ flex: 1, justifyContent: 'flex-end' }}>
              <View
                style={{
                  width: '100%',
                  height: barH,
                  backgroundColor: isCurrent ? c.primary : c.primary + '40',
                  borderRadius: 5,
                }}
              />
            </View>
            <Text style={{ fontSize: 10, color: c.muted }}>{d.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── Tela principal ───────────────────────────────────────────────────────────

export default function CarteiraScreen() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  const [data, setData] = useState<ChefEarningsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [notChef, setNotChef] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [sendingReply, setSendingReply] = useState<string | null>(null);
  const [showReplyFor, setShowReplyFor] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([getChefEarnings(), getMyReceivedReviews()]).then(([d, rv]) => {
      if (d === null) setNotChef(true);
      else setData(d);
      setReviews(rv);
      setLoading(false);
    });
  }, []);

  const handleSendReply = async (reviewId: string) => {
    const text = replyText[reviewId]?.trim();
    if (!text) return;
    try {
      setSendingReply(reviewId);
      await respondToReview(reviewId, text);
      setReviews((prev) =>
        prev.map((r) => r.id === reviewId ? { ...r, chefResponse: text, chefResponseAt: new Date().toISOString() } : r)
      );
      setReplyText((prev) => ({ ...prev, [reviewId]: '' }));
      setShowReplyFor(null);
    } catch {
      Alert.alert('Erro', 'Não foi possível enviar a resposta.');
    } finally {
      setSendingReply(null);
    }
  };

  useFocusEffect(load);

  const now = new Date();
  const monthName = now.toLocaleDateString('pt-BR', { month: 'long' });
  const trend = data ? trendLabel(data.totalThisMonth, data.totalLastMonth) : null;

  return (
    <ScreenGradient>
      <AccentBar />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Carteira</Text>
        <Text style={styles.subtitle}>Seus ganhos e histórico financeiro.</Text>

        {loading ? (
          <View style={styles.loadingWrap}>
            <Text style={styles.loadingText}>Carregando dados...</Text>
          </View>
        ) : notChef ? (
          <NotChefEmpty c={c} styles={styles} />
        ) : data ? (
          <>
            {/* ── Card principal de ganhos ── */}
            <View style={[styles.heroCard, GShadow]}>
              <View style={styles.heroStrip} />
              <View style={styles.heroBody}>
                <Text style={styles.heroLabel}>GANHOS EM {monthName.toUpperCase()}</Text>
                <Text style={styles.heroValue}>R$ {fmtBRL(data.totalThisMonth)}</Text>

                {trend && (
                  <View style={styles.trendRow}>
                    <FontAwesome
                      name={trend.up ? 'arrow-up' : 'arrow-down'}
                      size={11}
                      color={trend.up ? c.success : c.danger}
                    />
                    <Text style={[styles.trendText, { color: trend.up ? c.success : c.danger }]}>
                      {Math.abs(trend.pct)}% vs mês anterior
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* ── 3 pills de estatísticas ── */}
            <View style={styles.statsRow}>
              <StatPill
                icon="briefcase"
                label="Trabalhos"
                value={String(data.completedJobs)}
                c={c} styles={styles}
              />
              <StatPill
                icon="star"
                label="Avaliação"
                value={data.avgRating > 0 ? data.avgRating.toFixed(1) : '—'}
                c={c} styles={styles}
              />
              <StatPill
                icon="clock-o"
                label="Em aberto"
                value={String(data.pendingJobs)}
                accent={data.pendingJobs > 0 ? c.warning : undefined}
                c={c} styles={styles}
              />
            </View>

            {/* ── Gráfico de barras ── */}
            <View style={[styles.section, GShadow]}>
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>ÚLTIMOS 6 MESES</Text>
              </View>
              <BarChart data={data.monthlyData} c={c} />
            </View>

            {/* ── Trabalhos recentes ── */}
            {data.recentJobs.length > 0 && (
              <View style={[styles.section, GShadow]}>
                <View style={styles.sectionHead}>
                  <Text style={styles.sectionTitle}>TRABALHOS RECENTES</Text>
                </View>
                {data.recentJobs.map((job, i) => (
                  <View key={job.id} style={[styles.jobRow, i > 0 && styles.jobRowBorder]}>
                    {job.avatarUrl ? (
                      <Image source={{ uri: job.avatarUrl }} style={styles.jobAvatar} />
                    ) : (
                      <View style={[styles.jobAvatarFallback, { backgroundColor: c.primary + '22' }]}>
                        <Text style={[styles.jobAvatarText, { color: c.primary }]}>
                          {getInitials(job.clientName)}
                        </Text>
                      </View>
                    )}
                    <View style={styles.jobInfo}>
                      <Text style={styles.jobName}>{job.clientName}</Text>
                      <Text style={styles.jobDate}>{formatDate(job.date)}</Text>
                    </View>
                    <View style={styles.jobAmountWrap}>
                      <Text style={styles.jobAmount}>+ R$ {fmtBRL(job.amount)}</Text>
                      <View style={styles.jobStatusDot} />
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* ── Resumo total ── */}
            <View style={[styles.totalCard, GShadow]}>
              <FontAwesome name="trophy" size={16} color={c.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.totalLabel}>Total acumulado</Text>
                <Text style={styles.totalValue}>
                  R$ {fmtBRL(data.recentJobs.reduce((s, j) => s + j.amount, 0))}
                </Text>
              </View>
              <Text style={styles.totalJobs}>{data.completedJobs} serviços</Text>
            </View>

            {/* ── Avaliações recebidas ── */}
            <View style={[styles.section, GShadow]}>
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>AVALIAÇÕES RECEBIDAS</Text>
              </View>
              {reviews.length === 0 ? (
                <Text style={styles.reviewEmpty}>Nenhuma avaliação ainda.</Text>
              ) : (
                reviews.map((r) => (
                  <View key={r.id} style={styles.reviewCard}>
                    <View style={styles.reviewHeader}>
                      <View style={styles.reviewAvatar}>
                        <Text style={styles.reviewAvatarText}>{getInitials(r.reviewerName)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.reviewerName}>{r.reviewerName}</Text>
                        <Text style={styles.reviewDate}>
                          {new Date(r.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </Text>
                      </View>
                      <StarRow rating={r.rating} c={c} />
                    </View>
                    {r.comment ? (
                      <Text style={styles.reviewComment}>"{r.comment}"</Text>
                    ) : null}

                    {/* Resposta existente */}
                    {r.chefResponse ? (
                      <View style={styles.responseBox}>
                        <View style={styles.responseHeader}>
                          <FontAwesome name="cutlery" size={11} color={c.primary} />
                          <Text style={styles.responseLabel}>Sua resposta</Text>
                        </View>
                        <Text style={styles.responseText}>{r.chefResponse}</Text>
                        <TouchableOpacity onPress={() => setShowReplyFor(showReplyFor === r.id ? null : r.id)} style={styles.editResponseBtn}>
                          <Text style={styles.editResponseText}>Editar resposta</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity style={styles.replyBtn} onPress={() => setShowReplyFor(showReplyFor === r.id ? null : r.id)}>
                        <FontAwesome name="reply" size={11} color={c.primary} />
                        <Text style={styles.replyBtnText}>Responder avaliação</Text>
                      </TouchableOpacity>
                    )}

                    {/* Input de resposta */}
                    {showReplyFor === r.id && (
                      <View style={styles.replyInputWrap}>
                        <TextInput
                          style={styles.replyInput}
                          placeholder="Escreva sua resposta..."
                          placeholderTextColor={c.hint}
                          value={replyText[r.id] ?? (r.chefResponse ?? '')}
                          onChangeText={(t) => setReplyText((prev) => ({ ...prev, [r.id]: t }))}
                          multiline
                          textAlignVertical="top"
                        />
                        <TouchableOpacity
                          style={[styles.replySendBtn, sendingReply === r.id && { opacity: 0.6 }]}
                          onPress={() => handleSendReply(r.id)}
                          disabled={sendingReply === r.id}
                        >
                          {sendingReply === r.id
                            ? <ActivityIndicator size="small" color="#fff" />
                            : <><FontAwesome name="send" size={13} color="#fff" /><Text style={styles.replySendText}>Enviar</Text></>}
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))
              )}
            </View>
          </>
        ) : null}
      </ScrollView>
    </ScreenGradient>
  );
}

// ─── Componentes auxiliares ───────────────────────────────────────────────────

function StatPill({
  icon, label, value, accent, c, styles,
}: {
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  label: string;
  value: string;
  accent?: string;
  c: Palette;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.statPill}>
      <FontAwesome name={icon} size={14} color={accent ?? c.primary} />
      <Text style={[styles.statValue, accent ? { color: accent } : {}]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function StarRow({ rating, c }: { rating: number; c: Palette }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <FontAwesome key={i} name={i <= rating ? 'star' : 'star-o'} size={13}
          color={i <= rating ? c.primary : c.hint} />
      ))}
    </View>
  );
}

function NotChefEmpty({ c, styles }: { c: Palette; styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIcon}>
        <FontAwesome name="dollar" size={28} color={c.hint} />
      </View>
      <Text style={styles.emptyTitle}>Área exclusiva para chefs</Text>
      <Text style={styles.emptySub}>
        Ative seu perfil como chef para acompanhar seus ganhos, histórico e estatísticas.
      </Text>
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    scroll: { paddingHorizontal: GSpacing.screen, paddingBottom: 48, paddingTop: 20 },

    title: { fontSize: 26, fontWeight: '700', color: c.cream, fontFamily: brandFont },
    subtitle: { fontSize: 13, color: c.muted, marginTop: 4, marginBottom: 20 },

    loadingWrap: { alignItems: 'center', marginTop: 60 },
    loadingText: { color: c.muted, fontSize: 14 },

    // Hero card
    heroCard: {
      flexDirection: 'row',
      backgroundColor: c.surface,
      borderRadius: GSpacing.radius,
      borderWidth: 1,
      borderColor: c.border,
      marginBottom: 14,
      overflow: 'hidden',
    },
    heroStrip: { width: 5, backgroundColor: c.primary },
    heroBody: { flex: 1, padding: 20 },
    heroLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, color: c.muted, marginBottom: 6 },
    heroValue: { fontSize: 34, fontWeight: '700', color: c.primary, fontFamily: brandFont },
    trendRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
    trendText: { fontSize: 12, fontWeight: '600' },

    // Stats
    statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
    statPill: {
      flex: 1, alignItems: 'center', gap: 4,
      backgroundColor: c.surface, borderRadius: GSpacing.radius,
      borderWidth: 1, borderColor: c.border,
      paddingVertical: 14,
    },
    statValue: { fontSize: 20, fontWeight: '700', color: c.cream, fontFamily: brandFont },
    statLabel: { fontSize: 11, color: c.muted, fontWeight: '600' },

    // Section card
    section: {
      backgroundColor: c.surface,
      borderRadius: GSpacing.radius,
      borderWidth: 1,
      borderColor: c.border,
      padding: 16,
      marginBottom: 14,
    },
    sectionHead: { marginBottom: 14 },
    sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, color: c.muted },

    // Job rows
    jobRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
    jobRowBorder: { borderTopWidth: 1, borderTopColor: c.border },
    jobAvatar: { width: 40, height: 40, borderRadius: 20 },
    jobAvatarFallback: {
      width: 40, height: 40, borderRadius: 20,
      alignItems: 'center', justifyContent: 'center',
    },
    jobAvatarText: { fontSize: 14, fontWeight: '700', fontFamily: brandFont },
    jobInfo: { flex: 1 },
    jobName: { fontSize: 14, fontWeight: '600', color: c.cream },
    jobDate: { fontSize: 12, color: c.muted, marginTop: 2 },
    jobAmountWrap: { alignItems: 'flex-end', gap: 4 },
    jobAmount: { fontSize: 15, fontWeight: '700', color: c.success },
    jobStatusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.success },

    // Total card
    totalCard: {
      flexDirection: 'row', alignItems: 'center', gap: 14,
      backgroundColor: c.primary + '15',
      borderRadius: GSpacing.radius,
      borderWidth: 1,
      borderColor: c.primary + '40',
      padding: 16,
      marginBottom: 8,
    },
    totalLabel: { fontSize: 11, fontWeight: '600', color: c.muted, letterSpacing: 1 },
    totalValue: { fontSize: 22, fontWeight: '700', color: c.primary, fontFamily: brandFont, marginTop: 2 },
    totalJobs: { fontSize: 13, color: c.muted, fontWeight: '600' },

    // Avaliações na carteira
    reviewCard: {
      backgroundColor: c.dark,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
    },
    reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    reviewAvatar: {
      width: 34, height: 34, borderRadius: 17,
      backgroundColor: c.primary + '22', alignItems: 'center', justifyContent: 'center',
    },
    reviewAvatarText: { fontSize: 12, fontWeight: '700', color: c.primary, fontFamily: brandFont },
    reviewerName: { fontSize: 13, fontWeight: '700', color: c.cream },
    reviewDate: { fontSize: 11, color: c.muted, marginTop: 1 },
    reviewComment: { fontSize: 13, color: c.cream, lineHeight: 19, fontStyle: 'italic', marginBottom: 8 },
    reviewEmpty: { fontSize: 13, color: c.muted, textAlign: 'center', paddingVertical: 8 },

    responseBox: {
      backgroundColor: c.primary + '10', borderLeftWidth: 3, borderLeftColor: c.primary + '60',
      borderRadius: 8, padding: 10, marginTop: 4,
    },
    responseHeader: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
    responseLabel: { fontSize: 11, fontWeight: '700', color: c.primary, letterSpacing: 0.5 },
    responseText: { fontSize: 13, color: c.muted, lineHeight: 19, fontStyle: 'italic' },
    editResponseBtn: { marginTop: 6 },
    editResponseText: { fontSize: 12, color: c.primary, fontWeight: '600' },

    replyBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 6,
    },
    replyBtnText: { fontSize: 12, color: c.primary, fontWeight: '600' },
    replyInputWrap: { marginTop: 10, gap: 8 },
    replyInput: {
      backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: c.cream,
      minHeight: 76,
    },
    replySendBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      backgroundColor: c.primary, borderRadius: 9, paddingVertical: 10,
    },
    replySendText: { fontSize: 14, fontWeight: '700', color: '#fff' },

    // Empty
    emptyWrap: { alignItems: 'center', marginTop: 60, gap: 14, paddingHorizontal: 12 },
    emptyIcon: {
      width: 64, height: 64, borderRadius: 32, backgroundColor: c.card,
      alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.border,
    },
    emptyTitle: { fontSize: 17, fontWeight: '700', color: c.cream, textAlign: 'center' },
    emptySub: { fontSize: 13, color: c.muted, textAlign: 'center', lineHeight: 20 },
  });
