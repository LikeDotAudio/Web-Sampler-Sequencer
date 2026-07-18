#!/usr/bin/env bash
# Compile the .jsx/.js sources into dist/app.js. Run this after editing anything
# under libControl/ and commit the result alongside your change.
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -d node_modules/@babel/core ]; then
  echo "Installing build dependencies (one time)…"
  npm install --silent
fi

node build.mjs "$@"
