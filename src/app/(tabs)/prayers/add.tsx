import { useState } from 'react';
import {
  View, StyleSheet, TextInput, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Text } from '../../../components/ui/Text';
import { Button } from '../../../components/ui/Button';
import { BackLink } from '../../../components/ui/BackLink';
import { Switch } from '../../../components/ui/Switch';
import { SectionEyebrow } from '../../../components/ui/SectionEyebrow';
import { NotificationPreview } from '../../../components/NotificationPreview';
import { fonts } from '../../../constants/typography';
import { GUTTER } from '../../../theme/tokens';
import { useTheme } from '../../../providers/ThemeProvider';
import { useAuth } from '../../../providers/AuthProvider';
import { useCouple } from '../../../providers/CoupleProvider';
import {
  createPrayer, updatePrayer, PrayerCategory, PRAYER_CATEGORIES, CATEGORY_LABEL,
} from '../../../lib/prayers';
import { haptics } from '../../../lib/haptics';

const MAX_LENGTH = 280;

export default function AddPrayerScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { couple, partner } = useCouple();
  const params = useLocalSearchParams<{ editId?: string; text?: string; category?: string }>();

  const isEdit = !!params.editId;
  const [text, setText] = useState(params.text ?? '');
  const [category, setCategory] = useState<PrayerCategory>(
    (PRAYER_CATEGORIES.includes(params.category as PrayerCategory) ? params.category : 'other') as PrayerCategory,
  );
  const [notifyPartner, setNotifyPartner] = useState(true);
  const [saving, setSaving] = useState(false);

  const partnerName = partner?.display_name ?? 'your partner';
  const myName = (user?.user_metadata?.full_name || user?.email || 'You').split(' ')[0];

  const handleSave = async () => {
    if (!couple || !text.trim()) return;
    try {
      setSaving(true);
      haptics.medium();
      if (isEdit && params.editId) {
        await updatePrayer(params.editId, text, category);
      } else {
        await createPrayer(couple.id, text, notifyPartner, category);
      }
      router.back();
    } catch (err: any) {
      Alert.alert('Could not save your prayer', err?.message ?? 'Please try again in a moment.');
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <BackLink label="Prayer requests" onPress={() => router.back()} />
          <Text variant="h1" style={styles.title}>{isEdit ? 'Edit prayer' : 'New prayer'}</Text>
          <Text variant="journal" italic color={colors.ink2} style={styles.subtitle}>Name it, and carry it to Him together.</Text>

          <SectionEyebrow style={styles.eyebrow}>Your prayer</SectionEyebrow>
          <View style={[styles.textBox, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <TextInput
              style={[styles.textInput, { color: colors.ink }]}
              multiline autoFocus={!isEdit} maxLength={MAX_LENGTH}
              placeholder="e.g. Wisdom as we decide about the move…"
              placeholderTextColor={colors.muted}
              value={text} onChangeText={setText} textAlignVertical="top"
            />
          </View>
          <Text style={[styles.count, { color: colors.muted }]}>{text.length} / {MAX_LENGTH}</Text>

          <SectionEyebrow style={styles.eyebrow}>What is it about?</SectionEyebrow>
          <View style={styles.chips}>
            {PRAYER_CATEGORIES.map((c) => {
              const sel = category === c;
              return (
                <TouchableOpacity key={c} activeOpacity={0.8} onPress={() => { haptics.tap(); setCategory(c); }}
                  accessibilityRole="button" accessibilityLabel={CATEGORY_LABEL[c]} accessibilityState={{ selected: sel }}
                  style={[styles.chip, {
                    backgroundColor: sel ? colors.accent : colors.surface2,
                    borderColor: sel ? colors.accent : colors.lineAccent,
                  }]}>
                  <Text style={[styles.chipText, { color: sel ? colors.bg : colors.accent2 }]}>{CATEGORY_LABEL[c]}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {!isEdit && (
            <View style={[styles.notifyCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              <View style={styles.notifyRow}>
                <View style={styles.flex}>
                  <Text style={[styles.notifyTitle, { color: colors.ink }]}>Let {partnerName} know</Text>
                  <Text style={[styles.notifySub, { color: colors.muted }]}>
                    They'll get a gentle notification to pray with you.
                  </Text>
                </View>
                <Switch value={notifyPartner} onValueChange={setNotifyPartner} accessibilityLabel={`Notify ${partnerName}`} />
              </View>
              {notifyPartner && (
                <View style={[styles.previewWrap, { borderTopColor: colors.line2 }]}>
                  <Text style={[styles.previewLabel, { color: colors.muted }]}>{partnerName} will see</Text>
                  <NotificationPreview
                    line={`${myName} added a prayer point`}
                    subline={text.trim() ? `“${text.trim()}”` : '“…”'}
                  />
                </View>
              )}
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title={isEdit ? 'Save changes' : 'Share prayer'}
            onPress={handleSave}
            loading={saving}
            disabled={!text.trim() || saving}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1, minWidth: 0 },
  scroll: { paddingHorizontal: GUTTER, paddingTop: 12, paddingBottom: 24 },
  title: { marginTop: 12 },
  subtitle: { fontSize: 14, marginTop: 5 },
  eyebrow: { marginTop: 22 },
  textBox: { borderWidth: 1, borderRadius: 16, padding: 15, marginTop: 10 },
  textInput: { fontFamily: fonts.serif, fontSize: 17, lineHeight: 26, minHeight: 96, padding: 0 },
  count: { fontFamily: fonts.sans, fontSize: 11, textAlign: 'right', marginTop: 8 },
  chips: { marginTop: 11, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1.2, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  chipText: { fontFamily: fonts.sansMedium, fontSize: 11.5 },
  notifyCard: { marginTop: 24, borderWidth: 1, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 16 },
  notifyRow: { flexDirection: 'row', alignItems: 'center' },
  notifyTitle: { fontFamily: fonts.sansMedium, fontSize: 14 },
  notifySub: { fontFamily: fonts.sans, fontSize: 11, marginTop: 2, paddingRight: 12 },
  previewWrap: { marginTop: 14, paddingTop: 14, borderTopWidth: 1 },
  previewLabel: { fontFamily: fonts.sansSemiBold, fontSize: 9, letterSpacing: 1.6, textTransform: 'uppercase', marginBottom: 8 },
  footer: { paddingHorizontal: GUTTER, paddingTop: 10, paddingBottom: 12 },
});
