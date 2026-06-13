import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { GColors, GSpacing, brandFont } from '@/constants/gourmet-theme';
import { SPECIALTIES } from '@/constants/specialties';
import { searchChefs } from '@/services/chefService';
import type { ChefListing, ChefSearchFilters } from '@/types/database';

const PRICE_OPTIONS = [
  { label: 'Qualquer preço', value: null },
  { label: 'Até R$ 400', value: 400 },
  { label: 'Até R$ 550', value: 550 },
] as const;

const RATING_OPTIONS = [
  { label: 'Qualquer nota', value: null },
  { label: '4.5+', value: 4.5 },
  { label: '4.8+', value: 4.8 },
] as const;

export default function CatalogoScreen() {
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [specialty, setSpecialty] = useState<string | null>(null);
  const [maxDailyRate, setMaxDailyRate] = useState<number | null>(null);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  const [chefs, setChefs] = useState<ChefListing[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const filters: ChefSearchFilters = {
      query,
      specialty,
      maxDailyRate,
      minRating,
      onlyAvailable,
    };
    const data = await searchChefs(filters);
    setChefs(data);
    setLoading(false);
  }, [query, specialty, maxDailyRate, minRating, onlyAvailable]);

  useEffect(() => {
    const id = setTimeout(load, 300); // debounce simples para a busca por texto
    return () => clearTimeout(id);
  }, [load]);

  const renderChef = ({ item }: { item: ChefListing }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => router.push({ pathname: '/perfil', params: { id: item.id } })}
    >
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
        </View>
        <View style={styles.cardHeaderText}>
          <View style={styles.nameRow}>
            <Text style={styles.chefName} numberOfLines={1}>
              {item.name}
            </Text>
            {item.verificationStatus === 'aprovado' && (
              <FontAwesome name="check-circle" size={14} color={GColors.primary} />
            )}
          </View>
          <Text style={styles.headline} numberOfLines={1}>
            {item.headline}
          </Text>
          <Text style={styles.location}>
            {item.city}
            {item.state ? `, ${item.state}` : ''}
          </Text>
        </View>
      </View>

      <View style={styles.specialtyRow}>
        {item.specialties.slice(0, 3).map((s) => (
          <View key={s} style={styles.tag}>
            <Text style={styles.tagText}>{s}</Text>
          </View>
        ))}
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.ratingInfo}>
          <FontAwesome name="star" size={13} color={GColors.primary} />
          <Text style={styles.rating}>
            {item.ratingAvg.toFixed(1)}{' '}
            <Text style={styles.ratingCount}>({item.ratingCount})</Text>
          </Text>
          <View
            style={[
              styles.availabilityDot,
              { backgroundColor: item.isAvailable ? GColors.success : GColors.muted },
            ]}
          />
          <Text style={styles.availabilityText}>
            {item.isAvailable ? 'Disponível' : 'Indisponível'}
          </Text>
        </View>
        <Text style={styles.price}>
          R$ {item.dailyRate.toFixed(0)}
          <Text style={styles.priceUnit}> /diária</Text>
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.flex}>
      <StatusBar barStyle="light-content" backgroundColor={GColors.dark} />

      <FlatList
        data={chefs}
        keyExtractor={(item) => item.id}
        renderItem={renderChef}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <View style={styles.topAccent} />
            <Text style={styles.title}>Encontre seu Chef</Text>
            <Text style={styles.subtitle}>
              Profissionais da alta gastronomia para o seu evento.
            </Text>

            {/* Busca por texto */}
            <View style={styles.searchWrapper}>
              <FontAwesome name="search" size={16} color={GColors.muted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar por nome ou especialidade"
                placeholderTextColor={GColors.hint}
                value={query}
                onChangeText={setQuery}
                autoCapitalize="none"
              />
              {query.length > 0 && (
                <TouchableOpacity onPress={() => setQuery('')}>
                  <FontAwesome name="times-circle" size={16} color={GColors.muted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Filtro: especialidade */}
            <Text style={styles.filterLabel}>ESPECIALIDADE</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
            >
              <FilterChip
                label="Todas"
                active={specialty === null}
                onPress={() => setSpecialty(null)}
              />
              {SPECIALTIES.map((s) => (
                <FilterChip
                  key={s}
                  label={s}
                  active={specialty === s}
                  onPress={() => setSpecialty(specialty === s ? null : s)}
                />
              ))}
            </ScrollView>

            {/* Filtro: faixa de preço */}
            <Text style={styles.filterLabel}>FAIXA DE PREÇO</Text>
            <View style={styles.chipsRowWrap}>
              {PRICE_OPTIONS.map((opt) => (
                <FilterChip
                  key={opt.label}
                  label={opt.label}
                  active={maxDailyRate === opt.value}
                  onPress={() => setMaxDailyRate(opt.value)}
                />
              ))}
            </View>

            {/* Filtro: avaliação */}
            <Text style={styles.filterLabel}>AVALIAÇÃO</Text>
            <View style={styles.chipsRowWrap}>
              {RATING_OPTIONS.map((opt) => (
                <FilterChip
                  key={opt.label}
                  label={opt.label}
                  active={minRating === opt.value}
                  onPress={() => setMinRating(opt.value)}
                />
              ))}
            </View>

            {/* Filtro: disponibilidade */}
            <TouchableOpacity
              style={styles.availabilityToggle}
              onPress={() => setOnlyAvailable((v) => !v)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, onlyAvailable && styles.checkboxOn]}>
                {onlyAvailable && <FontAwesome name="check" size={11} color={GColors.dark} />}
              </View>
              <Text style={styles.availabilityToggleText}>Apenas disponíveis</Text>
            </TouchableOpacity>

            <Text style={styles.resultsCount}>
              {loading ? 'Buscando…' : `${chefs.length} profissional(is) encontrado(s)`}
            </Text>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={GColors.primary} style={{ marginTop: 40 }} />
          ) : (
            <Text style={styles.empty}>Nenhum chef encontrado com esses filtros.</Text>
          )
        }
      />
    </View>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: GColors.dark,
  },
  listContent: {
    paddingHorizontal: GSpacing.screen,
    paddingBottom: 32,
  },
  topAccent: {
    height: 4,
    backgroundColor: GColors.primary,
    marginHorizontal: -GSpacing.screen,
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: GColors.primary,
    fontFamily: brandFont,
  },
  subtitle: {
    fontSize: 14,
    color: GColors.muted,
    marginTop: 4,
    marginBottom: 20,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: GColors.card,
    borderWidth: 1,
    borderColor: GColors.border,
    borderRadius: GSpacing.radius,
    paddingHorizontal: 16,
    height: GSpacing.inputHeight,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: GColors.cream,
    height: '100%',
  },
  filterLabel: {
    fontSize: 10,
    color: GColors.primary,
    letterSpacing: 2,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 10,
  },
  chipsRow: {
    gap: 8,
    paddingRight: GSpacing.screen,
  },
  chipsRowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: GColors.border,
    backgroundColor: GColors.card,
  },
  chipActive: {
    backgroundColor: GColors.primary,
    borderColor: GColors.primary,
  },
  chipText: {
    fontSize: 13,
    color: GColors.muted,
    fontWeight: '600',
  },
  chipTextActive: {
    color: GColors.dark,
  },
  availabilityToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: GColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: GColors.primary,
    borderColor: GColors.primary,
  },
  availabilityToggleText: {
    fontSize: 14,
    color: GColors.cream,
  },
  resultsCount: {
    fontSize: 12,
    color: GColors.muted,
    marginTop: 22,
    marginBottom: 12,
  },
  // ---- Card ----
  card: {
    backgroundColor: GColors.card,
    borderWidth: 1,
    borderColor: GColors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: GColors.dark,
    borderWidth: 1,
    borderColor: GColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: GColors.primary,
    fontWeight: '700',
    fontSize: 16,
  },
  cardHeaderText: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chefName: {
    fontSize: 16,
    fontWeight: '700',
    color: GColors.cream,
    flexShrink: 1,
  },
  headline: {
    fontSize: 13,
    color: GColors.muted,
    marginTop: 2,
  },
  location: {
    fontSize: 12,
    color: GColors.hint,
    marginTop: 2,
  },
  specialtyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  tag: {
    backgroundColor: GColors.dark,
    borderWidth: 1,
    borderColor: GColors.border,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tagText: {
    fontSize: 11,
    color: GColors.primary,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  ratingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rating: {
    fontSize: 13,
    color: GColors.cream,
    fontWeight: '600',
  },
  ratingCount: {
    color: GColors.muted,
    fontWeight: '400',
  },
  availabilityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  availabilityText: {
    fontSize: 12,
    color: GColors.muted,
  },
  price: {
    fontSize: 15,
    fontWeight: '700',
    color: GColors.primary,
  },
  priceUnit: {
    fontSize: 11,
    fontWeight: '400',
    color: GColors.muted,
  },
  empty: {
    textAlign: 'center',
    color: GColors.muted,
    marginTop: 40,
    fontSize: 14,
  },
});
