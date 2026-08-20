import { readdirSync, statSync } from 'fs';
import { join } from 'path';

// The auth gate must be the only thing that answers "/".
//
// Expo Router elides route GROUPS from the URL, so while Today lived at
// src/app/(tabs)/(today)/index.tsx it resolved to "/", the same URL as the
// auth gate at src/app/index.tsx. The router picked the tabs, so every
// router.replace('/') in the app, and every cold start, mounted Today directly
// and src/app/index.tsx never ran at all.
//
// For a paired couple that is invisible, because the gate's answer for them IS
// the tabs. It broke the moment an account had no couple: App Review's signup,
// and every real signup at launch. They landed inside a tab shell with no way
// to reach pairing, and once the CoupleFence started ejecting them to "/" the
// two halves looped, tabs → "/" → tabs, several times a second, which is what
// shipped in build 33.
//
// Today is therefore a plain `today` directory, like the other five tabs, and
// answers "/today". This test fails if any index file ever lands at a
// group-only path again, because the symptom is a silent redirect rather than
// an error, and it is invisible to anyone whose own account is paired.
const APP = join(__dirname, '..', 'app');

/** Every index route whose URL is "/" once route groups are elided. */
function indexRoutesAtRoot(): string[] {
  const out: string[] = [];
  const walk = (dir: string, url: string) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) {
        // (group) contributes nothing to the URL; any other segment does.
        walk(p, /^\(.*\)$/.test(name) ? url : `${url}/${name}`);
      } else if (/^index\.tsx?$/.test(name) && url === '') {
        out.push(p.split(`src${require('path').sep}`)[1]);
      }
    }
  };
  walk(APP, '');
  return out;
}

describe('the root URL', () => {
  it('is owned by the auth gate alone', () => {
    expect(indexRoutesAtRoot()).toEqual(['app/index.tsx']);
  });
});
