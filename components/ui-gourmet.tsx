import { FontAwesome } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';

import { GShadow, GSpacing } from '@/constants/gourmet-theme';
import { useColors } from '@/components/theme-context';

/** Fundo de tela plano, na cor do tema ativo. (Nome mantido por compat.) */
export function ScreenGradient({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  return <View style={[{ flex: 1, backgroundColor: c.dark }, style]}>{children}</View>;
}

/** Barra de acento fina no topo (dourado do tema). */
export function AccentBar({ style }: { style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  return <View style={[{ height: 3, backgroundColor: c.primary }, style]} />;
}

/** Card plano com borda fina e sombra suave (estilo clean). */
export function Panel({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  return (
    <View
      style={[
        {
          backgroundColor: c.card,
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: GSpacing.radius,
          ...GShadow,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

type IconName = React.ComponentProps<typeof FontAwesome>['name'];

interface ButtonProps {
  label: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}

/** Botão primário (dourado, flat). */
export function GoldButton({ label, onPress, loading, disabled, icon, style }: ButtonProps) {
  const c = useColors();
  const off = disabled || loading;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={off}
      activeOpacity={0.85}
      style={[styles.btn, { backgroundColor: c.primary }, off && styles.off, style]}
    >
      {loading ? (
        <ActivityIndicator color={c.onPrimary} />
      ) : (
        <View style={styles.row}>
          {icon && <FontAwesome name={icon} size={15} color={c.onPrimary} />}
          <Text style={[styles.text, { color: c.onPrimary }]}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

/** Botão de destaque (CTA — cor de acento do tema, flat). */
export function AccentButton({ label, onPress, loading, disabled, icon, style }: ButtonProps) {
  const c = useColors();
  const off = disabled || loading;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={off}
      activeOpacity={0.85}
      style={[styles.btn, { backgroundColor: c.accent }, off && styles.off, style]}
    >
      {loading ? (
        <ActivityIndicator color={c.onAccent} />
      ) : (
        <View style={styles.row}>
          {icon && <FontAwesome name={icon} size={15} color={c.onAccent} />}
          <Text style={[styles.text, { color: c.onAccent }]}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: GSpacing.buttonHeight,
    borderRadius: GSpacing.radius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  off: { opacity: 0.55 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  text: { fontSize: 14, fontWeight: '700', letterSpacing: 1 },
});
