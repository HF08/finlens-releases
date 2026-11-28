/* Build-pipeline smoke test for the ECDICT SQLite converter. */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const OUT = path.resolve('tests/shots');
const CSV = path.join(OUT, 'ecdict-build-sample.csv');
const DB = path.join(OUT, 'ecdict-build-sample.sqlite');
const METADATA = path.join(OUT, 'ecdict-build-sample.metadata.json');
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(CSV, [
  'word,phonetic,definition,translation,pos,collins,oxford,tag,bnc,frq,exchange,detail,audio',
  '"surge","sɜːdʒ","to rise suddenly","v. 激增；涌动","v:100",4,1,"cet4 cet6 ielts",4122,3196,"p:surged/d:surged/i:surging/3:surges",,'
].join('\n'));
if (fs.existsSync(DB)) fs.unlinkSync(DB);
if (fs.existsSync(METADATA)) fs.unlinkSync(METADATA);

const run = spawnSync(process.execPath, ['scripts/build-ecdict.mjs', CSV, DB], {
  cwd: process.cwd(),
  encoding: 'utf8'
});
console.log(run.stdout.trim());
if (run.stderr.trim()) console.error(run.stderr.trim());

const results = [];
const check = (name, condition, extra = '') => {
  results.push({ name, pass: !!condition, extra });
  console.log(`${condition ? 'PASS' : 'FAIL'} ${name}${extra ? ' - ' + extra : ''}`);
};

check('ECDICT converter completes', run.status === 0, `exit=${run.status}`);
check('ECDICT converter writes a SQLite database', fs.existsSync(DB));
const metadata = fs.existsSync(METADATA) ? JSON.parse(fs.readFileSync(METADATA, 'utf8')) : null;
check('ECDICT converter records source and build metadata',
  metadata?.entryCount === 1 &&
  metadata?.license === 'MIT' &&
  /^[a-f0-9]{64}$/i.test(metadata?.sourceSha256 || ''),
  JSON.stringify(metadata));
if (fs.existsSync(DB)) {
  const db = new DatabaseSync(DB, { readOnly: true });
  const row = db.prepare('SELECT * FROM entries WHERE word = ?').get('surge');
  const count = db.prepare('SELECT COUNT(*) AS count FROM entries').get().count;
  db.close();
  check('ECDICT converter preserves lookup fields',
    count === 1 && row?.phonetic === 'sɜːdʒ' && row?.translation.includes('激增') && row?.exchange.includes('surged'),
    JSON.stringify(row));
}

const failed = results.filter(result => !result.pass);
console.log(`\n=== ${results.length - failed.length}/${results.length} passed ===`);
if (failed.length) {
  for (const result of failed) console.log(' -', result.name, result.extra);
  process.exitCode = 1;
}
