import { FontAwesome } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { GSpacing, brandFont, type Palette } from '@/constants/gourmet-theme';
import { AccentBar, Panel, ScreenGradient } from '@/components/ui-gourmet';
import { SkeletonChefCard } from '@/components/skeleton';
import { useColors, useTheme } from '@/components/theme-context';
import { SPECIALTIES } from '@/constants/specialties';
import { searchChefs } from '@/services/chefService';
import type { ChefListing, ChefSearchFilters } from '@/types/database';

const MAX_PRICE = 1000;

export default function CatalogoScreen() {
  const router = useRouter();
  const c = useColors();
  const { mode } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  const [query, setQuery] = useState('');
  const [specialty, setSpecialty] = useState<string | null>(null);
  const [maxPrice, setMaxPrice] = useState(MAX_PRICE);
  const [minRating, setMinRating] = useState(0);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [chefs, setChefs] = useState<ChefListing[]>([]);
  const [loading, setLoading] = useState(true);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (specialty) n++;
    if (maxPrice < MAX_PRICE) n++;
    if (minRating > 0) n++;
    if (onlyAvailable) n++;
    if (onlyVerified) n++;
    return n;
  }, [specialty, maxPrice, minRating, onlyAvailable, onlyVerified]);

  const load = useCallback(async () => {
    setLoading(true);
    const filters: ChefSearchFilters = {
      query,
      specialty,
      maxDailyRate: maxPrice < MAX_PRICE ? maxPrice : null,
      minRating: minRating > 0 ? minRating : null,
      onlyAvailable,
      onlyVerified,
    };
    setChefs(await searchChefs(filters));
    setLoading(false);
  }, [query, specialty, maxPrice, minRating, onlyAvailable, onlyVerified]);

  useEffect(() => {
    const id = setTimeout(load, 300);
    return () => clearTimeout(id);
  }, [load]);

  // Recarrega ao voltar para a aba (ex: após criar/editar perfil)
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const clearFilters = () => {
    setSpecialty(null);
    setMaxPrice(MAX_PRICE);
    setMinRating(0);
    setOnlyAvailable(false);
    setOnlyVerified(false);
  };

  const renderChef = ({ item }: { item: ChefListing }) => {
    const cover = item.portfolio?.[0]?.image_url || item.avatarUrl;
    return (
    <TouchableOpacity style={styles.cardWrap} activeOpacity={0.9} onPress={() => router.push(`/chef/${item.id}` as Href)}>
      <Panel style={styles.card}>
        <View style={styles.cardImage}>
          {cover ? (
            <Image source={{ uri: cover }} style={styles.cardImageFill} resizeMode="cover" />
          ) : (
            <View style={[styles.cardImageFill, styles.cardImagePlaceholder]}>
              <Text style={styles.cardInitials}>{getInitials(item.name)}</Text>
            </View>
          )}
          <View style={[styles.pill, styles.pillLeft]}>
            <View style={[styles.dot, { backgroundColor: item.isAvailable ? c.success : c.muted }]} />
            <Text style={styles.pillText}>{item.isAvailable ? 'Disponível' : 'Ocupado'}</Text>
          </View>
          <View style={[styles.pill, styles.pillRight]}>
            <FontAwesome name="star" size={11} color={c.primary} />
            <Text style={styles.pillText}>{item.ratingAvg.toFixed(1)}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.nameRow}>
            <Text style={styles.chefName} numberOfLines={1}>
              {item.name}{' '}
              {item.verificationStatus === 'aprovado' && (
                <FontAwesome name="check-circle" size={13} color={c.primary} />
              )}
            </Text>
            <Text style={styles.price}>
              R$ {item.dailyRate.toFixed(0)}
              <Text style={styles.priceUnit}> /diária</Text>
            </Text>
          </View>
          <Text style={styles.headline} numberOfLines={1}>{item.headline}</Text>
          <Text style={styles.location}>
            <FontAwesome name="map-marker" size={11} color={c.hint} /> {item.city}
            {item.state ? `, ${item.state}` : ''}
          </Text>
          <View style={styles.specialtyRow}>
            {item.specialties.slice(0, 3).map((s) => (
              <View key={s} style={styles.tag}>
                <Text style={styles.tagText}>{s}</Text>
              </View>
            ))}
          </View>
        </View>
      </Panel>
    </TouchableOpacity>
    );
  };

  return (
    <ScreenGradient>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} />
      <FlatList
        data={chefs}
        keyExtractor={(item) => item.id}
        renderItem={renderChef}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <AccentBar style={styles.topAccent} />
            <View style={styles.brandRow}>
              <Image source={require('../../assets/images/chef_logo_mark.png')} style={styles.logo} resizeMode="contain" />
              <View>
                <Text style={styles.brandName}>SeuChefe</Text>
                <Text style={styles.brandTag}>GOURMET</Text>
              </View>
            </View>

            <Text style={styles.title}>Encontre seu Chef</Text>
            <Text style={styles.subtitle}>Profissionais da alta gastronomia para o seu evento.</Text>

            <View style={styles.searchWrapper}>
              <FontAwesome name="search" size={16} color={c.muted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar por nome ou especialidade"
                placeholderTextColor={c.hint}
                value={query}
                onChangeText={setQuery}
                autoCapitalize="none"
              />
              {query.length > 0 && (
                <TouchableOpacity onPress={() => setQuery('')}>
                  <FontAwesome name="times-circle" size={16} color={c.muted} />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.filterBar}>
              <TouchableOpacity style={styles.filterToggle} onPress={() => setShowFilters((v) => !v)} activeOpacity={0.8}>
                <FontAwesome name="sliders" size={15} color={c.primary} />
                <Text style={styles.filterToggleText}>Filtros</Text>
                {activeFilterCount > 0 && (
                  <View style={styles.filterBadge}>
                    <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                  </View>
                )}
                <FontAwesome name={showFilters ? 'chevron-up' : 'chevron-down'} size={11} color={c.muted} />
              </TouchableOpacity>
              {activeFilterCount > 0 && (
                <TouchableOpacity onPress={clearFilters}>
                  <Text style={styles.clearText}>Limpar</Text>
                </TouchableOpacity>
              )}
            </View>

            {showFilters && (
              <View style={styles.filterPanel}>
                <Text style={styles.filterLabel}>ESPECIALIDADE</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                  <Chip styles={styles} c={c} label="Todas" active={specialty === null} onPress={() => setSpecialty(null)} />
                  {SPECIALTIES.map((s) => (
                    <Chip key={s} styles={styles} c={c} label={s} active={specialty === s} onPress={() => setSpecialty(specialty === s ? null : s)} />
                  ))}
                </ScrollView>

                <View style={styles.sliderHeader}>
                  <Text style={styles.filterLabel}>FAIXA DE PREÇO (DIÁRIA)</Text>
                  <Text style={styles.sliderValue}>{maxPrice >= MAX_PRICE ? 'Qualquer' : `Até R$ ${maxPrice}`}</Text>
                </View>
                <Slider style={styles.slider} minimumValue={200} maximumValue={MAX_PRICE} step={20} value={maxPrice} onValueChange={setMaxPrice} minimumTrackTintColor={c.primary} maximumTrackTintColor={c.border} thumbTintColor={c.primary} />

                <View style={styles.sliderHeader}>
                  <Text style={styles.filterLabel}>AVALIAÇÃO MÍNIMA</Text>
                  <Text style={styles.sliderValue}>{minRating === 0 ? 'Qualquer' : `${minRating.toFixed(1)} ★`}</Text>
                </View>
                <Slider style={styles.slider} minimumValue={0} maximumValue={5} step={0.5} value={minRating} onValueChange={setMinRating} minimumTrackTintColor={c.primary} maximumTrackTintColor={c.border} thumbTintColor={c.primary} />

                <TouchableOpacity style={styles.availabilityToggle} onPress={() => setOnlyAvailable((v) => !v)} activeOpacity={0.8}>
                  <View style={[styles.checkbox, onlyAvailable && styles.checkboxOn]}>
                    {onlyAvailable && <FontAwesome name="check" size={11} color={c.onPrimary} />}
                  </View>
                  <Text style={styles.availabilityToggleText}>Apenas chefs disponíveis</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.availabilityToggle} onPress={() => setOnlyVerified((v) => !v)} activeOpacity={0.8}>
                  <View style={[styles.checkbox, onlyVerified && styles.checkboxOn]}>
                    {onlyVerified && <FontAwesome name="check" size={11} color={c.onPrimary} />}
                  </View>
                  <FontAwesome name="check-circle" size={13} color={onlyVerified ? c.primary : c.hint} />
                  <Text style={styles.availabilityToggleText}>Apenas chefs verificados</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={styles.resultsCount}>
              {loading ? 'Buscando…' : `${chefs.length} profissional(is) encontrado(s)`}
            </Text>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={{ paddingHorizontal: GSpacing.screen }}>
              {[1, 2, 3].map((n) => <SkeletonChefCard key={n} />)}
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <FontAwesome name="cutlery" size={32} color={c.hint} />
              <Text style={styles.empty}>Nenhum chef encontrado com esses filtros.</Text>
            </View>
          )
        }
      />
    </ScreenGradient>
  );
}

