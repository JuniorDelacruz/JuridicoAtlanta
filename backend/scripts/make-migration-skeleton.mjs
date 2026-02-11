// scripts/make-migration-skeleton.mjs (NÍVEL 2)
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import dotenv from "dotenv";

dotenv.config();

const MODELS_INDEX_PATH = path.resolve("models/index.js");
const MIGRATIONS_DIR = path.resolve("migrations");

function normalizeTableName(t) {
  if (!t) return null;
  if (typeof t === "object" && t.tableName) return t.tableName;
  return String(t);
}

function nowStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return (
    d.getFullYear() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

function safeName(s) {
  return String(s)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function pathToFileUrl(p) {
  const abs = path.resolve(p);
  const normalized = abs.replace(/\\/g, "/");
  return `file:///${normalized}`;
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

function normalizeBoolDefault(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  const s = String(v).trim().toLowerCase();
  if (s === "true" || s === "t" || s === "1") return true;
  if (s === "false" || s === "f" || s === "0") return false;
  return null;
}

function normalizeSimpleDefaultForCompare(v) {
  // defaults no DB geralmente vêm como strings tipo: 'foo'::character varying, now(), 0, true
  if (v === null || v === undefined) return null;
  const s = String(v).trim();

  // string literal
  const mStr = s.match(/^'(.*)'::/);
  if (mStr) return mStr[1];

  // boolean
  const b = normalizeBoolDefault(s);
  if (b !== null) return b;

  // number
  const mNum = s.match(/^-?\d+(\.\d+)?$/);
  if (mNum) return Number(s);

  return { raw: s }; // não comparável com segurança
}

function isSimpleJsDefault(v) {
  return typeof v === "string" || typeof v === "number" || typeof v === "boolean";
}

function mapSequelizeAttrToMigrationType(attr) {
  const t = attr?.type;
  const key = t?.key || t?.constructor?.key || null;

  switch (key) {
    case "STRING": {
      const len = t?._length || t?.options?.length;
      return len ? `Sequelize.STRING(${len})` : `Sequelize.STRING`;
    }
    case "TEXT":
      return `Sequelize.TEXT`;
    case "INTEGER":
      return `Sequelize.INTEGER`;
    case "BIGINT":
      return `Sequelize.BIGINT`;
    case "FLOAT":
      return `Sequelize.FLOAT`;
    case "DOUBLE":
      return `Sequelize.DOUBLE`;
    case "DECIMAL": {
      const p = t?.options?.precision;
      const s = t?.options?.scale;
      if (p != null && s != null) return `Sequelize.DECIMAL(${p}, ${s})`;
      return `Sequelize.DECIMAL`;
    }
    case "BOOLEAN":
      return `Sequelize.BOOLEAN`;
    case "DATE":
      return `Sequelize.DATE`;
    case "DATEONLY":
      return `Sequelize.DATEONLY`;
    case "JSON":
      return `Sequelize.JSON`;
    case "JSONB":
      return `Sequelize.JSONB`;
    case "UUID":
      return `Sequelize.UUID`;
    case "ENUM": {
      const values = t?.values || [];
      const list = values.map((v) => JSON.stringify(v)).join(", ");
      return `Sequelize.ENUM(${list})`;
    }
    default: {
      const sql = typeof t?.toSql === "function" ? t.toSql() : null;
      if (sql) {
        const low = sql.toLowerCase();
        if (low.includes("timestamp")) return `Sequelize.DATE`;
        if (low.includes("jsonb")) return `Sequelize.JSONB`;
        if (low.includes("json")) return `Sequelize.JSON`;
        if (low.includes("int")) return `Sequelize.INTEGER`;
        if (low.includes("bool")) return `Sequelize.BOOLEAN`;
      }
      return `Sequelize.STRING`;
    }
  }
}

function indentLines(s, spaces) {
  const pad = " ".repeat(spaces);
  return s
    .split("\n")
    .map((l) => (l.trim().length ? pad + l : l))
    .join("\n");
}

function stableIndexKey({ unique, fields }) {
  return `${unique ? "U" : "N"}:${fields.join("|")}`;
}

async function getDbColumns(sequelize, schema) {
  const [rows] = await sequelize.query(
    `
    SELECT
      table_schema,
      table_name,
      column_name,
      is_nullable,
      data_type,
      udt_name,
      column_default
    FROM information_schema.columns
    WHERE table_schema = :schema
    ORDER BY table_name, ordinal_position;
  `,
    { replacements: { schema } }
  );

  const map = new Map();
  for (const r of rows) {
    const key = `${r.table_schema}.${r.table_name}`;
    if (!map.has(key)) map.set(key, new Map());
    map.get(key).set(r.column_name, r);
  }
  return map;
}

async function getDbIndexes(sequelize, schema) {
  // Pega definição de índices do Postgres via pg_indexes
  const [rows] = await sequelize.query(
    `
    SELECT schemaname, tablename, indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = :schema
    ORDER BY tablename, indexname;
  `,
    { replacements: { schema } }
  );

  // Map<table, Array<{name, def, unique, cols[]}>>
  const out = new Map();

  for (const r of rows) {
    const table = r.tablename;
    const def = r.indexdef;

    // extrai unique
    const unique = /create\s+unique\s+index/i.test(def);

    // extrai colunas dentro dos parênteses do "ON table (...)" (simplão)
    const mCols = def.match(/\((.+)\)/);
    let cols = [];
    if (mCols && mCols[1]) {
      cols = mCols[1]
        .split(",")
        .map((s) => s.trim())
        .map((s) => s.replace(/"/g, ""))
        // remove expressões tipo lower(col)
        .map((s) => s.replace(/^.*\((.*)\).*$/, "$1"))
        .map((s) => s.trim())
        .filter(Boolean);
    }

    if (!out.has(table)) out.set(table, []);
    out.get(table).push({ name: r.indexname, def, unique, cols });
  }

  return out;
}

function renderMigration({ addColumns, changeColumns, addIndexes, dropOrphans }) {
  const up = [];
  const down = [];

  if (addColumns.length) up.push(`// Gerado automaticamente: colunas faltando no DB`);
  for (const a of addColumns) {
    const { table, column, attr } = a;
    const typeExpr = mapSequelizeAttrToMigrationType(attr);
    const allowNull = attr.allowNull !== undefined ? !!attr.allowNull : true;

    let defaultValueLine = "";
    if (attr.defaultValue !== undefined && attr.defaultValue !== null && isSimpleJsDefault(attr.defaultValue)) {
      defaultValueLine = `,\n        defaultValue: ${JSON.stringify(attr.defaultValue)}`;
    }

    up.push(`
await queryInterface.addColumn(${JSON.stringify(table)}, ${JSON.stringify(column)}, {
  type: ${typeExpr},
  allowNull: ${allowNull}${defaultValueLine}
});`.trim());

    down.push(`
await queryInterface.removeColumn(${JSON.stringify(table)}, ${JSON.stringify(column)});`.trim());
  }

  if (changeColumns.length) up.push(`\n// Gerado automaticamente: alterações seguras (allowNull/default simples)`);
  for (const c of changeColumns) {
    const { table, column, attr, reason } = c;
    const typeExpr = mapSequelizeAttrToMigrationType(attr);
    const allowNull = attr.allowNull !== undefined ? !!attr.allowNull : true;

    let defaultValueLine = "";
    if (attr.defaultValue !== undefined && attr.defaultValue !== null && isSimpleJsDefault(attr.defaultValue)) {
      defaultValueLine = `,\n  defaultValue: ${JSON.stringify(attr.defaultValue)}`;
    } else if (attr.defaultValue === null) {
      // não seta default quando null
    }

    up.push(`
/** ${reason} */
await queryInterface.changeColumn(${JSON.stringify(table)}, ${JSON.stringify(column)}, {
  type: ${typeExpr},
  allowNull: ${allowNull}${defaultValueLine}
});`.trim());

    // Down: não dá pra saber o estado anterior com 100% certeza sem persistir snapshot.
    // Então deixo comentário para ajuste manual.
    down.push(`
/** TODO: rever rollback de ${table}.${column} (estado anterior não armazenado) */`.trim());
  }

  if (addIndexes.length) up.push(`\n// Gerado automaticamente: índices do model que faltam no DB`);
  for (const idx of addIndexes) {
    const { table, name, unique, fields } = idx;

    up.push(`
await queryInterface.addIndex(${JSON.stringify(table)}, ${JSON.stringify(fields)}, {
  name: ${JSON.stringify(name)},
  unique: ${unique}
});`.trim());

    down.push(`
await queryInterface.removeIndex(${JSON.stringify(table)}, ${JSON.stringify(name)});`.trim());
  }

  if (dropOrphans.length) {
    up.push(`\n// ATENÇÃO: remoção de colunas órfãs (opcional / perigoso)`);
    for (const o of dropOrphans) {
      up.push(`
/** DROP ORPHAN (revise!) */
await queryInterface.removeColumn(${JSON.stringify(o.table)}, ${JSON.stringify(o.column)});`.trim());

      down.push(`
/** TODO: rollback orphan ${o.table}.${o.column} (definir tipo manualmente) */`.trim());
    }
  }

  return `"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
${indentLines(up.join("\n\n"), 4)}
  },

  async down(queryInterface, Sequelize) {
${indentLines(down.join("\n\n"), 4)}
  },
};
`;
}

async function main() {
  const args = process.argv.slice(2);
  const migrationLabel = (args.find((a) => !a.startsWith("--")) || "auto_schema_diff").trim();
  const dropOrphansFlag = args.includes("--drop-orphans"); // perigoso, default OFF

  const db = (await import(pathToFileUrl(MODELS_INDEX_PATH))).default;
  const sequelize = db.sequelize;

  const [[schemaRow]] = await sequelize.query(`select current_schema() as schema;`);
  const schema = schemaRow?.schema || "public";

  const dbCols = await getDbColumns(sequelize, schema);
  const dbIdx = await getDbIndexes(sequelize, schema);

  const addColumns = [];
  const changeColumns = [];
  const orphanColumns = [];
  const addIndexes = [];

  const warnings = [];

  for (const [modelName, model] of Object.entries(db)) {
    if (!model || !model.getTableName || !model.rawAttributes) continue;
    if (["sequelize", "Sequelize"].includes(modelName)) continue;

    const tableName = normalizeTableName(model.getTableName());
    if (!tableName) continue;

    const tableKey = `${schema}.${tableName}`;
    const existingCols = dbCols.get(tableKey) || new Map();

    // ====== comparar colunas ======
    const modelCols = new Map();
    for (const [attrName, attr] of Object.entries(model.rawAttributes)) {
      if (attr?.type?.key === "VIRTUAL") continue;
      const colName = attr.field || attrName;
      modelCols.set(colName, { attrName, attr });
    }

    // add missing
    for (const [colName, { attr }] of modelCols.entries()) {
      if (!existingCols.has(colName)) {
        addColumns.push({ kind: "addColumn", table: tableName, column: colName, attr });
      } else {
        // ====== changeColumn seguro: allowNull + default simples ======
        const dbInfo = existingCols.get(colName);

        const dbNullable = String(dbInfo.is_nullable).toUpperCase() === "YES";
        const modelAllowNull = attr.allowNull !== undefined ? !!attr.allowNull : true;

        // allowNull diff
        if (dbNullable !== modelAllowNull) {
          changeColumns.push({
            kind: "changeColumn",
            table: tableName,
            column: colName,
            attr,
            reason: `allowNull diverge (DB: ${dbNullable} | Model: ${modelAllowNull})`,
          });
        }

        // default diff (apenas defaults simples)
        const modelDef = attr.defaultValue;
        const dbDefNorm = normalizeSimpleDefaultForCompare(dbInfo.column_default);

        if (isSimpleJsDefault(modelDef)) {
          // compara com string/number/bool
          if (dbDefNorm === null || typeof dbDefNorm === "object" || dbDefNorm !== modelDef) {
            changeColumns.push({
              kind: "changeColumn",
              table: tableName,
              column: colName,
              attr,
              reason: `defaultValue simples diverge (DB: ${JSON.stringify(dbDefNorm)} | Model: ${JSON.stringify(modelDef)})`,
            });
          }
        } else if (modelDef === undefined || modelDef === null) {
          // se model não define default, não mexe (muito arriscado)
        }
      }
    }

    // orphans (DB tem, model não tem) -> aviso
    for (const [dbColName] of existingCols.entries()) {
      // ignora colunas padrão de sequelize se você quiser (createdAt/updatedAt)
      if (dbColName === "createdAt" || dbColName === "updatedAt") continue;
      if (!modelCols.has(dbColName)) {
        orphanColumns.push({ table: tableName, column: dbColName });
      }
    }

    // ====== comparar índices ======
    const modelIndexes = Array.isArray(model?.options?.indexes) ? model.options.indexes : [];
    const dbIndexes = dbIdx.get(tableName) || [];

    // mapeia db indexes "simplificados"
    const dbIndexKeys = new Set(
      dbIndexes
        .filter((x) => x.cols?.length)
        .map((x) => stableIndexKey({ unique: x.unique, fields: x.cols }))
    );

    for (const idx of modelIndexes) {
      const fields = (idx.fields || []).map((f) => (typeof f === "string" ? f : f?.name)).filter(Boolean);
      if (!fields.length) continue;

      const unique = !!idx.unique;
      const key = stableIndexKey({ unique, fields });

      if (!dbIndexKeys.has(key)) {
        // define nome estável
        const name = idx.name || `idx_${tableName}_${fields.join("_")}_${unique ? "uniq" : "idx"}`;
        addIndexes.push({ table: tableName, name, unique, fields });
      }
    }

    // ====== warning de unique perigoso no DB (muitos duplicados, como o teu caso) ======
    // Se DB tiver índice unique de 1 coluna requerimentoNumero, só avisa (dropar automático é perigoso).
    for (const di of dbIndexes) {
      if (di.unique && di.cols?.length === 1) {
        const col = di.cols[0];
        // se o model não declara unique nesse campo, avisa
        const modelAttr = modelCols.get(col)?.attr;
        const modelSaysUnique =
          !!modelAttr?.unique ||
          modelIndexes.some((mi) => !!mi.unique && (mi.fields || []).length === 1 && (mi.fields[0] === col || mi.fields[0]?.name === col));

        if (!modelSaysUnique) {
          warnings.push(`[WARN] DB tem UNIQUE index "${di.name}" em ${tableName}(${col}) mas o model não pede. NÃO vou dropar automaticamente.`);
        }
      }
    }
  }

  // imprime orphans sempre
  if (orphanColumns.length) {
    console.log("\n=== COLUNAS ÓRFÃS (no DB mas não no model) ===");
    for (const o of orphanColumns) console.log(`- ${o.table}.${o.column}`);
    console.log("Obs: por segurança, não removo automático. Use --drop-orphans se você souber o que está fazendo.\n");
  }

  // imprime warnings
  if (warnings.length) {
    console.log("\n=== WARNINGS (revisar) ===");
    for (const w of warnings) console.log(w);
    console.log("");
  }

  // Decide se vai dropar orphans
  const dropOrphans = dropOrphansFlag ? orphanColumns : [];

  const hasWork = addColumns.length || changeColumns.length || addIndexes.length || dropOrphans.length;

  if (!hasWork) {
    console.log("Nada seguro para migrar. (Somente avisos/órfãs ou nada detectado)");
    await sequelize.close();
    return;
  }

  const stamp = nowStamp();
  const fileBase = `${stamp}-${safeName(migrationLabel)}`;
  const filePath = path.join(MIGRATIONS_DIR, `${fileBase}.cjs`);

  await ensureDir(MIGRATIONS_DIR);

  const migration = renderMigration({ addColumns, changeColumns, addIndexes, dropOrphans });

  await fs.writeFile(filePath, migration, "utf8");
  console.log(`✅ Migration gerada: ${filePath}`);
  if (dropOrphansFlag) console.log("⚠️ Você usou --drop-orphans. Revise MUITO antes de rodar em produção.");

  await sequelize.close();
}

main().catch((e) => {
  console.error("Erro no helper:", e);
  process.exit(1);
});
