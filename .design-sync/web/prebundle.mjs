// Pre-bundles the Pamwe UI kit for the web so design-sync's converter can
// consume it like a normal package dist. react-native resolves to
// react-native-web; native-only modules are shimmed (see shims/); Metro's
// platform-extension resolution (<file>.web.js) is replicated with a plugin.
// Output: .design-sync/.cache/web-dist/{index.js,tokens.css,package.json,types/}.
// Resolve esbuild via the .design-sync/node_modules symlink → ../.ds-sync/node_modules.
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url)); // .design-sync/web
const ROOT = resolve(HERE, '../..'); // repo root
const OUT = resolve(ROOT, '.design-sync/.cache/web-dist');

const shim = (name) => resolve(HERE, 'shims', name);
const shims = {
  name: 'pamwe-shims',
  setup(b) {
    b.onResolve({ filter: /^expo-glass-effect$/ }, () => ({ path: shim('expo-glass-effect.tsx') }));
    b.onResolve({ filter: /supabase$/ }, (a) => {
      if (a.path.startsWith('.') && resolve(a.resolveDir, a.path).endsWith(join('src', 'lib', 'supabase')))
        return { path: shim('supabase.ts') };
      return null;
    });
    b.onResolve({ filter: /PamweFab$/ }, (a) => {
      if (a.path.startsWith('.') && resolve(a.resolveDir, a.path).endsWith(join('src', 'components', 'PamweFab')))
        return { path: shim('PamweFab.tsx') };
      return null;
    });
  },
};

// Metro resolves <file>.web.js over <file>.js; esbuild doesn't. Re-resolve
// every import normally, then swap in a .web sibling when one exists.
const preferWeb = {
  name: 'prefer-web-ext',
  setup(b) {
    b.onResolve({ filter: /.*/ }, async (a) => {
      if (a.pluginData?.__web || a.kind === 'entry-point') return null;
      const r = await b.resolve(a.path, {
        resolveDir: a.resolveDir,
        importer: a.importer,
        kind: a.kind,
        pluginData: { __web: true },
      });
      if (r.errors.length || r.external || !r.path) return r;
      const m = r.path.match(/^(.*)\.(mjs|cjs|jsx|tsx|ts|js)$/);
      if (m && !/\.web\.[^./]+$/.test(r.path)) {
        for (const ext of new Set([m[2], 'js', 'ts', 'tsx'])) {
          const w = `${m[1]}.web.${ext}`;
          if (existsSync(w)) return { ...r, path: w };
        }
      }
      return r;
    });
  },
};

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

await build({
  entryPoints: [resolve(HERE, 'entry.ts')],
  outfile: join(OUT, 'index.js'),
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2020',
  jsx: 'automatic',
  alias: { 'react-native': 'react-native-web' },
  external: ['react', 'react-dom', 'react/jsx-runtime', 'react-dom/client'],
  define: {
    __DEV__: 'false',
    'process.env.NODE_ENV': '"production"',
    'process.env.EXPO_OS': '"web"',
    'process.env.JEST_WORKER_ID': 'undefined',
  },
  // Belt-and-suspenders for process reads the defines don't cover: the bundle
  // runs in the browser, where process doesn't exist.
  banner: {
    js: 'var process = globalThis.process || { env: { NODE_ENV: "production" } };\nvar global = globalThis;',
  },
  loader: { '.png': 'dataurl' },
  resolveExtensions: ['.web.tsx', '.web.ts', '.web.jsx', '.web.js', '.tsx', '.ts', '.jsx', '.js', '.json'],
  plugins: [shims, preferWeb],
  logLevel: 'warning',
});

// tokens.css is generated from src/theme/tokens.ts each build so it can't rot.
{
  const r = await build({
    entryPoints: [resolve(ROOT, 'src/theme/tokens.ts')],
    bundle: true,
    format: 'esm',
    write: false,
  });
  const mod = await import('data:text/javascript;base64,' + Buffer.from(r.outputFiles[0].text).toString('base64'));
  const vars = (o) => Object.entries(o).map(([k, v]) => `  --${k}: ${v};`).join('\n');
  writeFileSync(
    join(OUT, 'tokens.css'),
    `/* Generated from src/theme/tokens.ts by prebundle.mjs. Reference values:
 * components read these through useTheme(), not CSS custom properties. */
:root {
${vars(mod.light)}
  --gutter: ${mod.GUTTER}px;
${vars(Object.fromEntries(Object.entries(mod.swatches).map(([k, v]) => ['swatch-' + k, v])))}
}
[data-theme="dark"] {
${vars(mod.dark)}
}
`
  );
}

// package.json makes the converter treat web-dist as the package root.
const appVersion = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version ?? '1.0.0';
writeFileSync(
  join(OUT, 'package.json'),
  JSON.stringify(
    {
      name: 'pamwe',
      version: appVersion,
      main: 'index.js',
      module: 'index.js',
      types: 'types/.design-sync/web/entry.d.ts',
    },
    null,
    2
  ) + '\n'
);

// .d.ts tree via the repo's own tsc (typescript is a devDependency).
execFileSync('npx', ['tsc', '--project', resolve(HERE, 'tsconfig.dts.json')], { cwd: ROOT, stdio: 'inherit' });
console.error(`web-dist ready at ${OUT}`);
