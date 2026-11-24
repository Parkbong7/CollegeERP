#!/usr/bin/env node
/**
 * Generate tenant-aware migrations.  No dependencies.
 *
 *  ADD A TABLE  (creates migration + model + registers the model in attachDbModels.js)
 *    node scripts/make-migration.js table <table_name> --service <ServiceFolder> --cols "name:string:required,city:string,age:integer"
 *
 *  ADD EXTRA FIELD(S) TO AN EXISTING TABLE  (creates migration + adds the field to the model)
 *    node scripts/make-migration.js column <table_name> --service <ServiceFolder> --cols "gst_no:string,credit_limit:decimal"
 *
 *  Column syntax :  name:type[:required][:unique]
 *  Types         :  string text integer bigint boolean date decimal jsonb uuid  enum(A|B|C)
 *  Service folder:  AccessManager-services | MasterConfiguration-services | CRM-services
 *
 *  Then apply it to every tenant:   npm run tenant:migrate   (inside that service folder)
 */
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
// positional args (kind, table) may appear before or after the --flags
const positional = [];
const flags = {};
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith("--")) flags[args[i]] = args[++i];
  else positional.push(args[i]);
}
const kind = positional[0];
const table = positional[1];
const flag = (n) => (flags[n] === undefined ? null : flags[n]);
const service = flag("--service");
const colsArg = flag("--cols");

function die(msg) {
  console.error("\n" + msg + "\n");
  process.exit(1);
}

if (!["table", "column"].includes(kind) || !table || !service || !colsArg) {
  die(
    'Usage:\n  node scripts/make-migration.js table  <table_name> --service <ServiceFolder> --cols "name:string:required,city:string"\n' +
      '  node scripts/make-migration.js column <table_name> --service <ServiceFolder> --cols "gst_no:string,credit_limit:decimal"'
  );
}
if (!/^[a-z][a-z0-9_]*$/i.test(table)) die(`Invalid table name '${table}'. Use letters, digits and underscore.`);

const serviceDir = path.join(__dirname, "..", "Node-services", service);
if (!fs.existsSync(serviceDir)) die(`Service folder not found: ${serviceDir}`);
const migDir = path.join(serviceDir, "migrations");
const modelDir = path.join(serviceDir, "models");
fs.mkdirSync(migDir, { recursive: true });

// ---------- parse columns ----------
const TYPES = {
  string: ["Sequelize.STRING", "DataTypes.STRING"],
  text: ["Sequelize.TEXT", "DataTypes.TEXT"],
  integer: ["Sequelize.INTEGER", "DataTypes.INTEGER"],
  bigint: ["Sequelize.BIGINT", "DataTypes.BIGINT"],
  boolean: ["Sequelize.BOOLEAN", "DataTypes.BOOLEAN"],
  date: ["Sequelize.DATE", "DataTypes.DATE"],
  decimal: ["Sequelize.DECIMAL(15, 2)", "DataTypes.DECIMAL(15, 2)"],
  jsonb: ["Sequelize.JSONB", "DataTypes.JSONB"],
  uuid: ["Sequelize.UUID", "DataTypes.UUID"],
};

function splitTop(str) {
  // split on commas that are not inside ( )
  const out = [];
  let depth = 0,
    cur = "";
  for (const ch of str) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out.map((s) => s.trim()).filter(Boolean);
}

function parseCol(spec) {
  const m = spec.match(/^([a-z][a-z0-9_]*):(enum\([^)]+\)|[a-z]+)((?::[a-z]+)*)$/i);
  if (!m) die(`Cannot read column '${spec}'. Expected name:type[:required][:unique]`);
  const [, name, typeRaw, rest] = m;
  const flags = rest.split(":").filter(Boolean).map((s) => s.toLowerCase());
  let seq, dt, enumValues = null;
  if (typeRaw.toLowerCase().startsWith("enum(")) {
    enumValues = typeRaw.slice(5, -1).split("|").map((s) => s.trim()).filter(Boolean);
    if (!enumValues.length) die(`enum for '${name}' has no values`);
    const list = enumValues.map((v) => JSON.stringify(v)).join(", ");
    seq = `Sequelize.ENUM(${list})`;
    dt = `DataTypes.ENUM(${list})`;
  } else {
    const t = TYPES[typeRaw.toLowerCase()];
    if (!t) die(`Unknown type '${typeRaw}' for column '${name}'. Allowed: ${Object.keys(TYPES).join(", ")}, enum(A|B)`);
    [seq, dt] = t;
  }
  flags.forEach((f) => {
    if (!["required", "unique"].includes(f)) die(`Unknown flag ':${f}' on '${name}'. Use :required or :unique`);
  });
  return { name, seq, dt, enumValues, required: flags.includes("required"), unique: flags.includes("unique") };
}

const cols = splitTop(colsArg).map(parseCol);
const dup = cols.map((c) => c.name).filter((n, i, a) => a.indexOf(n) !== i);
if (dup.length) die(`Duplicate column name: ${dup[0]}`);

// ---------- helpers ----------
const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
const pascal = (s) => s.split("_").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("");
const schemaGuard = `    const schema = queryInterface.sequelize.options.schema;
    if (!schema) {
      throw new Error("Schema was not provided! This migration must be run via the tenant migration script.");
    }`;

function colDef(c, indent) {
  const pad = " ".repeat(indent);
  const lines = [`${pad}type: ${c.seq},`, `${pad}allowNull: ${c.required ? "false" : "true"},`];
  if (c.unique) lines.push(`${pad}unique: true,`);
  return lines.join("\n");
}

function existsLike(re) {
  return fs.readdirSync(migDir).some((f) => re.test(f));
}

