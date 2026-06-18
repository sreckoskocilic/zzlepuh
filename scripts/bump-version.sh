#!/usr/bin/env bash
# Bump app version everywhere + refresh lockfiles.
# Usage: scripts/bump-version.sh <major.minor.patch>   e.g. 0.1.1
set -euo pipefail

VERSION="${1:-}"
if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
	echo "Usage: $0 <major.minor.patch>   (npr. 0.1.1)" >&2
	exit 1
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "→ Bump na $VERSION"

# 1) package.json (+ package-lock.json)
npm version "$VERSION" --no-git-tag-version --allow-same-version >/dev/null

# 2) src-tauri/tauri.conf.json  (JSON-safe, čuva indent)
node -e '
	const fs = require("fs");
	const p = "src-tauri/tauri.conf.json";
	const j = JSON.parse(fs.readFileSync(p, "utf8"));
	j.version = process.argv[1];
	fs.writeFileSync(p, JSON.stringify(j, null, 2) + "\n");
' "$VERSION"

# 3) src-tauri/Cargo.toml  (samo version pod [package])
perl -0pi -e 's/(\[package\][^\[]*?\nversion = ")[^"]+(")/${1}'"$VERSION"'${2}/s' src-tauri/Cargo.toml

# 4) osvježi Cargo.lock
cargo update --manifest-path src-tauri/Cargo.toml --workspace >/dev/null 2>&1 || true

echo "✓ Gotovo:"
echo -n "  package.json     "; node -p 'require("./package.json").version'
echo -n "  tauri.conf.json  "; node -p 'require("./src-tauri/tauri.conf.json").version'
echo -n "  Cargo.toml       "; grep -m1 '^version' src-tauri/Cargo.toml | sed 's/version = //;s/"//g'
echo
echo "Dalje (ti, ručno):"
echo "  git commit -am \"v$VERSION\" && git tag v$VERSION && git push --follow-tags"
