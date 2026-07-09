// Maps the design prototype's navigator.vibrate patterns to native haptics.
// tap: 8-10ms (tabs, segmented controls) · light: 12ms (toggles, "prayed")
// medium: 16-18ms (submit, swipe-open) · success: [14,40,22] · celebrate: [16,50,24,50,30]
import * as Haptics from 'expo-haptics';

const swallow = () => {};

export const haptics = {
  tap: () => Haptics.selectionAsync().catch(swallow),
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(swallow),
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(swallow),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(swallow),
  celebrate: () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(swallow);
    setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(swallow);
    }, 150);
  },
};