// ---------- TABLE ----------
if (kind === "table") {
  if (existsLike(new RegExp(`-create-${table}\\.js$`))) die(`A create migration for '${table}' already exists.`);
  const colLines = cols
    .map((c) => `        ${c.name}: {\n${colDef(c, 10)}\n        },`)
    .join("\n");
  const enumDrops = cols
    .filter((c) => c.enumValues)
    .map((c) => `    await queryInterface.sequelize.query(\`DROP TYPE IF EXISTS "\${schema}"."enum_${table}_${c.name}";\`);`)
    .join("\n");

  const mig = `"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
${schemaGuard}

    await queryInterface.createTable(
      "${table}",
      {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
${colLines}
        created_at: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        },
        updated_at: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        },
      },
      { schema }
    );
  },

  async down(queryInterface) {
    const schema = queryInterface.sequelize.options.schema;
    await queryInterface.dropTable({ tableName: "${table}", schema });
${enumDrops}
  },
};
`;
  const migFile = `${stamp}-create-${table}.js`;
  fs.writeFileSync(path.join(migDir, migFile), mig);

  // model
  const modelName = pascal(table);
  const modelFile = path.join(modelDir, `${table}.js`);
  let modelMsg = "";
  if (fs.existsSync(modelDir)) {
    if (fs.existsSync(modelFile)) {
      modelMsg = `model models/${table}.js already exists - not overwritten`;
    } else {
      const fieldLines = cols
        .map((c) => `    ${c.name}: { type: ${c.dt}, allowNull: ${c.required ? "false" : "true"}${c.unique ? ", unique: true" : ""} },`)
        .join("\n");
      fs.writeFileSync(
        modelFile,
        `"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class ${modelName} extends Model {
    static associate(models) {
      // define associations here
    }
  }
  ${modelName}.init(
    {
${fieldLines}
    },
    {
      sequelize,
      modelName: "${modelName}",
      tableName: "${table}",
      timestamps: true,
      underscored: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );
  return ${modelName};
};
`
      );
      modelMsg = `model  models/${table}.js`;
    }
    // register in attachDbModels
    const attach = path.join(serviceDir, "middlewares", "attachDbModels.js");
    if (fs.existsSync(attach)) {
      let src = fs.readFileSync(attach, "utf8");
      const marker = "// [make:table] new models are registered above this line";
      const line = `${modelName}: db.${modelName}.schema(tenantId),`;
      if (src.includes(line)) modelMsg += " (already registered)";
      else if (src.includes(marker)) {
        src = src.replace(marker, `${line}\n    ${marker}`);
        fs.writeFileSync(attach, src);
        modelMsg += `\nregistered in middlewares/attachDbModels.js`;
      } else {
        modelMsg += `\n!! add this line to req.db in middlewares/attachDbModels.js:  ${line}`;
      }
    }
  }
  console.log(`\nCreated table migration:\n  migrations/${migFile}\n  ${modelMsg.split("\n").join("\n  ")}`);
  console.log(`\nNext: cd Node-services/${service}  &&  npm run tenant:migrate\n`);
}

// ---------- COLUMN ----------
if (kind === "column") {
  const migFile = `${stamp}-add-${cols.map((c) => c.name).join("-").slice(0, 40)}-to-${table}.js`;
  const ups = cols
    .map((c) => `      await queryInterface.addColumn(\n        { tableName: "${table}", schema },\n        "${c.name}",\n        {\n${colDef(c, 10)}\n        },\n        { transaction }\n      );`)
    .join("\n");
  const downs = cols
    .map((c) => `      await queryInterface.removeColumn({ tableName: "${table}", schema }, "${c.name}", { transaction });`)
    .join("\n");
  const enumDrops = cols
    .filter((c) => c.enumValues)
    .map((c) => `    await queryInterface.sequelize.query(\`DROP TYPE IF EXISTS "\${schema}"."enum_${table}_${c.name}";\`);`)
    .join("\n");

  fs.writeFileSync(
    path.join(migDir, migFile),
    `"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
${schemaGuard}

    const transaction = await queryInterface.sequelize.transaction();
    try {
${ups}
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const schema = queryInterface.sequelize.options.schema;
    const transaction = await queryInterface.sequelize.transaction();
    try {
${downs}
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
${enumDrops}
  },
};
`
  );

  // update model
  let modelMsg = "model not found - add the field(s) to the model by hand";
  if (fs.existsSync(modelDir)) {
    const file = fs
      .readdirSync(modelDir)
      .filter((f) => f.endsWith(".js") && f !== "index.js")
      .find((f) => new RegExp(`tableName:\\s*['"]${table}['"]`).test(fs.readFileSync(path.join(modelDir, f), "utf8")));
    if (file) {
      const p = path.join(modelDir, file);
      let src = fs.readFileSync(p, "utf8");
      const initRe = /\.init\(\s*\{[ \t]*\r?\n/;
      if (initRe.test(src)) {
        const add = cols
          .filter((c) => !new RegExp(`\\b${c.name}\\s*:`).test(src))
          .map((c) => `    ${c.name}: { type: ${c.dt}, allowNull: ${c.required ? "false" : "true"}${c.unique ? ", unique: true" : ""} },\n`)
          .join("");
        src = src.replace(initRe, (m) => m + add);
        fs.writeFileSync(p, src);
        modelMsg = `model  models/${file} updated`;
      } else modelMsg = `could not patch models/${file} automatically - add the field(s) by hand`;
    }
  }
  console.log(`\nCreated column migration:\n  migrations/${migFile}\n  ${modelMsg}`);
  console.log(`\nNext: cd Node-services/${service}  &&  npm run tenant:migrate\n`);
}
