import { useEffect, useState } from 'react';
import { View, StyleSheet, AppState } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { PamweWordmark } from '../../components/PamweWordmark';
import { TwineDivider } from '../../components/ui/TwineDivider';
import { Avatar } from '../../components/ui/Avatar';
import { colors } from '../../constants/colors';
import { getUserCouple } from '../../lib/couples';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';

const FALLBACK_POLL_MS = 30000;

export default function WaitingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [inviteCode, setInviteCode] = useState('');
  const [coupleId, setCoupleId] = useState<string | null>(null);

  useEffect(() => {
    loadCouple();
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') checkIfPaired();
    });
    return () => sub.remove();
  }, []);

  // Live update the moment the partner joins (UPDATE sets partner_b_id + paired_at),
  // with a slow fallback poll as a safety net the way the entries waiting screen does.
  useEffect(() => {
    if (!coupleId) return;

    const channel = supabase
      .channel('pairing')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'couples', filter: `id=eq.${coupleId}` },
        () => { checkIfPaired(); },
      )
      .subscribe();

    const fallback = setInterval(checkIfPaired, FALLBACK_POLL_MS);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(fallback);
    };
  }, [coupleId]);

  const loadCouple = async () => {
    const couple = await getUserCouple();
    if (couple?.id) setCoupleId(couple.id);
    if (couple?.invite_code) setInviteCode(couple.invite_code);
    if (couple?.paired_at) router.replace('/');
  };

  const checkIfPaired = async () => {
    const couple = await getUserCouple();
    if (couple?.paired_at) router.replace('/');
  };

  const initial = user?.email?.[0]?.toUpperCase() ?? '?';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <PamweWordmark size={24} />
      </View>

      <View style={styles.content}>
        <View style={styles.avatars}>
          <Avatar initial={initial} />
          <TwineDivider width={40} />
          <Avatar initial="?" dashed />
        </View>

        <Text variant="heading" style={styles.title}>
          Waiting for your partner
        </Text>
        <Text variant="body" color={colors.textMuted} style={styles.subtitle}>
          Share your invite code and we'll connect you as soon as they join.
        </Text>

        {inviteCode ? (
          <View style={styles.codeContainer}>
            <Text variant="label" color={colors.textLight}>Your code</Text>
            <Text variant="hero" style={styles.code}>{inviteCode}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.footer}>
        <Button
          title="Back"
          variant="ghost"
          onPress={() => router.back()}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  header: {
    paddingTop: 40,
    paddingBottom: 20,
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  avatars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  codeContainer: {
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  code: {
    letterSpacing: 8,
  },
  footer: {
    paddingBottom: 24,
  },
});
