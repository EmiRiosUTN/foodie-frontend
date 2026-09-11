#!/usr/bin/env bash
set -Eeuo pipefail

readonly APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly BRANCH="${DEPLOY_BRANCH:-main}"
readonly PM2_APP="${PM2_APP_NAME:-foodie-frontend}"
readonly HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:3003/api/health}"
readonly HEALTH_ATTEMPTS="${HEALTH_ATTEMPTS:-15}"

cd "$APP_DIR"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Deployment aborted: the server worktree has uncommitted changes." >&2
  exit 1
fi

git fetch --prune origin "$BRANCH"
git checkout "$BRANCH"
git merge --ff-only "origin/$BRANCH"

npm ci --include=dev
npm run build

pm2 startOrReload ecosystem.config.js --only "$PM2_APP" --update-env

for ((attempt = 1; attempt <= HEALTH_ATTEMPTS; attempt++)); do
  if curl --fail --silent --show-error "$HEALTH_URL" >/dev/null; then
    echo "Deployment completed successfully."
    exit 0
  fi
  sleep 2
done

echo "Deployment failed: the process did not pass its health check at $HEALTH_URL." >&2
exit 1
