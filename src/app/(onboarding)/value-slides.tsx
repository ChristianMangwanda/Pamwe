import { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated from 'react-native-reanimated';
import { BookOpen, LockKey, HandsPraying } from 'phosphor-react-native';
import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { BackLink } from '../../components/ui/BackLink';
import { fadeUp } from '../../lib/motion';
import { haptics } from '../../lib/haptics';
import { GUTTER } from '../../theme/tokens';
import { useTheme } from '../../providers/ThemeProvider';
import { ONB_INTENT_KEY } from '../(auth)/welcome';

// Copy lifted verbatim from the prototype's valueSlides array.
const SLIDES = [
  { Icon: BookOpen, title: 'Read together', body: 'Move through Scripture side by side: the same passage, the same day, wherever you each are.' },
  { Icon: LockKey, title: 'Reflect, then reveal', body: "You each write alone. It stays sealed until you've both finished. Then you open it together." },
  { Icon: HandsPraying, title: 'Carry each other', body: 'Share prayer points. Pray for what the other is walking through, every day.' },
];

export default function ValueSlidesScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [idx, setIdx] = useState(0);

  // Code-holders (welcome → "I have an invite code") skip the value sell.
  useEffect(() => {
    AsyncStorage.getItem(ONB_INTENT_KEY).then((intent) => {
      if (intent === 'join') router.replace('/(onboarding)/name');
    });
  }, [router]);

  const slide = SLIDES[idx];
  const isLast = idx === SLIDES.length - 1;

  const next = () => {
    haptics.tap();
    if (isLast) router.replace('/(onboarding)/name');
    else setIdx((i) => i + 1);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        {idx > 0 ? (
          <BackLink onPress={() => setIdx((i) => i - 1)} />
        ) : (
          <View />
        )}
        <TouchableOpacity onPress={() => router.replace('/(onboarding)/name')} hitSlop={12} accessibilityRole="button">
          <Text color={colors.muted} style={styles.skip}>Skip</Text>
        </TouchableOpacity>
      </View>

      <Animated.View key={idx} entering={fadeUp} style={styles.body}>
        <View style={[styles.iconWrap, { backgroundColor: colors.surface2, borderColor: colors.lineAccent }]}>
          <slide.Icon size={44} color={colors.accent} weight="regular" />
        </View>
        <Text style={[styles.title, { color: colors.ink }]}>{slide.title}</Text>
        <Text color={colors.ink2} style={styles.slideBody}>{slide.body}</Text>
      </Animated.View>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { width: i === idx ? 20 : 7, backgroundColor: i === idx ? colors.accent : colors.line2 },
              ]}
            />
          ))}
        </View>
        <Button title="Continue" onPress={next} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: GUTTER },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 },
  skip: { fontSize: 12, fontWeight: '600' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontFamily: 'Fraunces_300Light', fontSize: 34, lineHeight: 36, textAlign: 'center', marginTop: 30 },
  slideBody: { fontSize: 16, lineHeight: 25.6, textAlign: 'center', marginTop: 14 },
  footer: { paddingBottom: 12 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 7, marginBottom: 22 },
  dot: { height: 7, borderRadius: 4 },
});
