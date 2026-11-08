#!/usr/bin/env bash
set -euo pipefail

if [[ ! -f .prod.vars ]]; then
  echo "Missing .prod.vars; copy .prod.vars.example and verify the production configuration first." >&2
  exit 1
fi

deploy_vars_dir=$(mktemp -d)
dev_vars_moved=false

restore_dev_vars() {
  if [[ "$dev_vars_moved" == true ]]; then
    mv "$deploy_vars_dir/.dev.vars" .dev.vars
  fi
  rmdir "$deploy_vars_dir"
}
trap restore_dev_vars EXIT INT TERM

if [[ -f .dev.vars ]]; then
  mv .dev.vars "$deploy_vars_dir/.dev.vars"
  dev_vars_moved=true
fi

npx opennextjs-cloudflare build
npx opennextjs-cloudflare deploy --env=""
