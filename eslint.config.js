// Flat config for `npm run lint` (which is `expo lint`).
//
// The script existed long before this file did, so it could not run: neither
// eslint nor eslint-config-expo was installed, and there was no config anywhere.
// That is why no static analysis had ever run over this repo.
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      'node_modules/**',
      'ios/**',
      'android/**',
      '.expo/**',
      'dist/**',
      // Vendored design-handoff bundles and the design-sync cache. Someone
      // else's build output, and 90% of every finding when it is included.
      '.design-sync/**',
      '.ds-sync/**',
      'ds-bundle/**',
      'design_handoff_reveal_ceremony/**',
      // Design mockups, not app code.
      'docs/**',
      // Deno, not Node: URL imports resolve in the edge runtime, not in
      // ESLint's resolver, so import/no-unresolved is pure noise here.
      'supabase/functions/**',
      // Generated or non-JS: the Bible catalogue emitter's output, the Python
      // catalogue tooling, and the Ruby iOS patch scripts.
      'supabase/seeds/**',
      'scripts/**/*.py',
      'scripts/**/*.rb',
      'scripts/**/*.sql',
      // `supabase gen types typescript --local`, regenerated after every
      // migration. Nothing here is hand-written.
      'src/types/database.ts',
    ],
  },
  {
    // The 2026-08-11 backlog burn (179 errors -> 0). Two kinds of decision
    // live here, and they are different in kind: copy rules tuned to what the
    // rule is actually for, and the react-hooks v6 compiler preset switched
    // off because this app does not run the React Compiler.
    rules: {
      // Keep the part that catches a stray `>` or `}` in JSX (a real typo),
      // drop the part that wants &apos; in prose. The copy is written in
      // Christian's voice across ~30 screens; entity-escaping every
      // apostrophe makes the source unreadable for zero rendered difference.
      'react/no-unescaped-entities': ['error', { forbid: ['>', '}'] }],

      // The react-hooks v6 compiler rules assume the React Compiler will
      // memoize renders, and they flag three patterns this codebase uses
      // deliberately: load-then-setState in effects (every data screen),
      // reanimated shared-value writes (`sv.value = x`, which `immutability`
      // and `refs` read as mutation during render), and theme-closing helper
      // components in the static legal screens (hoisting them means threading
      // `colors` through 57 call sites of frozen copy). Without the compiler
      // these are style opinions, not bugs. Revisit if the compiler is ever
      // adopted.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/static-components': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/purity': 'off',
    },
  },
  {
    // Jest hoists jest.mock() above imports at runtime, so mocks are written
    // before the imports they shape; import/first cannot know that. require()
    // inside a test body is the sanctioned way to re-import a module after
    // jest.resetModules().
    files: ['src/__tests__/**'],
    rules: {
      'import/first': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
]);
