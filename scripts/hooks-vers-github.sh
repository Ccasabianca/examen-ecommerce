#!/usr/bin/env bash
# pousse les hooks render et les urls des fronts dans les secrets et variables du dépôt github
# 1. copier les hooks (Settings > Deploy Hook de chaque service render) dans hooks.env, hors dépôt :
#      RENDER_DEPLOY_HOOK_BACKEND_PROD=https://api.render.com/deploy/srv-...?key=...
#      ... (BACKEND, GATEWAY, STOCK, FRONT) x (PROD, PREPROD), la notification tourne chez hostinger
#      FRONT_URL_PROD=https://examen.mywatchbuddy.com
#      FRONT_URL_PREPROD=https://preprod.examen.mywatchbuddy.com
# 2. bash scripts/hooks-vers-github.sh Ccasabianca/nom-du-depot
set -euo pipefail
REPO=${1:?usage : bash scripts/hooks-vers-github.sh proprietaire/depot}
FILE=${2:-hooks.env}

while IFS='=' read -r name value; do
  [[ -z "$name" || "$name" == \#* ]] && continue
  if [[ "$name" == RENDER_DEPLOY_HOOK_* ]]; then
    printf '%s' "$value" | gh secret set "$name" --repo "$REPO"
    echo "secret $name posé"
  else
    gh variable set "$name" --body "$value" --repo "$REPO"
    echo "variable $name = $value"
  fi
done < "$FILE"

gh secret list --repo "$REPO"
gh variable list --repo "$REPO"
