import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Resvg } from '@resvg/resvg-js';

// Renders the PNGs that cannot be SVG (social previews, touch icons) from the
// SVG sources in public/. Runs before every build; the outputs are committed
// too, so `npm run dev` has them without a build.
const root = resolve(import.meta.dirname, '..');

const renders = [
  { from: 'og-image.svg', to: 'og-image.png', width: 1200, background: 'rgba(13,17,23,1)' },
  { from: 'favicon.svg', to: 'favicon-32.png', width: 32 },
  { from: 'favicon.svg', to: 'apple-touch-icon.png', width: 180, background: 'rgba(13,17,23,1)' },
];

for (const { from, to, width, background } of renders) {
  const svg = await readFile(resolve(root, 'public', from), 'utf8');
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    background,
    font: {
      loadSystemFonts: true,
      defaultFontFamily: 'DejaVu Sans Mono',
    },
  });
  await writeFile(resolve(root, 'public', to), resvg.render().asPng());
}
