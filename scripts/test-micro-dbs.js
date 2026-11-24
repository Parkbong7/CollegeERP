const authSeq = require('../Node-services/AccessManager-services/config/db.config');
const masterSeq = require('../Node-services/MasterConfiguration-services/config/db.config');
const studentSeq = require('../Node-services/Student-services/config/db.config');
const deptSeq = require('../Node-services/Department-services/config/db.config');

async function testConnections() {
  const configs = [
    { name: 'AccessManager (Auth)', seq: authSeq },
    { name: 'MasterConfiguration', seq: masterSeq },
    { name: 'Student', seq: studentSeq },
    { name: 'Department', seq: deptSeq }
  ];

  console.log('=== Testing Microservice Database Connections ===');
  for (const c of configs) {
    try {
      await c.seq.authenticate();
      const [res] = await c.seq.query('SELECT current_database();');
      console.log(`✓ ${c.name} connected to database: ${res[0].current_database}`);
      await c.seq.close();
    } catch (e) {
      console.error(`✗ ${c.name} failed:`, e.message);
    }
  }
}

testConnections();
