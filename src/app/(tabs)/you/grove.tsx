import { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Tree, TreeEvergreen, Lock } from 'phosphor-react-native';
import { Text } from '../../../components/ui/Text';
import { BackLink } from '../../../components/ui/BackLink';
import { Floral } from '../../../components/ui/Floral';
import { PamweLoading } from '../../../components/ui/PamweLoading';
import { fonts } from '../../../constants/typography';
import { GUTTER } from '../../../theme/tokens';
import { useTheme } from '../../../providers/ThemeProvider';
import { useCouple } from '../../../providers/CoupleProvider';
import { finishedPlanCount } from '../../../lib/planHistory';
import { TREE_AWARDS, currentAward, nextAward } from '../../../lib/treeAwards';

// Evergreens for the two that are: everything else is broadleaf.
const EVERGREEN = new Set(['cedar', 'redwood']);

export default function GroveScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { couple } = useCouple();
  const [finished, setFinished] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    if (!couple?.id) { setFinished(0); return; }
    finishedPlanCount(couple.id)
      .then((n) => { if (alive) setFinished(n); })
      .catch(() => { if (alive) setFinished(0); });
    return () => { alive = false; };
  }, [couple?.id]);

  const award = finished === null ? null : currentAward(finished);
  const next = finished === null ? null : nextAward(finished);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Floral variant="corner" style={styles.floral} />
        <BackLink label="You" onPress={() => router.back()} />
        <Text variant="h1" style={styles.title}>Your grove</Text>
        <Text variant="journal" italic color={colors.ink2} style={styles.subtitle}>
          A tree from somewhere in the world for every plan you finish together.
        </Text>

        {finished === null ? (
          <View style={styles.center}><PamweLoading /></View>
        ) : (
          <>
            <Text style={[styles.standing, { color: colors.ink }]}>
              {award
                ? next
                  ? `${award.name}, standing. ${next.threshold - finished} more plan${next.threshold - finished === 1 ? '' : 's'} and the ${next.name.toLowerCase()} joins it.`
                  : `${award.name}, standing. Every tree in the grove is yours.`
                : 'Nothing planted yet. The first plan you finish together starts the grove.'}
            </Text>

            <View style={styles.list}>
              {TREE_AWARDS.map((a) => {
                const earned = finished >= a.threshold;
                const Icon = EVERGREEN.has(a.key) ? TreeEvergreen : Tree;
                return (
                  <View key={a.key}
                    style={[styles.row, {
                      backgroundColor: earned ? colors.surface : 'transparent',
                      borderColor: earned ? colors.lineAccent : colors.line,
                    }]}>
                    <View style={[styles.icon, { backgroundColor: earned ? colors.surface2 : 'transparent', borderColor: earned ? colors.lineAccent : colors.line }]}>
                      {earned
                        ? <Icon size={20} color={colors.accent} weight="fill" />
                        : <Lock size={15} color={colors.muted} weight="regular" />}
                    </View>
                    <View style={styles.flex}>
                      <Text style={[styles.name, { color: earned ? colors.ink : colors.muted }]}>{a.name}</Text>
                      <Text style={[styles.line, { color: colors.muted }]}>
                        {earned ? a.line : `Unlocks at ${a.threshold} plans finished.`}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1, minWidth: 0 },
  scroll: { paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: 40 },
  floral: { position: 'absolute', top: -6, right: -18, width: 92, height: 92, opacity: 0.55, transform: [{ scaleX: -1 }] },
  title: { marginTop: 12 },
  subtitle: { fontSize: 14, marginTop: 5 },
  center: { paddingTop: 50, alignItems: 'center' },
  standing: { fontFamily: fonts.serifLight, fontSize: 20, lineHeight: 27, marginTop: 22 },
  list: { marginTop: 20, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 13, borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14 },
  icon: { width: 38, height: 38, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: fonts.serif, fontSize: 15 },
  line: { fontFamily: fonts.sans, fontSize: 11.5, lineHeight: 17, marginTop: 3 },
});
