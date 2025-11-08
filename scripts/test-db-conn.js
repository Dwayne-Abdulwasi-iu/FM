const dns = require('dns').promises;
const net = require('net');

function timeout(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function tcpCheck(host, port=27017, ms=5000) {
  return new Promise((resolve) => {
    const s = net.createConnection({ host, port }, () => {
      s.end();
      resolve({ ok: true });
    });
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
