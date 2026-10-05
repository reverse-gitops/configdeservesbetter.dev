# configdeservesbetter.dev

The public website for [configdeservesbetter.dev](https://configdeservesbetter.dev): a manifesto for treating configuration with the same care as code.

Built with [Astro](https://astro.build) and deployed to GitHub Pages. Sister site of [reversegitops.dev](https://reversegitops.dev), and built the same way.

```sh
npm install
npm run dev
```

## The manifesto

The text lives in [`manifesto.md`](manifesto.md), in this repo. **Editing it is the entire update**: the page is built from its structure, not from a copy.

`src/lib/manifesto.ts` reads it at build time and expects:

| In the markdown | On the site |
| --- | --- |
| `# Title` | The hero wordmark: first word grey, the rest in the gradient |
| A line starting with `*Draft` | The "Draft · feedback welcome" badge. Delete the line and the badge goes. |
| `## Heading` with `### N. Principle` headings under it | A promise section, plus a card in the overview grid and a link in the nav |
| `**Now:**` / `**Better:**` paragraphs in a principle | The contrasting Now/Better blocks. Anything else in a principle is rendered as-is beneath them. |
| A paragraph that is entirely in italics | The closing pull quote, one line per sentence, last line in the gradient |
| `<!-- comments -->` | Nothing. Authoring notes and TODOs never reach the site. |

Every other heading, list and paragraph renders as ordinary prose. The build fails if no promise section is found or a principle heading is not numbered, rather than shipping a broken page.

## Generated files

None of these are maintained by hand. They follow `manifesto.md` and `src/pages` automatically:

| Path | What |
| --- | --- |
| `/manifesto.md` | The manifesto as Markdown, with comments stripped |
| `/llms.txt` | Summary for language models and agents, including every principle |
| `/sitemap.xml` | Every page under `src/pages` |
| `public/og-image.png`, `favicon-32.png`, `apple-touch-icon.png` | Rendered from `og-image.svg` and `favicon.svg` before every build (`npm run render:images`) |

## Deployment

Every push to `main` builds and deploys through `.github/workflows/deploy.yml`. One-time setup in the repository settings:

1. **Settings → Pages → Source:** GitHub Actions.
2. **Settings → Pages → Custom domain:** `configdeservesbetter.dev`, then enforce HTTPS once the certificate is issued.
3. At the DNS provider, point the apex at GitHub Pages (`A` records `185.199.108.153`, `.109.153`, `.110.153`, `.111.153`, and the matching `AAAA` records).

## Attributions

- GitHub corner ribbon by [Tim Holman](https://github.com/tholman/github-corners) (MIT License)
- Logo based on the [Sliders Horizontal](https://lucide.dev/icons/sliders-horizontal) icon by [Lucide](https://lucide.dev) (ISC License)
