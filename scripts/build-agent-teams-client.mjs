/** Rebuild the shipped Agent Teams client from its maintained JavaScript and CSS. */
import { readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { transform } from 'lightningcss'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = resolve(root, 'packages/opc-profile/agent-teams-desktop/source')
const { name: pluginId } = JSON.parse(await readFile(resolve(source, 'package.json'), 'utf8'))

// Match the Harness browser loader's platform table. Shared runtime instances
// must resolve through its require function, while lucide-react is bundled.
const external = [
  'react', 'react/jsx-runtime', 'react-dom', 'react-dom/client', '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-ui-slots', '@deepseek-ai/dsh-client-web-react',
  '@deepseek-ai/dsh-client-ui-primitives', '@deepseek-ai/dsh-client-ui-attachment',
  '@deepseek-ai/dsh-client-schema-form', '@deepseek-ai/dsh-client-runtime/client',
]
const inlineSafe = /^@deepseek-ai\/(?:cosmokit|schemastery)(\/|$)|^@deepseek-ai\/dsh-(?:host-apiproxy|session|llm|tools|brand)(\/|$)|^@deepseek-ai\/dsh-[a-z0-9]+(?:-[a-z0-9]+)*\/remote$/

const result = await build({
  absWorkingDir: root,
  entryPoints: [resolve(source, 'lib/client/index.js')],
  outfile: resolve(source, 'lib/client.js'),
  bundle: true,
  platform: 'browser',
  format: 'cjs',
  target: 'es2022',
  charset: 'utf8',
  sourcemap: 'linked',
  external,
  write: false,
  metafile: true,
  define: {
    'process.env.NODE_ENV': '"production"',
    'import.meta.env.MODE': '"production"',
    'import.meta.env': '{"MODE":"production"}',
  },
  banner: { js: `window.__ModuleLoader__.load({ id: ${JSON.stringify(pluginId)}, factory: (require) => {\nvar module = { exports: {} }; var exports = module.exports;` },
  footer: { js: 'return module.exports; } });' },
  plugins: [{
    name: 'dsh-client-purity',
    setup(builder) {
      builder.onResolve({ filter: /^@deepseek-ai\// }, ({ path }) => {
        if (external.includes(path)) return { path, external: true }
        if (inlineSafe.test(path)) return undefined
        throw new Error(`Client bundle purity: unsupported cross-plugin value import ${path}`)
      })
    },
  }, {
    name: 'dsh-css-modules-inline',
    setup(builder) {
      builder.onLoad({ filter: /\.module\.css$/ }, async ({ path }) => {
        const { code, exports: cssExports } = transform({
          // Relative filenames keep CSS hashes stable across worktrees/machines.
          filename: relative(source, path).replaceAll('\\', '/'),
          code: await readFile(path),
          cssModules: { pattern: '[hash]_[local]' },
          minify: true,
        })
        const classMap = Object.fromEntries(Object.entries(cssExports ?? {})
          .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
          .map(([local, value]) => [local, value.name]))
        return {
          loader: 'js',
          contents: `
const tagId = ${JSON.stringify(`${pluginId}/${basename(path)}`)};
if (typeof document !== 'undefined' && !document.querySelector('style[data-plugin-css=' + JSON.stringify(tagId) + ']')) {
  const tag = document.createElement('style');
  tag.dataset.plugin = ${JSON.stringify(pluginId)};
  tag.dataset.pluginCss = tagId;
  tag.textContent = ${JSON.stringify(code.toString())};
  document.head.appendChild(tag);
}
export default ${JSON.stringify(classMap)};`,
        }
      })
    },
  }],
})

// Refuse to ship unresolved dependencies the frozen loader table cannot serve.
for (const output of Object.values(result.metafile.outputs)) {
  for (const dependency of output.imports) {
    if (dependency.external && !external.includes(dependency.path)) {
      throw new Error(`Unsupported browser runtime dependency: ${dependency.path}`)
    }
  }
}
for (const output of result.outputFiles) await writeFile(output.path, output.contents)
for (const output of result.outputFiles) {
  console.log(`Built ${relative(root, output.path)} (${output.contents.length} bytes)`)
}
