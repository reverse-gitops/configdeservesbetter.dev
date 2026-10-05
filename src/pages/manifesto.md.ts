import type { APIRoute } from 'astro';
import { markdown } from '../lib/manifesto';

// The manifesto as Markdown, for agents and anyone who prefers the source.
// Authoring comments are stripped; the text is otherwise exactly manifesto.md.
export const GET: APIRoute = () =>
  new Response(markdown, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
