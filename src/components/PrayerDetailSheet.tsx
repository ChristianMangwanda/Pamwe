import { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Switch, Alert } from 'react-native';
import { HandsPraying, SealCheck, PencilSimple, Trash, BellRinging } from 'phosphor-react-native';
import { BottomSheet } from './ui/BottomSheet';
import { Text } from './ui/Text';
import { CategoryChip } from './ui/CategoryChip';
import { Prayer, relativeTime } from './PrayerCard';
import { fonts } from '../constants/typography';
import { useTheme } from '../providers/ThemeProvider';
import { haptics } from '../lib/haptics';
import { getReminder, setReminder, clearReminder } from '../lib/prayerReminders';

const REMINDER_PRESETS: { label: string; hour: number; minute: number }[] = [
  { label: '8:00 AM', hour: 8, minute: 0 },
  { label: '12:00 PM', hour: 12, minute: 0 },
  { label: '9:00 PM', hour: 21, minute: 0 },
];

interface Props {
  prayer: Prayer | null;
  isMine: boolean;
  partnerName: string;
  prayedByMe: boolean;
  prayedByPartner: boolean;
  onClose: () => void;
  onMarkAnswered: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function PrayerDetailSheet({
  prayer, isMine, partnerName, prayedByMe, prayedByPartner, onClose, onMarkAnswered, onEdit, onDelete,
}: Props) {
  const { colors } = useTheme();

  // Per-prayer local reminder state. Loaded when the sheet opens on an active
  // prayer; a preset time schedules a daily on-device notification.
  const [reminder, setReminderState] = useState<{ hour: number; minute: number } | null>(null);
  const [savingReminder, setSavingReminder] = useState(false);
  useEffect(() => {
    if (!prayer || prayer.status === 'answered') { setReminderState(null); return; }
    let alive = true;
    getReminder(prayer.id).then((r) => { if (alive) setReminderState(r); }).catch(() => {});
    return () => { alive = false; };
  }, [prayer?.id, prayer?.status]);

  if (!prayer) return null;
  const prayerId = prayer.id;
  const prayerText = prayer.text;

  const toggleReminder = async (on: boolean) => {
    if (savingReminder) return;
    setSavingReminder(true);
    haptics.tap();
    try {
      if (!on) {
        await clearReminder(prayerId);
        setReminderState(null);
      } else {
        const preset = REMINDER_PRESETS[0];
        const ok = await setReminder(prayerId, prayerText, preset.hour, preset.minute);
        if (ok) setReminderState({ hour: preset.hour, minute: preset.minute });
        else Alert.alert('Notifications are off', 'Turn on notifications for Pamwe to set a reminder.');
      }
    } finally {
      setSavingReminder(false);
    }
  };

  const pickReminderTime = async (hour: number, minute: number) => {
    haptics.tap();
    const ok = await setReminder(prayerId, prayerText, hour, minute);
    if (ok) setReminderState({ hour, minute });
  };

  const answered = prayer.status === 'answered';
  const initial = (isMine ? 'You' : partnerName)[0]?.toUpperCase() ?? '?';
  const who = isMine ? 'You' : partnerName;

  const row = isMine
    ? prayedByPartner
      ? { label: `${partnerName} prayed today`, color: colors.accent, fill: true }
      : { label: `Waiting for ${partnerName}`, color: colors.muted, fill: false }
    : prayedByMe
      ? { label: 'You prayed today', color: colors.accent, fill: true }
      : { label: 'Not prayed yet', color: colors.muted, fill: false };

  return (
    <BottomSheet visible={!!prayer} onClose={onClose}>
      <View style={styles.headerRow}>
        <View style={[styles.avatar, { backgroundColor: colors.accent2 }]}>
          <Text style={[styles.avatarInitial, { color: colors.surface }]}>{initial}</Text>
        </View>
        <Text style={[styles.who, { color: colors.ink }]}>{who}</Text>
        <Text style={[styles.when, { color: colors.muted }]}>· {relativeTime(answered && prayer.answered_at ? prayer.answered_at : prayer.created_at)}</Text>
        <CategoryChip category={prayer.category} style={styles.chip} />
      </View>

      <Text style={[styles.text, { color: colors.ink }]}>{prayer.text}</Text>

      {answered ? (
        <>
          <View style={styles.answeredRow}>
            <SealCheck size={16} color={colors.accent} weight="fill" />
            <Text style={[styles.rowLabel, { color: colors.accent }]}>Answered</Text>
          </View>
          {prayer.answer_note ? (
            <Text variant="journal" italic color={colors.ink2} style={styles.note}>{prayer.answer_note}</Text>
          ) : null}
        </>
      ) : (
        <>
          <View style={styles.answeredRow}>
            <HandsPraying size={16} color={row.color} weight={row.fill ? 'fill' : 'regular'} />
            <Text style={[styles.rowLabel, { color: colors.ink2 }]}>{row.label}</Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              onPress={() => { haptics.tap(); onMarkAnswered(); }}
              style={[styles.answerBtn, { backgroundColor: colors.accent }]}
              accessibilityRole="button"
            >
              <SealCheck size={16} color={colors.bg} weight="fill" />
              <Text variant="cta" color={colors.bg} style={styles.answerBtnText}>Mark as answered</Text>
            </TouchableOpacity>

            {isMine && (
              <View style={styles.ownRow}>
                <TouchableOpacity onPress={() => { haptics.tap(); onEdit(); }} style={[styles.ownBtn, { borderColor: colors.accent2 }]}>
                  <PencilSimple size={15} color={colors.accent} weight="regular" />
                  <Text variant="chip" color={colors.accent} style={styles.ownBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { haptics.tap(); onDelete(); }} style={[styles.ownBtn, { borderColor: colors.line }]}>
                  <Trash size={15} color={colors.accent2} weight="regular" />
                  <Text variant="chip" color={colors.accent2} style={styles.ownBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={[styles.reminderCard, { borderTopColor: colors.line2 }]}>
            <View style={styles.reminderRow}>
              <BellRinging size={17} color={colors.accent2} weight="regular" />
              <View style={styles.flex}>
                <Text style={[styles.reminderTitle, { color: colors.ink }]}>Remind me to pray</Text>
                <Text style={[styles.reminderSub, { color: colors.muted }]}>A daily nudge on this phone.</Text>
              </View>
              <Switch
                value={!!reminder}
                onValueChange={toggleReminder}
                disabled={savingReminder}
                accessibilityLabel="Daily prayer reminder"
                trackColor={{ false: colors.line, true: colors.accent2 }}
                thumbColor={reminder ? colors.accent : colors.surface}
              />
            </View>
            {reminder && (
              <View style={styles.presetRow}>
                {REMINDER_PRESETS.map((p) => {
                  const on = reminder.hour === p.hour && reminder.minute === p.minute;
                  return (
                    <TouchableOpacity key={p.label} onPress={() => pickReminderTime(p.hour, p.minute)} activeOpacity={0.8}
                      accessibilityRole="button" accessibilityState={{ selected: on }}
                      style={[styles.preset, { borderColor: on ? colors.accent : colors.line, backgroundColor: on ? colors.accent : 'transparent' }]}>
                      <Text variant="chip" color={on ? colors.bg : colors.ink2}>{p.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        </>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontFamily: fonts.serifMedium, fontSize: 12 },
  who: { fontFamily: fonts.sansMedium, fontSize: 12 },
  when: { fontFamily: fonts.sans, fontSize: 11 },
  chip: { marginLeft: 'auto' },
  text: { fontFamily: fonts.serif, fontSize: 20, lineHeight: 30, marginTop: 16 },
  answeredRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 14 },
  rowLabel: { fontFamily: fonts.sansSemiBold, fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase' },
  note: { marginTop: 12, lineHeight: 24 },
  actions: { marginTop: 22, gap: 10 },
  answerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, borderRadius: 14, paddingVertical: 15 },
  answerBtnText: { letterSpacing: 0.9 },
  ownRow: { flexDirection: 'row', gap: 10 },
  ownBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderRadius: 14, paddingVertical: 14 },
  ownBtnText: { fontSize: 11, letterSpacing: 0.6 },
  flex: { flex: 1 },
  reminderCard: { marginTop: 20, paddingTop: 16, borderTopWidth: 1 },
  reminderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  reminderTitle: { fontFamily: fonts.serifMedium, fontSize: 15 },
  reminderSub: { fontFamily: fonts.sans, fontSize: 11, marginTop: 2 },
  presetRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  preset: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
});
