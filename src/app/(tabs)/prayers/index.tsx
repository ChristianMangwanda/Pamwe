import { useCallback, useState } from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { PlusCircle, HandsPraying, SealCheck } from 'phosphor-react-native';
import { Text } from '../../../components/ui/Text';
import { Floral } from '../../../components/ui/Floral';
import { CategoryChip } from '../../../components/ui/CategoryChip';
import { PrayerCard, Prayer, relativeTime } from '../../../components/PrayerCard';
import { PrayerDetailSheet } from '../../../components/PrayerDetailSheet';
import { fonts } from '../../../constants/typography';
import { GUTTER } from '../../../theme/tokens';
import { useTheme } from '../../../providers/ThemeProvider';
import { useAuth } from '../../../providers/AuthProvider';
import { useCouple } from '../../../providers/CoupleProvider';
import { supabase } from '../../../lib/supabase';
import { getPrayers, getAnsweredPrayers, getTodayMarks, markPrayedFor, markAnswered, deletePrayer } from '../../../lib/prayers';
import { haptics } from '../../../lib/haptics';

type Mark = { prayer_id: string; user_id: string };

export default function PrayersScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { couple, partner } = useCouple();

  const [active, setActive] = useState<Prayer[]>([]);
  const [answered, setAnswered] = useState<Prayer[]>([]);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [detail, setDetail] = useState<Prayer | null>(null);

  const partnerName = partner?.display_name ?? 'Your partner';
  const partnerId = couple?.partner_a_id === user?.id ? couple?.partner_b_id : couple?.partner_a_id;

  const load = useCallback(async () => {
    if (!couple?.id) return;
    try {
      const [a, ans, todayMarks] = await Promise.all([
        getPrayers(couple.id, 'active'),
        getAnsweredPrayers(couple.id),
        getTodayMarks(couple.timezone),
      ]);
      setActive(a as Prayer[]);
      setAnswered(ans as Prayer[]);
      setMarks(todayMarks as Mark[]);
    } catch {
      // Keep the last good state; realtime/focus retries.
    } finally {
      setLoading(false);
    }
  }, [couple?.id, couple?.timezone]);

  useFocusEffect(
    useCallback(() => {
      load();
      if (!couple?.id) return;
      const channel = supabase
        .channel('prayers-list')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'prayers', filter: `couple_id=eq.${couple.id}` }, () => load())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'prayer_marks' }, () => load())
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }, [couple?.id, load]),
  );

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const prayedByMe = (id: string) => marks.some((m) => m.prayer_id === id && m.user_id === user?.id);
  const prayedByPartner = (id: string) => marks.some((m) => m.prayer_id === id && m.user_id === partnerId);

  const handlePray = async (prayerId: string) => {
    if (!couple) return;
    haptics.light();
    setMarks((prev) => prev.some((m) => m.prayer_id === prayerId && m.user_id === user!.id) ? prev : [...prev, { prayer_id: prayerId, user_id: user!.id }]);
    try {
      await markPrayedFor(prayerId, couple.timezone);
    } catch {
      await load();
      Alert.alert('Could not save', "That didn't go through. Please try again.");
    }
  };

  const handleMarkAnswered = (prayer: Prayer) => {
    setDetail(null);
    const submit = async (note?: string) => {
      try { await markAnswered(prayer.id, note); load(); }
      catch (err: any) { Alert.alert('Error', err?.message ?? 'Could not mark as answered'); }
    };
    if (Platform.OS === 'ios') {
      Alert.prompt('Mark as answered', 'Add a note about how it was answered (optional).',
        [{ text: 'Cancel', style: 'cancel' }, { text: 'Mark answered', onPress: (note?: string) => submit(note) }], 'plain-text');
    } else {
      Alert.alert('Mark as answered', 'This moves the prayer to your answered archive.',
        [{ text: 'Cancel', style: 'cancel' }, { text: 'Mark answered', onPress: () => submit() }]);
    }
  };

  const handleEdit = (prayer: Prayer) => {
    setDetail(null);
    router.push({ pathname: '/(tabs)/prayers/add', params: { editId: prayer.id, text: prayer.text, category: prayer.category } });
  };

  const handleDelete = (prayer: Prayer) => {
    setDetail(null);
    Alert.alert('Delete this prayer?', 'This removes it for both of you and can’t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          setActive((prev) => prev.filter((p) => p.id !== prayer.id));
          try { await deletePrayer(prayer.id); await load(); }
          catch (err: any) { await load(); Alert.alert('Error', err?.message ?? 'Could not delete'); }
        },
      },
    ]);
  };

  const allEmpty = !loading && active.length === 0 && answered.length === 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        <Text variant="h1">Prayer requests</Text>
        <Text variant="journal" italic color={colors.ink2} style={styles.subtitle}>What you're carrying to Him, together.</Text>

        <TouchableOpacity activeOpacity={0.85} onPress={() => { haptics.tap(); router.push('/(tabs)/prayers/add'); }}
          style={[styles.addBtn, { backgroundColor: colors.accent }]}>
          <PlusCircle size={18} color={colors.bg} weight="regular" />
          <Text variant="cta" color={colors.bg} style={styles.addText}>Add a prayer point</Text>
        </TouchableOpacity>

        <Floral variant="divider" style={styles.divider} />

        {loading ? (
          <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>
        ) : allEmpty ? (
          <View style={styles.empty}>
            <HandsPraying size={40} color="#CBB99B" weight="regular" />
            <Text variant="h2" italic style={styles.emptyTitle}>Nothing on your hearts yet</Text>
            <Text color={colors.muted} style={styles.emptyText}>
              Add your first prayer point above, and {partnerName} can pray it with you.
            </Text>
          </View>
        ) : (
          <>
            {active.map((p) => (
              <PrayerCard
                key={p.id}
                prayer={p}
                isMine={p.author_id === user?.id}
                partnerName={partnerName}
                prayedByMe={prayedByMe(p.id)}
                prayedByPartner={prayedByPartner(p.id)}
                onPray={() => handlePray(p.id)}
                onCard={() => setDetail(p)}
                onEdit={() => handleEdit(p)}
                onDelete={() => handleDelete(p)}
              />
            ))}

            {answered.length > 0 && (
              <>
                <View style={styles.answeredHeader}>
                  <SealCheck size={16} color={colors.accent2} weight="fill" />
                  <Text variant="eyebrow" color={colors.muted}>Answered · {answered.length}</Text>
                </View>
                {answered.map((p) => (
                  <TouchableOpacity key={p.id} activeOpacity={0.85} onPress={() => setDetail(p)}
                    style={[styles.answeredCard, { backgroundColor: colors.surface2, borderColor: colors.lineAccent }]}>
                    <View style={styles.answeredRow}>
                      <SealCheck size={16} color={colors.accent} weight="fill" />
                      <Text style={[styles.answeredWho, { color: colors.accent }]}>{p.author_id === user?.id ? 'You' : partnerName}</Text>
                      <Text style={[styles.answeredWhen, { color: colors.muted }]}>· {relativeTime(p.answered_at ?? p.created_at)}</Text>
                      <CategoryChip category={p.category} style={styles.answeredChip} />
                    </View>
                    <Text style={[styles.answeredText, { color: colors.accent }]}>{p.text}</Text>
                  </TouchableOpacity>
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>

      <PrayerDetailSheet
        prayer={detail}
        isMine={detail?.author_id === user?.id}
        partnerName={partnerName}
        prayedByMe={detail ? prayedByMe(detail.id) : false}
        prayedByPartner={detail ? prayedByPartner(detail.id) : false}
        onClose={() => setDetail(null)}
        onMarkAnswered={() => detail && handleMarkAnswered(detail)}
        onEdit={() => detail && handleEdit(detail)}
        onDelete={() => detail && handleDelete(detail)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: 118 },
  subtitle: { fontSize: 14, marginTop: 6 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, borderRadius: 14, paddingVertical: 15, marginTop: 16 },
  addText: { letterSpacing: 0.9 },
  divider: { width: 140, height: 26, alignSelf: 'center', marginVertical: 18, opacity: 0.8 },
  center: { paddingTop: 40, alignItems: 'center' },
  empty: { alignItems: 'center', paddingTop: 24, paddingHorizontal: 24 },
  emptyTitle: { marginTop: 16, textAlign: 'center' },
  emptyText: { fontSize: 15, marginTop: 10, textAlign: 'center', lineHeight: 24 },
  answeredHeader: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 22, marginBottom: 12 },
  answeredCard: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 14, marginBottom: 10 },
  answeredRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  answeredWho: { fontFamily: fonts.sansMedium, fontSize: 11 },
  answeredWhen: { fontFamily: fonts.sans, fontSize: 10 },
  answeredChip: { marginLeft: 'auto' },
  answeredText: { fontFamily: fonts.serif, fontSize: 15, lineHeight: 22, marginTop: 9 },
});
