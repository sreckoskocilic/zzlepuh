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

npm version "$VERSION" --no-git-tag-version --allow-same-version >/dev/null

node -e '
	const fs = require("fs");
	const p = "src-tauri/tauri.conf.json";
	const j = JSON.parse(fs.readFileSync(p, "utf8"));
	j.version = process.argv[1];
	fs.writeFileSync(p, JSON.stringify(j, null, 2) + "\n");
' "$VERSION"

perl -0pi -e 's/(\[package\][^\[]*?\nversion = ")[^"]+(")/${1}'"$VERSION"'${2}/s' src-tauri/Cargo.toml

cargo update --manifest-path src-tauri/Cargo.toml --workspace >/dev/null

PKG=$(node -p 'require("./package.json").version')
CONF=$(node -p 'require("./src-tauri/tauri.conf.json").version')
CARGO=$(grep -m1 '^version' src-tauri/Cargo.toml | sed -E 's/.*"(.*)".*/\1/')
LOCK=$(grep -A1 '^name = "zzlepuh"$' src-tauri/Cargo.lock | sed -nE 's/^version = "(.*)"/\1/p')

for pair in "package.json:$PKG" "tauri.conf.json:$CONF" "Cargo.toml:$CARGO" "Cargo.lock:$LOCK"; do
	if [[ "${pair#*:}" != "$VERSION" ]]; then
		echo "✗ ${pair%%:*} kaže '${pair#*:}', očekivano '$VERSION'" >&2
		exit 1
	fi
done

echo "✓ Gotovo — $VERSION u package.json, tauri.conf.json, Cargo.toml, Cargo.lock"
echo
echo "Dalje (ti, ručno):"
echo "  git commit -am \"v$VERSION\" && git tag -a v$VERSION -m v$VERSION && git push --follow-tags"
