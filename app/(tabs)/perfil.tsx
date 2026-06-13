import { FontAwesome } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { GColors, GSpacing, brandFont } from '@/constants/gourmet-theme';
import { authErrorMessage, signOut } from '@/services/authService';
import { getChefById, getMyChefProfile } from '@/services/chefService';
import type { ChefListing, VerificationStatus } from '@/types/database';

const VERIFICATION_UI: Record<
  VerificationStatus,
  { label: string; color: string; icon: React.ComponentProps<typeof FontAwesome>['name'] }
> = {
  aprovado: { label: 'Perfil verificado', color: GColors.success, icon: 'check-circle' },
  pendente: { label: 'Validação pendente', color: GColors.warning, icon: 'clock-o' },
  rejeitado: { label: 'Validação rejeitada', color: GColors.danger, icon: 'times-circle' },
};

export default function PerfilScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const chefId = typeof params.id === 'string' ? params.id : undefined;
  // Sem id => perfil do próprio profissional (editável). Com id => visão pública.
  const isOwnProfile = !chefId;

  const handleLogout = async () => {
    try {
      await signOut();
      router.replace('/');
    } catch (error) {
      Alert.alert('Erro ao sair', authErrorMessage(error));
    }
  };

  const [chef, setChef] = useState<ChefListing | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    (chefId ? getChefById(chefId) : getMyChefProfile()).then((data) => {
      if (active) {
        setChef(data);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [chefId]);

  if (loading) {
    return (
      <View style={[styles.flex, styles.center]}>
        <StatusBar barStyle="light-content" backgroundColor={GColors.dark} />
        <ActivityIndicator color={GColors.primary} />
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

  const verification = VERIFICATION_UI[chef.verificationStatus];

  return (
    <View style={styles.flex}>
      <StatusBar barStyle="light-content" backgroundColor={GColors.dark} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.topAccent} />

        {/* Cabeçalho do perfil */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(chef.name)}</Text>
          </View>
          <Text style={styles.name}>{chef.name}</Text>
          <Text style={styles.headline}>{chef.headline}</Text>
          <Text style={styles.location}>
            <FontAwesome name="map-marker" size={12} color={GColors.muted} /> {chef.city}
            {chef.state ? `, ${chef.state}` : ''}
          </Text>

          {/* Selo de validação de perfil */}
          <View style={[styles.badge, { borderColor: verification.color }]}>
            <FontAwesome name={verification.icon} size={13} color={verification.color} />
            <Text style={[styles.badgeText, { color: verification.color }]}>
              {verification.label}
            </Text>
          </View>
        </View>

        {/* Métricas */}
        <View style={styles.statsRow}>
          <Stat
            value={chef.ratingAvg.toFixed(1)}
            label={`${chef.ratingCount} avaliações`}
            icon="star"
          />
          <View style={styles.statDivider} />
          <Stat value={`${chef.yearsExperience} anos`} label="experiência" icon="cutlery" />
          <View style={styles.statDivider} />
          <Stat value={`R$ ${chef.dailyRate.toFixed(0)}`} label="diária" icon="money" />
        </View>

        {/* Especialidades */}
        <Section title="Especialidades">
          <View style={styles.tagsWrap}>
            {chef.specialties.map((s) => (
              <View key={s} style={styles.tag}>
                <Text style={styles.tagText}>{s}</Text>
              </View>
            ))}
          </View>
        </Section>

        {/* Sobre */}
        {chef.bio ? (
          <Section title="Sobre">
            <Text style={styles.bio}>{chef.bio}</Text>
          </Section>
        ) : null}

        {/* Experiência profissional (validação de credibilidade) */}
        <Section title="Experiência em restaurantes">
          {chef.experiences && chef.experiences.length > 0 ? (
            chef.experiences.map((exp) => (
              <View key={exp.id} style={styles.expItem}>
                <FontAwesome name="circle" size={8} color={GColors.primary} style={{ marginTop: 5 }} />
                <View style={styles.expText}>
                  <Text style={styles.expRole}>
                    {exp.role} · {exp.restaurant_name}
                  </Text>
                  <Text style={styles.expPeriod}>
                    {formatYear(exp.start_date)} — {exp.end_date ? formatYear(exp.end_date) : 'Atual'}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.muted}>Nenhuma experiência cadastrada ainda.</Text>
          )}
        </Section>

        {/* Portfólio */}
        <Section title="Portfólio">
          {chef.portfolio && chef.portfolio.length > 0 ? (
            <View style={styles.portfolioGrid}>
              {chef.portfolio.map((item) => (
                <View key={item.id} style={styles.portfolioItem}>
                  <View style={styles.portfolioThumb}>
                    <FontAwesome name="image" size={22} color={GColors.hint} />
                  </View>
                  <Text style={styles.portfolioTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.muted}>Nenhum item no portfólio ainda.</Text>
          )}
        </Section>

        {/* CTA — depende de ser o próprio perfil ou a visão de um cliente */}
        <TouchableOpacity style={styles.cta} activeOpacity={0.85}>
          <FontAwesome
            name={isOwnProfile ? 'pencil' : 'calendar-check-o'}
            size={15}
            color={GColors.dark}
          />
          <Text style={styles.ctaText}>
            {isOwnProfile ? 'EDITAR PERFIL' : 'AGENDAR SERVIÇO'}
          </Text>
        </TouchableOpacity>

        {isOwnProfile && chef.verificationStatus === 'pendente' && (
          <Text style={styles.hint}>
            Complete seu portfólio e experiências para acelerar a validação do seu perfil.
          </Text>
        )}

        {isOwnProfile && (
          <TouchableOpacity style={styles.logout} onPress={handleLogout} activeOpacity={0.7}>
            <FontAwesome name="sign-out" size={15} color={GColors.muted} />
            <Text style={styles.logoutText}>Sair da conta</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Stat({
  value,
  label,
  icon,
}: {
  value: string;
  label: string;
  icon: React.ComponentProps<typeof FontAwesome>['name'];
}) {
  return (
    <View style={styles.stat}>
      <FontAwesome name={icon} size={14} color={GColors.primary} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
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

function formatYear(date: string) {
  return new Date(date).getFullYear().toString();
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: GColors.dark,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    color: GColors.muted,
    fontSize: 14,
  },
  scroll: {
    paddingHorizontal: GSpacing.screen,
    paddingBottom: 40,
  },
  topAccent: {
    height: 4,
    backgroundColor: GColors.primary,
    marginHorizontal: -GSpacing.screen,
    marginBottom: 28,
  },
  header: {
    alignItems: 'center',
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: GColors.card,
    borderWidth: 2,
    borderColor: GColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: GColors.primary,
    fontSize: 28,
    fontWeight: '700',
    fontFamily: brandFont,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: GColors.cream,
    marginTop: 14,
  },
  headline: {
    fontSize: 14,
    color: GColors.muted,
    marginTop: 4,
    textAlign: 'center',
  },
  location: {
    fontSize: 12,
    color: GColors.muted,
    marginTop: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 14,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: GColors.card,
    borderWidth: 1,
    borderColor: GColors.border,
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 24,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: GColors.cream,
  },
  statLabel: {
    fontSize: 11,
    color: GColors.muted,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: GColors.border,
  },
  section: {
    marginTop: 28,
  },
  sectionTitle: {
    fontSize: 11,
    color: GColors.primary,
    letterSpacing: 2,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: GColors.card,
    borderWidth: 1,
    borderColor: GColors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tagText: {
    fontSize: 13,
    color: GColors.primary,
  },
  bio: {
    fontSize: 14,
    lineHeight: 22,
    color: GColors.cream,
  },
  muted: {
    fontSize: 14,
    color: GColors.muted,
  },
  expItem: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  expText: {
    flex: 1,
  },
  expRole: {
    fontSize: 14,
    color: GColors.cream,
    fontWeight: '600',
  },
  expPeriod: {
    fontSize: 12,
    color: GColors.muted,
    marginTop: 2,
  },
  portfolioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  portfolioItem: {
    width: '47%',
  },
  portfolioThumb: {
    height: 110,
    borderRadius: 10,
    backgroundColor: GColors.card,
    borderWidth: 1,
    borderColor: GColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  portfolioTitle: {
    fontSize: 13,
    color: GColors.cream,
    marginTop: 6,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: GSpacing.buttonHeight,
    backgroundColor: GColors.primary,
    borderRadius: GSpacing.radius,
    marginTop: 32,
  },
  ctaText: {
    color: GColors.dark,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
  },
  hint: {
    fontSize: 12,
    color: GColors.muted,
    textAlign: 'center',
    marginTop: 14,
    lineHeight: 18,
  },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    paddingVertical: 12,
  },
  logoutText: {
    fontSize: 14,
    color: GColors.muted,
    fontWeight: '600',
  },
});
