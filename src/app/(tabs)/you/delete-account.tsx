import { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Text } from '../../../components/ui/Text';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { useTheme } from '../../../providers/ThemeProvider';
import { useAuth } from '../../../providers/AuthProvider';
import { deleteMyAccount } from '../../../lib/account';

export default function DeleteAccountScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { signOut } = useAuth();
  const [deleting, setDeleting] = useState(false);

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
        <Text variant="h2" italic style={styles.title}>This removes you from Pamwe</Text>

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

        <View style={styles.footer}>
          <Button
            title="Delete my account"
            variant="primary"
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
  title: { marginBottom: 24, textAlign: 'center' },
  card: { padding: 22, gap: 14 },
  line: { lineHeight: 22 },
  footer: { marginTop: 'auto', paddingTop: 32 },
  keep: { marginTop: 8 },
});
