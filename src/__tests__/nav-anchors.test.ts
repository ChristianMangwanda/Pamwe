import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// The navigation trap, made impossible to reintroduce.
//
// A push into a screen that is NOT its tab's root mounts that screen as the
// stack's ONLY route unless the push passes `withAnchor` AND the target stack
// declares `unstable_settings.initialRouteName`. When it does, the back link
// falls through to the tab navigator, lands on Today, and that tab stays stuck
// on the pushed screen until the app is restarted, with no in-app way back.
//
// Christian hit it through the weekly recap. Round one fixed the three
// notification routes; this test was written after round two found NINE more
// in-app ones, because fixing them one report at a time clearly was not
// converging. Same-stack pushes are exempt: the stack already has routes under
// them.

const APP = join(__dirname, '..', 'app', '(tabs)');
const TABS = ['today', 'bible', 'plans', 'prayers', 'reflect', 'you'];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return walk(p);
    return /\.tsx?$/.test(name) ? [p] : [];
  });
}

/** Which tab's stack a source file belongs to, or null outside the tabs. */
function tabOf(file: string): string | null {
  const rest = file.split(`app${require('path').sep}(tabs)${require('path').sep}`)[1];
  return rest ? rest.split(require('path').sep)[0] : null;
}

const anchoredStacks = new Set(
  TABS.filter((t) => {
    try {
      return readFileSync(join(APP, t, '_layout.tsx'), 'utf8').includes('unstable_settings');
    } catch {
      return false;
    }
  }),
);

// router.push('/(tabs)/x/y') and router.push({ pathname: '/(tabs)/x/y', ... }).
const NAV = /router\.(?:push|replace)\(\s*(?:\{[^}]*?pathname:\s*'([^']+)'|['"`]([^'"`]+))/gs;

/**
 * The full text of the router call starting at `from`, by matching parens.
 *
 * A fixed-size window was the obvious thing and it was wrong: the option can
 * trail the pathname object by however many lines of comment sit inside the
 * call, so a comment long enough to push it past the window read as a missing
 * anchor. This ends where the call ends.
 */
function callText(src: string, from: number): string {
  const open = src.indexOf('(', from);
  if (open < 0) return '';
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '(') depth++;
    else if (src[i] === ')' && --depth === 0) return src.slice(open, i + 1);
  }
  return src.slice(open);
}

type Nav = { file: string; line: number; target: string; targetTab: string; anchored: boolean };

function crossTabNestedNavigations(): Nav[] {
  const out: Nav[] = [];
  const files = [...walk(join(__dirname, '..', 'app')), ...walk(join(__dirname, '..', 'hooks'))];
  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    const from = tabOf(file);
    for (const m of src.matchAll(NAV)) {
      const target = m[1] ?? m[2];
      if (!target?.startsWith('/(tabs)/')) continue;
      const parts = target.slice('/(tabs)/'.length).split('/');
      // A tab root needs nothing: it is already the stack's first screen.
      if (parts.length < 2 || parts[1] === '' || parts[1] === 'index') continue;
      if (from === parts[0]) continue;
      out.push({
        file: file.split(`src${require('path').sep}`)[1],
        line: src.slice(0, m.index).split('\n').length,
        target,
        targetTab: parts[0],
        anchored: callText(src, m.index!).includes('withAnchor'),
      });
    }
  }
  return out;
}

describe('cross-tab navigation into a nested screen', () => {
  const navs = crossTabNestedNavigations();

  it('finds the navigations it is meant to be checking', () => {
    // A regex that silently matches nothing would make every assertion below
    // vacuously pass, which is the one way this test could rot into a no-op.
    expect(navs.length).toBeGreaterThan(5);
  });

  it('always passes withAnchor', () => {
    const missing = navs.filter((n) => !n.anchored)
      .map((n) => `${n.file}:${n.line} -> ${n.target}`);
    expect(missing).toEqual([]);
  });

  it('only targets stacks that declare an initial route to anchor to', () => {
    // withAnchor is inert without it, so the two halves must ship together.
    const unanchorable = navs.filter((n) => !anchoredStacks.has(n.targetTab))
      .map((n) => `${n.file}:${n.line} -> ${n.target} (${n.targetTab}/_layout.tsx has no unstable_settings)`);
    expect(unanchorable).toEqual([]);
  });
});
