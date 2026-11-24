#!/usr/bin/env node
/**
 * ONE command to add a new tenant end to end:
 *
 *   npm run tenant:add -- <TENANT_ID> "<Tenant Name>" <admin_email> <admin_password> ["<Branch Name>" [<BRANCH_CODE> ["<Location>"]]]
 *   e.g.  npm run tenant:add -- DEMO "Demo Company" admin@demo.com "Admin@12345"
 *         npm run tenant:add -- MNC "MNC Company" mnc@abc.com "MNC@12345" "Chennai Branch" CHN Chennai
 *   (the same three can be given as --branch-name / --branch-code / --location; no branch given = Head Office / HO)
 *
 * Steps (each is also available alone, see README):
 *   1. Access Manager : register tenant in public.tenants + create schema
 *   2. Migrate        : Access Manager, Master & Configuration, CRM tables for this tenant
 *   3. Seed           : first branch (Head Office unless you name one), modules/screens, Admin role, admin user
 *   4. Master lists   : starter company types, industries, countries/states/cities, statuses ... (editable in Master Data)
 *
 * Before the tenant can LOG IN you must still add  JWT_SECRET_<TENANT_ID>=...  to the .env of
 * Access Manager and Middleware (step 1 prints a ready-made random value) and restart them.
 */
const path = require("path");
const { spawnSync } = require("child_process");

// positional: <TENANT_ID> <Tenant Name> <email> <password> [branch name] [branch code] [location]; or --branch-name/--branch-code/--location
const positional = [];
const opt = {};
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith("--")) opt[argv[i].slice(2)] = argv[++i];
  else positional.push(argv[i]);
}
const [idArg, name, email, password, branchNameArg, branchCodeArg, locationArg] = positional;
if (!idArg || !name || !email || !password) {
  console.error('Usage: npm run tenant:add -- <TENANT_ID> "<Tenant Name>" <admin_email> <admin_password> ["<Branch Name>" [<BRANCH_CODE> ["<Location>"]]]');
  process.exit(1);
}
const branchName = opt["branch-name"] || branchNameArg;
const branchCode = opt["branch-code"] || branchCodeArg;
const location = opt.location || locationArg;
const tenantId = idArg.toUpperCase();
const nodeServices = path.join(__dirname, "..", "Node-services");
const am = path.join(nodeServices, "AccessManager-services");

function run(title, cwd, args) {
  console.log(`\n--- ${title}`);
  const r = spawnSync(process.execPath, args, { cwd, stdio: "inherit" });
  if (r.status !== 0) {
    console.error(`\nStopped: "${title}" failed.`);
    process.exit(r.status || 1);
  }
}

run("1/4 Register tenant", am, ["scripts/create-tenant.js", tenantId, name]);
run("2/4 Migrate all services", path.join(__dirname, ".."), ["scripts/tenant-migrate-all.js", "up", "--tenant", tenantId]);
const seedArgs = ["scripts/seed-tenant.js", tenantId, email, password];
if (branchName) seedArgs.push("--branch-name", branchName);
if (branchCode) seedArgs.push("--branch-code", branchCode);
if (location) seedArgs.push("--location", location);
run("3/4 Seed first data", am, seedArgs);
run("4/4 Seed master lists", path.join(nodeServices, "MasterConfiguration-services"), ["scripts/seed-master-data.js", tenantId]);

console.log(`\nTenant ${tenantId} is ready. Remember JWT_SECRET_${tenantId} in Access Manager + Middleware .env, then restart them.`);
