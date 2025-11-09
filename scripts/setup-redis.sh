#!/usr/bin/env bash
# setup-redis.sh - cross-platform (bash) helper
set -euo pipefail
echo "This will start a local Redis container and add REDIS_URL to .env.local"
read -p "Enter a password for Redis (leave empty for no password): " REDIS_PWD
if [ -n "$REDIS_PWD" ]; then
  echo "Starting Redis with AUTH enabled"
else
  echo "Starting Redis without AUTH"
fi

docker compose -f docker-compose.redis.yml up -d

if [ -n "$REDIS_PWD" ]; then
  CID=$(docker ps -q --filter ancestor=redis:7 | head -n1)
  if [ -z "$CID" ]; then
    echo "Redis container not found" >&2
    exit 1
  fi
  docker exec -i $CID redis-cli CONFIG SET requirepass "$REDIS_PWD" >/dev/null
  REDIS_URL="redis://:$REDIS_PWD@localhost:6379"
else
  REDIS_URL="redis://localhost:6379"
fi

ENVFILE=.env.local
[ -f "$ENVFILE" ] || touch "$ENVFILE"
if grep -q '^REDIS_URL=' "$ENVFILE"; then
  sed -i.bak "s|^REDIS_URL=.*$|REDIS_URL=\"$REDIS_URL\"|" "$ENVFILE"
else
  echo "REDIS_URL=\"$REDIS_URL\"" >> "$ENVFILE"
fi

echo "Wrote REDIS_URL to $ENVFILE"
echo "Done."
