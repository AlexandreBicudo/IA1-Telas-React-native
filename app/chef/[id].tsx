import { FontAwesome } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
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
import { AccentButton, ScreenGradient } from '@/components/ui-gourmet';
import { useColors } from '@/components/theme-context';
import { createBooking } from '@/services/bookingService';
import { getChefById } from '@/services/chefService';
import type { ChefListing, VerificationStatus } from '@/types/database';

export default function ChefDetailScreen() {
  const router = useRouter();
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const params = useLocalSearchParams<{ id: string }>();
  const chefId = typeof params.id === 'string' ? params.id : '';

  const [chef, setChef] = useState<ChefListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  const verification = (s: VerificationStatus) =>
    ({
      aprovado: { label: 'Perfil verificado', color: c.success, icon: 'check-circle' as const },
      pendente: { label: 'Validação pendente', color: c.warning, icon: 'clock-o' as const },
      rejeitado: { label: 'Validação rejeitada', color: c.danger, icon: 'times-circle' as const },
    })[s];

  useEffect(() => {
    let active = true;
    setLoading(true);
    getChefById(chefId).then((data) => {
      if (active) {
        setChef(data);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [chefId]);

  const handleAgendar = async () => {
    if (!chef) return;
    try {
      setBooking(true);
      const r = await createBooking({ chefId: chef.id, dailyRate: chef.dailyRate });
      Alert.alert(
        'Solicitação enviada!',
        r.mock ? 'Em modo demonstração, veja o pedido na aba Agenda.' : 'O chef receberá seu pedido. Acompanhe em Agenda.',
        [{ text: 'Ver agenda', onPress: () => router.push('/agenda' as Href) }, { text: 'OK' }],
      );
    } catch (e) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível agendar.');
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.flex, styles.center]}>
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }
  if (!chef) {
    return (
      <View style={[styles.flex, styles.center]}>
        <Text style={styles.empty}>Perfil não encontrado.</Text>
      </View>
    );
  }

  const v = verification(chef.verificationStatus);

  return (
    <ScreenGradient>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero com foto */}
        <View style={styles.hero}>
          {chef.avatarUrl ? (
            <Image source={{ uri: chef.avatarUrl }} style={styles.heroImg} resizeMode="cover" />
          ) : (
            <View style={[styles.heroImg, styles.heroPlaceholder]}>
              <Text style={styles.heroInitials}>{getInitials(chef.name)}</Text>
            </View>
          )}
          <TouchableOpacity style={styles.back} onPress={() => router.back()} hitSlop={12}>
            <FontAwesome name="chevron-left" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.body}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{chef.name}</Text>
            <View style={[styles.badge, { borderColor: v.color }]}>
              <FontAwesome name={v.icon} size={12} color={v.color} />
              <Text style={[styles.badgeText, { color: v.color }]}>{v.label}</Text>
            </View>
          </View>
          <Text style={styles.headline}>{chef.headline}</Text>
          <Text style={styles.location}>
            <FontAwesome name="map-marker" size={12} color={c.muted} /> {chef.city}
            {chef.state ? `, ${chef.state}` : ''}
          </Text>

          <View style={styles.statsRow}>
            <Stat styles={styles} c={c} value={chef.ratingAvg.toFixed(1)} label={`${chef.ratingCount} avaliações`} icon="star" />
            <View style={styles.statDivider} />
            <Stat styles={styles} c={c} value={`${chef.yearsExperience} anos`} label="experiência" icon="cutlery" />
            <View style={styles.statDivider} />
            <Stat styles={styles} c={c} value={`R$ ${chef.dailyRate.toFixed(0)}`} label="diária" icon="money" />
          </View>

          <Text style={styles.sectionTitle}>Especialidades</Text>
          <View style={styles.tagsWrap}>
            {chef.specialties.length > 0 ? (
              chef.specialties.map((s) => (
                <View key={s} style={styles.tag}>
                  <Text style={styles.tagText}>{s}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.muted}>Nenhuma especialidade cadastrada.</Text>
            )}
          </View>

          {chef.bio ? (
            <>
              <Text style={styles.sectionTitle}>Sobre</Text>
              <Text style={styles.bio}>{chef.bio}</Text>
            </>
          ) : null}

          <Text style={styles.sectionTitle}>Experiência em restaurantes</Text>
          {chef.experiences && chef.experiences.length > 0 ? (
            chef.experiences.map((exp) => (
              <View key={exp.id} style={styles.expItem}>
                <FontAwesome name="circle" size={8} color={c.primary} style={{ marginTop: 5 }} />
                <View style={styles.expText}>
                  <Text style={styles.expRole}>{exp.role} · {exp.restaurant_name}</Text>
                  <Text style={styles.expPeriod}>
                    {formatYear(exp.start_date)} — {exp.end_date ? formatYear(exp.end_date) : 'Atual'}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.muted}>Nenhuma experiência cadastrada ainda.</Text>
          )}

          <Text style={styles.sectionTitle}>Portfólio</Text>
          {chef.portfolio && chef.portfolio.length > 0 ? (
            <View style={styles.portfolioGrid}>
              {chef.portfolio.map((item) => (
                <View key={item.id} style={styles.portfolioItem}>
                  <View style={styles.portfolioThumb}>
                    {item.image_url ? (
                      <Image source={{ uri: item.image_url }} style={styles.portfolioImg} resizeMode="cover" />
                    ) : (
                      <FontAwesome name="image" size={22} color={c.hint} />
                    )}
                  </View>
                  <Text style={styles.portfolioTitle} numberOfLines={2}>{item.title}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.muted}>Nenhum item no portfólio ainda.</Text>
          )}

          <AccentButton label="AGENDAR SERVIÇO" icon="calendar-check-o" onPress={handleAgendar} loading={booking} style={styles.cta} />
        </View>
      </ScrollView>
    </ScreenGradient>
  );
}

function Stat({
  styles,
  c,
  value,
  label,
  icon,
}: {
  styles: ReturnType<typeof makeStyles>;
  c: Palette;
  value: string;
  label: string;
  icon: React.ComponentProps<typeof FontAwesome>['name'];
}) {
  return (
    <View style={styles.stat}>
      <FontAwesome name={icon} size={14} color={c.primary} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase();
}
function formatYear(date: string) {
  return new Date(date).getFullYear().toString();
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: c.dark },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    empty: { color: c.muted, fontSize: 14, textAlign: 'center' },
    scroll: { paddingBottom: 40 },
    hero: { height: 240, backgroundColor: c.surface },
    heroImg: { width: '100%', height: '100%' },
    heroPlaceholder: { alignItems: 'center', justifyContent: 'center' },
    heroInitials: { fontSize: 56, fontWeight: '700', color: c.primary, fontFamily: brandFont },
    back: {
      position: 'absolute',
      top: 16,
      left: 16,
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: 'rgba(0,0,0,0.45)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: { paddingHorizontal: GSpacing.screen, paddingTop: 20 },
    nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    name: { fontSize: 24, fontWeight: '700', color: c.cream, flexShrink: 1 },
    badge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4 },
    badgeText: { fontSize: 11, fontWeight: '600' },
    headline: { fontSize: 15, color: c.muted, marginTop: 6 },
    location: { fontSize: 12, color: c.muted, marginTop: 6 },
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: GSpacing.radius,
      paddingVertical: 16,
      marginTop: 20,
    },
    stat: { flex: 1, alignItems: 'center', gap: 4 },
    statValue: { fontSize: 16, fontWeight: '700', color: c.cream },
    statLabel: { fontSize: 11, color: c.muted },
    statDivider: { width: 1, height: 36, backgroundColor: c.border },
    sectionTitle: { fontSize: 11, color: c.primary, letterSpacing: 2, fontWeight: '600', textTransform: 'uppercase', marginTop: 26, marginBottom: 12 },
    tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    tag: { backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
    tagText: { fontSize: 13, color: c.primary },
    bio: { fontSize: 14, lineHeight: 22, color: c.cream },
    muted: { fontSize: 14, color: c.muted },
    expItem: { flexDirection: 'row', gap: 12, marginBottom: 14 },
    expText: { flex: 1 },
    expRole: { fontSize: 14, color: c.cream, fontWeight: '600' },
    expPeriod: { fontSize: 12, color: c.muted, marginTop: 2 },
    portfolioGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    portfolioItem: { width: '47%' },
    portfolioThumb: {
      height: 110,
      borderRadius: 10,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    portfolioImg: { width: '100%', height: '100%' },
    portfolioTitle: { fontSize: 13, color: c.cream, marginTop: 6 },
    cta: { marginTop: 30 },
  });
