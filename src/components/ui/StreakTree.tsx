import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Ellipse, Line, G } from 'react-native-svg';
import { Text } from './Text';
import { fonts } from '../../constants/typography';
import { useTheme } from '../../providers/ThemeProvider';

// A quiet growth metaphor: the couple's constancy is a plant that grows with
// the PLANS they finish together. Drawn in the app's ink/accent language so it
// reads in light and dark.
//
// It used to grow with days read and sat on Today beside the streak bar, where
// the two said the same thing twice and neither meant much. Finishing a plan is
// rare (a fortnight to a year), so the tree now moves only for that, which
// makes each step worth seeing. Christian's call, 2026-08-01.
export type TreeStage = 0 | 1 | 2 | 3 | 4 | 5;

/** Finished plans it takes to grow the tree to full. Lives here rather than in
 *  lib so this file stays free of the Supabase client and can be unit tested as
 *  the pure drawing it is. One constant, so the ceiling is a one-line
 *  recalibration once we see how it feels over a year. */
export const TREE_FULL_AT = 3;

// Stages spread evenly across the run to TREE_FULL_AT. At a ceiling of 3 a plan
// is worth two stages (1 -> 2, 2 -> 4, 3 -> 5); at 5 it is worth one each.
// Either way the last finished plan is what tips it into full bloom.

export function treeStage(finishedPlans: number): TreeStage {
  if (finishedPlans <= 0) return 0;
  const ceiling = TREE_FULL_AT > 0 ? TREE_FULL_AT : 1;
  return Math.min(5, Math.ceil((finishedPlans / ceiling) * 5)) as TreeStage;
}

const STAGE_STEM_TOP = [70, 62, 50, 38, 26, 20];

// One height per stage, no interpolation. Days read could ease between stages
// because they arrive daily; finished plans cannot, since there is no such
// thing as being part-way through one as far as this is concerned.
export function stemTopFor(finishedPlans: number): number {
  return STAGE_STEM_TOP[treeStage(finishedPlans)];
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

  // Stem grows with the days read. viewBox 72x84; ground at y=72.
  const groundY = 72;
  const stemTop = stemTopFor(count);

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
