# Serves the Astro output as a static site.
# Production still ships via GitHub Pages (deploy.yml); this image is not used there yet.
# The build step (image.yml) runs `npm run build` before `docker build`,
# producing ./dist.
# Pinned by digest so Dependabot proposes (and the routing test gates) base
# image bumps; the :alpine tag is kept for readability.
FROM nginxinc/nginx-unprivileged:alpine@sha256:a8d5564c3354241473c1e152d5dd3281ab4224edb61b23c291e0bfd9854687a1
# Serve Astro's directory-style URLs for both /path and /path/ as a direct 200
# (no redirect), so the container's internal :8080 never leaks into a Location
# header behind a reverse proxy. See nginx/default.conf.
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY dist/ /usr/share/nginx/html/
EXPOSE 8080
