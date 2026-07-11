import { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Bell, BookBookmark, ChartLineUp, Heart, ShieldCheck, Scroll, Sun, MoonStars, CaretRight } from 'phosphor-react-native';
import { Text } from '../../../components/ui/Text';
import { Floral } from '../../../components/ui/Floral';
import { fonts } from '../../../constants/typography';
import { GUTTER } from '../../../theme/tokens';
import { useTheme } from '../../../providers/ThemeProvider';
import { useAuth } from '../../../providers/AuthProvider';
import { useCouple } from '../../../providers/CoupleProvider';
import { profileInitial } from '../../../lib/couples';
import { countMyTotalSubmitted, countCoupleReflections } from '../../../lib/entries';
import { countPrayers } from '../../../lib/prayers';
import { haptics } from '../../../lib/haptics';

export default function YouScreen() {
  const router = useRouter();
  const { colors, mode, setMode } = useTheme();
  const { user, signOut } = useAuth();
  const { couple, partner } = useCouple();

  const [stats, setStats] = useState({ days: 0, reflections: 0, prayers: 0 });

  // Last-good stats from disk so a cold launch never opens on lying zeros
  // while the counts are still in flight.
  useEffect(() => {
    if (!couple?.id) return;
    AsyncStorage.getItem(`pamwe:youStats:${couple.id}`)
      .then((v) => {
        if (!v) return;
        const cached = JSON.parse(v);
        setStats((prev) => (prev.days || prev.reflections || prev.prayers ? prev : cached));
      })
      .catch(() => {});
  }, [couple?.id]);

  const load = useCallback(async () => {
    if (!couple?.id) return;
    // Independent counts: one failed query keeps its last-good number instead
    // of dragging the other two down with it.
    const [days, reflections, prayers] = await Promise.allSettled([
      countMyTotalSubmitted(couple.id),
      countCoupleReflections(couple.id),
      countPrayers(couple.id),
    ]);
    setStats((prev) => {
      const next = {
        days: days.status === 'fulfilled' ? days.value : prev.days,
        reflections: reflections.status === 'fulfilled' ? reflections.value : prev.reflections,
        prayers: prayers.status === 'fulfilled' ? prayers.value : prev.prayers,
      };
      AsyncStorage.setItem(`pamwe:youStats:${couple.id}`, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, [couple?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const myName = user?.user_metadata?.full_name || (user?.email ? user.email.split('@')[0] : 'You');
  const myInitial = myName[0]?.toUpperCase() ?? 'Y';
  const partnerName = partner?.display_name ?? 'your partner';
  const streak = couple?.streak_count ?? 0;

  const confirmSignOut = () => {
    Alert.alert('Sign out?', 'You can sign back in any time.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => { signOut(); router.replace('/'); } },
    ]);
  };

  const go = (path: any) => { haptics.tap(); router.push(path); };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Floral variant="corner" style={styles.floral} />
        <Text variant="h1">You</Text>

        <View style={styles.profile}>
          <View style={[styles.bigAvatar, { backgroundColor: colors.accent }]}>
            <Text style={[styles.bigAvatarInitial, { color: colors.bg }]}>{myInitial}</Text>
          </View>
          <View style={styles.flex}>
            <Text style={[styles.name, { color: colors.ink }]}>{myName}</Text>
            <Text style={[styles.walking, { color: colors.ink2 }]}>
              Walking with {partnerName} · {streak} day streak
            </Text>
          </View>
        </View>

        <View style={styles.stats}>
          <Stat value={stats.days} label="Days read" colors={colors} />
          <Stat value={stats.reflections} label="Reflections" colors={colors} />
          <Stat value={stats.prayers} label="Prayers" colors={colors} />
        </View>

        <Text variant="eyebrow" color={colors.muted} style={styles.section}>Appearance</Text>
        <View style={[styles.appearance, { backgroundColor: colors.line2 }]}>
          <AppearanceOption active={mode === 'light'} label="Light" onPress={() => { haptics.tap(); setMode('light'); }} colors={colors} icon={<Sun size={16} color={mode === 'light' ? colors.bg : colors.ink2} weight="regular" />} />
          <AppearanceOption active={mode === 'dark'} label="Dark" onPress={() => { haptics.tap(); setMode('dark'); }} colors={colors} icon={<MoonStars size={16} color={mode === 'dark' ? colors.bg : colors.ink2} weight="regular" />} />
        </View>

        <Text variant="eyebrow" color={colors.muted} style={styles.section}>Settings</Text>
        <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Row icon={Bell} label="Notifications & reminders" onPress={() => go('/(tabs)/you/settings')} colors={colors} />
          <Row icon={BookBookmark} label="Change reading plan" onPress={() => go('/(tabs)/plans')} colors={colors} />
          <Row icon={ChartLineUp} label="Your recaps" onPress={() => go('/(tabs)/you/recaps')} colors={colors} />
          <Row icon={Heart} label={`You & ${partner?.display_name ?? 'partner'}`} onPress={() => go('/(tabs)/you/couple')} colors={colors} last />
        </View>

        <Text variant="eyebrow" color={colors.muted} style={styles.section}>About</Text>
        <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Row icon={ShieldCheck} label="Privacy policy" onPress={() => go('/(tabs)/you/privacy')} colors={colors} />
          <Row icon={Scroll} label="Terms of service" onPress={() => go('/(tabs)/you/terms')} colors={colors} last />
        </View>

        <TouchableOpacity onPress={confirmSignOut} style={styles.signOut} accessibilityRole="button">
          <Text variant="cta" color={colors.accent2} style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
        <Text style={[styles.footer, { color: '#B7A88C' }]}>Scripture: World English Bible · public domain</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ value, label, colors }: { value: number; label: string; colors: any }) {
  return (
    <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      <Text style={[styles.statValue, { color: colors.accent }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.muted }]}>{label}</Text>
    </View>
  );
}

function AppearanceOption({ active, label, icon, onPress, colors }: { active: boolean; label: string; icon: React.ReactNode; onPress: () => void; colors: any }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}
      style={[styles.appOption, active && { backgroundColor: colors.accent }]}
      accessibilityRole="button" accessibilityState={{ selected: active }}>
      {icon}
      <Text style={[styles.appLabel, { color: active ? colors.bg : colors.ink2 }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Row({ icon: Icon, label, onPress, colors, last }: { icon: any; label: string; onPress: () => void; colors: any; last?: boolean }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}
      style={[styles.row, !last && { borderBottomColor: colors.line2, borderBottomWidth: 1 }]}>
      <Icon size={19} color={colors.accent2} weight="regular" />
      <Text style={[styles.rowLabel, { color: colors.ink }]}>{label}</Text>
      <CaretRight size={15} color="#CBB99B" weight="regular" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1, minWidth: 0 },
  scroll: { paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: 96 },
  floral: { position: 'absolute', top: -10, right: -18, width: 96, height: 96, opacity: 0.55, transform: [{ scaleX: -1 }] },
  profile: { marginTop: 18, flexDirection: 'row', alignItems: 'center', gap: 16 },
  bigAvatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  bigAvatarInitial: { fontFamily: fonts.serif, fontSize: 28 },
  name: { fontFamily: fonts.serif, fontSize: 22 },
  walking: { fontFamily: fonts.sans, fontSize: 13, marginTop: 2 },
  stats: { marginTop: 20, flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, borderWidth: 1, borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  statValue: { fontFamily: fonts.serif, fontSize: 24 },
  statLabel: { fontFamily: fonts.sansSemiBold, fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 2 },
  section: { marginTop: 24, marginBottom: 10 },
  appearance: { flexDirection: 'row', gap: 6, borderRadius: 14, padding: 5 },
  appOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 10 },
  appLabel: { fontFamily: fonts.sansSemiBold, fontSize: 12 },
  group: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 16, paddingVertical: 15 },
  rowLabel: { flex: 1, fontFamily: fonts.sans, fontSize: 15 },
  signOut: { marginTop: 18, alignItems: 'center', paddingVertical: 15 },
  signOutText: { fontSize: 12, letterSpacing: 0.7 },
  footer: { fontFamily: fonts.sans, fontSize: 11, textAlign: 'center', marginTop: 4 },
});
