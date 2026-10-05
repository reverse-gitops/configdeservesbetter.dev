import type { APIRoute } from 'astro';

// Every .astro page under src/pages becomes one <url> entry, so the sitemap
// stays correct without anyone remembering to update it.
const pages = Object.keys(import.meta.glob('./**/*.astro'))
	.map((file) => file.replace(/^\.\//, '').replace(/\.astro$/, ''))
	.filter((name) => !name.startsWith('404'))
	// Trailing slashes, to match the <link rel="canonical"> each page emits.
	.map((name) => (name === 'index' ? '' : `${name.replace(/\/index$/, '')}/`))
	.sort();

export const GET: APIRoute = ({ site }) => {
	const urls = pages
		.map((page) => `\t<url>\n\t\t<loc>${new URL(page, site).href}</loc>\n\t</url>`)
		.join('\n');

	return new Response(
		`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
		{ headers: { 'Content-Type': 'application/xml; charset=utf-8' } }
	);
};
