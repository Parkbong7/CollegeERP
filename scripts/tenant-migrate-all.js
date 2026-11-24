#!/usr/bin/env node
/**
 * Run tenant migrations across all College ERP services.
 *   node scripts/tenant-migrate-all.js up                    -> every active tenant
 *   node scripts/tenant-migrate-all.js up --tenant DEMO      -> only DEMO
 *   node scripts/tenant-migrate-all.js status
 *   node scripts/tenant-migrate-all.js undo --tenant DEMO    -> reverts the LAST migration in each service
 */
const path = require("path");
const { spawnSync } = require("child_process");

const SERVICES = [
  "AccessManager-services",
  "MasterConfiguration-services",
  "Department-services",
  "Student-services"
];
const extra = process.argv.slice(2);
if (extra.length === 0) extra.push("up");

let failed = false;
for (const service of SERVICES) {
  const servicePath = path.join(__dirname, "..", "Node-services", service);
  const migrateScript = path.join(servicePath, "scripts", "migrate-tenants.js");
  const fs = require("fs");
  if (!fs.existsSync(migrateScript)) {
    console.log(`[tenant-migrate-all] ${service} has no scripts/migrate-tenants.js - skipping.`);
    continue;
  }
  console.log(`\n=== ${service} ===`);
  const r = spawnSync(
    process.execPath,
    [migrateScript, ...extra],
    { cwd: servicePath, stdio: "inherit" }
  );
  if (r.status !== 0) {
    failed = true;
    console.error(`!! ${service} failed - stopping.`);
    break;
  }
}
process.exit(failed ? 1 : 0);
