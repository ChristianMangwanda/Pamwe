import { useMemo, useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Text } from '../../../components/ui/Text';
import { BackLink } from '../../../components/ui/BackLink';
import { Button } from '../../../components/ui/Button';
import { Floral } from '../../../components/ui/Floral';
import { fonts } from '../../../constants/typography';
import { GUTTER } from '../../../theme/tokens';
import { useTheme } from '../../../providers/ThemeProvider';
import { useCouple } from '../../../providers/CoupleProvider';
import { togetherSince, toISODate, setAnniversary } from '../../../lib/couples';
import { haptics } from '../../../lib/haptics';

// A screen of its own rather than a bottom sheet. The iOS picker reports its
// size one layout pass after mount (its Fabric state starts at zero and only
// gets the real ~216pt after updateMeasurements), so it grew the sheet after
// the sheet had already been placed, and Save ended up below the screen edge.
// Here the picker sits in a flex child with Save pinned outside it, so the
// late measurement just re-centers the wheel and can't push anything away.
export default function AnniversaryScreen() {
  const router = useRouter();
  const { colors, mode } = useTheme();
  const { couple, refresh } = useCouple();

  const [date, setDate] = useState<Date>(() => togetherSince(couple) ?? new Date());
  const [saving, setSaving] = useState(false);

  // Held still for the life of the screen. Rebuilt inline, it handed the picker
  // a new bound on every render, which re-set min/max natively mid-spin.
  const today = useMemo(() => new Date(), []);

  const save = async () => {
    setSaving(true);
    try {
      // A DATE column, so send the local calendar day rather than an ISO
      // instant, which would shift the date west of Greenwich.
      await setAnniversary(toISODate(date));
      await refresh();
      haptics.success();
      router.back();
    } catch {
      Alert.alert('Could not save', 'Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <View style={styles.body}>
        <Floral variant="corner" style={styles.floral} />
        <BackLink label="Couple" onPress={() => router.back()} />
        <Text variant="h1" style={styles.title}>Your anniversary</Text>
        <Text style={[styles.blurb, { color: colors.ink2 }]}>
          The date you got together. It sets the days together count here and on your Lock Screen.
        </Text>

        <View style={styles.pickerWrap}>
          <DateTimePicker
            value={date}
            mode="date"
            display="spinner"
            // Tomorrow onward would render as a negative count on the widget,
            // where there is no room to explain itself.
            maximumDate={today}
            onChange={(_, d) => { if (d) setDate(d); }}
            themeVariant={mode}
            style={styles.picker}
          />
        </View>
      </View>

      <View style={styles.footer}>
        <Button title="Save" onPress={save} loading={saving} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { flex: 1, paddingHorizontal: GUTTER, paddingTop: 8 },
  floral: { position: 'absolute', top: -6, right: -18, width: 92, height: 92, opacity: 0.55, transform: [{ scaleX: -1 }] },
  title: { marginTop: 12 },
  blurb: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 21, marginTop: 6 },
  // Centres the wheel in whatever is left between the blurb and Save. The
  // explicit height keeps the first frame the right size, before the native
  // measurement lands.
  pickerWrap: { flex: 1, justifyContent: 'center' },
  picker: { alignSelf: 'stretch', height: 216 },
  footer: { paddingHorizontal: GUTTER, paddingBottom: 8 },
});
