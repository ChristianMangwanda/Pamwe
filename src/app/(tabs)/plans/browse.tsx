import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Screen } from '../../../components/ui/Screen';
import { Text } from '../../../components/ui/Text';
import { BackLink } from '../../../components/ui/BackLink';
import { PamweLoading } from '../../../components/ui/PamweLoading';
import { StripedBanner } from '../../../components/ui/StripedBanner';
import { Heart } from 'phosphor-react-native';
import { fonts } from '../../../constants/typography';
import { useTheme } from '../../../providers/ThemeProvider';
import { getBrowsablePlans, getReaderCounts, filterPlans, topicsIn } from '../../../lib/plans';
import { bannerTintForPlan } from '../../../lib/planArtwork';
import { haptics } from '../../../lib/haptics';

// The Browse door on the Plans tab used to only clear the filter chips further
// down the same screen, so tapping the thing labelled Browse did nothing you
// could see. The grid lives here now, and the door goes here.
const PLANS_CACHE_KEY = 'pamwe:plansBrowse';
const LENGTHS = [7, 14, 21, 30];

export default function BrowsePlansScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [browsable, setBrowsable] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [topic, setTopic] = useState<string | null>(null);
  const [days, setDays] = useState<number | null>(null);

  // Same cache key the Plans tab writes, so arriving here paints instantly.
  useEffect(() => {
    AsyncStorage.getItem(PLANS_CACHE_KEY)
      .then((v) => {
        if (!v) return;
        setBrowsable((prev) => (prev.length ? prev : JSON.parse(v)));
        setLoading(false);
      })
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    try {
      const b = await getBrowsablePlans();
      setBrowsable(b);
      AsyncStorage.setItem(PLANS_CACHE_KEY, JSON.stringify(b)).catch(() => {});
      getReaderCounts(b.map((p: any) => p.id)).then(setCounts).catch(() => {});
    } catch {
      // Leave the list as-is; pull-to-refresh can retry.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const open = (id: string) => { haptics.tap(); router.push({ pathname: '/(tabs)/plans/[id]', params: { id } }); };
  const build = (seed?: string) => {
    haptics.tap();
    router.push({ pathname: '/(tabs)/plans/build', params: seed ? { q: seed } : {} });
  };

  const topics = useMemo(() => topicsIn(browsable).slice(0, 8), [browsable]);
  const browseList = useMemo(() => filterPlans(browsable, topic, days), [browsable, topic, days]);
  const metaLine = (p: any) => `${p.book_label ?? p.title} · ${p.duration_days} days`;

  if (loading) {
    return (
      <Screen>
        <View style={styles.center}><PamweLoading /></View>
      </Screen>
    );
  }

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}>
      <BackLink label="Plans" onPress={() => router.back()} />
      <Text variant="h1" style={styles.title}>Browse</Text>
      <Text variant="journal" italic color={colors.ink2} style={styles.subtitle}>
        Plans by topic and length, and what other couples read.
      </Text>

      {topics.length > 0 && (
        <>
          <Text variant="eyebrow" color={colors.muted} style={styles.eyebrow}>Topic</Text>
          <View style={styles.chips}>
            {topics.map((t) => (
              <Chip key={t} label={t} on={topic === t} colors={colors}
                onPress={() => { haptics.tap(); setTopic(topic === t ? null : t); }} />
            ))}
          </View>
        </>
      )}

      <Text variant="eyebrow" color={colors.muted} style={styles.eyebrow}>Length</Text>
      <View style={styles.chips}>
        {LENGTHS.map((d) => (
          <Chip key={d} label={`${d} days`} on={days === d} colors={colors}
            onPress={() => { haptics.tap(); setDays(days === d ? null : d); }} />
        ))}
      </View>

      <Text variant="eyebrow" color={colors.muted} style={styles.eyebrow}>
        {topic || days ? `${browseList.length} plan${browseList.length === 1 ? '' : 's'}` : 'All plans'}
      </Text>
      {browseList.length === 0 ? (
        <TouchableOpacity activeOpacity={0.85} onPress={() => build(topic ?? undefined)}
          style={[styles.emptyBrowse, { borderColor: colors.lineAccent, backgroundColor: colors.surface2 }]}>
          <Text style={[styles.emptyText, { color: colors.ink2 }]}>
            Nothing here yet with that shape. Pamwe can build one instead.
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.grid}>
          {browseList.map((p: any) => (
            <TouchableOpacity key={p.id} activeOpacity={0.85} onPress={() => open(p.id)}
              style={[styles.gridCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              <StripedBanner height={64} stripe={6} tint={bannerTintForPlan(p)} />
              <View style={styles.gridBody}>
                <Text style={[styles.gridTitle, { color: colors.ink }]} numberOfLines={2}>{p.title}</Text>
                <Text style={[styles.gridMeta, { color: colors.muted }]}>{metaLine(p)}</Text>
                {counts[p.id] > 1 && (
                  <View style={styles.readBy}>
                    <Heart size={10} color={colors.accent2} weight="fill" />
                    <Text style={[styles.readByText, { color: colors.accent2 }]}>
                      Read by {counts[p.id]} couples
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </Screen>
  );
}

function Chip({ label, on, colors, onPress }: { label: string; on: boolean; colors: any; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}
      accessibilityRole="button" accessibilityState={{ selected: on }}
      style={[styles.chip, {
        backgroundColor: on ? colors.accent : colors.surface,
        borderColor: on ? colors.accent : colors.line,
      }]}>
      <Text variant="chip" color={on ? colors.bg : colors.ink2} style={styles.chipText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  center: { paddingTop: 80, alignItems: 'center' },
  title: { marginTop: 12 },
  subtitle: { fontSize: 14, marginTop: 5 },
  eyebrow: { marginTop: 22, marginBottom: 10 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 8 },
  chipText: { fontSize: 10, letterSpacing: 0.7 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 11 },
  gridCard: { width: '47.5%', flexGrow: 1, borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  gridBody: { paddingHorizontal: 12, paddingTop: 11, paddingBottom: 13 },
  gridTitle: { fontFamily: fonts.serif, fontSize: 13.5, lineHeight: 17 },
  gridMeta: { fontFamily: fonts.sans, fontSize: 10.5, marginTop: 5 },
  readBy: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  readByText: { fontFamily: fonts.sansSemiBold, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase' },

  emptyBrowse: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16 },
  emptyText: { fontFamily: fonts.serif, fontSize: 14, lineHeight: 21, textAlign: 'center' },
});
