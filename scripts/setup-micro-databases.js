const path = require('path');
const { Sequelize } = require(path.resolve(__dirname, '../Node-services/node_modules/sequelize'));

const targetDbs = [
  'college_erp_auth',
  'college_erp_master',
  'college_erp_student',
  'college_erp_department'
];

async function setupMicroDatabases() {
  console.log('=== Step 1: Connecting to PostgreSQL root ===');
  const adminSeq = new Sequelize('postgres', 'postgres', 'kaiazer07', {
    host: 'localhost',
    port: 5432,
    dialect: 'postgres',
    logging: false
  });

  try {
    await adminSeq.authenticate();
    console.log('Connected to PostgreSQL successfully.');

    // 1. Terminate all connections to college_erp_db so it can be used as a template
    console.log('Terminating existing connections to college_erp_db...');
    await adminSeq.query(`
      SELECT pg_terminate_backend(pid) 
      FROM pg_stat_activity 
      WHERE datname = 'college_erp_db' AND pid <> pg_backend_pid();
    `);

    // 2. Check existing databases
    const [existingDbs] = await adminSeq.query("SELECT datname FROM pg_database WHERE datistemplate = false;");
    const existingNames = new Set(existingDbs.map(r => r.datname));

    for (const dbName of targetDbs) {
      if (existingNames.has(dbName)) {
        console.log(`Database '${dbName}' already exists. Terminating connections and dropping to ensure clean clone...`);
        await adminSeq.query(`
          SELECT pg_terminate_backend(pid) 
          FROM pg_stat_activity 
          WHERE datname = '${dbName}' AND pid <> pg_backend_pid();
        `);
        await adminSeq.query(`DROP DATABASE "${dbName}";`);
      }

      console.log(`Creating micro-database '${dbName}' from template 'college_erp_db'...`);
      await adminSeq.query(`CREATE DATABASE "${dbName}" TEMPLATE "college_erp_db" OWNER postgres;`);
      console.log(`✓ Micro-database '${dbName}' created successfully.`);
    }

    console.log('\n=== Verifying tables in each micro-database ===');
    for (const dbName of targetDbs) {
      const dbSeq = new Sequelize(dbName, 'postgres', 'kaiazer07', {
        host: 'localhost',
        port: 5432,
        dialect: 'postgres',
        logging: false
      });
      const [tables] = await dbSeq.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public';");
      console.log(`  ✓ ${dbName}: ${tables.length} tables present (${tables.map(t => t.tablename).join(', ')})`);
      await dbSeq.close();
    }

    console.log('\n>>> All micro-databases created and populated successfully! <<<');
  } catch (err) {
    console.error('Setup failed:', err);
    throw err;
  } finally {
    await adminSeq.close();
  }
}

setupMicroDatabases().catch((err) => {
  console.error(err);
  process.exit(1);
});
