const path = require('path');
const pgPath = path.resolve(__dirname, '../Node-services/node_modules/pg');
const { Client } = require(pgPath);

const client = new Client({
  connectionString: 'postgres://postgres:kaiazer07@localhost:5432/college_erp_auth'
});

async function main() {
  await client.connect();
  const users = await client.query('SELECT u.id, u.username, u.email, r.name as role FROM users u JOIN roles r ON u.role_id = r.id');
  console.log('Users in college_erp_auth:');
  console.table(users.rows);

  const roles = await client.query('SELECT id, name FROM roles');
  console.log('Roles in college_erp_auth:');
  console.table(roles.rows);

  await client.end();
}

main().catch(console.error);
