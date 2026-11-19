import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'

const root = fileURLToPath(new URL('../', import.meta.url))
const source = (path) => new URL('../' + path, import.meta.url)
const asset = async (path, mime) =>
  'data:' + mime + ';base64,' + (await readFile(source('public/' + path))).toString('base64')
const embedded = {}
for (const folder of ['atlas', 'sky', 'terrain-materials']) {
  for (const file of await readdir(source('public/' + folder))) {
    if (file.endsWith('.webp'))
      embedded['/' + folder + '/' + file] = await asset(folder + '/' + file, 'image/webp')
  }
}
const { output } = await build({
  root,
  configFile: false,
  logLevel: 'error',
  build: {
    target: 'es2022',
    write: false,
    copyPublicDir: false,
    modulePreload: false,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
})
const code = output.find((file) => file.type === 'chunk' && file.isEntry).code
const html = output.find((file) => file.fileName === 'index.html').source
const css = output.find((file) => file.fileName.endsWith('.css')).source
const icon = await asset('sigil.svg', 'image/svg+xml')
const legal = await Promise.all(
  [
    'LICENSE',
    'dist/licenses/third-party.md',
    'public/sky/CREDITS.md',
    'public/terrain-materials/CREDITS.md',
  ].map((file) => readFile(source(file), 'utf8')),
)
const inline = (value) => value.replace(/<\/script/gi, '<\\/script')
const standalone = html
  .replace(/<script type="module"[^>]*src="[^"]+"[^>]*><\/script>/, '')
  .replace(/<link rel="stylesheet"[^>]*>/, () => '<style>' + css + '</style>')
  .replaceAll('/sigil.svg', icon)
  .replace(
    '</body>',
    () =>
      '<script type="application/json" id="licenses">' +
      inline(JSON.stringify(legal)) +
      '</script>\n' +
      '<script type="module">globalThis.faultlineAssets=' +
      JSON.stringify(embedded) +
      ';\n' +
      inline(code) +
      '</script>\n</body>',
  )
await mkdir(source('dist/'), { recursive: true })
await writeFile(source('dist/faultline-local.html'), standalone)
console.log(
  'Created dist/faultline-local.html (' + (Buffer.byteLength(standalone) / 1048576).toFixed(1) + ' MiB)',
)
