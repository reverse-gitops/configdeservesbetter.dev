#!/usr/bin/env bash
#
# Black-box routing tests for the site image (Dockerfile + nginx/default.conf).
#
# Builds the image, runs the container, and asserts the routing behaviour that
# matters for visitors:
#   - /talks AND /talks/ both return the real page as a direct 200
#   - no response ever leaks the container's internal :8080 in a Location header
#   - every stylesheet the homepage links to is actually served
#   - llms.txt and manifesto.md are served as UTF-8 text, not downloads
#   - unknown paths return 404
#
# Usage:
#   test/routing.sh                     # build image from repo, test, clean up
#   IMAGE=ghcr.io/foo/bar:tag test/routing.sh   # test an already-built image
#   PORT=18099 test/routing.sh          # override the host port
#
set -euo pipefail
cd "$(dirname "$0")/.."

PORT="${PORT:-18088}"
CONTAINER="site-routing-test-$$"
IMAGE="${IMAGE:-}"
BUILT_IMAGE=""

cleanup() {
    docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
    [ -n "$BUILT_IMAGE" ] && docker rmi "$BUILT_IMAGE" >/dev/null 2>&1 || true
}
trap cleanup EXIT

# The image bundles ./dist, so the Astro output must exist. CI builds it before
# calling this script; locally we build it if it is missing.
if [ -z "$IMAGE" ] && [ ! -f dist/talks/index.html ]; then
    echo "==> building site (npm run build)"
    npm run build --silent >/dev/null
fi

if [ -z "$IMAGE" ]; then
    BUILT_IMAGE="site-routing-test:$$"
    IMAGE="$BUILT_IMAGE"
    echo "==> docker build -> $IMAGE"
    docker build -q -t "$IMAGE" . >/dev/null
fi

echo "==> running $IMAGE on :$PORT"
docker run -d --name "$CONTAINER" -p "$PORT:8080" "$IMAGE" >/dev/null

base="http://localhost:$PORT"

# Wait for the server to accept connections.
ready=""
for _ in $(seq 1 30); do
    if curl -fsS -o /dev/null "$base/" 2>/dev/null; then ready=1; break; fi
    sleep 0.5
done
[ -n "$ready" ] || { echo "ERROR: server did not become ready" >&2; exit 1; }

fail=0
pass() { printf '  ok   %s\n' "$1"; }
bad()  { printf '  FAIL %s\n' "$1"; fail=1; }

# assert_status PATH EXPECTED_CODE
assert_status() {
    local got
    got=$(curl -s -o /dev/null -w '%{http_code}' "$base$1")
    [ "$got" = "$2" ] && pass "$1 -> $got" || bad "$1 -> $got (want $2)"
}

# assert_served_directly PATH : 2xx with no Location header (no redirect at all)
assert_served_directly() {
    local headers code loc
    headers=$(curl -s -D - -o /dev/null "$base$1")
    code=$(printf '%s' "$headers" | awk 'NR==1{print $2}')
    loc=$(printf '%s' "$headers" | grep -i '^location:' || true)
    if [ "${code:0:1}" = "2" ] && [ -z "$loc" ]; then
        pass "$1 served directly ($code, no redirect)"
    else
        bad "$1 expected direct 2xx, got code=$code location='$loc'"
    fi
}

# assert_no_port_leak PATH : no Location header points at :8080 or an absolute http origin
assert_no_port_leak() {
    local headers loc
    headers=$(curl -s -D - -o /dev/null "$base$1")
    loc=$(printf '%s' "$headers" | grep -i '^location:' || true)
    if [[ "$loc" == *:8080* || "$loc" == *"http://"* ]]; then
        bad "$1 leaks internal origin in Location header ($loc)"
    else
        pass "$1 no :8080 leak"
    fi
}

# assert_content_type PATH EXPECTED_CONTENT_TYPE
assert_content_type() {
    local got
    got=$(curl -s -o /dev/null -w '%{content_type}' "$base$1")
    [ "$got" = "$2" ] && pass "$1 is $got" || bad "$1 is '$got' (want '$2')"
}

# assert_body_contains PATH NEEDLE
# Capture the body first, then match in-shell. Do NOT pipe curl into `grep -q`:
# under `pipefail`, grep exits on first match and SIGPIPEs the still-writing
# curl, which then reports the whole pipeline as failed — a race that flakes on
# large bodies (passes when curl happens to finish first, fails otherwise).
assert_body_contains() {
    local body
    body=$(curl -s "$base$1")
    if [[ "$body" == *"$2"* ]]; then
        pass "$1 body contains '$2'"
    else
        bad "$1 body missing '$2'"
    fi
}

# assert_stylesheets_served PATH : every <link rel="stylesheet"> on the page
# that points at this site returns 200. Astro names the shared stylesheet after
# a module in its chunk, which can start with a dot (.Layout.[hash].css); a
# host that drops dotfiles then serves an unstyled site.
assert_stylesheets_served() {
    local body hrefs href
    body=$(curl -s "$base$1")
    hrefs=$(printf '%s' "$body" | grep -o '<link rel="stylesheet" href="/[^"]*"' | sed 's/.*href="//; s/"$//' || true)
    if [ -z "$hrefs" ]; then
        bad "$1 links no local stylesheet"
        return
    fi
    for href in $hrefs; do
        assert_status "$href" 200
    done
}

echo "== status codes =="
assert_status "/"                                 200
assert_status "/talks"                            200
assert_status "/talks/"                           200
assert_status "/llms.txt"                         200
assert_status "/manifesto.md"                     200
assert_status "/sitemap.xml"                      200
assert_status "/robots.txt"                       200
assert_status "/this-page-does-not-exist-xyz123"  404

echo "== no redirect, no :8080 leak =="
assert_served_directly "/talks"
assert_no_port_leak    "/talks"

echo "== stylesheets =="
assert_stylesheets_served "/"
assert_stylesheets_served "/talks/"

echo "== content types =="
assert_content_type "/"             "text/html; charset=utf-8"
assert_content_type "/llms.txt"     "text/plain; charset=utf-8"
assert_content_type "/manifesto.md" "text/markdown; charset=utf-8"

echo "== real page, not an error (decent answer) =="
assert_body_contains "/talks"  "<title>Talks · Config Deserves Better</title>"
assert_body_contains "/talks/" "<title>Talks · Config Deserves Better</title>"

echo
if [ "$fail" -ne 0 ]; then
    echo "ROUTING TESTS FAILED" >&2
    exit 1
fi
echo "ALL ROUTING TESTS PASSED"
