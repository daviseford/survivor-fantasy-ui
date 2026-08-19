#!/usr/bin/env bash
# Fail loudly when Firebase build config is missing.
#
# Vite inlines `import.meta.env.VITE_*` at build time. When a variable is
# absent it inlines `undefined` and the build still SUCCEEDS — shipping a
# bundle with `apiKey:void 0` that white-screens on load. A renamed or deleted
# repository variable would otherwise sail through CI and deploy unnoticed.
#
# Values come from repository variables, not secrets: Firebase web config is
# public by design and is served in the client bundle regardless.
set -euo pipefail

required=(
  VITE_FIREBASE_API_KEY
  VITE_FIREBASE_AUTH_DOMAIN
  VITE_FIREBASE_PROJECT_ID
  VITE_FIREBASE_STORAGE_BUCKET
  VITE_FIREBASE_MESSAGING_SENDER_ID
  VITE_FIREBASE_APP_ID
  VITE_FIREBASE_MEASUREMENT_ID
  VITE_FIREBASE_DATABASE_URL
)

missing=()
for name in "${required[@]}"; do
  if [ -z "${!name:-}" ]; then
    missing+=("$name")
  fi
done

if [ ${#missing[@]} -gt 0 ]; then
  printf '::error::Missing Firebase build config: %s\n' "${missing[*]}"
  cat <<'MSG'
Set these under Settings > Secrets and variables > Actions > Variables.
Without them Vite inlines `undefined`, the build still succeeds, and the
deployed app fails to initialize Firebase.
MSG
  exit 1
fi

printf 'All %d Firebase config variables present.\n' "${#required[@]}"
