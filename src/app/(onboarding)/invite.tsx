import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Share, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Copy, ShareNetwork, Check } from 'phosphor-react-native';
import { Text } from '../../components/ui/Text';
import { BackLink } from '../../components/ui/BackLink';
import { Spinner } from '../../components/ui/Spinner';
import { fonts } from '../../constants/typography';
import { GUTTER } from '../../theme/tokens';
import { useTheme } from '../../providers/ThemeProvider';
import { useCouple } from '../../providers/CoupleProvider';
import { haptics } from '../../lib/haptics';
import { createCouple, getUserCouple } from '../../lib/couples';
import { supabase } from '../../lib/supabase';

const FALLBACK_POLL_MS = 30000;

export default function InviteScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { refresh } = useCouple();
  const [code, setCode] = useState<string | null>(null);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const started = useRef(false);

  // Idempotent: reuse an existing unpaired couple (e.g. after relaunch), else create one.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      try {
        const existing = await getUserCouple();
        if (existing?.invite_code) {
          if (existing.paired_at) return router.replace('/');
          setCode(existing.invite_code);
          setCoupleId(existing.id);
          return;
        }
        const couple = await createCouple();
        setCode(couple.invite_code);
        setCoupleId(couple.id);
        // Provider was loaded pre-couple; sync it so its realtime
        // subscription attaches and catches the partner joining.
        refresh();
      } catch (e: any) {
        Alert.alert('Could not create invite', e.message);
      }
    })();
  }, [router]);

  // Live-advance the moment the partner joins, with a slow fallback poll.
  useEffect(() => {
    if (!coupleId) return;
    const check = async () => {
      const couple = await getUserCouple();
      if (couple?.paired_at) router.replace('/(onboarding)/connected');
    };
    const channel = supabase
      .channel('pairing')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'couples', filter: `id=eq.${coupleId}` }, check)
      .subscribe();
    const fallback = setInterval(check, FALLBACK_POLL_MS);
    return () => { supabase.removeChannel(channel); clearInterval(fallback); };
  }, [coupleId, router]);

  const onCopy = async () => {
    if (!code) return;
    haptics.light();
    await Clipboard.setStringAsync(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const onShare = async () => {
    if (!code) return;
    haptics.tap();
    await Share.share({ message: `Join me on Pamwe. Enter this code to link with me: ${code}` });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <BackLink onPress={() => router.back()} />
      </View>

      <View style={styles.body}>
        <Text variant="h1" style={styles.title}>Share your code</Text>
        <Text italic color={colors.ink2} style={styles.subtitle}>Your partner enters this to link with you.</Text>

        <View style={[styles.codeCard, { backgroundColor: colors.surface, borderColor: colors.accent2 }]}>
          <Text style={[styles.code, { color: colors.accent }]}>{code ?? '····'}</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity onPress={onCopy} style={[styles.action, { borderColor: colors.line }]} accessibilityRole="button" accessibilityLabel="Copy code">
            {copied ? <Check size={16} color={colors.accent} weight="bold" /> : <Copy size={16} color={colors.accent} />}
            <Text style={[styles.actionLabel, { color: colors.accent }]}>{copied ? 'Copied' : 'Copy'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onShare} style={[styles.action, styles.actionPrimary, { backgroundColor: colors.accent }]} accessibilityRole="button" accessibilityLabel="Share code">
            <ShareNetwork size={16} color={colors.bg} />
            <Text style={[styles.actionLabel, { color: colors.bg }]}>Share</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.waiting}>
          <Spinner size={17} color={colors.muted} />
          <Text italic color={colors.muted} style={styles.waitingText}>Waiting for your partner to join…</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: GUTTER },
  header: { paddingTop: 8 },
  body: { flex: 1, alignItems: 'center', paddingTop: 14, paddingHorizontal: 14 },
  title: { textAlign: 'center' },
  subtitle: { fontSize: 15, textAlign: 'center', marginTop: 10 },
  codeCard: {
    marginTop: 28,
    width: '100%',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 20,
    paddingVertical: 26,
    alignItems: 'center',
  },
  code: { fontFamily: fonts.serifSemiBold, fontSize: 34, letterSpacing: 4.8 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16, width: '100%' },
  action: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 14,
  },
  actionPrimary: { borderWidth: 0 },
  actionLabel: { fontFamily: fonts.sansSemiBold, fontSize: 11, letterSpacing: 0.7, textTransform: 'uppercase' },
  waiting: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 30 },
  waitingText: { fontSize: 14 },
});
