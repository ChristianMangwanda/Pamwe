import { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Text } from '../../../components/ui/Text';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { useTheme } from '../../../providers/ThemeProvider';
import { useAuth } from '../../../providers/AuthProvider';
import { useCouple } from '../../../providers/CoupleProvider';
import { deleteMyAccount } from '../../../lib/account';
import { archiveEntries, exportText } from '../../../lib/archive';

export default function DeleteAccountScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { signOut, user } = useAuth();
  const { couple, partner, me } = useCouple();
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const partnerName = partner?.display_name?.split(' ')[0] ?? 'your partner';

  // The same file the archive offers, from the same rows. Reachable here
  // because this is the last moment it can be reached at all.
  const onExport = async () => {
    if (!couple?.id) return;
    setExporting(true);
    try {
      const rows = await archiveEntries(couple.id, 1000);
      const names: Record<string, string> = {};
      if (user?.id) names[user.id] = me?.display_name ?? 'You';
      if (partner?.id) names[partner.id] = partner.display_name ?? 'Your partner';
      await Share.share({ message: exportText(rows, names, null) });
    } catch (err: any) {
      Alert.alert("Couldn't export", err?.message ?? 'Try again in a moment.');
    } finally {
      setExporting(false);
    }
  };

  const runDeletion = async () => {
    try {
      setDeleting(true);
      await deleteMyAccount();
      await signOut();
      router.replace('/');
    } catch (err: any) {
      setDeleting(false);
      Alert.alert("Couldn't delete your account", err?.message ?? 'Try again in a moment.');
    }
  };

  const confirm = () => {
    Alert.alert(
      'Delete your account?',
      'This permanently removes your reflections and prayers. It cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete forever', style: 'destructive', onPress: runDeletion },
      ],
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} activeOpacity={0.7}>
          <Text variant="label" color={colors.muted}>Cancel</Text>
        </TouchableOpacity>
        <Text variant="label" color={colors.ink2}>Delete account</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text variant="h1" style={styles.title}>Delete my account</Text>

        {/* The handoff says this out loud for the first time, and it is exactly
            the demote-don't-delete rule the edge function has always followed:
            your half goes today, the days you spent together are half your
            partner's and are not yours alone to erase. */}
        <Text italic color={colors.ink2} style={styles.blurb}>
          Your profile and your own reflections go today. The days you read
          together stay with {partnerName}.
        </Text>

        <Card style={styles.card}>
          <Text variant="body" color={colors.ink2} style={styles.line}>
            • Your reflections and the prayers you wrote are deleted.
          </Text>
          <Text variant="body" color={colors.ink2} style={styles.line}>
            • Your partner keeps their own reflections and prayers.
          </Text>
          <Text variant="body" color={colors.ink2} style={styles.line}>
            • Your partner is unpaired and told that you've left.
          </Text>
          <Text variant="body" color={colors.ink2} style={styles.line}>
            • This is immediate and cannot be undone.
          </Text>
        </Card>

        {/* Above the destructive action, not beside it. Beside it, exporting
            reads as one of two equal choices; above it, it is the step before. */}
        <Card style={styles.keepCard}>
          <Text variant="label" color={colors.muted}>Keep a copy first</Text>
          <Text variant="body" color={colors.ink2} style={styles.keepLine}>
            One file, everything you have written.
          </Text>
          <Button
            title="Export everything"
            variant="secondary"
            onPress={onExport}
            disabled={deleting || exporting}
            loading={exporting}
            style={styles.exportBtn}
          />
        </Card>

        <View style={styles.footer}>
          <Button
            title="Delete my account"
            variant="ghost"
            onPress={confirm}
            loading={deleting}
            disabled={deleting}
          />
          <Button
            title="Keep my account"
            variant="ghost"
            onPress={() => router.back()}
            style={styles.keep}
            disabled={deleting}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  headerSpacer: { width: 48 },
  scroll: { padding: 24, flexGrow: 1 },
  title: { marginBottom: 12, textAlign: 'center' },
  blurb: { fontSize: 15, textAlign: 'center', lineHeight: 23, marginBottom: 22 },
  card: { padding: 22, gap: 14 },
  line: { lineHeight: 22 },
  keepCard: { padding: 20, gap: 6, marginTop: 16 },
  keepLine: { marginBottom: 4 },
  exportBtn: { marginTop: 8 },
  footer: { marginTop: 'auto', paddingTop: 32 },
  keep: { marginTop: 8 },
});
