#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PI_HOST="${PI_HOST:-pi-server}"
REMOTE_ROOT="${REMOTE_ROOT:-/var/www/foodhelperfront}"
REMOTE_BUILD_DIR="${REMOTE_BUILD_DIR:-/tmp/foodhelperfront-build}"
PUBLIC_BACKEND_BASE_URL="${PUBLIC_BACKEND_BASE_URL:-}"
REMOTE_NEXT_ROOT="${REMOTE_ROOT}.next"
REMOTE_PREV_ROOT="${REMOTE_ROOT}.prev"

if [[ -z "$PUBLIC_BACKEND_BASE_URL" ]]; then
	PI_IP="$(ssh "$PI_HOST" "hostname -I | awk '{print \$1}'")"
	if [[ -z "$PI_IP" ]]; then
		echo "No se pudo resolver la IP del Raspberry para inferir PUBLIC_BACKEND_BASE_URL" >&2
		exit 1
	fi

	PUBLIC_BACKEND_BASE_URL="http://${PI_IP}:8080"
fi

echo "Building with PUBLIC_BACKEND_BASE_URL=${PUBLIC_BACKEND_BASE_URL}"
(cd "$ROOT_DIR" && PUBLIC_BACKEND_BASE_URL="$PUBLIC_BACKEND_BASE_URL" npm run build)

echo "Uploading build/ to ${PI_HOST}:${REMOTE_BUILD_DIR}"
ssh "$PI_HOST" "mkdir -p '$REMOTE_BUILD_DIR'"
rsync -a --delete "$ROOT_DIR/build/" "${PI_HOST}:${REMOTE_BUILD_DIR}/"

echo "Publishing on the Raspberry"
ssh "$PI_HOST" "set -euo pipefail
sudo rm -rf '$REMOTE_NEXT_ROOT'
sudo mkdir -p '$REMOTE_NEXT_ROOT'
sudo rsync -a --delete '$REMOTE_BUILD_DIR/' '$REMOTE_NEXT_ROOT/'
sudo chown -R www-data:www-data '$REMOTE_NEXT_ROOT'
sudo chmod -R u=rwX,go=rX '$REMOTE_NEXT_ROOT'
sudo test -f '$REMOTE_NEXT_ROOT/index.html'
if [ -e '$REMOTE_ROOT' ]; then
	sudo rm -rf '$REMOTE_PREV_ROOT'
	sudo mv '$REMOTE_ROOT' '$REMOTE_PREV_ROOT'
fi
sudo mv '$REMOTE_NEXT_ROOT' '$REMOTE_ROOT'
sudo rm -rf '$REMOTE_PREV_ROOT'
sudo systemctl reload nginx
curl -fsSI http://127.0.0.1/ | head -n 1
"

PI_IP="$(ssh "$PI_HOST" "hostname -I | awk '{print \$1}'")"
if [[ -n "$PI_IP" ]]; then
	echo "Verifying public origin http://${PI_IP}/"
	curl -fsSI "http://${PI_IP}/" | head -n 1
fi
