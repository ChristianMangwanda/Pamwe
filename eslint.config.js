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
      'ds-bundle/**',
      'design_handoff_reveal_ceremony/**',
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
]);
