import { Marked, type Token, type Tokens } from 'marked';
// The manifesto lives at the repo root. Imported via Vite ?raw so it is inlined
// at build time — the prerender entry is bundled into dist/, so a runtime path
// lookup would resolve against the wrong root.
import raw from '../../manifesto.md?raw';

// Everything the site shows is read out of manifesto.md: the hero title, the
// draft badge, the four promises, the thirteen principles and the closing
// line. Editing the markdown is the entire update.
//
// The structure this relies on:
//   # Title
//   *Draft …*                  optional; shows the draft badge while present
//   ## Promise                 an h2 whose section contains h3s
//   ### 1. Principle title
//   **Now:** …                 optional pair; anything else in the principle
//   **Better:** …              is rendered as-is below it
//   *A paragraph in italics.*  becomes the pull quote
//
// HTML comments are authoring notes and never reach the site.

export interface Principle {
  number: number;
  id: string;
  title: string;
  now?: string;
  better?: string;
  rest: string;
}

export interface PromiseSection {
  number: number;
  id: string;
  title: string;
  intro: string;
  principles: Principle[];
}

export type Block =
  | { kind: 'html'; html: string }
  | { kind: 'promise'; promise: PromiseSection }
  | { kind: 'quote'; lines: string[] };

export const slugify = (text: string) =>
  text
    .replace(/<[^>]+>/g, '')
    .toLowerCase()
    .replace(/&[a-z]+;|&#\d+;/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const md = new Marked({
  renderer: {
    heading({ tokens, depth }) {
      const text = this.parser.parseInline(tokens);
      return `<h${depth} id="${slugify(text)}">${text}</h${depth}>\n`;
    },
  },
});

const render = (tokens: Token[]) => md.parser(tokens);

/** The manifesto as published: authoring comments removed, nothing else touched. */
export const markdown = raw.replace(/[ \t]*<!--[\s\S]*?-->[ \t]*\n?/g, '');

const titleMatch = markdown.match(/^#\s+(.+)$/m);
if (!titleMatch) throw new Error('manifesto.md has no "# Title" line');
export const title = titleMatch[1].trim();

const DRAFT_LINE = /^\*Draft\b[^\n]*\*[ \t]*\n/m;
export const isDraft = DRAFT_LINE.test(markdown);

// The title is rendered in the hero and the draft note as a badge.
const body = markdown.replace(/^#\s+.+\n/m, '').replace(DRAFT_LINE, '').trimStart();

const isHeading = (t: Token, depth: number): t is Tokens.Heading =>
  t.type === 'heading' && (t as Tokens.Heading).depth === depth;

const labelOf = (t: Token) => {
  if (t.type !== 'paragraph') return undefined;
  const first = (t as Tokens.Paragraph).tokens[0];
  return first?.type === 'strong' ? (first as Tokens.Strong).text.trim() : undefined;
};

const withoutLabel = (t: Token) =>
  render([t]).replace(/^<p><strong>[^<]*<\/strong>\s*/, '<p>');

function parsePrinciple(heading: Tokens.Heading, tokens: Token[]): Principle {
  const match = heading.text.match(/^(\d+)\.\s+(.+)$/);
  if (!match) throw new Error(`principle heading is not numbered: "### ${heading.text}"`);

  const principle: Principle = {
    number: Number(match[1]),
    id: `principle-${match[1]}`,
    title: md.parseInline(match[2]) as string,
    rest: '',
  };
  const rest: Token[] = [];

  for (const t of tokens) {
    const label = labelOf(t);
    if (label === 'Now:' && !principle.now) principle.now = withoutLabel(t);
    else if (label === 'Better:' && !principle.better) principle.better = withoutLabel(t);
    else rest.push(t);
  }

  principle.rest = render(rest);
  return principle;
}

function parsePromise(heading: Tokens.Heading, tokens: Token[], number: number): PromiseSection {
  const firstPrinciple = tokens.findIndex((t) => isHeading(t, 3));
  const principles: Principle[] = [];

  for (let i = firstPrinciple; i < tokens.length; ) {
    let end = i + 1;
    while (end < tokens.length && !isHeading(tokens[end], 3)) end++;
    principles.push(parsePrinciple(tokens[i] as Tokens.Heading, tokens.slice(i + 1, end)));
    i = end;
  }

  return {
    number,
    id: slugify(heading.text),
    title: md.parseInline(heading.text) as string,
    intro: render(tokens.slice(0, firstPrinciple)),
    principles,
  };
}

// A paragraph that is italic from start to end, like the closing line.
const isQuote = (t: Token): t is Tokens.Paragraph =>
  t.type === 'paragraph' &&
  (t as Tokens.Paragraph).tokens.length === 1 &&
  (t as Tokens.Paragraph).tokens[0].type === 'em';

const tokens = md.lexer(body);
export const blocks: Block[] = [];
export const promises: PromiseSection[] = [];

let pending: Token[] = [];
const flush = () => {
  if (pending.length) blocks.push({ kind: 'html', html: render(pending) });
  pending = [];
};

for (let i = 0; i < tokens.length; ) {
  const t = tokens[i];

  if (isHeading(t, 2)) {
    // A section runs to the next h2 or horizontal rule.
    let end = i + 1;
    while (end < tokens.length && !isHeading(tokens[end], 2) && tokens[end].type !== 'hr') end++;
    const section = tokens.slice(i + 1, end);

    if (section.some((s) => isHeading(s, 3))) {
      flush();
      const promise = parsePromise(t, section, promises.length + 1);
      promises.push(promise);
      blocks.push({ kind: 'promise', promise });
      i = end;
      continue;
    }
  }

  if (isQuote(t)) {
    flush();
    const text = (t.tokens[0] as Tokens.Em).text;
    blocks.push({
      kind: 'quote',
      lines: text.split(/(?<=[.!?])\s+/).map((line) => md.parseInline(line) as string),
    });
    i++;
    continue;
  }

  pending.push(t);
  i++;
}
flush();

if (promises.length === 0) throw new Error('manifesto.md has no promise sections (## heading followed by ### principles)');

export const principles = promises.flatMap((p) => p.principles);

/** Plain text for meta tags and llms.txt. */
export const plain = (html: string) =>
  html
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

const listOf = (items: string[]) =>
  items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;

export const description = `A manifesto for configuration: ${principles.length} principles that make it ${listOf(
  promises.map((p) => plain(p.title).toLowerCase()),
)}.`;
