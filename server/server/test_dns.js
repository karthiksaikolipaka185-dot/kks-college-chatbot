const dns = require('dns').promises;
const fs = require('fs');
async function test() {
  try {
    const srv = await dns.resolveSrv('_mongodb._tcp.cluster0.dacf6.mongodb.net');
    const txt = await dns.resolveTxt('cluster0.dacf6.mongodb.net');
    fs.writeFileSync('dns_result.json', JSON.stringify({srv, txt}, null, 2));
  } catch (e) {
    fs.writeFileSync('dns_result.json', JSON.stringify({error: e.message}, null, 2));
  }
}
test();
