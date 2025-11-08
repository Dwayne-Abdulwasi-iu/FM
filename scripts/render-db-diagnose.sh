#!/usr/bin/env bash
# Render DB diagnose script - runs SRV/A resolution and TCP checks for MongoDB Atlas
# Usage: run in the Render service shell where your app runs (it uses $DATABASE_URL)

set -euo pipefail

if [ -z "${DATABASE_URL-}" ]; then
  echo "DATABASE_URL is not set in the environment. Abort." >&2
  exit 2
fi

echo "Parsing host from DATABASE_URL (no credentials will be printed)..."
HOST=$(node -e "try{const URL=require('url').URL; const u=new URL(process.env.DATABASE_URL.replace(/^mongodb:/,'mongodb:')); console.log(u.hostname);}catch(e){console.error('parse-failed', e.message); process.exit(2)}")
if [ $? -ne 0 ]; then
  echo "Failed to parse DATABASE_URL host" >&2
  exit 2
fi

echo "Detected host: $HOST"

echo "\n1) SRV lookup for _mongodb._tcp.$HOST"
if command -v dig >/dev/null 2>&1; then
  dig +short SRV _mongodb._tcp.$HOST || true
else
  nslookup -type=SRV _mongodb._tcp.$HOST || true
fi

echo "\n2) Running Node resolver + TCP probe (test-db-conn.js will be executed)"
if [ ! -f "./scripts/test-db-conn.js" ]; then
  echo "scripts/test-db-conn.js not found in repo. Creating temporary copy..."
  cat > /tmp/test-db-conn.js <<'JS'
const dns = require('dns').promises;
const net = require('net');

async function tcpCheck(host, port=27017, ms=5000) {
  return new Promise((resolve) => {
    const s = net.createConnection({ host, port }, () => { s.end(); resolve({ ok: true }); });
    s.setTimeout(ms, () => { s.destroy(); resolve({ ok: false, reason: 'timeout' }); });
    s.on('error', (err) => resolve({ ok: false, reason: err.message }));
  });
}

(async function(){
  const dbUrl = process.env.DATABASE_URL;
  if(!dbUrl){ console.error('DATABASE_URL not set'); process.exit(2); }
  let host;
  try { host = new (require('url').URL)(dbUrl.replace(/^mongodb:/,'mongodb:')).hostname } catch(e) { console.error('Failed to parse DB host:', e.message); process.exit(2) }

  console.log('Parsed host:', host);
  const srvName = `_mongodb._tcp.${host}`;
  try {
    const srv = await dns.resolveSrv(srvName);
    console.log('SRV records:', srv);
    for(const r of srv){
      const tgt = r.name || r.target || r;
      try {
        const addrs = await dns.resolve4(tgt);
        console.log('A records for', tgt, ':', addrs);
        for(const a of addrs){
          console.log('TCP ->', a, 'result:', await tcpCheck(a));
        }
      } catch(ae){
        console.error('A record lookup failed for', tgt, ae.message);
      }
    }
  } catch(e) {
    console.warn('SRV lookup failed:', e.message);
    try {
      const addrs = await dns.resolve4(host);
      console.log('A records for', host, addrs);
      for(const a of addrs){
        console.log('TCP ->', a, 'result:', await tcpCheck(a));
      }
    } catch(e2){
      console.error('A record lookup failed for host:', e2.message);
    }
  }
  console.log('Done.');
})();
JS
  node /tmp/test-db-conn.js || true
else
  node ./scripts/test-db-conn.js || true
fi

# Optional: attempt mongosh ping (will authenticate with DB credentials in DATABASE_URL)
if command -v mongosh >/dev/null 2>&1; then
  echo "\n3) Attempting mongosh ping (will authenticate):"
  mongosh "$DATABASE_URL" --eval "db.adminCommand({ ping: 1 })" || true
else
  echo "\nNote: mongosh not installed on this host. If you want to authenticate and ping, install mongosh or run it from a host with mongosh installed."
fi

echo "\nFinished diagnostics. Paste output back here and I'll interpret it." 
