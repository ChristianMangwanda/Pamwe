import { supabase } from './supabase';

/** What the other person did while you were away.
 *
 *  Derived at read time from the five tables that already record it, never
 *  stored (see 20260811000002). Delivered banners are dismissed on every
 *  foreground, deliberately, so before this the OS notification list was the
 *  only trail and opening the app erased it.
 */
export type ActivityKind = 'response' | 'prayer' | 'dream' | 'note' | 'verse_comment';

export type ActivityItem = {
  kind: ActivityKind;
  id: string;
  actorId: string;
  happenedAt: string;
  preview: string | null;
  target: Record<string, any>;
};

export async function getActivity(before?: string | null, limit = 40): Promise<ActivityItem[]> {
  const { data, error } = await supabase.rpc('activity_feed', {
    p_before: before ?? undefined,
    p_limit: limit,
  });
  if (error) throw error;
  return ((data ?? []) as any[]).map((r) => ({
    kind: r.kind,
    id: r.id,
    actorId: r.actor_id,
    happenedAt: r.happened_at,
    preview: r.preview,
    target: r.target ?? {},
  }));
}

/** Whether the dot shows. Capped server-side: the dot never carries a number,
 *  so nothing needs an exact count. */
export async function unreadActivityCount(): Promise<number> {
  const { data, error } = await supabase.rpc('unread_activity_count');
  if (error) throw error;
  return typeof data === 'number' ? data : 0;
}

/** Opening the list is what marks it read. */
export async function markActivitySeen(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return;
  const { error } = await supabase
    .from('users')
    .update({ last_seen_activity_at: new Date().toISOString() })
    .eq('id', user.id);
  if (error) throw error;
}

/** One line naming what happened, in the partner's name.
 *
 *  Pure, so it is testable without a database. A reaction carries no body, so
 *  the sentence has to supply the whole meaning; anything with words shows the
 *  words underneath instead.
 */
export function activityTitle(item: ActivityItem, partnerName: string): string {
  const ref = item.target?.book
    ? `${item.target.book} ${item.target.chapter}:${item.target.verse}`
    : 'a verse';

  switch (item.kind) {
    case 'response':
      switch (item.target?.responseKind) {
        case 'heart': return `${partnerName} left a heart on your reflection`;
        case 'amen': return `${partnerName} said amen to your reflection`;
        case 'quote': return `${partnerName} kept a line from your reflection`;
        default: return `${partnerName} replied to you`;
      }
    case 'prayer': return `${partnerName} added a prayer`;
    case 'dream': return `${partnerName} wrote down a dream`;
    case 'note': return `${partnerName} took note of ${ref}`;
    case 'verse_comment':
      return item.target?.commentKind === 'comment'
        ? `${partnerName} said something on ${ref}`
        : `${partnerName} responded on ${ref}`;
    default: return `${partnerName} did something`;
  }
}

/** Where tapping an item goes. Returns null when there is nowhere sensible,
 *  rather than guessing at a route that would land on the wrong screen. */
export function activityRoute(item: ActivityItem):
  { pathname: string; params?: Record<string, string>; anchored: boolean } | null {
  switch (item.kind) {
    case 'response':
      if (!item.target?.day) return null;
      // The reveal for the day the response sits on. Pinned by day for the same
      // reason the partner push carries one: current_day may have moved on.
      return {
        pathname: '/(tabs)/today/reveal',
        params: { day: String(item.target.day) },
        anchored: false,
      };
    case 'prayer':
      return { pathname: '/(tabs)/prayers', anchored: false };
    case 'dream':
      return { pathname: '/(tabs)/prayers', params: { tab: 'dreams' }, anchored: false };
    case 'note':
    case 'verse_comment': {
      const { book, chapter, verse } = item.target ?? {};
      if (!book || !chapter || !verse) return null;
      // Same split the partner pushes already make (usePushRouting): a note is
      // read in the chapter with the verse flashed, but a comment's words live
      // on the discussion page, so land there rather than a long press away.
      // Both are nested pushes inside the bible stack, so both need an anchor
      // or the back link falls through to Today and strands the tab.
      return {
        pathname: item.kind === 'verse_comment'
          ? '/(tabs)/bible/verse'
          : '/(tabs)/bible/[book]/[chapter]',
        params: { book: String(book), chapter: String(chapter), verse: String(verse) },
        anchored: true,
      };
    }
    default: return null;
  }
}
