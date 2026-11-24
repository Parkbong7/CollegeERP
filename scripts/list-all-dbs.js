const path = require('path');
const { Sequelize } = require(path.resolve(__dirname, '../Node-services/node_modules/sequelize'));

async function listDbs() {
  const s = new Sequelize('postgres', 'postgres', 'kaiazer07', {
    host: 'localhost',
    port: 5432,
    dialect: 'postgres',
    logging: false
  });
  const [rows] = await s.query("SELECT datname FROM pg_database WHERE datistemplate = false;");
  console.log('ALL DATABASES:', rows.map(r => r.datname));
  await s.close();
}

listDbs().catch(console.error);
