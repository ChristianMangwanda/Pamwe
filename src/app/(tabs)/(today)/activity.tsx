import { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { CaretRight } from 'phosphor-react-native';
import { Text } from '../../../components/ui/Text';
import { BackLink } from '../../../components/ui/BackLink';
import { PamweLoading } from '../../../components/ui/PamweLoading';
import { Floral } from '../../../components/ui/Floral';
import { fonts } from '../../../constants/typography';
import { GUTTER } from '../../../theme/tokens';
import { useTheme } from '../../../providers/ThemeProvider';
import { useCouple } from '../../../providers/CoupleProvider';
import {
  getActivity, markActivitySeen, activityTitle, activityRoute, type ActivityItem,
} from '../../../lib/activity';
import { haptics } from '../../../lib/haptics';

// Delivered banners are dismissed on every foreground, which is deliberate:
// a stack of days-old pushes reads as if the same thing keeps happening. But
// that left the OS notification list as the only record of a reply, a prayer,
// a dream or a note, so opening the app erased the only trail there was.
export default function ActivityScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { partner } = useCouple();
  const [items, setItems] = useState<ActivityItem[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const partnerName = partner?.display_name ?? 'Your partner';

  const load = useCallback(async () => {
    try {
      setItems(await getActivity());
    } catch {
      // Keep whatever is on screen; pull to refresh can try again.
      setItems((prev) => prev ?? []);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      // Opening the list IS reading it, so the dot clears on arrival rather
      // than asking for a second gesture to dismiss.
      markActivitySeen().catch(() => {});
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const open = (item: ActivityItem) => {
    const route = activityRoute(item);
    if (!route) return;
    haptics.tap();
    router.push(
      { pathname: route.pathname, params: route.params } as any,
      route.anchored ? { withAnchor: true } : undefined,
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        <BackLink label="Today" onPress={() => router.back()} />
        <Text variant="h2" style={styles.title}>While you were away</Text>
        <Text variant="journal" italic color={colors.ink2} style={styles.subtitle}>
          What {partnerName} has been doing.
        </Text>

        {items === null ? (
          <View style={styles.center}><PamweLoading /></View>
        ) : items.length === 0 ? (
          <View style={styles.empty}>
            <Floral variant="divider" style={styles.emptyFloral} />
            <Text style={[styles.emptyText, { color: colors.muted }]}>
              Nothing new since you last looked. When {partnerName} writes, prays or marks a verse,
              it will be here.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {items.map((item) => {
              const tappable = !!activityRoute(item);
              return (
                <TouchableOpacity
                  key={`${item.kind}-${item.id}`}
                  activeOpacity={tappable ? 0.85 : 1}
                  onPress={() => open(item)}
                  disabled={!tappable}
                  style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.line }]}
                  accessibilityRole={tappable ? 'button' : undefined}
                >
                  <View style={styles.flex}>
                    <Text style={[styles.rowTitle, { color: colors.ink }]}>
                      {activityTitle(item, partnerName)}
                    </Text>
                    {!!item.preview?.trim() && (
                      <Text style={[styles.rowPreview, { color: colors.ink2 }]} numberOfLines={2}>
                        “{item.preview.trim()}”
                      </Text>
                    )}
                    <Text style={[styles.rowWhen, { color: colors.muted }]}>{whenLabel(item.happenedAt)}</Text>
                  </View>
                  {tappable && <CaretRight size={15} color={colors.accent2} weight="regular" />}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function whenLabel(iso: string): string {
  const then = new Date(iso);
  const mins = Math.floor((Date.now() - then.getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  const sameYear = then.getFullYear() === new Date().getFullYear();
  return then.toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }),
  });
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1, minWidth: 0 },
  scroll: { paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: 32 },
  title: { marginTop: 12 },
  subtitle: { fontSize: 14, marginTop: 5 },
  center: { paddingTop: 60, alignItems: 'center' },
  empty: { marginTop: 34, alignItems: 'center' },
  emptyFloral: { width: 150, height: 26, opacity: 0.85, marginBottom: 16 },
  emptyText: { fontFamily: fonts.serif, fontSize: 15, lineHeight: 23, textAlign: 'center' },
  list: { marginTop: 22 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 8,
  },
  rowTitle: { fontFamily: fonts.sansMedium, fontSize: 13.5, lineHeight: 19 },
  rowPreview: { fontFamily: fonts.serifItalic, fontSize: 14, lineHeight: 21, marginTop: 5 },
  rowWhen: { fontFamily: fonts.sans, fontSize: 11, marginTop: 6 },
});
