/* Convert the official ECDICT CSV into a compact read-only SQLite dictionary.
 * Usage: node scripts/build-ecdict.mjs <input.csv> <output.sqlite>
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { parse } from 'csv-parse';
import { DatabaseSync } from 'node:sqlite';

const inputPath = path.resolve(process.argv[2] || 'data/dictionary/ecdict.csv');
const outputPath = path.resolve(process.argv[3] || 'data/dictionary/ecdict.sqlite');
const temporaryPath = outputPath + '.building';
const metadataPath = path.join(
  path.dirname(outputPath),
  path.basename(outputPath, path.extname(outputPath)) + '.metadata.json'
);

if (!fs.existsSync(inputPath)) {
  console.error(`ECDICT CSV not found: ${inputPath}`);
  process.exit(1);
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
const sourceSha256 = crypto.createHash('sha256').update(fs.readFileSync(inputPath)).digest('hex');
const sourceBytes = fs.statSync(inputPath).size;

const db = new DatabaseSync(temporaryPath);
db.exec(`
  PRAGMA journal_mode = OFF;
  PRAGMA synchronous = OFF;
  PRAGMA temp_store = MEMORY;
  CREATE TABLE entries (
    word TEXT PRIMARY KEY COLLATE NOCASE,
    phonetic TEXT,
    translation TEXT,
    definition TEXT,
    pos TEXT,
    exchange TEXT,
    tags TEXT,
    collins INTEGER,
    oxford INTEGER,
    bnc INTEGER,
    frq INTEGER
  ) WITHOUT ROWID;
`);

const insert = db.prepare(`
  INSERT OR REPLACE INTO entries
  (word, phonetic, translation, definition, pos, exchange, tags, collins, oxford, bnc, frq)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const integer = value => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.trunc(number) : null;
};

let imported = 0;
let skipped = 0;
db.exec('BEGIN');
try {
  const parser = fs.createReadStream(inputPath).pipe(parse({
    bom: true,
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true
  }));
  for await (const row of parser) {
    const word = String(row.word || '').trim();
    if (!word) {
      skipped++;
      continue;
    }
    insert.run(
      word,
      String(row.phonetic || '').trim(),
      String(row.translation || '').trim(),
      String(row.definition || '').trim(),
      String(row.pos || '').trim(),
      String(row.exchange || '').trim(),
      String(row.tag || '').trim(),
      integer(row.collins),
      integer(row.oxford),
      integer(row.bnc),
      integer(row.frq)
    );
    imported++;
    if (imported % 50000 === 0) process.stdout.write(`\rImported ${imported.toLocaleString()} entries`);
  }
  db.exec('COMMIT');
  db.exec('PRAGMA optimize');
} catch (error) {
  db.exec('ROLLBACK');
  db.close();
  if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
  console.error('\nECDICT build failed:', error.message || error);
  process.exit(1);
}
db.close();

if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
fs.renameSync(temporaryPath, outputPath);
const size = fs.statSync(outputPath).size;
fs.writeFileSync(metadataPath, JSON.stringify({
  source: 'ECDICT',
  sourceUrl: 'https://github.com/skywind3000/ECDICT',
  license: 'MIT',
  builtAt: new Date().toISOString(),
  sourceBytes,
  sourceSha256,
  entryCount: imported,
  skipped,
  databaseBytes: size
}, null, 2));
console.log(`\rBuilt ${outputPath}`);
console.log(`Entries: ${imported.toLocaleString()} | skipped: ${skipped}`);
console.log(`Size: ${(size / 1024 / 1024).toFixed(1)} MB`);
