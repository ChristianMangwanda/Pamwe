import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Ellipse, Line, G } from 'react-native-svg';
import { Text } from './Text';
import { fonts } from '../../constants/typography';
import { useTheme } from '../../providers/ThemeProvider';

// A quiet growth metaphor for the streak: the couple's constancy is a plant that
// grows with the days they read together. Discrete stages tied to thresholds,
// drawn in the app's ink/accent language so it reads in light and dark.
export type TreeStage = 0 | 1 | 2 | 3 | 4 | 5;

export function treeStage(count: number): TreeStage {
  if (count >= 30) return 5;
  if (count >= 14) return 4;
  if (count >= 7) return 3;
  if (count >= 3) return 2;
  if (count >= 1) return 1;
  return 0;
}

const STAGE_WORD: Record<TreeStage, string> = {
  0: 'Ready to plant',
  1: 'Planted',
  2: 'Taking root',
  3: 'Growing',
  4: 'Reaching up',
  5: 'In full bloom',
};

export function StreakTree({ count }: { count: number }) {
  const { colors } = useTheme();
  const stage = treeStage(count);
  const stem = colors.accent2;
  const leaf = colors.accent2;
  const bloom = colors.accent;

  // Stem grows taller with each stage. viewBox 72x84; ground at y=72.
  const groundY = 72;
  const stemTopByStage = [70, 62, 50, 38, 26, 20];
  const stemTop = stemTopByStage[stage];

  return (
    <View style={styles.wrap}>
      <Svg width={72} height={84} viewBox="0 0 72 84">
        {/* soil */}
        <Ellipse cx={36} cy={groundY + 4} rx={20} ry={5} fill={colors.line2} />
        <Line x1={16} y1={groundY} x2={56} y2={groundY} stroke={colors.line} strokeWidth={1.5} strokeLinecap="round" />

        {stage === 0 && (
          // a seed resting in the soil
          <Circle cx={36} cy={groundY - 2} r={3.2} fill={stem} />
        )}

        {stage >= 1 && (
          <G>
            {/* stem */}
            <Path
              d={`M36 ${groundY} C 34 ${(groundY + stemTop) / 2}, 38 ${(groundY + stemTop) / 2}, 36 ${stemTop}`}
              stroke={stem}
              strokeWidth={2.4}
              strokeLinecap="round"
              fill="none"
            />
            {/* first leaves appear at stage 2 */}
            {stage >= 2 && (
              <>
                <Path d={`M36 ${groundY - 14} C 26 ${groundY - 20}, 24 ${groundY - 10}, 36 ${groundY - 10} Z`} fill={leaf} opacity={0.9} />
                <Path d={`M36 ${groundY - 20} C 46 ${groundY - 26}, 48 ${groundY - 16}, 36 ${groundY - 16} Z`} fill={leaf} opacity={0.9} />
              </>
            )}
            {/* upper leaves at stage 3+ */}
            {stage >= 3 && (
              <>
                <Path d={`M36 ${stemTop + 14} C 26 ${stemTop + 8}, 24 ${stemTop + 18}, 36 ${stemTop + 18} Z`} fill={leaf} />
                <Path d={`M36 ${stemTop + 8} C 46 ${stemTop + 2}, 48 ${stemTop + 12}, 36 ${stemTop + 12} Z`} fill={leaf} />
              </>
            )}
            {/* a bud at stage 4, a bloom at stage 5 */}
            {stage === 4 && <Circle cx={36} cy={stemTop} r={4.5} fill={bloom} opacity={0.85} />}
            {stage === 5 && (
              <G>
                {[0, 72, 144, 216, 288].map((deg) => (
                  <Ellipse
                    key={deg}
                    cx={36}
                    cy={stemTop - 7}
                    rx={3.6}
                    ry={7}
                    fill={bloom}
                    opacity={0.92}
                    transform={`rotate(${deg} 36 ${stemTop})`}
                  />
                ))}
                <Circle cx={36} cy={stemTop} r={3.4} fill={colors.accent2} />
              </G>
            )}
          </G>
        )}
      </Svg>
      <Text style={[styles.word, { color: colors.muted }]}>{STAGE_WORD[stage]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 4 },
  word: { fontFamily: fonts.sansSemiBold, fontSize: 9.5, letterSpacing: 1.6, textTransform: 'uppercase' },
});