function Chip({
  styles,
  c,
  label,
  active,
  onPress,
}: {
  styles: ReturnType<typeof makeStyles>;
  c: Palette;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress} activeOpacity={0.8}>
      <Text style={[styles.chipText, active && { color: c.onPrimary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase();
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    listContent: { paddingHorizontal: GSpacing.screen, paddingBottom: 32 },
    topAccent: { marginHorizontal: -GSpacing.screen, marginBottom: 20 },
    brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
    logo: { width: 44, height: 44 },
    brandName: { fontSize: 20, fontWeight: '700', color: c.primary, fontFamily: brandFont },
    brandTag: { fontSize: 9, color: c.cream, letterSpacing: 3 },
    title: { fontSize: 26, fontWeight: '700', color: c.cream },
    subtitle: { fontSize: 14, color: c.muted, marginTop: 4, marginBottom: 18 },
    searchWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: GSpacing.radius,
      paddingHorizontal: 16,
      height: GSpacing.inputHeight,
    },
    searchInput: { flex: 1, fontSize: 15, color: c.cream, height: '100%' },
    filterBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
    filterToggle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    filterToggleText: { fontSize: 14, color: c.cream, fontWeight: '600' },
    filterBadge: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
    filterBadgeText: { fontSize: 11, fontWeight: '700', color: c.onPrimary },
    clearText: { fontSize: 13, color: c.muted, textDecorationLine: 'underline' },
    filterPanel: { backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: GSpacing.radius, padding: 16, marginTop: 12 },
    filterLabel: { fontSize: 10, color: c.primary, letterSpacing: 2, fontWeight: '600', marginBottom: 10 },
    chipsRow: { gap: 8, paddingRight: 8 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface },
    chipActive: { backgroundColor: c.primary, borderColor: c.primary },
    chipText: { fontSize: 13, color: c.muted, fontWeight: '600' },
    sliderHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18 },
    sliderValue: { fontSize: 13, color: c.cream, fontWeight: '600' },
    slider: { width: '100%', height: 36 },
    availabilityToggle: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
    checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' },
    checkboxOn: { backgroundColor: c.primary, borderColor: c.primary },
    availabilityToggleText: { fontSize: 14, color: c.cream },
    resultsCount: { fontSize: 12, color: c.muted, marginTop: 20, marginBottom: 12 },
    // Card image-led
    cardWrap: { marginBottom: 16 },
    card: { overflow: 'hidden' },
    cardImage: { height: 150, backgroundColor: c.surface },
    cardImageFill: { width: '100%', height: '100%' },
    cardImagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
    cardInitials: { fontSize: 34, fontWeight: '700', color: c.primary, fontFamily: brandFont },
    pill: {
      position: 'absolute',
      top: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: 'rgba(0,0,0,0.55)',
      borderRadius: 20,
      paddingHorizontal: 9,
      paddingVertical: 4,
    },
    pillLeft: { left: 10 },
    pillRight: { right: 10 },
    dot: { width: 7, height: 7, borderRadius: 4 },
    pillText: { fontSize: 11, fontWeight: '600', color: '#FFFFFF' },
    cardBody: { padding: 14 },
    nameRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
    chefName: { fontSize: 16, fontWeight: '700', color: c.cream, flex: 1 },
    price: { fontSize: 15, fontWeight: '700', color: c.primary, marginLeft: 8 },
    priceUnit: { fontSize: 11, fontWeight: '400', color: c.muted },
    headline: { fontSize: 13, color: c.muted, marginTop: 3 },
    location: { fontSize: 12, color: c.hint, marginTop: 3 },
    specialtyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
    tag: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
    tagText: { fontSize: 11, color: c.primary },
    emptyWrap: { alignItems: 'center', marginTop: 50, gap: 12 },
    empty: { textAlign: 'center', color: c.muted, fontSize: 14 },
  });
