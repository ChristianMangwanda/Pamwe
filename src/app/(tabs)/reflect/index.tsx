import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Feather, CaretRight, BookmarkSimple } from 'phosphor-react-native';
import { Text } from '../../../components/ui/Text';
import { Floral } from '../../../components/ui/Floral';
import { fonts } from '../../../constants/typography';
import { GUTTER } from '../../../theme/tokens';
import { useTheme } from '../../../providers/ThemeProvider';
import { useAuth } from '../../../providers/AuthProvider';
import { useCouple } from '../../../providers/CoupleProvider';
import { profileInitial } from '../../../lib/couples';
import { getRevealedReflections, pickOnThisDay, ReflectionSummary } from '../../../lib/reflections';
import { haptics } from '../../../lib/haptics';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ReflectScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { couple, partner } = useCouple();

  const [items, setItems] = useState<ReflectionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  // Stale-while-revalidate: the last-seen history (or its emptiness) paints
  // instantly on cold launch while `load` refreshes it below.
  useEffect(() => {
    if (!couple?.id) return;
    AsyncStorage.getItem(`pamwe:reflections:${couple.id}`)
      .then((v) => {
        if (!v) return;
        const cached = JSON.parse(v) as ReflectionSummary[];
        setItems((prev) => (prev.length ? prev : cached));
        setLoading(false);
      })
      .catch(() => {});
  }, [couple?.id]);

  const load = useCallback(async () => {
    if (!couple?.id) { setLoading(false); return; }
    try {
      const fresh = await getRevealedReflections(couple.id);
      setItems(fresh);
      AsyncStorage.setItem(`pamwe:reflections:${couple.id}`, JSON.stringify(fresh)).catch(() => {});
    } catch {
      // keep last good state
    } finally {
      setLoading(false);
    }
  }, [couple?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const books = useMemo(() => {
    const seen: string[] = [];
    for (const it of items) if (!seen.includes(it.book)) seen.push(it.book);
    return seen;
  }, [items]);

  const visible = filter === 'all' ? items : items.filter((it) => it.book === filter);
  const onThisDay = useMemo(() => pickOnThisDay(items), [items]);

  const myInitial = (user?.user_metadata?.full_name || user?.email || 'Y')[0]?.toUpperCase() ?? 'Y';
  const partnerInitial = profileInitial(partner) ?? '?';

  const open = (it: ReflectionSummary) => {
    haptics.tap();
    router.push({ pathname: '/(tabs)/reflect/[id]', params: { id: it.couplePlanId, day: String(it.dayNumber) } });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        <Floral variant="corner" style={styles.floral} />
        <View style={styles.titleRow}>
          <Text variant="h1">Reflections</Text>
          <TouchableOpacity onPress={() => { haptics.tap(); router.push('/(tabs)/reflect/words'); }} hitSlop={12}
            accessibilityRole="button" accessibilityLabel="Their words">
            <BookmarkSimple size={20} color={colors.ink2} weight="regular" />
          </TouchableOpacity>
        </View>
        <Text variant="journal" italic color={colors.ink2} style={styles.subtitle}>What you've come across, together.</Text>

        {loading ? (
          <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>
        ) : items.length === 0 ? (
          <View style={styles.empty}>
            <Feather size={40} color="#CBB99B" weight="regular" />
            <Text variant="h2" italic style={styles.emptyTitle}>No reflections yet</Text>
            <Text color={colors.muted} style={styles.emptyText}>
              When you read a day together and reflect, what you each write will gather here.
            </Text>
          </View>
        ) : (
          <>
            {onThisDay && (
              <TouchableOpacity activeOpacity={0.85} onPress={() => open(onThisDay.item)}
                style={[styles.storyCard, { backgroundColor: colors.surface2, borderColor: colors.lineAccent }]}>
                <Text variant="eyebrow" color={colors.accent2}>From your story · {onThisDay.label}</Text>
                <Text style={[styles.storySnippet, { color: colors.ink }]} numberOfLines={2}>“{onThisDay.item.snippet}”</Text>
                <Text style={[styles.storyMeta, { color: colors.muted }]}>
                  {formatDate(onThisDay.item.revealedAt)} · {onThisDay.item.reference}
                </Text>
              </TouchableOpacity>
            )}

            {books.length > 1 && (
              <View style={styles.filters}>
                <FilterChip label="All" active={filter === 'all'} onPress={() => setFilter('all')} colors={colors} />
                {books.map((b) => (
                  <FilterChip key={b} label={b} active={filter === b} onPress={() => setFilter(b)} colors={colors} />
                ))}
              </View>
            )}

            <View style={styles.list}>
              {visible.map((it) => (
                <TouchableOpacity key={it.id} activeOpacity={0.85} onPress={() => open(it)}
                  style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
                  <View style={styles.cardTop}>
                    <Text style={[styles.cardEyebrow, { color: colors.accent }]} numberOfLines={1}>
                      {formatDate(it.revealedAt)} · {it.reference}
                    </Text>
                    <View style={styles.avatars}>
                      <Avatar initial={myInitial} colors={colors} />
                      <Avatar initial={partnerInitial} colors={colors} overlap />
                    </View>
                  </View>
                  <Text style={[styles.snippet, { color: colors.ink }]} numberOfLines={2}>“{it.snippet}”</Text>
                  <View style={styles.cardBottom}>
                    <View style={[styles.topic, { borderColor: '#cbb89a' }]}>
                      <Text style={[styles.topicText, { color: colors.accent }]}>{it.book}</Text>
                    </View>
                    <View style={styles.read}>
                      <Text style={[styles.readText, { color: colors.muted }]}>Read</Text>
                      <CaretRight size={12} color={colors.muted} weight="bold" />
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function FilterChip({ label, active, onPress, colors }: { label: string; active: boolean; onPress: () => void; colors: any }) {
  return (
    <TouchableOpacity onPress={() => { haptics.tap(); onPress(); }} activeOpacity={0.8}
      accessibilityRole="button" accessibilityState={{ selected: active }}
      style={[styles.filterChip, {
        backgroundColor: active ? colors.accent : colors.surface2,
        borderColor: active ? colors.accent : colors.lineAccent,
      }]}>
      <Text style={[styles.filterText, { color: active ? colors.bg : colors.accent2 }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Avatar({ initial, colors, overlap }: { initial: string; colors: any; overlap?: boolean }) {
  return (
    <View style={[styles.avatar, { borderColor: colors.accent2, backgroundColor: colors.surface }, overlap && styles.avatarOverlap]}>
      <Text style={[styles.avatarInitial, { color: colors.accent }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: 96 },
  floral: { position: 'absolute', top: -10, right: -18, width: 96, height: 96, opacity: 0.6, transform: [{ scaleX: -1 }] },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subtitle: { fontSize: 14, marginTop: 6 },
  center: { paddingTop: 60, alignItems: 'center' },
  empty: { alignItems: 'center', paddingTop: 44, paddingHorizontal: 24 },
  emptyTitle: { marginTop: 16, textAlign: 'center' },
  emptyText: { fontSize: 15, marginTop: 10, textAlign: 'center', lineHeight: 24 },
  storyCard: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 15, marginTop: 16 },
  storySnippet: { fontFamily: fonts.serifItalic, fontSize: 15, lineHeight: 22.5, marginTop: 9 },
  storyMeta: { fontFamily: fonts.sansSemiBold, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 10 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 16 },
  filterChip: { borderWidth: 1.2, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6 },
  filterText: { fontFamily: fonts.sansMedium, fontSize: 10 },
  list: { marginTop: 16 },
  card: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 15, marginBottom: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  cardEyebrow: { flex: 1, fontFamily: fonts.sansSemiBold, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase' },
  avatars: { flexDirection: 'row' },
  avatar: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.4, alignItems: 'center', justifyContent: 'center' },
  avatarOverlap: { marginLeft: -6 },
  avatarInitial: { fontFamily: fonts.serif, fontSize: 10 },
  snippet: { fontFamily: fonts.serifItalic, fontSize: 15, lineHeight: 22.5, marginTop: 10, marginBottom: 12 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topic: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  topicText: { fontFamily: fonts.sansSemiBold, fontSize: 9, letterSpacing: 0.7, textTransform: 'uppercase' },
  read: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  readText: { fontFamily: fonts.sansSemiBold, fontSize: 9, letterSpacing: 0.7, textTransform: 'uppercase' },
});
