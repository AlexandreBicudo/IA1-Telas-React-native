import { FontAwesome } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter, type Href } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { GSpacing, GShadow, brandFont, type Palette } from '@/constants/gourmet-theme';
import { AccentBar, ScreenGradient } from '@/components/ui-gourmet';
import { NotificationBell } from '@/components/NotificationBell';
import { useColors } from '@/components/theme-context';
import { searchChefs } from '@/services/chefService';
import { SPECIALTIES } from '@/constants/specialties';
import type { ChefListing } from '@/types/database';

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase();
}

// ─── Hero card de destaque ────────────────────────────────────────────────────

function HeroChef({ chef, c, styles, onPress }: {
  chef: ChefListing; c: Palette;
  styles: ReturnType<typeof makeStyles>; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.heroCard} activeOpacity={0.88} onPress={onPress}>
      {chef.avatarUrl ? (
        <Image source={{ uri: chef.avatarUrl }} style={styles.heroImg} resizeMode="cover" />
      ) : (
        <View style={[styles.heroImg, styles.heroPlaceholder]}>
          <Text style={[styles.heroInitials, { color: c.primary }]}>{getInitials(chef.name)}</Text>
        </View>
      )}
      <View style={styles.heroOverlay}>
        <View style={[styles.heroBadge, { backgroundColor: c.primary }]}>
          <FontAwesome name="star" size={10} color={c.onPrimary} />
          <Text style={[styles.heroBadgeText, { color: c.onPrimary }]}>DESTAQUE</Text>
        </View>
        <Text style={styles.heroName} numberOfLines={1}>{chef.name}</Text>
        <Text style={styles.heroHeadline} numberOfLines={1}>{chef.headline}</Text>
        <View style={styles.heroFooter}>
          <View style={styles.heroStat}>
            <FontAwesome name="star" size={12} color={c.primary} />
            <Text style={styles.heroStatText}>{chef.ratingAvg.toFixed(1)} ({chef.ratingCount})</Text>
          </View>
          <Text style={styles.heroRate}>R$ {chef.dailyRate.toFixed(0)}/dia</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Card de chef horizontal ─────────────────────────────────────────────────

function ChefCard({ chef, c, styles, onPress }: {
  chef: ChefListing; c: Palette;
  styles: ReturnType<typeof makeStyles>; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[styles.chefCard, GShadow]} activeOpacity={0.85} onPress={onPress}>
      {chef.avatarUrl ? (
        <Image source={{ uri: chef.avatarUrl }} style={styles.chefAvatar} resizeMode="cover" />
      ) : (
        <View style={[styles.chefAvatarFallback, { backgroundColor: c.primary + '22' }]}>
          <Text style={[styles.chefAvatarText, { color: c.primary }]}>{getInitials(chef.name)}</Text>
        </View>
      )}
      <View style={styles.chefInfo}>
        <Text style={styles.chefName} numberOfLines={1}>{chef.name}</Text>
        <Text style={styles.chefHeadline} numberOfLines={1}>{chef.headline}</Text>
        <View style={styles.chefMeta}>
          <FontAwesome name="star" size={11} color={c.primary} />
          <Text style={styles.chefRating}>{chef.ratingAvg.toFixed(1)}</Text>
          <Text style={styles.chefCity}>{chef.city}{chef.state ? `, ${chef.state}` : ''}</Text>
        </View>
      </View>
      <View style={styles.chefRight}>
        <Text style={styles.chefRate}>R$ {chef.dailyRate.toFixed(0)}</Text>
        <Text style={styles.chefRateLabel}>/dia</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Tela principal ───────────────────────────────────────────────────────────

export default function DestaquesScreen() {
  const router = useRouter();
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  const [chefs, setChefs] = useState<ChefListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSpecialty, setActiveSpecialty] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    searchChefs({ onlyAvailable: true }).then((data) => {
      setChefs(data);
      setLoading(false);
    });
  }, []);

  useFocusEffect(load);

  const goToChef = (chef: ChefListing) =>
    router.push({ pathname: '/chef/[id]', params: { id: chef.id } } as any as Href);

  const topChef = chefs[0] ?? null;
  const highlighted = chefs.slice(1, 4);
  const filtered = activeSpecialty
    ? chefs.filter((ch) => ch.specialties.includes(activeSpecialty))
    : chefs.slice(0, 8);

  const specsInUse = useMemo(() => {
    const set = new Set(chefs.flatMap((ch) => ch.specialties));
    return SPECIALTIES.filter((s) => set.has(s));
  }, [chefs]);

  return (
    <ScreenGradient>
      <AccentBar />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Cabeçalho */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Destaques</Text>
            <Text style={styles.subtitle}>Os melhores chefs disponíveis agora</Text>
          </View>
          <NotificationBell />
        </View>

        {loading ? (
          <View style={styles.loadingWrap}><ActivityIndicator color={c.primary} size="large" /></View>
        ) : chefs.length === 0 ? (
          <View style={styles.emptyWrap}>
            <FontAwesome name="cutlery" size={32} color={c.hint} />
            <Text style={styles.emptyText}>Nenhum chef disponível no momento.</Text>
          </View>
        ) : (
          <>
            {/* Chef em destaque */}
            {topChef && (
              <>
                <HeroChef chef={topChef} c={c} styles={styles} onPress={() => goToChef(topChef)} />
              </>
            )}

            {/* Top 3 secundários */}
            {highlighted.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Mais bem avaliados</Text>
                {highlighted.map((ch) => (
                  <ChefCard key={ch.id} chef={ch} c={c} styles={styles} onPress={() => goToChef(ch)} />
                ))}
              </>
            )}

            {/* Filtro por especialidade */}
            {specsInUse.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Por especialidade</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  style={{ marginBottom: 14 }} contentContainerStyle={styles.specRow}>
                  <TouchableOpacity
                    style={[styles.specChip, !activeSpecialty && styles.specChipActive]}
                    onPress={() => setActiveSpecialty(null)}
                  >
                    <Text style={[styles.specChipText, !activeSpecialty && { color: c.onPrimary }]}>Todos</Text>
                  </TouchableOpacity>
                  {specsInUse.map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[styles.specChip, activeSpecialty === s && styles.specChipActive]}
                      onPress={() => setActiveSpecialty(activeSpecialty === s ? null : s)}
                    >
                      <Text style={[styles.specChipText, activeSpecialty === s && { color: c.onPrimary }]}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {filtered.length === 0 ? (
                  <Text style={[styles.emptyText, { textAlign: 'left', marginBottom: 16 }]}>
                    Nenhum chef disponível nesta especialidade.
                  </Text>
                ) : (
                  filtered.map((ch) => (
                    <ChefCard key={ch.id} chef={ch} c={c} styles={styles} onPress={() => goToChef(ch)} />
                  ))
                )}
              </>
            )}

            {/* CTA para catálogo completo */}
            <TouchableOpacity style={styles.catalogoBtn} onPress={() => router.push('/catalogo' as any as Href)}>
              <FontAwesome name="search" size={14} color={c.primary} />
              <Text style={styles.catalogoBtnText}>Ver catálogo completo com filtros avançados</Text>
              <FontAwesome name="chevron-right" size={12} color={c.primary} />
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </ScreenGradient>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    scroll: { paddingHorizontal: GSpacing.screen, paddingBottom: 48, paddingTop: 20 },
    header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 },
    title: { fontSize: 26, fontWeight: '700', color: c.cream, fontFamily: brandFont },
    subtitle: { fontSize: 13, color: c.muted, marginTop: 4 },

    loadingWrap: { alignItems: 'center', marginTop: 80 },
    emptyWrap: { alignItems: 'center', gap: 14, marginTop: 80 },
    emptyText: { fontSize: 14, color: c.muted, textAlign: 'center' },

    // Hero card
    heroCard: { borderRadius: GSpacing.radius + 2, overflow: 'hidden', marginBottom: 20, height: 220, ...GShadow },
    heroImg: { width: '100%', height: '100%', position: 'absolute' },
    heroPlaceholder: { backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' },
    heroInitials: { fontSize: 56, fontWeight: '700', fontFamily: brandFont },
    heroOverlay: {
      position: 'absolute', bottom: 0, left: 0, right: 0,
      backgroundColor: 'rgba(10,10,10,0.72)',
      padding: 16,
    },
    heroBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3,
      alignSelf: 'flex-start', marginBottom: 8,
    },
    heroBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2 },
    heroName: { fontSize: 20, fontWeight: '700', color: '#fff', fontFamily: brandFont },
    heroHeadline: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
    heroFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
    heroStat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    heroStatText: { fontSize: 13, color: '#fff', fontWeight: '600' },
    heroRate: { fontSize: 15, fontWeight: '700', color: c.primary },

    // Section
    sectionTitle: { fontSize: 11, fontWeight: '700', color: c.primary, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 },

    // Chef card
    chefCard: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
      borderRadius: GSpacing.radius, padding: 14, marginBottom: 10,
    },
    chefAvatar: { width: 48, height: 48, borderRadius: 24 },
    chefAvatarFallback: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    chefAvatarText: { fontSize: 16, fontWeight: '700', fontFamily: brandFont },
    chefInfo: { flex: 1, minWidth: 0 },
    chefName: { fontSize: 15, fontWeight: '700', color: c.cream },
    chefHeadline: { fontSize: 12, color: c.muted, marginTop: 2 },
    chefMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
    chefRating: { fontSize: 12, fontWeight: '700', color: c.cream },
    chefCity: { fontSize: 12, color: c.hint },
    chefRight: { alignItems: 'flex-end' },
    chefRate: { fontSize: 17, fontWeight: '700', color: c.primary, fontFamily: brandFont },
    chefRateLabel: { fontSize: 11, color: c.muted },

    // Especialidades
    specRow: { gap: 8, paddingRight: 4 },
    specChip: {
      borderWidth: 1, borderColor: c.border, borderRadius: 20,
      paddingHorizontal: 14, paddingVertical: 8, backgroundColor: c.card,
    },
    specChipActive: { backgroundColor: c.primary, borderColor: c.primary },
    specChipText: { fontSize: 13, color: c.muted, fontWeight: '600' },

    // Link catálogo
    catalogoBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      borderWidth: 1, borderColor: c.primary + '60',
      borderRadius: GSpacing.radius, padding: 14, marginTop: 8,
    },
    catalogoBtnText: { flex: 1, fontSize: 14, color: c.primary, fontWeight: '600' },
  });
