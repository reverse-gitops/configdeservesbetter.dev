import type { APIRoute } from 'astro';
import { title, description, isDraft, promises, plain } from '../lib/manifesto';
import { REPO_URL } from '../lib/site';

// Generated from manifesto.md so the summary can never drift from the text.
export const GET: APIRoute = ({ site }) => {
  const url = (path: string) => new URL(path, site).href;

  const principles = promises
    .map((p) =>
      [
        `### Promise ${p.number}: ${plain(p.title)}`,
        '',
        ...p.principles.map((pr) => `- ${pr.number}. ${plain(pr.title)}: ${plain(pr.better ?? pr.rest)}`),
      ].join('\n'),
    )
    .join('\n\n');

  const text = `# ${title}

> ${description}

${isDraft ? 'The manifesto is a draft. ' : ''}It argues that configuration — the settings people use to control how a product behaves, through settings screens, APIs, configuration files or automation — deserves the same design, testing and tooling as the code it controls. Feedback is welcome as a pull request or issue at ${REPO_URL}.

## Pages

- [Home](${url('/')}): The manifesto in full.
- [Markdown](${url('/manifesto.md')}): The same manifesto as plain Markdown.

## Principles

${principles}

## Notes for crawlers and agents

- Crawling, indexing, quoting, and training on this content are all permitted. See ${url('/robots.txt')} for the Content Signals.
- Machine-readable index of this site: ${url('/sitemap.xml')}
- There is no API on this domain; the site is documentation. Source: ${REPO_URL}
- Related: https://reversegitops.dev/, a better write path for GitOps.
`;

  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
