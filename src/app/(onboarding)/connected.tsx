import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated from 'react-native-reanimated';
import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { Floral } from '../../components/ui/Floral';
import { popIn } from '../../lib/motion';
import { haptics } from '../../lib/haptics';
import { fonts } from '../../constants/typography';
import { GUTTER } from '../../theme/tokens';
import { useTheme } from '../../providers/ThemeProvider';
import { getUserCouple, getPartnerProfile, profileInitial } from '../../lib/couples';
import { getMyProfile } from '../../lib/account';
import {
  getNotificationPermissionStatus,
  requestPushPermission,
  getPushTokenIfGranted,
  savePushToken,
} from '../../lib/notifications';

export default function ConnectedScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [me, setMe] = useState<string>('You');
  const [myInitial, setMyInitial] = useState('?');
  const [partner, setPartner] = useState<string>('your partner');
  const [partnerInitial, setPartnerInitial] = useState('?');
  // The permission ask lives here, not at sign-in. iOS asks once and a refusal
  // is permanent, so it should arrive when there is a person to name and a
  // reason to say yes, rather than in the first seconds of an empty account.
  const [askPush, setAskPush] = useState(false);
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    (async () => {
      haptics.celebrate();
      const [mine, couple] = await Promise.all([getMyProfile(), getUserCouple()]);
      if (mine?.display_name) setMe(mine.display_name);
      setMyInitial(profileInitial(mine) ?? '?');
      const p = await getPartnerProfile(couple);
      if (p?.display_name) setPartner(p.display_name);
      setPartnerInitial(profileInitial(p) ?? '?');

      // Only offer where the OS has not already been answered. A phone that
      // said yes long ago just registers; one that said no is not nagged here.
      const status = await getNotificationPermissionStatus().catch(() => null);
      if (status === 'undetermined') setAskPush(true);
      else if (status === 'granted') getPushTokenIfGranted().then((t) => { if (t) savePushToken(t); });
    })();
  }, []);

  const enablePush = async () => {
    setAsking(true);
    haptics.tap();
    const granted = await requestPushPermission().catch(() => false);
    if (granted) {
      const token = await getPushTokenIfGranted().catch(() => null);
      if (token) await savePushToken(token).catch(() => {});
    }
    setAsking(false);
    router.replace('/');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.body}>
        {/* Side by side and both named, rather than overlapped. The handoff
            asks for two people standing together, not one badge partly hiding
            another, and a name under each is what makes it a pair rather than
            a decoration. */}
        <View style={styles.avatars}>
          <Animated.View entering={popIn}>
            <Avatar initial={myInitial} name={me} dashed={false} />
          </Animated.View>
          <Animated.View entering={popIn.delay(140)}>
            <Avatar initial={partnerInitial} name={partner} />
          </Animated.View>
        </View>

        <Floral variant="divider" style={styles.divider} />

        {/* Naming who arrived, not the state of the record. "You're linked" is
            a fact about the database; "Ammy joined" is what happened. */}
        <Text style={[styles.title, { color: colors.ink }]}>{partner} joined</Text>

        {askPush && (
          <View style={[styles.prime, { backgroundColor: colors.surface, borderColor: colors.lineAccent }]}>
            <Text style={[styles.primeText, { color: colors.ink }]}>
              Pamwe can tell you the moment {partner} has written, so neither of you is left waiting
              without knowing.
            </Text>
          </View>
        )}
      </View>

      <SafeAreaView edges={['bottom']} style={styles.footer}>
        {askPush ? (
          <>
            <Button title={`Tell me when ${partner} writes`} onPress={enablePush} loading={asking} />
            <Button
              title="Not now"
              variant="secondary"
              onPress={() => { haptics.tap(); router.replace('/'); }}
              style={styles.secondary}
            />
          </>
        ) : (
          <Button title="Begin today's reading" onPress={() => router.replace('/')} />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 42 },
  avatars: { flexDirection: 'row', alignItems: 'flex-start', gap: 20 },
  divider: { width: 140, height: 26, marginTop: 24, opacity: 0.8 },
  title: { fontFamily: fonts.serifLight, fontSize: 34, lineHeight: 36, marginTop: 22, textAlign: 'center' },
  prime: { marginTop: 30, borderWidth: 1, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 15 },
  primeText: { fontFamily: fonts.serif, fontSize: 14, lineHeight: 21.5, textAlign: 'center' },
  footer: { paddingHorizontal: GUTTER, paddingBottom: 12 },
  secondary: { marginTop: 10 },
});
