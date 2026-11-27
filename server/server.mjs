/* ================= FinLens 本地服务 =================
 * 内置 Node 22.5+ 原生 fetch / node:sqlite。职责：
 *   1. 静态托管工作台前端
 *   2. /api/health   健康检查，供前端探测引擎状态
 *   3. /api/fetch    抓取外刊网页 → 清洗为段落文本
 *   4. /api/annotate 调用 OpenAI 兼容接口 → 生成逐段译文/生词/金融知识卡
 * 启动：node server/server.mjs   （默认 8787）
 * ================================================== */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { jsonrepair } from 'jsonrepair';
import { PDFParse } from 'pdf-parse';
import JSZip from 'jszip';
import { DatabaseSync } from 'node:sqlite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_APP_ROOT = path.resolve(__dirname, '..');
let APP_ROOT = process.env.FINLENS_APP_ROOT
  ? path.resolve(process.env.FINLENS_APP_ROOT)
  : DEFAULT_APP_ROOT;
let DATA_ROOT = process.env.FINLENS_DATA_DIR
  ? path.resolve(process.env.FINLENS_DATA_DIR)
  : path.join(APP_ROOT, 'data');
const PORT = Number(process.env.PORT || 8787);
const KEY = process.env.OPENAI_API_KEY || '';
const DAY_MS = 86400000;
const FETCH_TIMEOUT_MS = 15000;
const RESEARCH_TIMEOUT_MS = 8000;
const GDELT_API_BASE = process.env.GDELT_API_BASE || 'https://api.gdeltproject.org/api/v2/doc/doc';
const CROSSREF_API_BASE = process.env.CROSSREF_API_BASE || 'https://api.crossref.org/works';
const TAVILY_API_URL = process.env.TAVILY_API_URL || 'https://api.tavily.com/search';
const TAVILY_API_KEY = process.env.TAVILY_API_KEY || '';
let ECDICT_DB_PATH = process.env.ECDICT_DB
  ? path.resolve(process.env.ECDICT_DB)
  : path.join(DATA_ROOT, 'dictionary', 'ecdict.sqlite');
const MW_API_BASE = process.env.MW_API_BASE || 'https://www.dictionaryapi.com/api/v3/references/learners/json';
let BACKUP_DIR = path.resolve(process.env.FINLENS_BACKUP_DIR || path.join(DATA_ROOT, 'backups'));
let CREDENTIAL_DIR = path.resolve(process.env.FINLENS_CREDENTIAL_DIR || path.join(DATA_ROOT, 'credentials'));
let CREDENTIAL_FILE = path.join(CREDENTIAL_DIR, 'credentials.json');
let ALLOW_AUTOMATION_RECOVERY = process.env.FINLENS_ALLOW_AUTOMATION_RECOVERY === '1';
const execFileAsync = promisify(execFile);
let ecdictDb;
let ecdictUnavailable = false;
const knowledgeResearchCache = new Map();

function configureRuntimePaths(options = {}) {
  if (options.appRoot) APP_ROOT = path.resolve(options.appRoot);
  if (options.dataRoot) DATA_ROOT = path.resolve(options.dataRoot);
  ECDICT_DB_PATH = options.dictionaryPath
    ? path.resolve(options.dictionaryPath)
    : process.env.ECDICT_DB
      ? path.resolve(process.env.ECDICT_DB)
      : path.join(DATA_ROOT, 'dictionary', 'ecdict.sqlite');
  BACKUP_DIR = path.resolve(options.backupDir || process.env.FINLENS_BACKUP_DIR || path.join(DATA_ROOT, 'backups'));
  CREDENTIAL_DIR = path.resolve(options.credentialDir || process.env.FINLENS_CREDENTIAL_DIR || path.join(DATA_ROOT, 'credentials'));
  CREDENTIAL_FILE = path.join(CREDENTIAL_DIR, 'credentials.json');
  ALLOW_AUTOMATION_RECOVERY = options.allowAutomationRecovery === true ||
    process.env.FINLENS_ALLOW_AUTOMATION_RECOVERY === '1';
  fs.mkdirSync(DATA_ROOT, { recursive: true });
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  fs.mkdirSync(CREDENTIAL_DIR, { recursive: true, mode: 0o700 });
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

const githubErrorMessage = (error, fallback = 'GitHub 资源读取失败') => {
  const message = String(error?.message || error || '');
  if (/fetch failed|EACCES|ENOTFOUND|ETIMEDOUT|UND_ERR/i.test(message)) {
    return '无法连接 GitHub API，请检查网络后重试';
  }
  return message || fallback;
};

const json = (res, code, obj) => {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  });
  res.end(body);
};

const readBody = (req, limit = 12 * 1024 * 1024) => new Promise((resolve, reject) => {
  let n = 0;
  const chunks = [];
  req.on('data', c => {
    n += c.length;
    if (n > limit) { reject(new Error('payload too large')); req.destroy(); return; }
    chunks.push(c);
  });
  req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  req.on('error', reject);
});

function findPdfBrowser() {
  const candidates = [
    process.env.FINLENS_BROWSER_PDF,
    process.platform === 'win32' && 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    process.platform === 'win32' && 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.platform === 'win32' && 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    process.platform === 'win32' && 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    process.platform === 'darwin' && '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    process.platform === 'darwin' && '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/microsoft-edge'
  ].filter(Boolean);
  return candidates.find(candidate => {
    try {
      return fs.statSync(candidate).isFile();
    } catch {
      return false;
    }
  }) || '';
}

function pdfFilename(value) {
  const raw = path.basename(String(value || 'FinLens-精读讲义.pdf'));
  const cleaned = raw
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
    .replace(/\s+/g, ' ')
    .trim() || 'FinLens-精读讲义.pdf';
  return /\.pdf$/i.test(cleaned) ? cleaned : cleaned + '.pdf';
}

async function renderHtmlToPdf(html, requestedName) {
  const source = String(html || '');
  if (!source.trim()) throw new Error('PDF 内容为空');
  if (Buffer.byteLength(source, 'utf8') > 18 * 1024 * 1024) throw new Error('PDF 内容超过 18MB');
  const browserPath = findPdfBrowser();
  if (!browserPath) {
    throw new Error('未找到可用的 Chrome 或 Edge，无法生成 PDF');
  }

  const tempRoot = path.join(DATA_ROOT, 'tmp', 'pdf');
  fs.mkdirSync(tempRoot, { recursive: true });
  const workDir = fs.mkdtempSync(path.join(tempRoot, 'finlens-pdf-'));
  const htmlFile = path.join(workDir, 'handout.html');
  const pdfFile = path.join(workDir, 'handout.pdf');
  const profileDir = path.join(workDir, 'profile');
  fs.mkdirSync(profileDir, { recursive: true });
  fs.writeFileSync(htmlFile, source, 'utf8');

  try {
    const args = [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--disable-gpu-compositing',
      '--disable-features=Vulkan',
      '--disable-extensions',
      '--disable-background-networking',
      '--no-first-run',
      '--no-default-browser-check',
      '--run-all-compositor-stages-before-draw',
      '--virtual-time-budget=2500',
      '--no-pdf-header-footer',
      `--user-data-dir=${profileDir}`,
      `--print-to-pdf=${pdfFile}`,
      pathToFileURL(htmlFile).href
    ];
    await execFileAsync(browserPath, args, {
      timeout: 45000,
      windowsHide: true,
      maxBuffer: 8 * 1024 * 1024
    });
    if (!fs.existsSync(pdfFile)) throw new Error('浏览器未生成 PDF 文件');
    const buffer = fs.readFileSync(pdfFile);
    if (buffer.subarray(0, 5).toString() !== '%PDF-') throw new Error('生成的 PDF 文件无效');
    return { buffer, filename: pdfFilename(requestedName) };
  } finally {
    try { fs.rmSync(workDir, { recursive: true, force: true }); } catch {}
  }
}

/* ---------- HTML 正文提取 ---------- */
function normalizeArticleText(text) {
  return decodeEntities(String(text || ''))
    .replace(/â€™|â€˜|ãƒâ€™|Ã¢â‚¬â„¢/gi, "'")
    .replace(/â€œ|â€|ãƒâ€œ|Ã¢â‚¬Å“|Ã¢â‚¬Â/gi, '"')
    .replace(/â€”|ãƒâ€”|Ã¢â‚¬â€/gi, '—')
    .replace(/â€“|ãƒâ€“|Ã¢â‚¬â€œ/gi, '–')
    .replace(/Â|Ã‚/g, '')
    .replace(/\uFFFD/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STRONG_BOILERPLATE_SENTENCE = [
  /confidential news tip/i,
  /we want to hear from you/i,
  /delivered to your inbox/i,
  /more info about our products and services/i,
  /real-time snapshot|data is delayed at least \d+ minutes/i,
  /stock quotes,? and market data|business and financial news,? stock quotes/i,
  /download (?:our|the) app|available on the app store|google play/i,
  /subscribe (?:now|today)|subscribe to (?:our|the) newsletter|follow us for more|sign up for (?:our|the) newsletter|newsletter sign.?up/i,
  /^sign up (?:today )?for (?:the|our|a) [^.!?]{0,80}newsletter[.!?]?$/i,
  /all rights reserved|privacy policy|cookie policy|terms of (?:use|service)/i,
  /image (?:source|caption)|getty images|photograph:/i,
  /advertisement|sponsored content/i,
  /免责声明|版权归|点击关注|点击蓝字|扫码关注|订阅我们|推荐阅读|阅读原文|商务合作|广告合作|设为星标|责任编辑|校对[:：]|原标题[:：]/i
];

function stripBoilerplateSentences(text) {
  const sentences = String(text || '').match(/[^.!?。！？]+[.!?。！？]+(?:["')\]]+)?|[^.!?。！？]+$/g) || [];
  const kept = sentences
    .map(sentence => sentence.trim())
    .filter(Boolean)
    .filter(sentence => !STRONG_BOILERPLATE_SENTENCE.some(pattern => pattern.test(sentence)));
  return normalizeArticleText(kept.join(' '));
}

function stripPageNoiseContainers(html) {
  let clean = String(html || '');
  const containerNames = ['aside', 'footer', 'nav'];
  for (const tag of containerNames) {
    clean = clean.replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi'), ' ');
  }
  const noiseLabels = [
    'advert', 'advertisement', 'ad-slot', 'newsletter', 'subscription', 'subscribe',
    'related', 'recommended', 'most-read', 'social', 'share-tools', 'comments',
    'market-data', 'ticker', 'promo', 'paywall', 'site-footer', 'cookie'
  ].join('|');
  const containerPattern = new RegExp(
    `<(?:div|section|aside)\\b[^>]*(?:class|id)=["'][^"']*(?:${noiseLabels})[^"']*["'][^>]*>[\\s\\S]*?<\\/(?:div|section|aside)>`,
    'gi'
  );
  return clean.replace(containerPattern, ' ');
}

function normalizeTitleCandidate(value) {
  return decodeEntities(String(value || '').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function isStrictEnglishTitle(value) {
  const title = normalizeTitleCandidate(value);
  const words = title.match(/[A-Za-z][A-Za-z0-9'’-]*/g) || [];
  const cjk = title.match(/[\u3400-\u9fff]/g) || [];
  if (!title || cjk.length || title.length < 12 || title.length > 160) return false;
  if (words.length < 3 || words.length > 24) return false;
  if (/[.。]/.test(title)) return false;
  if (/subscribe|follow us|click here|read more|advertisement|sponsored|image source|微信公众平台/i.test(title)) return false;
  if (STRONG_BOILERPLATE_SENTENCE.some(pattern => pattern.test(title))) return false;
  return true;
}

function extractWechatEnglishTitle(html, pageTitle = '') {
  const source = String(html || '');
  const candidates = [pageTitle];
  for (const match of source.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = match[0];
    const key = (tag.match(/\b(?:property|name|itemprop)=["']([^"']+)["']/i) || [, ''])[1];
    if (!/^(?:og:title|twitter:title|title|headline)$/i.test(key)) continue;
    candidates.push((tag.match(/\bcontent=["']([^"']*)["']/i) || [, ''])[1]);
  }
  for (const match of source.matchAll(/<(?:h1|h2|h3)\b[^>]*>([\s\S]*?)<\/(?:h1|h2|h3)>/gi)) {
    candidates.push(match[1]);
  }
  for (const match of source.matchAll(/<(?:div|section|p|span)\b[^>]*(?:id|class)=["'][^"']*(?:rich_media_title|activity-name|article-title|post-title)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|section|p|span)>/gi)) {
    candidates.push(match[1]);
  }
  for (const match of source.slice(0, 12000).matchAll(/<(?:p|section)\b[^>]*>\s*<(?:strong|b)\b[^>]*>([\s\S]*?)<\/(?:strong|b)>\s*<\/(?:p|section)>/gi)) {
    candidates.push(match[1]);
  }
  for (const candidate of candidates) {
    const title = normalizeTitleCandidate(candidate)
      .replace(/\s*[-_|]\s*微信公众平台\s*$/i, '')
      .replace(/^微信公众平台\s*[-_|]\s*/i, '')
      .trim();
    if (isStrictEnglishTitle(title)) return title;
  }
  return '';
}

function extractParagraphs(html) {
  const sourceHtml = String(html || '');
  let h = stripPageNoiseContainers(sourceHtml
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' '));

  let title = decodeEntities((h.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [, ''])[1])
    .replace(/\s+/g, ' ')
    .trim();

  const wechat = h.match(/id=["']js_content["'][^>]*>([\s\S]*)/i);
  let englishTitle = '';
  if (wechat) {
    title = title
      .replace(/\s*[-_|]\s*微信公众平台\s*$/i, '')
      .replace(/^微信公众平台\s*[-_|]\s*/i, '')
      .trim();
    englishTitle = extractWechatEnglishTitle(sourceHtml, title);
    h = wechat[1]
      .split(/<div[^>]+class=["'][^"']*(?:rich_media_tool|qr_code|js_ad)[^"']*["']/i)[0]
      .replace(/<\/div>\s*<\/div>[\s\S]*$/i, '');
  } else {
    const article = h.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
    const main = h.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
    const content = h.match(/<(?:div|section)\b[^>]+id=["'](?:article|main-content|content)["'][^>]*>([\s\S]*)/i);
    if (article) h = article[1];
    else if (main) h = main[1];
    else if (content) {
      h = content[1]
        .split(/<(?:footer|div)\b[^>]*(?:class|id)=["'][^"']*(?:footer|site-map|related-content)[^"']*["']/i)[0];
    }
  }

  const normalizeCandidate = (text) => stripBoilerplateSentences(String(text || '').replace(/<[^>]+>/g, ' '))
    .replace(/\b(?:Share|Print|Email)\s+(?=(?:The|This|Today|Federal|Official|Statement|Press|Washington)\b)/gi, ' ')
    .trim();
  const englishWords = (text) => (String(text || '').match(/[A-Za-z][A-Za-z'-]*/g) || []).length;
  const englishRatio = (text) => {
    const latin = (String(text || '').match(/[A-Za-z]/g) || []).length;
    const chinese = (String(text || '').match(/[\u3400-\u9fff]/g) || []).length;
    return latin + chinese ? latin / (latin + chinese) : 0;
  };
  const pCandidates = [...h.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(match => match[1]);
  const blockText = h
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|section|div|li|blockquote|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');
  const candidates = wechat
    ? [...blockText.split(/\n+/), ...pCandidates]
    : (pCandidates.length ? pCandidates : blockText.split(/\n+/));
  const ps = [...new Set(candidates.map(normalizeCandidate))]
    .filter(t => t.length > 40 && englishWords(t) >= 5)
    .filter(t => englishRatio(t) >= 0.58)
    .filter(t => !/(Official websites use \.gov|Secure \.gov websites use HTTPS|The Federal Reserve, the central bank of the United States, provides|For media inquiries, please email)/i.test(t));

  // 去重（不少站点重复输出同一段）
  const seen = new Set();
  const out = [];
  for (const p of ps) {
    const k = p.slice(0, 80).toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(p);
    if (out.length >= 18) break;
  }
  return { title, englishTitle, paragraphs: out };
}

function validateArticleContent(paragraphs, title = '') {
  const clean = (paragraphs || [])
    .map(text => normalizeArticleText(text))
    .filter(Boolean);
  const words = clean.join(' ').match(/[A-Za-z0-9'-]+/g) || [];
  if (clean.length < 2 || words.length < 25) {
    throw new Error(`正文有效内容不足：仅识别到 ${clean.length} 段、${words.length} 个词。请改用粘贴正文或上传文档`);
  }
  if (title && /^(error|not found|access denied|403|404)$/i.test(title.trim())) {
    throw new Error('页面标题看起来不是有效文章，已拒绝导入');
  }
  return clean;
}

function extractDocxText(buffer) {
  const eocd = buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) throw new Error('DOCX 文件结构无效');
  const entries = buffer.readUInt16LE(eocd + 10);
  let cursor = buffer.readUInt32LE(eocd + 16);
  let target = null;

  for (let i = 0; i < entries; i++) {
    if (buffer.readUInt32LE(cursor) !== 0x02014b50) throw new Error('DOCX 目录损坏');
    const method = buffer.readUInt16LE(cursor + 10);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const nameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const localOffset = buffer.readUInt32LE(cursor + 42);
    const name = buffer.subarray(cursor + 46, cursor + 46 + nameLength).toString('utf8').replace(/\\/g, '/');
    if (name === 'word/document.xml') target = { method, compressedSize, localOffset };
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  if (!target) throw new Error('DOCX 中缺少正文');

  const local = target.localOffset;
  if (buffer.readUInt32LE(local) !== 0x04034b50) throw new Error('DOCX 正文索引无效');
  const localNameLength = buffer.readUInt16LE(local + 26);
  const localExtraLength = buffer.readUInt16LE(local + 28);
  const start = local + 30 + localNameLength + localExtraLength;
  const compressed = buffer.subarray(start, start + target.compressedSize);
  let xml;
  if (target.method === 0) xml = compressed;
  else if (target.method === 8) xml = zlib.inflateRawSync(compressed);
  else throw new Error('暂不支持该 DOCX 压缩方式');

  const text = decodeEntities(String(xml))
    .replace(/<w:tab\b[^>]*\/>/gi, ' ')
    .replace(/<w:br\b[^>]*\/>/gi, '\n')
    .replace(/<\/w:p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return text.split(/\n+/).map(line => line.trim()).filter(line => line.length > 30);
}

async function extractPdfText(buffer) {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    const text = String(result.text || '')
      .replace(/â€™|â€˜/g, "'")
      .replace(/â€œ|â€/g, '"')
      .replace(/â€”/g, '—').replace(/â€“/g, '–')
      .replace(/Â/g, '')
      .replace(/[ \t]+/g, ' ')
      .trim();
    const lines = text.split(/\r?\n/)
      .map(line => line.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .filter(line => !/^--\s*\d+\s+of\s+\d+\s*--$/i.test(line))
      .filter(line => !/^\d{1,3}$/.test(line))
      .filter(line => !/^\d{4}[\/-]\d{2}[\/-]\d{2}.*\d+\s+words$/i.test(line))
      .filter(line => !/^(核心词汇|金融知识卡|词\s+音标|The Economist\s*·)/i.test(line));
    const paragraphs = [];
    let current = '';
    const flush = () => {
      const value = current.trim();
      if (value.length > 20 && /[A-Za-z\u4e00-\u9fff]/.test(value)) paragraphs.push(value);
      current = '';
    };
    for (const line of lines) {
      if (!current) {
        current = line;
        continue;
      }
      const previousEndsSentence = /[.!?。！？:：]$/.test(current);
      const startsLowercase = /^[a-z,;:)]/.test(line);
      const isTableLike = /\t{2,}|(?:^|\s)(?:n\.|v\.|adj\.|adv\.)\s/.test(line);
      if (isTableLike) {
        flush();
        continue;
      }
      if (!previousEndsSentence || startsLowercase) {
        const needsSpace = /[A-Za-z0-9)]$/.test(current) && /^[A-Za-z0-9(]/.test(line);
        current += needsSpace ? ' ' + line : line;
      } else {
        flush();
        current = line;
      }
    }
    flush();
    return paragraphs;
  } finally {
    await parser.destroy();
  }
}

async function extractEpubChapters(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const names = Object.keys(zip.files);
  const containerName = names.find(name => name.toLowerCase() === 'meta-inf/container.xml');
  if (!containerName) throw new Error('EPUB 缺少 container.xml');
  const containerXml = await zip.file(containerName).async('string');
  const rootPath = containerXml.match(/full-path=["']([^"']+)["']/i)?.[1];
  if (!rootPath) throw new Error('EPUB 缺少 OPF 索引');
  const opfName = names.find(name => name.toLowerCase() === rootPath.toLowerCase());
  if (!opfName) throw new Error('EPUB OPF 文件不存在');
  const opf = await zip.file(opfName).async('string');
  const opfDir = path.posix.dirname(opfName);
  const title = decodeEntities(opf.match(/<dc:title[^>]*>([\s\S]*?)<\/dc:title>/i)?.[1] || 'Economist');
  const manifest = new Map();
  for (const match of opf.matchAll(/<item\b([^>]+)>/gi)) {
    const attrs = match[1];
    const id = attrs.match(/\bid=["']([^"']+)["']/i)?.[1];
    const href = attrs.match(/\bhref=["']([^"']+)["']/i)?.[1];
    if (!id || !href) continue;
    const mediaType = attrs.match(/\bmedia-type=["']([^"']+)["']/i)?.[1] || '';
    if (!/xhtml|html/i.test(mediaType) && !/\.x?html?$/i.test(href)) continue;
    manifest.set(id, path.posix.normalize(path.posix.join(opfDir, decodeURIComponent(href))));
  }
  const spineIds = [...opf.matchAll(/<itemref\b[^>]*\bidref=["']([^"']+)["'][^>]*>/gi)].map(m => m[1]);
  let chapterFiles = spineIds.map(id => manifest.get(id)).filter(Boolean);
  if (!chapterFiles.length) chapterFiles = [...manifest.values()];
  const chapters = [];
  for (const filePath of chapterFiles) {
    const entry = names.find(name => name.toLowerCase() === filePath.toLowerCase());
    if (!entry) continue;
    const html = await zip.file(entry).async('string');
    const chapterTitleMatch = html.match(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/i);
    const chapterTitle = stripHtml(chapterTitleMatch?.[1] || path.posix.basename(entry, path.posix.extname(entry)));
    const paragraphs = [...html.matchAll(/<(p|h1|h2)\b[^>]*>([\s\S]*?)<\/\1>/gi)]
      .map(match => stripHtml(match[2]))
      .filter(text => text.length > 35 && /[A-Za-z]/.test(text));
    if (!paragraphs.length) continue;
    if (/优质App|目录|封面|版权|广告|赞助|table of contents|cover image|about this edition/i.test(chapterTitle)) continue;
    chapters.push({ title: chapterTitle, paragraphs });
    if (chapters.length >= 80) break;
  }
  if (!chapters.length) throw new Error('EPUB 中未提取到文章章节');
  return { title, chapters };
}

/* ---------- RSS / Atom 时间线 ---------- */
function decodeEntitiesOnce(text) {
  return String(text || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#(\d+);/g, (_, n) => {
      const code = Number(n);
      return Number.isInteger(code) && code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : `&#${n};`;
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => {
      const code = parseInt(n, 16);
      return Number.isInteger(code) && code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : `&#x${n};`;
    })
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&rsquo;|&lsquo;/gi, "'")
    .replace(/&ldquo;|&rdquo;/gi, '"')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&hellip;/gi, '…')
    .replace(/&mdash;/gi, '—')
    .replace(/&ndash;/gi, '–');
}

function decodeEntities(text) {
  let decoded = String(text || '');
  for (let pass = 0; pass < 3; pass += 1) {
    const next = decodeEntitiesOnce(decoded);
    if (next === decoded) break;
    decoded = next;
  }
  return decoded;
}

function stripHtml(text) {
  return decodeEntities(String(text || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function tagValue(block, names) {
  for (const name of names) {
    const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i');
    const match = block.match(re);
    if (match) return decodeEntities(match[1]).trim();
  }
  return '';
}

function parseFeed(xml, feedUrl) {
  const channel = xml.match(/<channel\b[^>]*>([\s\S]*?)<\/channel>/i)?.[1] || xml;
  const feedTitle = tagValue(channel, ['title']) || new URL(feedUrl).hostname;
  const blocks = [...xml.matchAll(/<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map(m => m[2]);
  const items = [];
  for (const block of blocks) {
    const atomLink = block.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*>/i)?.[1];
    const url = decodeEntities(atomLink || tagValue(block, ['link'])).trim();
    const title = stripHtml(tagValue(block, ['title']));
    const rawDate = tagValue(block, ['pubDate', 'published', 'updated', 'dc:date']);
    const date = new Date(rawDate);
    if (!/^https?:\/\//i.test(url) || !title || Number.isNaN(date.getTime())) continue;
    items.push({
      title,
      url,
      date: date.toISOString().slice(0, 10),
      _ts: date.getTime(),
      source: feedTitle,
      summary: stripHtml(tagValue(block, ['description', 'summary', 'content:encoded', 'content'])).slice(0, 500)
    });
  }
  return items;
}

function parseDateRange(body) {
  const from = new Date(String(body.from || '') + 'T00:00:00Z');
  const to = new Date(String(body.to || '') + 'T00:00:00Z');
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) throw new Error('日期格式应为 YYYY-MM-DD');
  if (from > to) throw new Error('起始日期不能晚于结束日期');
  if (to.getTime() - from.getTime() > 365 * DAY_MS) throw new Error('抓取时间窗最长为一年');
  return { from, to: new Date(to.getTime() + DAY_MS) };
}

async function fetchFeedItems(body) {
  const feeds = [...new Set((Array.isArray(body.feeds) ? body.feeds : []).map(x => String(x).trim()).filter(Boolean))];
  if (!feeds.length) throw new Error('请至少配置一个 RSS / Atom 地址');
  if (feeds.length > 20) throw new Error('单次最多检查 20 个订阅源');
  const range = parseDateRange(body);
  const limit = Math.min(50, Math.max(1, Number(body.limit) || 20));
  const items = [];
  const errors = [];

  await Promise.all(feeds.map(async feed => {
    try {
      const u = new URL(feed);
      if (!/^https?:$/.test(u.protocol)) throw new Error('仅支持 http(s) 订阅源');
      const resp = await fetch(feed, {
        headers: {
          'user-agent': 'Mozilla/5.0 (compatible; FinLens/1.1) AppleWebKit/537.36 Chrome/120 Safari/537.36',
          accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*'
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
      });
      if (!resp.ok) throw new Error(`订阅源返回 HTTP ${resp.status}`);
      const xml = await resp.text();
      for (const item of parseFeed(xml, feed)) {
        if (item._ts < range.from.getTime() || item._ts > range.to.getTime()) continue;
        items.push(item);
      }
    } catch (e) {
      errors.push(`${feed}: ${String(e.message || e)}`);
    }
  }));

  if (!items.length && errors.length === feeds.length) throw new Error(errors.join('；'));
  const seen = new Set();
  return {
    items: items
      .sort((a, b) => b._ts - a._ts)
      .filter(item => {
        if (seen.has(item.url)) return false;
        seen.add(item.url);
        delete item._ts;
        return true;
      })
      .slice(0, limit),
    errors
  };
}

/* ---------- LLM 标注 ---------- */
const FINANCE_SKILL = `你是一名严谨的财经英语导师，同时具备宏观经济学、货币政策、财政、公司金融、市场微观结构和金融英语教学能力。
分析时遵循以下框架：
1. 区分事实、解释、预测和价值判断，不编造原文没有的数据或事件。
2. 宏观与政策：区分名义与实际、存量与流量、政策利率与市场利率，说明通胀、就业、财政和货币政策的传导渠道。
3. 市场与资产定价：区分价格变化与基本面变化，识别风险溢价、期限溢价、流动性、信用和预期的作用。
4. 公司与财务：关注现金流、资本开支、资本结构、会计口径、估值倍数和股东回报，不把会计利润等同于现金流。
5. 风险与监管：识别杠杆、久期、集中度、信用、流动性和政策风险，引用监管制度时保持审慎。
6. 英语教学：拆解句子主干、从句关系、指代、时态语气、搭配、修辞和可迁移表达，不只给翻译。
7. 背景分析：区分政治制度、经济周期、产业结构、国际关系、监管环境与历史脉络，不把相关性说成因果。
8. 方法分析：识别文章使用的现金流、久期、风险溢价、供需、激励、博弈、比较静态或情景分析，并说明假设与边界。
9. 对话回答必须把原文证据、文章知识库依据和权威机构背景分开；证据不足时明确说明限制，不提供个股买卖或确定性收益承诺。`;

const KNOWLEDGE_CASE_RULES = `案例字段（cases）规则：
1. 案例必须直接说明当前术语的本体、机制、用途或判断边界，不能用相邻概念、文章主题或金融后果替代术语。
2. 优先写可追溯的真实事件、政策、市场数据或原文语境；至少交代时间、机构、地区、指标、数据口径或原文出处之一。无法核验时宁可留空，不得为了填满字段编造。
3. 不得编造机构、日期、数字、统计关系、因果结论或适用范围。使用数字演示时必须明确写“假设”或“示例计算”，说明关键假设与计算口径，不能伪装成真实统计。
4. 区分事实、解释和预测。单一案例不能证明普遍规律，相关不等于因果，事件先后不等于因果；案例不得暗示唯一原因。
5. 数字必须带单位、期间和口径，区分百分比与百分点、水平与增速、存量与流量、名义与实际；涉及会计、法律或监管时说明准则、法域或生效时间。
6. 案例不参与 category 判断。即使案例跨到金融、法律或技术领域，术语主分类仍由 term、one 和 body 的主解释对象决定。`;

function buildPrompt({ title, paragraphs, vocabFocus, sourceKind, sourceTitle, originalEnglishTitle }) {
  const focus = {
    balanced: '通用财经英语，兼顾表达与金融概念',
    ielts: 'IELTS 学术阅读高频词汇，优先可用于写作与口语的学术表达',
    toefl: 'TOEFL 学术阅读高频词汇，优化学术听读场景中的识别速度',
    finance: '金融术语优先，重点是机制、指标和市场语境的准确理解'
  }[vocabFocus] || '通用财经英语，兼顾表达与金融概念';
  const analysisFocus = FOCUS_ANALYSIS_GUIDE[vocabFocus] || FOCUS_ANALYSIS_GUIDE.balanced;
  const titleRule = sourceKind === 'wechat'
    ? (originalEnglishTitle
        ? `0.1 这是微信公众号文章。JSON 的 title 必须原样使用已识别的英文原标题：“${originalEnglishTitle}”；不得翻译或改写。deck 仍写一句简体中文导语。`
        : '0.1 这是微信公众号文章，且正文中没有可靠的英文原标题。JSON 的 title 必须根据全文生成一个简洁、具体的英文摘要标题（3-18 个英文单词）；不得使用中文标题或栏目名。deck 仍写一句简体中文导语。')
    : '';
  return `你是财经英语教学专家。请把下面的英文财经报道改写为结构化精读语料，输出**严格 JSON**（不要 markdown 代码块）。

要求：
0. 先判断输入是否为连贯的完整文章。若是链接导航、碎片提示、前后不连贯文本或明显非文章内容，quality 设为 false，并在 qualityReason 说明原因。quality 只是诊断标记，无论取值如何，都必须继续返回 paragraphs、vocab 和 knowledge，不能因为 quality=false 而省略学习字段。官方声明、政策稿、报告节选只要语义连贯、段落完整，应视为可精读文章。
${titleRule}
1. 保留原文段落，按语义切分为 3-6 段；每段不超过 90 词。金融术语用 {{术语}} 包裹（仅标注真正的专业概念，如 term premium、yield curve）。
2. 为每段提供准确、通顺的简体中文翻译。
3. 为每段提供 analysis：english 包含 longSentence（长难句拆解）、grammar（语法与逻辑关系）、expression（可迁移表达）；finance 包含 term（核心金融概念）、background（背景与机制）、relevance（与本文论点或市场的联系）；focus 包含 label、guidance、recommendations（0-3 条英文推荐表达）。解析侧重为“${analysisFocus.label}”：${analysisFocus.instruction}。中文≤140 字/项。
4. 词汇侧重：${focus}。挑 10-14 个本段语料中对中文读者最有价值的学习词汇（含金融义项），给出音标、词性、中文释义、英文释义、常见词形 forms、带语法标签的 formChanges，以及 1-3 个同义或近义表达 synonyms；有金融语境的给出例句与例句翻译。formChanges 的 value 必须已经出现在 forms 中，不得编造派生词或搭配；每个词用 exam 数组标注适用的 IELTS / TOEFL / FINANCE，可多选。
5. 提炼 2-4 张知识卡，并明确 category 与 categories：
   - 通用判定顺序：先判定卡片的主要解释对象，再判断是否存在完整方法程序，再判断对象是否为金融本体；只有背景对象与金融关系都实质成立时才交叉。模型初始 category 只是弱提示。缺少正面金融本体证据时不保留 finance；缺少完整程序证据时不保留 method；默认归 background。
   - finance：卡片的主要解释对象必须是货币、信用、金融资产/合约、金融机构、融资与资本结构、资本预算、估值、保险、投资组合、风险转移或金融市场定价，例如 credit spread、term premium、corporate finance、business valuation、payback period、concessional capital、insurance underwriting、portfolio management、risk management、real wages、fiscal surplus。
   - background：政治、地缘政治、选举、制裁、监管环境、产业政策、产业结构、产业链与供给瓶颈、历史和国际关系；法律、司法、一般技术、军事、网络安全等基础领域也归 background。实体产业行动、基础设施和能源转型是 background，例如 electrification、equipment investment、capital expenditure、grid and storage investment、manufacturing capacity、electricity access、energy security、relative price effect、industrial policy。health equity、health inequality、公共卫生和医疗可及性也归 background；health insurance 和 healthcare finance 属于 finance。equity 单独出现不得判为 finance。unemployment duration、duration of unemployment、long-term unemployment 属于劳动市场 background；modified duration、bond duration、duration gap 才属于 finance。women's health funding gap、health research funding gap、medical research funding gap 属于健康与科研政策 background；corporate financing gap 和 refinancing gap 才属于 finance。funding 单独出现不得判为 finance。bargaining power、bargaining chip、negotiating leverage、谈判筹码、谈判杠杆、谈判力和议价能力属于谈判、组织关系或政策博弈 background；这里 leverage 不是财务杠杆。regulatory risk、compliance risk、legal risk、policy risk、strategic risk、reputational risk 和一般 operational risk 归 background；只有 market risk、credit risk、interest rate risk、liquidity risk、counterparty risk、bank operational risk、regulatory capital risk 等明确金融暴露才归 finance。enterprise risk management、regulatory risk management、compliance risk management 归 method。computing power、drug discovery pipeline、automated labs、autonomous laboratory、AI-for-science stack、research infrastructure 是工具、平台、科研技术或产业流程，归 background。AI agents、autonomous agents、agentic workflow、multi-agent system、AI agent platform 和 multi-agent simulation platform 是软件系统、执行流程或工具环境，归 background。限制高消费、限制消费措施、限制消费令、失信被执行人、可执行资产、可供执行财产、被执行人财产和责任财产属于民事执行、财产查控或失信惩戒制度，归 background；金融影响是法律执行后果。消费趋势、电解质补水趋势、补水需求、饮料品类扩张、品类颠覆、GLP-1 receptor agonist 等药物类别、首席执行官等高级管理角色，以及市场细分、产品差异化、品牌资产、品牌相关性、复购买家率、消费品增长战略和代际营销，属于消费、产业、医药、技术、营销或公司治理背景，不得因文章属于财经媒体而归 finance。战略收购、并购交易、自筹资金和企业融资仍属于 finance。scenario model、forecasting model、risk model、climate model 不能仅凭 model 词尾分类；若只是软件、平台或计算实现，归 background。
   - 金融边界：不得因为出现 investment、price、return、ratio 或 fund 就判为 finance。设备采购、厂房建设、电网与储能扩容、制造产能、技术采用、供应链、施工、运营和产业行动属于实体投资，默认 background。只有卡片核心讨论融资结构、资本成本、项目融资、贷款担保、资本预算或金融资产定价时才归 finance。相对估值、可比公司估值和估值倍数比较主分类属于 finance；只有同时明确给出可比对象、口径统一、倍数计算、风险检查和适用边界时，才作为“金融 + 方法交叉”，这类交叉不能推广到其他金融概念。airline revenue management 属于价格与收益管理 finance。企业或项目融资另立金融知识卡，不把实体行动本身写成金融概念。
   - 三项新增边界：market correction / 股市修正默认属于 finance，cardType=phenomenon，表示股票、指数或其他金融资产价格从近期高点回撤；若正文实际是房地产、一般商品、产业或库存价格修正且没有金融资产定价关系，回退 background。circular financing / 循环融资只有在投资、采购、云承诺、供应商融资、应收应付或再融资形成可识别资金闭环，并影响现金流、融资缺口、流动性或信用暴露时才归 finance + background；普通商业合作、纯会计循环或没有融资关系的产业活动回退 background，循环信贷和 rollover financing 不等同于 circular financing。capital expenditure / capex 单独出现仍归 background；当主解释对象是 capex 对经营现金流、自由现金流、融资缺口、流动性、偿债能力或资本成本的影响时归 finance + background；若同时给出完整、可复现的现金流比较计算程序，则归 finance + method。不能因出现 capex 就自动归背景，也不能仅凭一句“capex 消耗现金”升级为 method。
   - 购买力边界：purchasing power / 购买力衡量货币单位可购买的实际商品与服务，并连接名义收入、物价和家庭实际财务能力，默认归 finance、cardType=concept；若卡片完整给出商品篮子、价格数据、支出权重、指数计算和实际值平减程序，则归 finance + method、cardType=method。单纯的生活成本、示威或劳动市场背景不能替代购买力指标本体。
   - method：只接受可识别的分析、计量、估值、检验或决策程序，例如 DCF、scenario analysis、stress testing、event study、VaR、cost-benefit analysis、seasonal adjustment、data surprise analysis、job-growth breadth analysis、incremental vote-margin comparison、stated preference survey、wealth quantile analysis、UPC retail sales tracking、source completeness screening、attribution in reported speech 和 opportunity-cost analysis。不得仅因术语含 framework、model、agent 或 method 就归入 method；regulatory framework、business model、policy framework、legal framework 和 institutional framework 属于 background。scenario model、forecasting model、risk model、agent-based modeling、multi-agent simulation 只有在描述构成完整分析链，并说明分析目的、假设与输入、变换或模拟步骤、输出解释和适用边界时，才归入 method，且 methodSteps 应给出 2-5 个可执行步骤；否则归 background。agent-based modeling 和 multi-agent simulation 是方法候选，不是无条件方法强规则。完整分析程序的中文证据包括核查、比较、计算、排序、汇总、映射、剔除、筛选、判断、验证以及相应输入、输出和口径边界；不能因描述使用中文而漏判。
   - 机制边界：cardType=mechanism 只表示卡片解释因果链、传导路径或制度运行逻辑，不能据此把 category 改成 method。insurance premium financing、premium financing acquisition、acquisition financing 等融资收购安排首先属于 finance；即使有详细传导链和 methodSteps，也只能是 finance + mechanism，不是 method。查封、扣押、冻结、拍卖、变卖和分配流程是执行机制，同样不等于 method。
   - 资产回收边界：recovery rate、recovery amount、loss given default、LGD、不良资产处置、不良资产回收、不良贷款回收、债权回收、现金清收和抵押物处置属于 finance。未限定为不良资产或债权回收的“资产回收”默认归 background，不能仅凭“资产”或“回收”字样归 finance；recovery model、LGD model 也只有在完整程序证据下才归 method。
   - 交叉分类：金融法律、金融监管与金融政策、金融科技可以同时进入 finance 和 background。外部条件型风险溢价必须先识别外部条件本体：geopolitical risk premium、political risk premium、regulatory risk premium、policy risk premium、war risk premium 等，并且必须出现收益率、利差、折现率、资本成本或保险价格等可识别定价证据。若卡片主要解释该外部条件如何转化为定价补偿，以 finance 为主并交叉 background；若只描述外部条件和笼统市场影响，没有可识别定价对象，保留 background，不机械交叉；若卡片核心是溢价测算、估值公式或风险计量程序，则按 finance 或 method 另判。equity risk premium、term premium、credit spread、liquidity premium 是可定价金融指标，通常直接归 finance。AI trade repricing 是外部 AI 技术、竞争或市场情绪冲击引发的 AI 相关资产估值和仓位重定价，以 background 为主并交叉 finance。categories 最多两项且必须包含 category；金融法律可以 background 为主，金融监管与金融科技可以 finance 为主。在 categoryReason 说明交叉依据，不得只因出现 risk、premium、price、leverage 或 investment 字样就交叉。
   - 婚姻财产与共同控制股权配对规则：divorce asset division、divorce property division、marital property division、离婚财产分割等首先是婚姻财产制下确定财产归属和分配的法律机制，主分类 background；只有卡片同时实质涉及证券、企业权益、信托资产、估值、流动性、控制权、债务或税务处理时，才交叉 finance，且不得归 method，除非另有完整估值程序。jointly controlled equity stake、共同控制股权等主解释对象是可计价的股权资产，谁享有经济收益、投票、出售和处分权会直接影响减持、控制权、披露与估值，因此主分类 finance 并交叉 background；信托、婚姻财产制或受托人治理只是背景维度。不得仅凭共同控制、trust 或 divorce 字样改变主分类。
   category 只取一个主分类；categories 是 1-2 项板块数组。不得仅因文章属于财经就把一般法律、技术、能源、产业或政治概念归为 finance。
   - method：文章使用的思维框架、金融模型、估值/风险/因果分析方法。
   每张卡还要判断 cardType：
   - concept：定义、指标、制度或学术名词；没有案例时说明会在哪些统计口径、报告或研究场景中出现。
   - phenomenon：可观察的经济、市场或社会现象；应有触发条件、影响和案例。
   - mechanism：传导机制、因果路径或制度运行逻辑；应列出条件和逻辑步骤。机制本身不等于分析方法，不能因为存在机制说明或 methodSteps 就把 category 改成 method。
   - method：可重复的分析方法、分析模型或判断框架；应列出可执行步骤、输入输出、假设和适用边界。仅有一个 model 名称不足以判为 method。
   每张卡包含 term / en / category / categories / categoryReason / categoryConfidence / cardType / classificationReason / one（一句话讲透）/ body（机制解释 100-180 字）/ cases（可核验案例或明确标注的示例计算；没有可靠材料时留空）/ scenarios（出现场景数组）/ indicators（指标数组，每项含 name、meaning、importance）/ methodSteps / related / match。
   ${KNOWLEDGE_CASE_RULES}
   match 只允许填写原文中与 term 或 en 可互换的等价表达、缩写、词形变体或完整中文译名，不得填写人物、机构、公司、产品、国家、项目或其他上下文实体；例如卡片讲 Lean formal verification 时不能把 OpenAI 写入 match。
6. 难度 level 取 B2 / C1 / C2；topic 取 policy|markets|corporate|fintech|em|commodity|other 之一；若都不贴切则用 other，并给出 suggestedTag 建议标签。

JSON 结构：
{"quality":true,"qualityReason":"","title":"","deck":"一句中文导语","level":"C1","topic":"markets","suggestedTag":"",
 "paragraphs":[{"en":"","zh":"","note":"","analysis":{"english":{"longSentence":"","grammar":"","expression":""},"finance":{"term":"","background":"","relevance":""},"focus":{"label":"","guidance":"","recommendations":[""]}}}],
 "vocab":[{"w":"","ipa":"/.../","pos":"n.","zh":"","en":"","forms":[""],"formChanges":[{"label":"复数","value":""}],"synonyms":[""],"exam":["IELTS"],"ex":"","exZh":""}],
 "knowledge":[{"term":"","en":"","category":"finance|background|method","categories":["finance","background"],"categoryReason":"","categoryConfidence":0.95,"cardType":"concept|phenomenon|mechanism|method","classificationReason":"","one":"","body":"","cases":"","scenarios":[""],"indicators":[{"name":"","meaning":"","importance":""}],"methodSteps":[],"related":[""],"match":[""]}]}

原文标题：${title || '(unknown)'}
${sourceTitle && sourceTitle !== title ? `原文页面标题：${sourceTitle}` : ''}
原文段落：
${paragraphs.map((p, i) => `[${i + 1}] ${p}`).join('\n')}`;
}

function buildCompactPrompt(title, paragraph, vocabFocus = 'balanced', options = {}) {
  const focus = VOCAB_FOCUS_GUIDE[vocabFocus] || VOCAB_FOCUS_GUIDE.balanced;
  const analysisFocus = FOCUS_ANALYSIS_GUIDE[vocabFocus] || FOCUS_ANALYSIS_GUIDE.balanced;
  const titleRule = options.sourceKind === 'wechat'
    ? (options.originalEnglishTitle
        ? `JSON title 必须原样使用英文原标题“${options.originalEnglishTitle}”；deck 使用一句简体中文导语。`
        : 'JSON title 必须根据段落生成简洁具体的英文摘要标题（3-18 个英文单词），不得使用中文；deck 使用一句简体中文导语。')
    : '';
  return `只分析下面一个英文财经段落。即使输入看起来像网页提示而不是新闻，也按实际英文内容教学。
输出严格 JSON，不要 Markdown，不要代码块，字符串内不要使用未转义的双引号：
{"quality":true,"qualityReason":"","title":"${String(title || '').replace(/"/g, "'")}","deck":"一句中文导语","level":"C1","topic":"markets","suggestedTag":"",
"paragraphs":[{"en":"保留原文","zh":"中文翻译","note":"一条难点说明","analysis":{"english":{"longSentence":"长难句拆解","grammar":"语法逻辑","expression":"可迁移表达"},"finance":{"term":"核心金融术语","background":"背景和机制","relevance":"与文章的联系"},"focus":{"label":"${analysisFocus.label}","guidance":"","recommendations":[]}}}],
"vocab":[{"w":"词","ipa":"/.../","pos":"n.","zh":"中文","en":"English definition","forms":[],"formChanges":[{"label":"复数","value":""}],"synonyms":[],"exam":["FINANCE"],"ex":"例句","exZh":"例句翻译"}],
"knowledge":[{"term":"术语","en":"English","category":"finance|background|method","categories":["finance"],"categoryReason":"","categoryConfidence":0.95,"cardType":"concept|phenomenon|mechanism|method","classificationReason":"","one":"一句话解释","body":"机制说明","cases":"案例","scenarios":[],"indicators":[],"methodSteps":[],"related":[],"match":["仅填写与术语等价的原文表达"]}]}
最多 8 个词汇，最多 2 张知识卡。
词汇侧重：${focus}。解析侧重：${analysisFocus.label}。${analysisFocus.instruction}
exam 只能使用 IELTS / TOEFL / FINANCE，可多选。
match 不得填写公司、机构、人物、产品、国家或项目等上下文实体。
${KNOWLEDGE_CASE_RULES}
即使内容质量一般，也必须返回 vocab 和 knowledge；不确定时返回最相关的 1 个词汇和 1 张知识卡。
${titleRule}

原文段落：
${paragraph}`;
}

const VOCAB_FOCUS_GUIDE = {
  balanced: '通用财经英语，兼顾表达与金融概念',
  ielts: 'IELTS 学术阅读高频词汇，优先可用于写作与口语的学术表达',
  toefl: 'TOEFL 学术阅读高频词汇，优化学术听读场景中的识别速度',
  finance: '金融术语优先，重点是机制、指标和市场语境的准确理解'
};

const FOCUS_ANALYSIS_GUIDE = {
  balanced: {
    label: '通用精读',
    instruction: '英语层与金融层保持平衡；英语层给出句法、表达和可迁移用法，金融层给出术语、背景机制和文章关联。'
  },
  ielts: {
    label: 'IELTS 学术表达',
    instruction: '突出学术改写、论证结构、段落衔接、写作与口语可迁移表达；recommendations 给出 1-3 条可直接复用的学术表达。金融层保留必要术语和机制，但避免挤压英语层。'
  },
  toefl: {
    label: 'TOEFL 学术阅读',
    instruction: '突出学术阅读中的句间关系、指代、推断、段落功能和摘要表达；recommendations 给出 1-3 条可用于阅读复述或摘要的表达。金融层保留必要术语和机制。'
  },
  finance: {
    label: '金融层推理',
    instruction: '压缩一般英语说明，英语层只保留理解句意所必需的句法和表达；金融层必须强化术语的准确含义、传导机制、估值或风险含义、财务影响以及本文论证中的作用，避免泛泛复述。recommendations 可以留空。'
  }
};

function buildAnalysisPrompt({ title, paragraphs, vocabFocus }) {
  const focusKey = Object.hasOwn(FOCUS_ANALYSIS_GUIDE, vocabFocus) ? vocabFocus : 'balanced';
  const focus = FOCUS_ANALYSIS_GUIDE[focusKey];
  return `你是财经英语精读导师。只生成精读解析，不生成词汇、知识卡、译文或新的原文。输出严格 JSON，不要 Markdown，不要代码块。

当前学习侧重：${focus.label}
侧重要求：${focus.instruction}

硬性要求：
1. analyses 必须覆盖输入中的每一个 index，不能漏段，不能改写原文事实或编造数据。
2. english.longSentence 拆解主干、从句、修饰和逻辑；english.grammar 说明语法、指代和句间关系；english.expression 给出可在写作或口语中迁移的表达。
3. finance.term 给出本段真正重要的金融概念；finance.background 解释机制或制度背景；finance.relevance 说明它如何服务本文论点。没有金融内容时如实写空字符串，不得硬凑。
4. focus.label 使用“${focus.label}”；focus.guidance 用一句中文说明本段在该侧重下最值得学什么；focus.recommendations 是 0-3 条英文表达，必须能从本段结构或搭配中迁移。
5. 每项中文原则上不超过 140 字；重点不是写长，而是让英语层和金融层的主次与“${focus.label}”一致。

JSON 结构：
{"analyses":[{"index":0,"analysis":{"english":{"longSentence":"","grammar":"","expression":""},"finance":{"term":"","background":"","relevance":""},"focus":{"label":"${focus.label}","guidance":"","recommendations":[""]}}}]}

文章标题：${title || '(unknown)'}
段落：
${paragraphs.map(paragraph => `[${paragraph.index}] ${paragraph.text}`).join('\n')}`;
}

function buildCompactAnalysisPrompt({ title, paragraph, vocabFocus }) {
  const focusKey = Object.hasOwn(FOCUS_ANALYSIS_GUIDE, vocabFocus) ? vocabFocus : 'balanced';
  const focus = FOCUS_ANALYSIS_GUIDE[focusKey];
  return `只分析一个财经英语段落。只返回精读解析 JSON，不要返回词汇、知识卡、译文或正文。
当前学习侧重：${focus.label}。${focus.instruction}
返回格式：
{"analyses":[{"index":${paragraph.index},"analysis":{"english":{"longSentence":"","grammar":"","expression":""},"finance":{"term":"","background":"","relevance":""},"focus":{"label":"${focus.label}","guidance":"","recommendations":[]}}}]}
不得编造原文没有的事实。没有金融内容时 finance 字段留空。

文章标题：${title || '(unknown)'}
[${paragraph.index}] ${paragraph.text}`;
}

function normalizeFocusedAnalysis(value, vocabFocus) {
  const focusKey = Object.hasOwn(FOCUS_ANALYSIS_GUIDE, vocabFocus) ? vocabFocus : 'balanced';
  const fallback = FOCUS_ANALYSIS_GUIDE[focusKey];
  const source = value && typeof value === 'object' ? value : {};
  const english = source.english && typeof source.english === 'object' ? source.english : {};
  const finance = source.finance && typeof source.finance === 'object' ? source.finance : {};
  const focus = source.focus && typeof source.focus === 'object' ? source.focus : {};
  const text = (item, limit = 700) => String(item || '').trim().slice(0, limit);
  return {
    english: {
      longSentence: text(english.longSentence),
      grammar: text(english.grammar),
      expression: text(english.expression)
    },
    finance: {
      term: text(finance.term, 160),
      background: text(finance.background),
      relevance: text(finance.relevance)
    },
    focus: {
      label: text(focus.label || fallback.label, 60),
      guidance: text(focus.guidance),
      recommendations: (Array.isArray(focus.recommendations) ? focus.recommendations : [])
        .map(item => text(item, 180))
        .filter(Boolean)
        .slice(0, 3)
    }
  };
}

function analysisHasContent(analysis) {
  return !!(
    analysis?.english?.longSentence ||
    analysis?.english?.grammar ||
    analysis?.english?.expression ||
    analysis?.finance?.term ||
    analysis?.finance?.background ||
    analysis?.finance?.relevance
  );
}

async function generateFocusedAnalyses(body) {
  const { paragraphs, title, vocabFocus } = body;
  const sourceParagraphs = (Array.isArray(paragraphs) ? paragraphs : [])
    .map((text, index) => ({ index, text: String(text || '').trim() }))
    .filter(paragraph => paragraph.text);
  if (!sourceParagraphs.length) throw new Error('缺少需要生成精读解析的正文段落');

  const chunks = [];
  for (let index = 0; index < sourceParagraphs.length; index += 3) {
    chunks.push(sourceParagraphs.slice(index, index + 3));
  }
  const analyses = new Map();
  for (const chunk of chunks) {
    try {
      const result = await requestLLMJson(body, buildAnalysisPrompt({
        title,
        paragraphs: chunk,
        vocabFocus
      }));
      for (const item of Array.isArray(result.analyses) ? result.analyses : []) {
        const index = Number(item?.index);
        if (!Number.isInteger(index) || analyses.has(index)) continue;
        const analysis = normalizeFocusedAnalysis(item.analysis, vocabFocus);
        if (analysisHasContent(analysis)) analyses.set(index, analysis);
      }
    } catch {
      // Fall through to paragraph-level retries below.
    }
    for (const paragraph of chunk) {
      if (analyses.has(paragraph.index)) continue;
      const result = await requestLLMJson(body, buildCompactAnalysisPrompt({
        title,
        paragraph,
        vocabFocus
      }));
      const item = (Array.isArray(result.analyses) ? result.analyses : [])
        .find(candidate => Number(candidate?.index) === paragraph.index) ||
        result.analyses?.[0];
      const analysis = normalizeFocusedAnalysis(item?.analysis || item, vocabFocus);
      if (!analysisHasContent(analysis)) {
        throw new Error(`第 ${paragraph.index + 1} 段未返回有效精读解析，旧解析保持不变`);
      }
      analyses.set(paragraph.index, analysis);
    }
  }
  return sourceParagraphs.map(paragraph => {
    const analysis = analyses.get(paragraph.index);
    if (!analysis) throw new Error(`第 ${paragraph.index + 1} 段缺少精读解析，旧解析保持不变`);
    return analysis;
  });
}

async function generateFocusRefresh(body) {
  const [vocabulary, analyses] = await Promise.all([
    generateVocabulary(body),
    generateFocusedAnalyses(body)
  ]);
  return {
    ...vocabulary,
    analyses
  };
}

function buildVocabularyPrompt({ title, paragraphs, vocabFocus }) {
  const focus = VOCAB_FOCUS_GUIDE[vocabFocus] || VOCAB_FOCUS_GUIDE.balanced;
  return `你是财经英语词汇教学专家。只生成词汇标注，输出严格 JSON，不要 Markdown，不要代码块。

硬性边界：
1. 只返回 vocab 数组，不得返回 paragraphs、analysis、knowledge、译文、标题或任何其他文章字段。
2. 输入中的 {{...}} 是现有术语标记。不得移除、改写、移动或输出术语标记；只把它们当作锁定术语上下文。
3. 不重写正文，不生成知识卡，不改变句子结构。
4. 每个词必须来自输入正文或其词形范围，不得编造文章没有的词。

词汇侧重：${focus}。
选 10-14 个对中文读者最有价值的学习词汇。每个词返回：
w、ipa、pos、zh、en、forms、formChanges、synonyms、exam、ex、exZh。
formChanges 只能给 forms 中已存在的词形添加语法标签，不得新造词形、派生词或搭配。
exam 只能使用 IELTS / TOEFL / FINANCE，可多选；没有合适例句时 ex 和 exZh 可为空字符串。

JSON 结构：
{"vocab":[{"w":"","ipa":"/.../","pos":"n.","zh":"","en":"","forms":[],"formChanges":[{"label":"复数","value":""}],"synonyms":[],"exam":["IELTS"],"ex":"","exZh":""}]}

文章标题：${title || '(unknown)'}
锁定术语标记原样保留在下面正文中：
${paragraphs.map((paragraph, index) => `[${index + 1}] ${paragraph}`).join('\n')}`;
}

function buildCompactVocabularyPrompt(title, paragraph, vocabFocus) {
  const focus = VOCAB_FOCUS_GUIDE[vocabFocus] || VOCAB_FOCUS_GUIDE.balanced;
  return `只为一个英文财经段落生成词汇标注。输出严格 JSON，不要 Markdown。
只生成词汇标注，只返回 {"vocab":[...]}。不得返回正文、译文、分析或知识卡。
输入中的 {{...}} 是锁定术语标记，不得移除、改写、移动或输出术语标记。
词汇侧重：${focus}。最多生成 8 个词汇。
字段：w、ipa、pos、zh、en、forms、formChanges、synonyms、exam、ex、exZh。
formChanges 只能标注 forms 中已有的词形，不得新增词形。
exam 只能使用 IELTS / TOEFL / FINANCE，可多选。

文章标题：${title || '(unknown)'}
原文段落：
${paragraph}`;
}

function mergeVocabularyResults(results) {
  const vocab = results.flatMap(item => item?.vocab || item?.vocabulary || []);
  return [...new Map(vocab.map(item => {
    const word = String(item?.w || item?.word || '').trim();
    return [word.toLowerCase(), { ...item, w: word }];
  }).filter(([word]) => word)).values()];
}

async function generateVocabulary(body) {
  const { paragraphs, title, vocabFocus } = body;
  const sourceParagraphs = (paragraphs || []).map(paragraph => String(paragraph || '').trim()).filter(Boolean);
  if (!sourceParagraphs.length) throw new Error('缺少需要生成词汇的正文段落');
  const chunks = [];
  let current = [];
  let words = 0;
  for (const paragraph of sourceParagraphs) {
    const count = (paragraph.match(/[A-Za-z'-]+/g) || []).length;
    if (current.length && (current.length >= 3 || words + count > 260)) {
      chunks.push(current);
      current = [];
      words = 0;
    }
    current.push(paragraph);
    words += count;
  }
  if (current.length) chunks.push(current);

  const results = [];
  for (const chunk of chunks) {
    try {
      results.push(await requestLLMJson(body, buildVocabularyPrompt({
        title,
        paragraphs: chunk,
        vocabFocus
      })));
    } catch {
      for (const paragraph of chunk) {
        results.push(await requestLLMJson(body, buildCompactVocabularyPrompt(title, paragraph, vocabFocus)));
      }
    }
  }
  const vocab = mergeVocabularyResults(results);
  if (!vocab.length) throw new Error('模型未返回有效词汇，旧词汇保持不变');
  return {
    vocabFocus: Object.hasOwn(VOCAB_FOCUS_GUIDE, vocabFocus) ? vocabFocus : 'balanced',
    vocab
  };
}

function mergeAnnotationResults(results, fallbackTitle) {
  return {
    quality: results.every(item => item.quality !== false),
    qualityReason: results.find(item => item.qualityReason)?.qualityReason || '',
    title: results.find(item => item.title)?.title || fallbackTitle,
    deck: results.find(item => item.deck)?.deck || '',
    level: results.find(item => item.level)?.level || 'C1',
    topic: results.find(item => item.topic)?.topic || 'markets',
    suggestedTag: results.find(item => item.suggestedTag)?.suggestedTag || '',
    paragraphs: results.flatMap(item => item.paragraphs || []),
    vocab: [...new Map(results.flatMap(item => item.vocab || []).map(v => [String(v.w).toLowerCase(), v])).values()],
    knowledge: [...new Map(results.flatMap(item => item.knowledge || []).map(k => [String(k.term).toLowerCase(), enrichKnowledgeCard(k)])).values()]
  };
}

const KNOWLEDGE_CATEGORY_VALUES = new Set(['finance', 'background', 'method']);

function classifyKnowledgeCategory(card = {}) {
  const term = normalizeArticleText(`${card.term || ''} ${card.en || ''}`).toLowerCase();
  const context = normalizeArticleText([
    card.term,
    card.en,
    card.one,
    card.body,
    card.classificationReason,
    card.categoryReason,
    ...(Array.isArray(card.methodSteps) ? card.methodSteps : []),
    ...(Array.isArray(card.scenarios) ? card.scenarios : []),
    ...(Array.isArray(card.related) ? card.related : []),
    ...(Array.isArray(card.match) ? card.match : [])
  ].filter(Boolean).join(' ')).toLowerCase();
  const modelCategory = KNOWLEDGE_CATEGORY_VALUES.has(card.category) ? card.category : '';

  const methodSteps = Array.isArray(card.methodSteps) ? card.methodSteps.filter(Boolean) : [];
  const cardType = String(card.cardType || '').trim().toLowerCase();
  const relativeValuationProcedurePattern = /\b(relative valuation|relative pricing|comparables valuation|comparable company analysis)\b|相对估值|相对定价|可比公司估值|可比估值/;
  const revenueManagementFinancePattern = /\b(airline revenue management|revenue management|yield management)\b|航空.*收益管理|航线.*收益管理|收益管理/;
  if (revenueManagementFinancePattern.test(term)) {
    return {
      category: 'finance',
      categories: ['finance'],
      reason: '对象通过需求预测、舱位库存和动态定价配置收益，属于价格与收益管理活动，归入金融术语。',
      confidence: 0.95
    };
  }
  const analysisInfrastructurePattern = /\b(autonomous labs?|self.driving facilities?|automated labs?|laboratory automation|drug discovery(?: pipeline)?|clinical development pipeline|research infrastructure|research platform|computing power|computational infrastructure|ai agents?|autonomous agents?|agentic workflows?|multi.agent systems?|(?:model(?:ing)?|simulation) (?:platform|system|software|tool(?:kit)?|application|engine))\b|自主实验室|自动化实验室|药物研发管线|科研基础设施|算力|AI代理/;
  if (analysisInfrastructurePattern.test(term)) {
    return {
      category: 'background',
      categories: ['background'],
      reason: '对象是科研设施、研发管线、软件平台、执行环境或 AI 工具，本身不构成可迁移的分析方法，归入背景层。',
      confidence: 0.96
    };
  }
  const methodDescription = [
    card.one,
    card.body,
    card.classificationReason,
    card.categoryReason,
    ...methodSteps,
    ...(Array.isArray(card.scenarios) ? card.scenarios : [])
  ].filter(Boolean).join(' ').toLowerCase();
  const pricingEvidenceText = [
    card.one,
    card.body,
    card.classificationReason,
    card.categoryReason
  ].filter(Boolean).join(' ').toLowerCase();
  const methodEvidence = [
    /analyz|analys|assess|evaluate|estimate|forecast|predict|project|simulate|compare|measure|value|decision|scenario|risk|分析|估计|预测|评估|比较|计量|模拟|决策|情景|风险|估值|核查|检查|判断|识别|追踪|筛选|排序|测算|换算|调查|验证|归因|区分/.test(methodDescription),
    /assum|theory|theoretical|distribution|correlation|parameter|functional form|model specification|rule|initial condition|environment|network|假设|理论|概率分布|相关性|参数|函数关系|模型设定|规则|初始条件|环境|网络|口径|边界|限制|门槛|窗口|样本|误差|偏差|约束|可比性|季节因子|折算/.test(methodDescription),
    /input|data|variable|parameter|exposure|scenario|sample|initial condition|输入|数据|变量|参数|暴露|情景|样本|初始条件|对象|序列|指标|票数|余额|收入|成本|价格|时间|金额|库存|来源|文本|问卷|行业|家庭|资产|负债|销量|销售额/.test(methodDescription),
    /transform|process|estimate|simulat|calculat|comput|regress|discount|project|transmission|time series|monte carlo|training|optimization|equation|iterat|interaction|计算|估计|模拟|回归|折现|传导|处理|训练|优化|方程|迭代|交互|运行|比较|划分|排序|映射|汇总|拆解|调整|剔除|核查|检查|检验|追踪|筛选|预测|控制|区分|交叉验证|换算|反推|评估|判断|考察|定位|识别|补充/.test(methodDescription),
    /output|result|forecast|prediction|projection|confidence interval|\bvar\b|expected loss|estimate|capital adequacy|输出|结果|预测|置信区间|预期损失|资本充足率|估计值|占比|概率|结论|差异|变化|趋势|质量|分数|判断|解释|决策|溢价|价格|收益|增长|下降|排名|分位|风险|回报|季调值|指标|表现/.test(methodDescription),
    /boundary|limitation|uncertain|validation|backtest|out.of.sample|error|condition|invalid|失效|边界|不确定性|校验|验证|样本外|误差|偏差|噪音|口径|样本|可能|不能|覆盖|范围|限制|假设|风险/.test(methodDescription)
  ];
  const methodEvidenceScore = methodEvidence.filter(Boolean).length;
  const hasCompleteMethodProcedure = cardType === 'method' &&
    methodSteps.length >= 2 &&
    methodEvidenceScore >= 5 &&
    methodEvidence[0] && methodEvidence[2] && methodEvidence[3] && methodEvidence[4];
  const methodPattern = /\b(stress test(?:ing)?|scenario analys(?:is|es)|scenario testing|event study|regression analys(?:is|es)|regression model|econometrics?|econometric (?:analysis|model)|dcf|discounted cash flow|value at risk|var|sensitivity analys(?:is|es)|monte carlo (?:simulation|model)|factor model|capm|option pricing model|game theory|ratio analys(?:is|es)|duration analys(?:is|es)|comparative statics|cost.benefit analys(?:is|es)|break.even analys(?:is|es)|valuation model|valuation framework|risk management framework|enterprise risk management|regulatory risk management|compliance risk management|forecasting method|machine learning analysis|statistical learning method|statistical method|quantitative method|decision analysis|multi.criteria analysis|seasonal adjustment|data surprise analysis|job.growth breadth analysis|incremental vote.margin comparison|vote.margin analysis|founder.market fit|venture capital team evaluation|source completeness screening|stated preference survey|wealth quantile analysis|opportunity cost and time allocation|attribution in reported speech|upc.based retail sales tracking|retail sales tracking)\b|基于UPC的零售销售追踪|零售销售追踪/i;
  const normalizedTermNames = [card.term, card.en]
    .map(value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim())
    .filter(Boolean);
  const methodCandidateNamePattern = /^(?:agent based model(?:ing|s)?|multi agent simulation(?:s)?)$/i;
  const hasMethodCandidateName = normalizedTermNames.some(value => methodCandidateNamePattern.test(value));
  const hasNamedMethod = methodPattern.test(term);
  const hasSupportedMethodContext = hasCompleteMethodProcedure;
  const capexCashFlowPattern = /\b(?:capital expenditure|capital expenditures|capex)\b.*\b(?:cash ?flow|ocf|fcf|free cash flow|operating cash flow|financing gap|liquidity|debt|credit)\b|\b(?:cash ?flow|ocf|fcf)\b.*\b(?:capital expenditure|capital expenditures|capex)\b|资本支出.*现金流|资本开支.*现金流/;
  const purchasingPowerPattern = /\bpurchasing power(?!\s+parity)\b|购买力(?!平价)/;
  if (relativeValuationProcedurePattern.test(term)) {
    return hasCompleteMethodProcedure
      ? {
          category: 'finance',
          categories: ['finance', 'method'],
          reason: '对象属于金融估值，同时描述包含可比对象、口径统一、倍数比较、风险检查和适用边界，作为金融内容交叉归入分析方法。',
          confidence: 0.97
        }
      : {
          category: 'finance',
          categories: ['finance'],
          reason: '对象直接比较可比公司、估值倍数或相对价格，主要解释资产相对贵贱；描述不足以还原完整分析程序，因此不交叉归入方法。',
          confidence: 0.95
        };
  }
  if (capexCashFlowPattern.test(term) && hasCompleteMethodProcedure) {
    return {
      category: 'finance',
      categories: ['finance', 'method'],
      reason: '对象同时属于资本支出与现金流分析，并具备可复现的比较、计算和边界说明，主分类金融并交叉分析方法。',
      confidence: 0.93
    };
  }
  if (purchasingPowerPattern.test(term) && hasCompleteMethodProcedure) {
    return {
      category: 'finance',
      categories: ['finance', 'method'],
      reason: '对象首先属于货币购买力与家庭实际收入指标，同时具备完整的价格指数、支出权重和实际值计算程序，金融内容交叉分析方法。',
      confidence: 0.92
    };
  }
  if (hasNamedMethod || (hasMethodCandidateName && hasCompleteMethodProcedure) || hasSupportedMethodContext) {
    return {
      category: 'method',
      categories: ['method'],
      reason: '卡片描述可识别的分析、计量、估值、模拟或检验程序，归入分析方法。',
      confidence: 0.99
    };
  }

  const analyticalModelPattern = /\b(?:(?:scenario|forecasting|risk|climate|valuation|econometric|regression|factor|option pricing|statistical|predictive|projection|credit|market|pricing|analytical|analytics|quantitative|financial|economic|mathematical)\s+models?)\b/i;
  const exactModelNamePattern = /^(?:model|models|modeling|modelling)$/i;
  const analyticalModelCandidate = analyticalModelPattern.test(term) ||
    exactModelNamePattern.test(String(card.term || '').trim()) ||
    exactModelNamePattern.test(String(card.en || '').trim());
  if (analyticalModelCandidate) {
    const hasCompleteModelChain = methodEvidenceScore >= 5 &&
      methodEvidence[0] && methodEvidence[2] && methodEvidence[3] && methodEvidence[4] &&
      methodSteps.length >= 2;
    if (hasCompleteModelChain) {
      return {
        category: 'method',
        categories: ['method'],
        reason: '对象虽以 model 命名，但描述包含分析目的、假设与输入、变换或模拟步骤、输出解释及适用边界，归入分析方法。',
        confidence: 0.96
      };
    }
    return {
      category: 'background',
      categories: ['background'],
      reason: '对象虽以 model 命名，但描述不足以还原假设、输入、处理步骤和输出解释，暂归背景层。',
      confidence: 0.9
    };
  }
  const methodImplementationPattern = /\b(scenario simulation platform|(?:model(?:ing)?|multi.agent simulation|agent.based model(?:ing)?) (?:platform|system|software|tool(?:kit)?|application|engine))\b/i;
  if (methodImplementationPattern.test(term)) {
    return {
      category: 'background',
      categories: ['background'],
      reason: '对象是分析程序的软件、平台或计算实现；实现环境本身不构成分析方法，归入背景层。',
      confidence: 0.95
    };
  }
  const aiSystemToolPattern = /\b(ai agents?|autonomous agents?|agentic workflows?|multi.agent systems?|multi.agent simulation platform|ai agent platform|ai agent framework)\b/i;
  if (aiSystemToolPattern.test(term)) {
    return {
      category: 'background',
      categories: ['background'],
      reason: '对象是 AI 软件系统、代理、执行流程或工具环境，本身不构成可重复的分析方法，归入背景层。',
      confidence: 0.97
    };
  }
  const aiTradeRepricingPattern = /\b(ai[- ]trade[- ]repricing|repricing of (?:the )?ai trade|ai[- ](?:stock|equity|valuation)[- ]repricing)\b/i;
  if (aiTradeRepricingPattern.test(term)) {
    return {
      category: 'background',
      categories: ['background', 'finance'],
      reason: 'AI 技术、竞争或市场情绪变化是外部背景冲击，但其结果表现为 AI 相关资产估值、仓位和市场价格重定价，归入背景层并交叉归入金融术语。',
      confidence: 0.96
    };
  }
  const financialRecoveryPattern = /\b(recovery rate|recovery amount|loss given default|lgd|non.performing asset recovery|debt recovery|loan recovery)\b|不良资产处置|不良资产回收|不良贷款回收|不良贷款清收|债权回收|现金清收|抵押物处置/i;
  if (financialRecoveryPattern.test(term)) {
    return {
      category: 'finance',
      categories: ['finance'],
      reason: '对象涉及不良资产、债权回收或违约后回收指标，属于信用风险管理和金融资产处置，归入金融术语。',
      confidence: 0.97
    };
  }
  const judicialEnforcementPattern = /限制高消费|高消费限制|限制消费措施|限制消费令|失信被执行人|纳入失信被执行人名单|可执行资产|可供执行财产|被执行人财产|责任财产/;
  if (judicialEnforcementPattern.test(term)) {
    return {
      category: 'background',
      categories: ['background'],
      reason: '对象属于人民法院民事执行、财产查控或失信惩戒制度，金融影响是法律执行后果，不构成金融本体，归入背景层。',
      confidence: 0.97
    };
  }
  const genericAssetRecoveryPattern = /\b(asset recovery)\b|资产回收/;
  if (genericAssetRecoveryPattern.test(term)) {
    return {
      category: 'background',
      categories: ['background'],
      reason: '未限定为不良资产或债权回收的资产回收首先属于资产处置与追偿机制，暂归背景层，不构成分析方法。',
      confidence: 0.9
    };
  }
  const financialCorporateTransactionPattern = /\b(?:strategic acquisition|merger|takeover|self.funding|bootstrap financing)\b|战略收购|并购交易|收购交易|敌意收购|自筹资金|自筹融资/i;
  if (financialCorporateTransactionPattern.test(term)) {
    return {
      category: 'finance',
      categories: ['finance'],
      reason: '对象涉及企业控制权交易、并购、资金结构或融资来源，属于公司金融活动，归入金融术语。',
      confidence: 0.97
    };
  }
  const consumerBiomedBusinessPattern = /电解质补水|补水需求|补水趋势|饮料品类|品类扩张|品类颠覆|消费需求|消费趋势|消费者趋势|首席执行官|行政总裁|市场细分|产品差异化|品牌资产|品牌相关性|复购买家率|复购率|消费品增长战略|\bchief executive officer\b|\bchief executive\b|\bceo\b|\bglp.1(?:\s+receptor agonist)?\b|receptor agonist|drug class|therapeutic class|pharmaceutical drug|beverage category|category disruption|category expansion|consumer demand|consumer trend|hydration demand|electrolyte hydration|market segmentation|product differentiation|brand equity|brand relevance|repeat buyer rate|repeat purchase rate|repurchase rate|consumer staples growth strategy|market share leadership|generational marketing|broader appeal/i;
  if (consumerBiomedBusinessPattern.test(term)) {
    return {
      category: 'background',
      categories: ['background'],
      reason: '对象属于消费趋势、产品品类、医药或生物科技、企业经营或高级管理角色，不是融资、估值、金融资产或金融风险计量，归入背景层。',
      confidence: 0.96
    };
  }
  const negotiationLeveragePattern = /\b(bargaining power|negotiating power|bargaining leverage|negotiating leverage|negotiation leverage|leverage in (?:a )?(?:negotiation|bargaining)|bargaining chips?|negotiating chips?|negotiation chips?|negotiating cards?)\b|谈判筹码|谈判杠杆|谈判力|谈判优势|议价能力|议价权/;
  if (negotiationLeveragePattern.test(term)) {
    return {
      category: 'background',
      categories: ['background'],
      reason: '对象描述谈判、议价、组织关系或政策博弈中的相对影响力；“leverage”在这里是谈判杠杆，不是财务杠杆或金融工具，归入背景层。',
      confidence: 0.97
    };
  }

  const jointlyControlledEquityStakePattern = /\bjointly controlled equity (?:stake|interest|holding)\b|共同控制的?(?:股权|股份|权益)/i;
  if (jointlyControlledEquityStakePattern.test(term)) {
    return {
      category: 'finance',
      categories: ['finance', 'background'],
      reason: '主解释对象是上市公司或其他企业的股权资产，经济收益、投票、出售和处分权会影响减持、控制权、披露与估值；共同信托、婚姻或治理安排是背景维度，因此金融为主并交叉背景。',
      confidence: 0.96
    };
  }

  const divorceAssetDivisionPattern = /\bdivorce (?:asset|property) division|division of (?:marital|community) property|marital property division\b|离婚(?:财产|资产)分割|夫妻共同财产分割|婚姻财产分割/;
  if (divorceAssetDivisionPattern.test(term)) {
    const positiveDivisionContext = context
      .replace(/(?:不涉及|不包含|没有|无需|并非|而不是|不构成)[^。；;！？\n]{0,180}/gi, ' ')
      .replace(/\b(?:without|does not|doesn't|did not|no)\b[^.!?]{0,180}/gi, ' ');
    const financialDivisionEvidence = /\b(financial assets?|securities?|stocks?|shares?|equity|business interests?|valuation|market value|liquidity|tax|debt|portfolio|pension|brokerage|bank accounts?|trust assets?)\b|金融资产|证券|股票|股份|股权|企业权益|估值|流动性|税务|债务|投资组合|养老金|银行账户|信托资产/.test(positiveDivisionContext);
    return financialDivisionEvidence
      ? {
          category: 'background',
          categories: ['background', 'finance'],
          reason: '主解释对象是婚姻财产制下确定财产归属与分配的法律机制；本案同时涉及证券或企业权益的估值、流动性、控制权和税务，金融关系独立成立，因此背景为主并交叉金融。',
          confidence: 0.94
        }
      : {
          category: 'background',
          categories: ['background'],
          reason: '主解释对象是婚姻财产制下确定财产归属与分配的法律机制；没有可识别的金融资产定价、融资、风险转移或估值关系，保留背景层。',
          confidence: 0.91
        };
  }

  const financialLawPattern = /\b(financial law|banking law|securities law|insurance law|insolvency law|bankruptcy law|investor protection|deposit insurance|financial compliance|securities litigation)\b/i;
  if (financialLawPattern.test(term)) {
    return {
      category: 'background',
      categories: ['background', 'finance'],
      reason: '术语属于法律规则或司法约束，但直接规范金融交易、机构与投资者关系，归入背景层并交叉归入金融术语。',
      confidence: 0.98
    };
  }

  const financialRiskExposurePattern = /\b(financial risk|financial risk control|financial risk management|market risk|market risk control|credit risk|credit risk control|interest rate risk|liquidity risk|liquidity risk control|solvency risk|counterparty risk|underwriting risk|insurance risk|currency risk|foreign exchange risk|bank operational risk|banking operational risk|financial institution operational risk|regulatory capital risk|capital adequacy risk)\b/i;
  if (financialRiskExposurePattern.test(term)) {
    return {
      category: 'finance',
      categories: ['finance'],
      reason: '术语直接描述可计量的金融暴露、金融损失或风险转移机制，归入金融术语。',
      confidence: 0.98
    };
  }
  const marketCorrectionPattern = /\b(?:stock|equity)?\s*market correction\b|股市修正|市场修正/;
  if (marketCorrectionPattern.test(term)) {
    const nonFinancialMarket = /\b(housing|property|real estate|commodity|industrial|inventory|supply chain)\b|房地产|楼市|商品市场|产业|库存/.test(`${term} ${context}`);
    if (nonFinancialMarket) {
      return {
        category: 'background',
        categories: ['background'],
        reason: '术语虽然使用 correction，但主解释对象是房地产、商品、产业或库存价格调整，没有股票、证券或其他金融资产定价关系，归入背景层。',
        confidence: 0.86
      };
    }
    return {
      category: 'finance',
      categories: hasCompleteMethodProcedure ? ['finance', 'method'] : ['finance'],
      reason: '对象是股票、证券或金融资产价格从近期高点回撤的市场现象，归入金融术语；回撤计算本身仅在具备完整程序时交叉方法。',
      confidence: hasCompleteMethodProcedure ? 0.88 : 0.97
    };
  }
  const circularFinancingPattern = /\bcircular financing\b|循环融资|资金闭环/;
  if (circularFinancingPattern.test(term)) {
    const circularFinanceEvidence = /\b(invest|investment|procurement|purchase|cloud|compute|supplier finance|receivable|payable|cash flow|financing|equity|debt|credit|liquidity|refinancing)\b|投资|采购|云|算力|供应商融资|应收|应付|现金流|融资|股权|债务|信用|流动性|再融资/.test(context);
    const circularClosureEvidence = /\b(circular|loop|mutual|interdependent|recycle|round.trip)\b|闭环|循环|相互依赖|回流|往返/.test(context);
    if (circularFinanceEvidence && circularClosureEvidence) {
      return {
        category: 'finance',
        categories: ['finance', 'background'],
        reason: '投资、采购、云承诺或供应商融资在关联主体之间形成实质资金闭环，并影响现金流、融资或信用暴露；金融关系为主，产业与技术背景交叉。',
        confidence: 0.89
      };
    }
  }
  if (capexCashFlowPattern.test(term)) {
    return {
      category: 'finance',
      categories: hasCompleteMethodProcedure ? ['finance', 'method'] : ['finance', 'background'],
      reason: hasCompleteMethodProcedure
        ? '对象同时属于资本支出与现金流分析，并具备可复现的比较、计算和边界说明，主分类金融并交叉分析方法。'
        : '主解释对象已从实体采购转为资本支出对经营现金流、自由现金流、融资缺口或流动性的影响；金融关系为主，实体投资背景交叉。',
      confidence: hasCompleteMethodProcedure ? 0.93 : 0.91
    };
  }
  if (purchasingPowerPattern.test(term)) {
    return {
      category: 'finance',
      categories: ['finance'],
      reason: '购买力衡量货币单位能够购买的实际商品与服务，并连接名义收入、物价和家庭实际财务能力，归入金融指标。',
      confidence: 0.94
    };
  }

  const financialPolicyPattern = /\b(monetary policy|fiscal policy|tax policy|financial policy|financial regulation|banking regulation|prudential policy|macroprudential|regulatory capital|capital requirement|financial supervision|deposit protection)\b/i;
  if (financialPolicyPattern.test(term)) {
    return {
      category: 'finance',
      categories: ['finance', 'background'],
      reason: '术语涉及金融政策、监管规则或资本约束，归入金融术语并交叉归入背景层。',
      confidence: 0.98
    };
  }

  const policyToolPattern = /\b(value-added tax reduction|vat reduction|tax cut|tax reduction|fuel[- ]levy cut|consumer subsidy|price cap)\b/i;
  if (policyToolPattern.test(term)) {
    return {
      category: 'background',
      categories: ['background', 'finance'],
      reason: '术语首先是面向消费者或产业的政策工具，同时通过价格、税收或资金成本产生金融传导，归入背景层并交叉归入金融术语。',
      confidence: 0.96
    };
  }

  const fintechPattern = /\b(fintech|financial technology|financial innovation|digital finance|open banking|digital payment|payment system|payment infrastructure|algorithmic trading|high-frequency trading|robo.?advis\w*|digital currency|central bank digital currency|cbdc|stablecoin|crypto ?currency|crypto ?asset|digital asset)\b/i;
  if (fintechPattern.test(term)) {
    return {
      category: 'finance',
      categories: ['finance', 'background'],
      reason: '术语描述金融服务的数字化机制或技术化业务形态，归入金融术语并交叉归入背景层。',
      confidence: 0.98
    };
  }

  const realEconomyPattern = /\b(electrification(?: pathway| target)?s?|energy transition|equipment investment|business investment|capital expenditure|capex|grid(?: and storage)? investment|grid expansion|power grid|electricity access|electricity demand|electricity infrastructure|energy efficiency|energy security|energy import (?:dependency|intensity|spending)|avoided fuel import savings?|fuel import|manufacturing capacity|industrial capacity|production capacity|factory|plant construction|infrastructure investment|infrastructure|construction|equipment|machinery|heat pump|electric vehicle|charging infrastructure|battery storage|storage capacity|supply chain|industrial process|technology adoption|relative price effect|policy.market complementarity|market signals? and incentive structures?|incentive structure|state intervention|permitting and regulatory reform|climate plans?|conference of the parties|\bcop\b|paris agreement)\b/i;
  if (realEconomyPattern.test(term)) {
    return {
      category: 'background',
      categories: ['background'],
      reason: '概念主要描述实体产业、基础设施、能源转型、技术采用或经营行动；即使正文提到资金成本，主要解释对象仍不是金融资产或金融关系，归入背景层。',
      confidence: 0.97
    };
  }
  const externalRiskPremiumPattern = /\b(?:(?:geo)?political|regulatory|policy|election|sanctions?|war|armed conflict|climate|transition|energy security|trade)\s+(?:risk\s+|uncertainty\s+)?premium\b|地缘政治风险溢价|政治风险溢价|监管风险溢价|政策风险溢价|选举风险溢价|制裁风险溢价|战争风险溢价|气候风险溢价/;
  if (externalRiskPremiumPattern.test(term)) {
    const hasPricingEvidence = /\b(?:expected return|required return|return|yield|spread|discount rate|cost of capital|insurance (?:price|premium)|asset pricing|valuation)\b|预期收益|要求回报|收益率|回报率|利差|折现率|资本成本|保险价格|保险费用|资产定价|估值/.test(pricingEvidenceText);
    if (!hasPricingEvidence) {
      return {
        category: 'background',
        categories: ['background'],
        reason: '术语名称指向外部条件，但描述没有给出收益率、利差、折现率、资本成本或保险价格等可识别定价证据；交叉关系未独立成立，归入背景层。',
        confidence: 0.84
      };
    }
    return {
      category: 'finance',
      categories: ['finance', 'background'],
      reason: '卡片主要解释地缘政治、政治或监管条件如何转化为收益率、利差、折现率或保险价格中的补偿；金融定价为主，风险来源背景交叉归入背景层。',
      confidence: 0.96
    };
  }

  const pricedFinancialPattern = /\b(risk premium|term premium|equity risk premium|liquidity premium|insurance premium|insurance premium financing|premium financing acquisition|acquisition financing|leveraged acquisition|credit spread|yield spread|bid.ask spread|yield|modified duration|macaulay duration|effective duration|bond duration|portfolio duration|duration risk|duration gap|convexity|volatility|delta|beta|cost of capital|exchange rate|interest rate|asset price|equity price|business valuation|company valuation|equity valuation|asset valuation|valuation multiple|enterprise value|equity value|underwriting|actuarial|annuity|reinsurance|portfolio|asset allocation|hedging|financial risk management|capital structure|capital budgeting|payback period|concessional capital|blended finance|project finance|loan guarantee|working capital|corporate finance|money supply|money market|monetary aggregate|fiat money|保费融资|保费资金融资|融资收购|收购融资)\b/i;
  const chineseFinancialArrangementPattern = /(保费融资|保费资金融资|融资收购|收购融资)/;
  if (pricedFinancialPattern.test(term) || chineseFinancialArrangementPattern.test(term)) {
    return {
      category: 'finance',
      categories: ['finance'],
      reason: '术语涉及货币、公司财务、估值、保险、投资、风险管理或被定价计量的金融概念，归入金融术语。',
      confidence: 0.98
    };
  }

  const backgroundPattern = /\b(political risk|geopolitical risk|political instability|election risk|policy uncertainty|regulatory risk|regulatory environment|compliance risk|legal risk|policy risk|strategic risk|reputational risk|operational risk|risk control|sanctions?|trade war|industrial policy|industrial structure|industry structure|supply chain|supply bottleneck|value chain|industrial capacity|political economy|institution|institutional context|history|historical context|law|legal|judicial|judiciary|court|litigation|constitution|statute|regulation|regulatory framework|policy framework|legal framework|institutional framework|business model|operating model|business strategy|corporate strategy|market structure|procurement|health equity|health inequity|health inequalit(?:y|ies)|health disparit(?:y|ies)|social determinants of health|public health|healthcare access|health care access|universal health coverage|health policy|women.?s health funding|health research funding|medical research funding|biomedical research funding|research funding gap|science funding gap|public health funding|unemployment duration|duration of unemployment|unemployment spell|long-term unemployment|job search duration|ai agents?|autonomous agents?|agentic workflows?|multi.agent systems?|computing power|gpu (?:cluster|capacity)|computational infrastructure|scientific computing|drug discovery(?: pipeline)?|clinical development pipeline|biomedical research pipeline|automated labs?|autonomous lab(?:oratory)?|self.driving lab(?:oratory)?|lab(?:oratory)? automation|ai.for.science (?:stack|platform|toolkit)|ai (?:tool|toolkit|platform)|foundation model|large language model|machine learning platform|research infrastructure|research platform|scenario simulation platform|model(?:ing)? (?:platform|system|software|tool(?:kit)?|application|engine)|environmental valuation|valuation of environmental|technology|technological|cyber|encryption|data privacy|algorithm|military|defen[cs]e|armed forces|national security)\b/i;
  if (backgroundPattern.test(term) || (modelCategory === 'background' && backgroundPattern.test(context))) {
    return {
      category: 'background',
      categories: ['background'],
      reason: '术语主要指政治、地缘、政策制度或历史背景，归入背景层。',
      confidence: 0.96
    };
  }

  const financePattern = /\b(interest rate risk|policy rate|credit spread|term premium|risk premium|liquidity|modified duration|macaulay duration|effective duration|bond duration|portfolio duration|duration risk|duration gap|convexity|bond|stock|debt|loan|credit|default|derivative|option|futures?|swap|balance sheet|cash flow|capital adequacy|leverage|bank|banking|central bank|currency|exchange rate|inflation expectations?|inflation risk|yield curve|asset|sovereign risk|country risk|real wages?|wage growth|fiscal surplus|bracket creep|debt-service cost|debt service cost|tax pass-through|tax incidence|tax burden|insurance|health insurance|healthcare finance|health care finance|medical financing|insurance claim|equity financing|equity capital|equity market|equity markets|equity security|equity securities|shareholders.? equity|stockholders.? equity|return on equity|corporate financing gap|refinancing gap|funding liquidity gap|investment fund|hedge fund|mutual fund|pension fund|sovereign wealth fund|private equity|venture capital|fund management|brokerage|financial market|financial instrument|financial risk|market risk|credit risk|liquidity risk|solvency|concessional capital|payback period|cost of capital|loan guarantee|project finance|securitisation tranche|securitization tranche|structured finance|credit facility|capital call|short.selling|short interest|short squeeze|asymmetric payoff)\b/i;
  if (financePattern.test(term)) {
    return {
      category: 'finance',
      categories: ['finance'],
      reason: '术语涉及金融工具、指标、机构或金融风险传导，归入金融术语。',
      confidence: 0.94
    };
  }

  if (modelCategory === 'background') {
    return {
      category: 'background',
      categories: ['background'],
      reason: '模型提示为背景层，且正文没有提供金融本体或完整分析程序的正面证据，保留背景分类。',
      confidence: 0.78
    };
  }
  return {
    category: 'background',
    categories: ['background'],
    reason: modelCategory
      ? `模型原分类为 ${modelCategory}，但术语本体和描述缺少足够的金融对象或完整方法程序证据；按默认背景层处理。`
      : '未识别到明确的金融工具或分析方法特征，保守归入背景层。',
    confidence: modelCategory ? 0.7 : 0.5
  };
}

function enrichKnowledgeCard(card) {
  const classification = classifyKnowledgeCategory(card);
  const category = classification.category;
  const cardType = ['concept', 'phenomenon', 'mechanism', 'method'].includes(card.cardType)
    ? card.cardType
    : category === 'method'
      ? 'method'
      : 'concept';
  const authorityKey = {
    finance: 'fed',
    background: 'imf',
    method: 'bis'
  }[category];
  const authority = AUTHORITY_SOURCES[card.authorityKey] || AUTHORITY_SOURCES[authorityKey] || AUTHORITY_SOURCES.fed;
  return {
    ...card,
    category,
    categories: classification.categories,
    categoryReason: classification.reason,
    categoryConfidence: classification.confidence,
    cardType,
    classificationReason: String(card.classificationReason || ''),
    scenarios: Array.isArray(card.scenarios) ? card.scenarios.map(String) : [],
    indicators: Array.isArray(card.indicators) ? card.indicators.map(item => ({
      name: String(item?.name || ''),
      meaning: String(item?.meaning || ''),
      importance: String(item?.importance || '')
    })).filter(item => item.name) : [],
    methodSteps: Array.isArray(card.methodSteps) ? card.methodSteps.map(String) : [],
    suggestedTag: String(card.suggestedTag || ''),
    authority: {
      source: authority.title,
      description: authority.description,
      url: authority.url
    }
  };
}

async function requestLLMJson(body, userPrompt, systemPrompt = FINANCE_SKILL) {
  const { baseUrl, model, apiKey } = await resolveModelRequest(body);
  const key = apiKey;
  if (!key) throw new Error('缺少 API Key：请在设置中填写，或用环境变量 OPENAI_API_KEY 启动服务');
  const url = (baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '') + '/chat/completions';
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + key },
    body: JSON.stringify({
      model: model || 'gpt-4o-mini',
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt + '\n只输出合法 JSON。' },
        { role: 'user', content: userPrompt }
      ]
    }),
    signal: AbortSignal.timeout(60000)
  });
  if (!resp.ok) throw new Error(`上游返回 ${resp.status}: ${(await resp.text()).slice(0, 300)}`);
  const data = await resp.json();
  const message = data.choices?.[0]?.message || {};
  const content = Array.isArray(message.content)
    ? message.content.map(part => part?.text || '').join('')
    : message.content || data.output_text || '';
  const text = String(content).trim();
  const candidates = [
    text,
    text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  ];
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) candidates.push(text.slice(firstBrace, lastBrace + 1));
  for (const candidate of candidates) {
    try { return JSON.parse(candidate); } catch {}
  }
  for (const candidate of candidates) {
    try { return JSON.parse(jsonrepair(candidate)); } catch {}
  }
  const finish = data.choices?.[0]?.finish_reason || 'unknown';
  throw new Error(`模型未返回合法 JSON（finish=${finish}，长度=${text.length}，响应片段：${text.slice(0, 160).replace(/\s+/g, ' ') || '空'}）`);
}

function modelQualityRejects(reason) {
  const text = String(reason || '').trim();
  return /(不连贯|碎片|导航|登录页|错误页|不是文章|非文章|无法形成文章|缺少完整文章)/i.test(text);
}

async function annotate(body, onProgress = () => {}) {
  const {
    paragraphs,
    title,
    vocabFocus,
    sourceKind = 'article',
    sourceTitle = '',
    originalEnglishTitle = ''
  } = body;
  onProgress({ step: 'clean', percent: 5, message: '正文清洗与质量校验' });
  const sourceParagraphs = (paragraphs || []).map(p => String(p || '').trim()).filter(Boolean);
  if (!sourceParagraphs.length) throw new Error('缺少需要标注的正文段落');
  const chunks = [];
  let current = [];
  let words = 0;
  for (const paragraph of sourceParagraphs) {
    const count = (paragraph.match(/[A-Za-z'-]+/g) || []).length;
    if (current.length && (current.length >= 3 || words + count > 260)) {
      chunks.push(current);
      current = [];
      words = 0;
    }
    current.push(paragraph);
    words += count;
  }
  if (current.length) chunks.push(current);

  onProgress({ step: 'connect', percent: 15, message: '连接 AI 模型' });
  const results = [];
  for (let index = 0; index < chunks.length; index++) {
    const chunk = chunks[index];
    const start = 20 + Math.round(index / Math.max(1, chunks.length) * 55);
    onProgress({
      step: 'analyze',
      percent: start,
      message: `分段翻译与质量分析 ${index + 1}/${chunks.length}`
    });
    try {
      results.push(await requestLLMJson(body, buildPrompt({
        title,
        paragraphs: chunk,
        vocabFocus,
        sourceKind,
        sourceTitle,
        originalEnglishTitle
      })));
    } catch (error) {
      for (const paragraph of chunk) {
        results.push(await requestLLMJson(body, buildCompactPrompt(title, paragraph, vocabFocus, {
          sourceKind,
          originalEnglishTitle
        })));
      }
    }
  }
  onProgress({ step: 'enrich', percent: 82, message: '生成词汇、知识卡与权威依据' });
  const art = mergeAnnotationResults(results, originalEnglishTitle || title);
  if (sourceKind === 'wechat') {
    const recognizedTitle = isStrictEnglishTitle(originalEnglishTitle)
      ? normalizeTitleCandidate(originalEnglishTitle)
      : '';
    art.title = recognizedTitle || (isStrictEnglishTitle(art.title) ? normalizeTitleCandidate(art.title) : '');
    if (!art.title) throw new Error('公众号文章未能生成有效英文标题，请重试');
  }
  const qualityFalseChunks = results.filter(item => item.quality === false);
  if (results.length && qualityFalseChunks.length === results.length) {
    const rejectionReason = results.find(item => modelQualityRejects(item.qualityReason))?.qualityReason;
    if (rejectionReason) {
      throw new Error(`文章质量校验未通过：${rejectionReason || '正文不连贯或不是完整文章'}`);
    }
  }
  if (!art.paragraphs || !art.paragraphs.length) throw new Error('返回内容缺少段落');
  if (!Array.isArray(art.vocab) || !art.vocab.length) {
    throw new Error('模型未返回学习词汇，已停止保存；请重试或检查当前模型输出');
  }
  if (!Array.isArray(art.knowledge) || !art.knowledge.length) {
    throw new Error('模型未返回知识卡，已停止保存；请重试或检查当前模型输出');
  }
  onProgress({ step: 'save', percent: 95, message: '整理标注结果' });
  return art;
}

async function summarizeArticle(body) {
  const { title, paragraphs, deck } = body;
  const prompt = `你是财经英语精读导师。请根据下面的文章生成严格 JSON 结构化摘要，不要补充原文没有的事实。
JSON 结构：{"overview":"2-3 句中文总览","sections":[{"heading":"章节名","summary":"该章节要点"}],"takeaways":["3-5 条学习或分析要点"],"terms":["关键金融术语"]}

标题：${title || '(unknown)'}
导语：${deck || ''}
正文：
${(paragraphs || []).map((p, i) => `[${i + 1}] ${p}`).join('\n')}`;
  const summary = await requestLLMJson(body, prompt);
  if (!summary.overview) throw new Error('总结内容缺少 overview');
  return summary;
}

const MIND_MAP_KINDS = new Set(['thesis', 'argument', 'evidence', 'implication', 'detail']);

function cleanMindMapLabel(value, max = 80) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function normalizeMindMapSourceParagraphs(value) {
  const list = Array.isArray(value)
    ? value
    : Number.isInteger(value) ? [value] : [];
  return [...new Set(list
    .map(Number)
    .filter(number => Number.isInteger(number) && number >= 1 && number <= 50))]
    .slice(0, 8);
}

function normalizeMindMap(value, fallback = {}) {
  const source = value && typeof value === 'object' ? value : {};
  let nodeCount = 0;
  const walk = (node, depth) => {
    if (!node || nodeCount >= 40 || depth > 4) return null;
    const input = typeof node === 'string' ? { label: node } : node;
    const label = cleanMindMapLabel(input.label || input.title || input.term);
    if (!label) return null;
    nodeCount += 1;
    const children = depth < 4
      ? (Array.isArray(input.children) ? input.children : [])
          .map(child => walk(child, depth + 1))
          .filter(Boolean)
          .slice(0, 12)
      : [];
    return {
      label,
      kind: MIND_MAP_KINDS.has(input.kind) ? input.kind : depth === 1 ? 'thesis' : 'detail',
      sourceParagraphs: normalizeMindMapSourceParagraphs(
        input.sourceParagraphs || input.paragraphs || input.paragraph
      ),
      children
    };
  };
  const root = walk(source.root || source, 1);
  if (!root) throw new Error('思维导图缺少有效根节点');
  return {
    title: cleanMindMapLabel(source.title || fallback.title || '文章思维导图', 120),
    summary: cleanMindMapLabel(source.summary || fallback.summary || '', 300),
    root,
    nodeCount,
    generatedAt: Date.now()
  };
}

function buildMindMapPrompt({ title, paragraphs }) {
  return `你是财经文章逻辑编辑。请把下面的文章整理成可用于学习的思维导图，严格按原文逻辑组织，不补充原文没有的事实。
输出严格 JSON，不要 Markdown，不要代码块。

要求：
1. 根节点是文章的中心论点或核心问题，kind 使用 thesis。
2. 一级分支优先按文章论证结构拆成 2-5 个分论点，kind 使用 argument。
3. 证据、数据、案例放入 evidence；结论、影响或行动含义放入 implication；必要的解释放入 detail。
4. 每个节点 label 不超过 60 个中文字符；children 最多 6 个。
5. 每个节点尽量给出 sourceParagraphs，填写对应正文段落编号，使用 1 开始的整数数组。
6. 总节点数不得超过 40，树深度不得超过 4。

JSON 结构：
{"title":"文章标题","summary":"一句话概括导图结构","root":{"label":"中心论点","kind":"thesis","sourceParagraphs":[1],"children":[{"label":"分论点","kind":"argument","sourceParagraphs":[1,2],"children":[{"label":"证据或结论","kind":"evidence","sourceParagraphs":[2],"children":[]}]}]}}

标题：${title || '(unknown)'}
正文：
${(paragraphs || []).map((paragraph, index) => `[${index + 1}] ${paragraph}`).join('\n')}`;
}

async function generateMindMap(body) {
  const { title, paragraphs } = body;
  if (!Array.isArray(paragraphs) || !paragraphs.length) throw new Error('缺少文章正文，无法生成思维导图');
  const result = await requestLLMJson(body, buildMindMapPrompt({ title, paragraphs }));
  return normalizeMindMap(result, { title });
}

const KNOWLEDGE_TYPE_VALUES = new Set(['concept', 'phenomenon', 'mechanism', 'method']);
const RESEARCH_DOMAIN_NAMES = {
  'reuters.com': 'Reuters',
  'apnews.com': 'Associated Press',
  'bloomberg.com': 'Bloomberg',
  'ft.com': 'Financial Times',
  'wsj.com': 'The Wall Street Journal',
  'cnbc.com': 'CNBC',
  'economist.com': 'The Economist',
  'nytimes.com': 'The New York Times',
  'marketwatch.com': 'MarketWatch',
  'nasdaq.com': 'Nasdaq',
  'nikkei.com': 'Nikkei',
  'bankofengland.co.uk': 'Bank of England',
  'boj.or.jp': 'Bank of Japan',
  'nber.org': 'National Bureau of Economic Research',
  'federalreserve.gov': 'Federal Reserve',
  'ecb.europa.eu': 'European Central Bank',
  'bis.org': 'Bank for International Settlements',
  'imf.org': 'International Monetary Fund',
  'worldbank.org': 'World Bank',
  'oecd.org': 'OECD',
  'sec.gov': 'U.S. Securities and Exchange Commission',
  'bls.gov': 'U.S. Bureau of Labor Statistics',
  'bea.gov': 'U.S. Bureau of Economic Analysis'
};

function inferKnowledgeType(knowledge) {
  if (knowledge?.cardType && KNOWLEDGE_TYPE_VALUES.has(knowledge.cardType)) return knowledge.cardType;
  if (knowledge?.category === 'method') return 'method';
  if (/(crisis|recession|inflation shock|shortage|bubble|panic|run|boom|bust|现象|危机|衰退|通胀冲击|挤兑)/i.test(`${knowledge?.term || ''} ${knowledge?.en || ''}`)) {
    return 'phenomenon';
  }
  if (/(mechanism|transmission|channel|传导|机制)/i.test(`${knowledge?.term || ''} ${knowledge?.en || ''} ${knowledge?.body || ''}`)) {
    return 'mechanism';
  }
  return 'concept';
}

function validHttpUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return /^https?:$/.test(url.protocol) ? url : null;
  } catch {
    return null;
  }
}

function researchPublisher(domain) {
  const host = String(domain || '').toLowerCase().replace(/^www\./, '');
  return RESEARCH_DOMAIN_NAMES[host] || host || 'Web source';
}

function isProfessionalResearchDomain(hostname) {
  const host = String(hostname || '').toLowerCase().replace(/^www\./, '');
  return Object.hasOwn(RESEARCH_DOMAIN_NAMES, host) ||
    /\.(gov|int)$/i.test(host) ||
    /(^|\.)(imf\.org|bis\.org|ecb\.europa\.eu|worldbank\.org|oecd\.org|sec\.gov|federalreserve\.gov)$/.test(host);
}

function normalizeSeenDate(value) {
  const text = String(value || '');
  if (/^\d{8}T\d{6}Z$/i.test(text)) {
    return `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`;
  }
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

async function fetchResearchJson(url) {
  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      'user-agent': 'FinLens/1.2 research verification'
    },
    signal: AbortSignal.timeout(RESEARCH_TIMEOUT_MS)
  });
  if (!response.ok) throw new Error(`来源接口返回 HTTP ${response.status}`);
  return response.json();
}

async function searchTavilyNews(term) {
  if (!TAVILY_API_KEY) return [];
  const response = await fetch(TAVILY_API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${TAVILY_API_KEY}`
    },
    body: JSON.stringify({
      query: `${term} finance markets economy`,
      topic: 'news',
      search_depth: 'advanced',
      max_results: 6,
      include_answer: false,
      include_raw_content: false
    }),
    signal: AbortSignal.timeout(RESEARCH_TIMEOUT_MS)
  });
  if (!response.ok) throw new Error(`Tavily 返回 HTTP ${response.status}`);
  const data = await response.json();
  return (Array.isArray(data.results) ? data.results : [])
    .map(item => {
      const url = validHttpUrl(item.url);
      if (!url || !isProfessionalResearchDomain(url.hostname)) return null;
      const official = /\.(gov|int)$/i.test(url.hostname) ||
        /(^|\.)(imf\.org|bis\.org|ecb\.europa\.eu|worldbank\.org|oecd\.org|federalreserve\.gov)$/i.test(url.hostname);
      return {
        title: String(item.title || '').trim(),
        author: '',
        publisher: researchPublisher(url.hostname),
        date: normalizeSeenDate(item.published_date || item.published_at),
        description: String(item.content || '').replace(/\s+/g, ' ').slice(0, 360),
        url: url.href,
        kind: official ? 'official' : 'news',
        verified: true,
        provider: 'Tavily'
      };
    })
    .filter(item => item?.title && item.url);
}

async function searchKnowledgeNews(term) {
  const tavily = await searchTavilyNews(term).catch(() => []);
  if (tavily.length) return tavily;
  const query = `"${term}" (finance OR markets OR economy)`;
  const endpoint = new URL(GDELT_API_BASE);
  endpoint.searchParams.set('query', query);
  endpoint.searchParams.set('mode', 'ArtList');
  endpoint.searchParams.set('maxrecords', '5');
  endpoint.searchParams.set('format', 'json');
  endpoint.searchParams.set('sort', 'HybridRel');
  const data = await fetchResearchJson(endpoint);
  return (Array.isArray(data.articles) ? data.articles : [])
    .map(item => {
      const url = validHttpUrl(item.url);
      if (!url || !isProfessionalResearchDomain(url.hostname)) return null;
      const official = /\.(gov|int)$/i.test(url.hostname) ||
        /(^|\.)(imf\.org|bis\.org|ecb\.europa\.eu|worldbank\.org|oecd\.org|federalreserve\.gov)$/i.test(url.hostname);
      return {
        title: String(item.title || '').trim(),
        author: '',
        publisher: researchPublisher(item.domain || url.hostname),
        date: normalizeSeenDate(item.seendate),
        description: `相关市场报道，来源国：${String(item.sourcecountry || '未标注')}。`,
        url: url.href,
        kind: official ? 'official' : 'news',
        verified: true,
        provider: 'GDELT'
      };
    })
    .filter(item => item?.title && item.url);
}

async function searchKnowledgePapers(term) {
  const endpoint = new URL(CROSSREF_API_BASE);
  endpoint.searchParams.set('query.bibliographic', term);
  endpoint.searchParams.set('rows', '4');
  endpoint.searchParams.set('select', 'DOI,title,author,published,published-print,published-online,URL,container-title,type');
  const data = await fetchResearchJson(endpoint);
  return (Array.isArray(data.message?.items) ? data.message.items : [])
    .map(item => {
      const url = validHttpUrl(item.URL || (item.DOI ? `https://doi.org/${item.DOI}` : ''));
      if (!url) return null;
      const published = item.published?.['date-parts']?.[0]
        || item['published-print']?.['date-parts']?.[0]
        || item['published-online']?.['date-parts']?.[0]
        || [];
      const author = Array.isArray(item.author)
        ? item.author.map(name => name.family || name.given || '').filter(Boolean).join(', ')
        : '';
      return {
        title: String(item.title?.[0] || item.title || '').trim(),
        author,
        publisher: String(item['container-title']?.[0] || 'Crossref'),
        date: published.length ? published.map((part, index) => index === 0 ? String(part) : String(part).padStart(2, '0')).join('-') : '',
        description: '经 Crossref 检索到的学术文献元数据。',
        url: url.href,
        kind: item.type === 'book' || item.type === 'monograph' ? 'book' : 'paper',
        verified: true,
        provider: 'Crossref'
      };
    })
    .filter(item => item?.title && item.url);
}

async function researchKnowledgeSources(knowledge, enabled = true) {
  if (!enabled || process.env.FINLENS_RESEARCH_MODE === 'off') {
    return { status: 'disabled', sources: [], verifiedSources: 0, fetchedAt: Date.now(), error: '' };
  }
  const term = String(knowledge?.en || knowledge?.term || '').trim();
  const cacheKey = `${term.toLowerCase()}::${knowledge?.category || 'finance'}`;
  const cached = knowledgeResearchCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < 6 * 60 * 60 * 1000) return cached;
  const settled = await Promise.allSettled([
    searchKnowledgeNews(term),
    searchKnowledgePapers(term)
  ]);
  const sources = settled.flatMap(result => result.status === 'fulfilled' ? result.value : []);
  const deduped = [...new Map(sources.map(source => [source.url, source])).values()].slice(0, 10);
  const errors = settled
    .filter(result => result.status === 'rejected')
    .map(result => String(result.reason?.message || result.reason || '来源检索失败'));
  const result = {
    status: deduped.length ? 'verified' : errors.length ? 'unavailable' : 'empty',
    sources: deduped,
    verifiedSources: deduped.filter(source => source.verified).length,
    fetchedAt: Date.now(),
    error: errors.slice(0, 2).join('；')
  };
  knowledgeResearchCache.set(cacheKey, result);
  return result;
}

function classificationSourcesFor(card, classification) {
  const term = `${card?.term || ''} ${card?.en || ''} ${card?.one || ''} ${card?.body || ''}`.toLowerCase();
  const keys = new Set();
  const add = (...items) => items.forEach(item => item && keys.add(item));
  if (classification.category === 'finance' || classification.categories?.includes('finance')) {
    add('sec', 'fed', 'bis', 'imf');
    if (/cash flow|capital expenditure|capex|free cash flow|现金流|资本开支/.test(term)) add('ifrs', 'bea');
    if (/market correction|bond|yield|credit spread|market risk|股票|债券|收益率|利差|市场风险/.test(term)) {
      add('finra', 'nasdaq');
    }
    if (/purchasing power|购买力|real wage|实际工资/.test(term)) add('bls', 'bea');
  }
  if (classification.category === 'background' || classification.categories?.includes('background')) {
    add('imf', 'worldBank', 'oecd');
    if (/labor|unemployment|wage|inflation|price|purchasing power|employment|劳动|失业|工资|通胀|物价|购买力/.test(term)) {
      add('bls', 'bea');
    }
    if (/ifrs|accounting|cash flow|会计|现金流/.test(term)) add('ifrs');
    if (/technology|research|ai|science|技术|科研|人工智能/.test(term)) add('oecd', 'nber');
  }
  if (classification.category === 'method' || classification.categories?.includes('method')) {
    add('aea', 'nber', 'crossref', 'bis');
  }
  if (/financial law|financial policy|financial regulation|fintech|金融法|金融政策|监管|金融科技/.test(term)) {
    add('sec', 'bis', 'imf');
  }
  if (!keys.size) add('imf', 'bis');
  return [...keys].map(key => CLASSIFICATION_SOURCE_REGISTRY[key]).filter(Boolean);
}

function knowledgeContentMismatch(card) {
  const term = `${card?.term || ''} ${card?.en || ''}`.toLowerCase();
  const body = `${card?.one || ''} ${card?.body || ''}`.toLowerCase();
  const examples = String(card?.cases || '').trim();
  const warnings = [];
  if (/market correction|市场修正/.test(term) && /etf|申购赎回|跟踪误差|折溢价/.test(body)) {
    warnings.push('正文似乎解释 ETF 产品，而不是市场修正');
  }
  if (/wall of worry/.test(term) && /牛市|ark etf|bull market/.test(body)) {
    warnings.push('正文似乎解释牛市或 ARK ETF，而不是 Wall of Worry');
  }
  if (/general purpose technology|通用目的技术/.test(term) && /贴现现金流|久期|折现率/.test(body)) {
    warnings.push('正文似乎解释 DCF 或久期，而不是通用目的技术');
  }
  const aliases = Array.isArray(card?.match) ? card.match : [];
  if (aliases.some(alias => /^(openai|nvidia|anthropic|google|microsoft|meta|amazon)$/i.test(String(alias).trim()))) {
    warnings.push('match 中存在上下文实体，可能是误标别名');
  }
  const hasPercentageClaim = /\d+(?:\.\d+)?\s*(?:%|percent(?:\s+points?)?|百分点)/i.test(examples);
  const markedHypothetical = /假设|示例计算|假定|illustrative|hypothetical|stylized/i.test(examples);
  const caseHasTrace = /(?:19|20)\d{2}|Q[1-4]|文章|原文|来源|报告|数据|统计|SEC|Federal Reserve|Fed|BIS|IMF|BLS|BEA|IFRS|FINRA|Nasdaq|World Bank|OECD|NBER/i.test(examples);
  if (hasPercentageClaim && !markedHypothetical && !caseHasTrace) {
    warnings.push('案例含具体百分比，但未说明时间、来源或“假设/示例计算”口径');
  }
  if (examples.length > 260) {
    warnings.push('案例过长，应压缩为与术语直接相关的单一可核验语境');
  }
  return warnings;
}

const VERIFIED_CARD_CONTENT_DRAFTS = [
  {
    test: /market correction|市场修正/i,
    one: '市场修正是股票、指数或其他金融资产价格从近期高点明显回落的阶段，常被用于描述风险偏好和估值压力的变化。',
    body: '市场修正通常指广泛股票市场或某一金融资产从近期高点出现明显回撤。媒体和市场参与者常用约 10% 的跌幅描述 correction，但这不是所有交易所或监管机构统一规定的法定阈值；若文章给出具体指数、收盘价或跌幅，应按原文口径记录。修正不同于熊市、崩盘和波动率：熊市通常对应更深或更持久的下跌，崩盘强调下跌速度和交易秩序冲击，波动率描述的是价格波动程度而不是方向。',
    cases: '文章讨论的纳斯达克综合指数进入 correction territory，是金融资产价格从阶段高点回撤的市场语境；具体跌幅应回到指数数据核验。'
  },
  {
    test: /wall of worry/i,
    one: 'Wall of Worry 指市场持续存在担忧、怀疑和负面叙事，但价格仍可能继续上涨的情绪状态。',
    body: '“忧虑之墙”是一个市场情绪隐喻，不是统一的监管或会计术语。它描述投资者普遍保持怀疑、仓位和风险偏好受压，而市场却在担忧中逐步上涨的状态；逆向投资者可能把这种怀疑视为上涨尚未过度拥挤的信号，但情绪无法单独证明估值合理或未来收益。',
    cases: '文章用 wall of worry 描述投资者持续担忧、怀疑，但市场仍可能继续上涨的语境；该表达没有统一的量化阈值。'
  },
  {
    test: /general purpose technology|通用目的技术/i,
    one: '通用目的技术指能被广泛用作下游创新输入、持续改进并外溢到多个行业的基础性技术。',
    body: 'General Purpose Technology（GPT）不是指某一个产品，而是经济学中描述技术扩散的概念。典型特征包括：可被大量行业采用、与其他技术形成互补、持续改进并能产生广泛生产率外溢。电力、内燃机和互联网常被引用为历史例子；人工智能被视为潜在的新一代 GPT，但其采用路径、时间滞后和生产率效应仍需实证检验。',
    cases: '电力、内燃机和互联网常被视为通用目的技术；人工智能是潜在候选，但生产率效应和采用时滞仍需实证检验。'
  }
];

function knownContentDraft(card) {
  const text = `${card?.term || ''} ${card?.en || ''}`;
  return VERIFIED_CARD_CONTENT_DRAFTS.find(item => item.test.test(text)) || null;
}

async function suggestContentFix(card, warnings, requestBody = {}) {
  const known = knownContentDraft(card);
  if (known) return { one: known.one, body: known.body, cases: known.cases, source: 'verified-draft' };
  if (!requestBody.apiKey && !requestBody.localCredentialId && !requestBody.ccSwitchProviderId) return null;
  try {
    const result = await requestLLMJson(requestBody, `你是严谨的财经英语导师。下面这张知识卡的正文与术语明显错配，请只重写卡片正文，不要改变术语、分类或来源。输出严格 JSON：
{"one":"一句话解释","body":"100-180字专业解释","cases":"一个可核验案例；没有则空字符串"}
必须满足：定义准确；区分本体、机制和方法；不编造统计数字；不把相邻概念写成同义词。
${KNOWLEDGE_CASE_RULES}
问题提示：${warnings.join('；')}
术语：${card.term || ''}
英文：${card.en || ''}
当前一句话：${card.one || ''}
当前正文：${card.body || ''}
当前案例：${card.cases || ''}`);
    if (!result?.one || !result?.body) return null;
    return {
      one: String(result.one).trim(),
      body: String(result.body).trim(),
      cases: String(result.cases || '').trim(),
      source: 'model-draft'
    };
  } catch {
    return null;
  }
}

const KNOWLEDGE_CATEGORY_LABELS = {
  finance: '金融术语',
  background: '背景层',
  method: '分析方法'
};

const KNOWLEDGE_EVIDENCE_MARKERS = {
  finance: /\b(?:equity|security|securities|stock|share|valuation|market value|cash ?flow|debt|financ|credit|liquidity|interest rate|currency|insurance|portfolio|investment|return|yield|spread|tax)\w*\b|股权|股份|证券|估值|市值|现金流|债务|融资|信用|流动性|利率|货币|保险|投资组合|收益|利差|税务/i,
  background: /\b(?:law|legal|regulation|policy|court|judicial|institution|governance|trust|political|geopolitic|industry|social|public health|technology|research|science)\w*\b|法律|监管|政策|法院|司法|制度|治理|信托|政治|地缘|产业|社会|公共卫生|技术|科研/i,
  method: /\b(?:analysis|analytical|method|model|framework|estimate|forecast|assumption|scenario|simulation|validation|boundary|procedure|calculation)\w*\b|分析|方法|模型|框架|估计|预测|假设|情景|模拟|校验|边界|步骤|计算/i
};

const KNOWLEDGE_NEGATIVE_EVIDENCE_PATTERN = /(?:不涉及|不包含|没有|无需|并非|而不是|不构成|不能证明|不能作为|without|does not|doesn't|did not|is not|are not|no evidence of|not evidence of)/i;

function knowledgeEvidenceSentences(card = {}) {
  const snippets = [];
  for (const [source, value] of [['one', card.one], ['body', card.body]]) {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (!text) continue;
    const parts = text.split(/(?<=[。！？!?；;])|(?<=\.)\s+(?=[A-Z])/u);
    for (const part of parts) {
      const sentence = part.trim();
      if (sentence) snippets.push({ source, text: sentence.slice(0, 280) });
    }
  }
  return snippets;
}

function knowledgeTermNeedles(card = {}) {
  return [card.term, card.en]
    .map(value => String(value || '').toLowerCase().replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function knowledgeCategoryEvidence(card, classification, currentCategories, contentWarnings = []) {
  const sentences = knowledgeEvidenceSentences(card);
  const needles = knowledgeTermNeedles(card);
  const negative = sentences.filter(item => KNOWLEDGE_NEGATIVE_EVIDENCE_PATTERN.test(item.text));
  const negativeTexts = new Set(negative.map(item => item.text));
  const positive = sentences.filter(item => !negativeTexts.has(item.text));
  const termPattern = needles.length
    ? new RegExp(needles.map(value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'i')
    : null;
  const definitionPattern = /(?:是指|指的是|定义为|表示|意味着|衡量|属于|通过|导致|影响|refers? to|means|describes?|represents|measures|involves|allows|leads? to|affects?)/i;
  const directMain = positive
    .filter(item => termPattern?.test(item.text) || definitionPattern.test(item.text))
    .slice(0, 3);
  const main = directMain.length ? directMain : positive.slice(0, 2);
  const mainTexts = new Set(main.map(item => item.text));
  const crossCategories = classification.categories.filter(category =>
    category !== classification.category && KNOWLEDGE_CATEGORY_VALUES.has(category));
  const cross = crossCategories.length
    ? positive
      .filter(item => !mainTexts.has(item.text))
      .filter(item => crossCategories.some(category => KNOWLEDGE_EVIDENCE_MARKERS[category]?.test(item.text)))
      .slice(0, 3)
    : [];
  const sourceText = `${card.one || ''} ${card.body || ''}`.replace(/[\s。！？!?；;，,.]/g, '');
  const mainIsSubstantive = main.some(item => {
    const normalized = item.text.replace(/[\s。！？!?；;，,.]/g, '').toLowerCase();
    return normalized.length >= 8 && !needles.includes(normalized);
  });
  const sufficient = Boolean(
    main.length &&
    mainIsSubstantive &&
    sourceText.length >= 12 &&
    (!crossCategories.length || cross.length)
  );
  const mainReason = main.length
    ? `主对象按规则判断为${KNOWLEDGE_CATEGORY_LABELS[classification.category] || classification.category}：${classification.reason}`
    : '主对象证据不足：没有找到足以解释术语本体的正文片段。';
  const crossReason = crossCategories.length
    ? cross.length
      ? `独立交叉证据指向${crossCategories.map(category => KNOWLEDGE_CATEGORY_LABELS[category]).join('、')}；交叉关系来自正文的独立片段，不是术语名称或来源目录。`
      : `未找到独立的${crossCategories.map(category => KNOWLEDGE_CATEGORY_LABELS[category]).join('、')}正文证据，因此不提出交叉分类。`
    : '未提出交叉分类。';
  const negativeReason = negative.length
    ? '检测到明确否定表述；这些片段不会被当作正面分类证据。'
    : '';
  return {
    main,
    cross,
    negative: negative.slice(0, 3),
    sufficient,
    mainReason,
    crossReason,
    negativeReason,
    sourcePolicy: 'research-entry-points-only'
  };
}

async function revalidateKnowledgeCategories(cards, online = true, requestBody = {}) {
  const results = [];
  for (const raw of cards) {
    const card = raw && typeof raw === 'object' ? raw : {};
    const classification = classifyKnowledgeCategory({
      ...card,
      categoryLocked: false,
      category: undefined,
      categories: undefined
    });
    const currentCategory = KNOWLEDGE_CATEGORY_VALUES.has(card.category) ? card.category : '';
    const currentCategories = Array.isArray(card.categories) && card.categories.length
      ? card.categories.filter(item => KNOWLEDGE_CATEGORY_VALUES.has(item))
      : currentCategory ? [currentCategory] : [];
    const contentWarnings = knowledgeContentMismatch(card);
    const classifierChanged = Boolean(currentCategory) && (
      currentCategory !== classification.category ||
      JSON.stringify([...currentCategories].sort()) !== JSON.stringify([...classification.categories].sort())
    );
    const evidence = knowledgeCategoryEvidence(card, classification, currentCategories, contentWarnings);
    const changed = classifierChanged && evidence.sufficient;
    const recommendation = contentWarnings.length || (changed && classification.confidence < 0.85)
      ? 'review'
      : changed
        ? 'change'
        : 'keep';
    const suggestedCategory = changed || !currentCategory ? classification.category : currentCategory;
    const suggestedCategories = changed || !currentCategory ? classification.categories : currentCategories;
    const categoryConfidence = classifierChanged && !evidence.sufficient
      ? Math.min(classification.confidence, 0.65)
      : classification.confidence;
    const shouldResearch = online && (classifierChanged || classification.confidence < 0.85 || contentWarnings.length);
    let research = null;
    if (shouldResearch) {
      research = await researchKnowledgeSources(card, true);
    }
    const sourceMap = new Map();
    classificationSourcesFor(card, classification)
      .forEach(source => sourceMap.set(source.url, { ...source, verified: false, sourceType: 'registry' }));
    (research?.sources || []).forEach(source => sourceMap.set(source.url, { ...source, sourceType: 'live' }));
    const contentFix = contentWarnings.length
      ? await suggestContentFix(card, contentWarnings, requestBody)
      : null;
    results.push({
      articleId: String(card.articleId || card._aid || ''),
      articleTitle: String(card.articleTitle || card._title || ''),
      cardId: String(card.id || ''),
      term: String(card.term || ''),
      en: String(card.en || ''),
      originalContent: {
        one: String(card.one || ''),
        body: String(card.body || ''),
        cases: String(card.cases || '')
      },
      current: {
        category: currentCategory,
        categories: currentCategories,
        cardType: String(card.cardType || '')
      },
      suggested: {
        category: suggestedCategory,
        categories: suggestedCategories,
        cardType: inferKnowledgeType({ ...card, category: suggestedCategory })
      },
      categoryReason: classification.reason,
      categoryConfidence,
      changed,
      recommendation,
      evidence,
      contentWarnings,
      sources: [...sourceMap.values()].slice(0, 8),
      online: shouldResearch ? (research?.status || 'unknown') : 'registry',
      onlineError: research?.error || '',
      verifiedSources: Number(research?.verifiedSources || 0),
      contentFix,
      contentFixStatus: contentFix ? contentFix.source : contentWarnings.length ? 'manual-review' : ''
    });
  }
  return results;
}

function curatedKnowledgeSources(category) {
  const keys = category === 'background'
    ? ['imf', 'worldBank', 'oecd']
    : category === 'method'
      ? ['bis', 'imf', 'ecb']
      : ['fed', 'ecb', 'bis'];
  return keys.map(key => AUTHORITY_SOURCES[key]).filter(Boolean).map(source => ({
    title: `${source.title} 官方资料检索`,
    author: source.title,
    publisher: source.title,
    date: '',
    description: source.description,
    url: source.url,
    kind: 'official',
    verified: false,
    curated: true,
    provider: '来源目录'
  }));
}

function normalizeKnowledgeSources(modelSources, research, category) {
  const verified = research.sources || [];
  const combined = [...verified, ...curatedKnowledgeSources(category)];
  if (!verified.length && research.status === 'disabled') {
    const allowed = /^https?:\/\/(?:[^/]+\.)?(?:imf\.org|bis\.org|ecb\.europa\.eu|federalreserve\.gov|sec\.gov|worldbank\.org|oecd\.org|doi\.org)(?:\/|$)/i;
    const model = (Array.isArray(modelSources) ? modelSources : [])
      .map(item => typeof item === 'string'
        ? { title: item, author: '', publisher: '', date: '', description: '', url: '', kind: 'reference' }
        : {
            title: String(item?.title || item?.source || '').trim(),
            author: String(item?.author || '').trim(),
            publisher: String(item?.publisher || item?.source || '').trim(),
            date: String(item?.date || '').trim(),
            description: String(item?.description || '').trim(),
            url: String(item?.url || '').trim(),
            kind: String(item?.kind || 'reference').trim()
          })
      .filter(item => !item.url || allowed.test(item.url))
      .map(item => ({ ...item, verified: false, curated: false, provider: '模型建议' }));
    combined.unshift(...model);
  }
  return [...new Map(combined.map(item => [item.url || `${item.title}:${item.publisher}`, item])).values()].slice(0, 10);
}

async function generateKnowledgeDetail(body) {
  const { knowledge, title, paragraphs } = body;
  if (!knowledge?.term) throw new Error('缺少知识卡');
  const categoryClassification = classifyKnowledgeCategory(knowledge);
  const category = categoryClassification.category;
  const typeHint = inferKnowledgeType(knowledge);
  const research = await researchKnowledgeSources(knowledge, body.researchOnline !== false);
  const prompt = `你是严谨的财经英语导师。请扩展下面这张知识卡，输出严格 JSON。
要求：
1. 先判断 cardType：
   - concept：定义、指标、制度或学术名词；没有案例时说明口径、指标意义和典型报告场景。
   - phenomenon：可观察的市场、经济或社会现象；必须给出场景、触发条件、影响和可核验案例。
   - mechanism：解释传导链、因果路径或制度运作方式；必须列出条件和逻辑步骤。
   - method：分析方法、模型或判断框架；必须给出可执行步骤和适用边界。
2. detail：把概念讲透，说明定义、机制、因果链、适用条件与边界，250-500 字。
3. examples：2-4 个具体例子或场景，不得编造精确统计数据。
4. scenarios：2-4 个该概念会出现的社会、政策、市场或学术场景。
5. indicators：0-4 个可观察指标，每项包含 name、meaning、importance。学术概念优先说明口径和指标意义。
6. caseStudies：phenomenon 类优先；案例必须包含标题、日期、地点、具体事件、机制和影响。没有可靠案例时返回空数组。
7. methodSteps：method 或 mechanism 类给出 2-5 个可执行步骤；否则可为空数组。
8. sources：只允许使用下方 researchEvidence 中实际存在的来源；不得新增 URL、报告标题或作者。
9. authorityKey：只能从 fed|imf|bis|ecb|sec 中选择最相关的一手权威来源。
10. caution：指出容易混淆、证据不足或适用边界。
输出结构：
{"cardType":"concept|phenomenon|mechanism|method","classificationReason":"","detail":"","mechanism":"","examples":[""],"scenarios":[""],"indicators":[{"name":"","meaning":"","importance":""}],"caseStudies":[{"title":"","date":"","location":"","description":"","mechanism":"","impact":"","sourceTitle":""}],"sources":[{"title":"","author":"","description":"","url":"","kind":"official|book|paper|news"}],"methodSteps":[""],"authorityKey":"fed","caution":""}
要求：
- mechanism 说明因果链、传导机制和适用条件。
- caseStudies 给出可核验的案例标题、描述、机制和影响；没有可靠案例时返回空数组，不得编造。
- sources 只引用 researchEvidence；无法确认作者、标题或 URL 时留空。

知识卡类型：${category}
板块归类：${categoryClassification.categories.map(item => `${item}(${item === 'finance' ? '金融术语' : item === 'background' ? '背景层' : '分析方法'})`).join(' + ')}
分类依据：${categoryClassification.reason}（置信度 ${categoryClassification.confidence}）
初步类型判断：${typeHint}
概念：${knowledge.term}
英文：${knowledge.en || ''}
一句话解释：${knowledge.one || ''}
当前说明：${knowledge.body || ''}
联网核验状态：${research.status}（${research.verifiedSources} 条已验证来源）
researchEvidence：${JSON.stringify(research.sources || [])}
文章标题：${title || '(unknown)'}
文章原文：
${(paragraphs || []).join('\n').slice(0, 12000)}`;
  const result = await requestLLMJson(body, prompt);
  const source = AUTHORITY_SOURCES[result.authorityKey] ||
    AUTHORITY_SOURCES[category === 'method' ? 'bis' : category === 'background' ? 'imf' : 'fed'];
  const normalizeCases = (items) => (Array.isArray(items) ? items : [])
    .map(item => typeof item === 'string'
      ? { title: '案例', date: '', location: '', description: item, mechanism: '', impact: '', sourceTitle: '' }
      : {
        title: String(item?.title || '').trim(),
        date: String(item?.date || '').trim(),
        location: String(item?.location || '').trim(),
        description: String(item?.description || '').trim(),
        mechanism: String(item?.mechanism || '').trim(),
        impact: String(item?.impact || '').trim(),
        sourceTitle: String(item?.sourceTitle || item?.source || '').trim()
      })
    .filter(item => item.title || item.description || item.mechanism || item.impact)
    .slice(0, 5);
  const normalizeIndicators = (items) => (Array.isArray(items) ? items : [])
    .map(item => typeof item === 'string'
      ? { name: item, meaning: '', importance: '' }
      : {
          name: String(item?.name || '').trim(),
          meaning: String(item?.meaning || '').trim(),
          importance: String(item?.importance || '').trim()
        })
    .filter(item => item.name)
    .slice(0, 4);
  const cardType = KNOWLEDGE_TYPE_VALUES.has(result.cardType) ? result.cardType : typeHint;
  return {
    category,
    categories: categoryClassification.categories,
    categoryReason: categoryClassification.reason,
    categoryConfidence: categoryClassification.confidence,
    cardType,
    classificationReason: String(result.classificationReason || '').trim(),
    detail: String(result.detail || '').trim(),
    mechanism: String(result.mechanism || '').trim(),
    examples: Array.isArray(result.examples) ? result.examples.map(String).slice(0, 4) : [],
    scenarios: Array.isArray(result.scenarios) ? result.scenarios.map(String).slice(0, 4) : [],
    indicators: normalizeIndicators(result.indicators),
    caseStudies: normalizeCases(result.caseStudies),
    sources: normalizeKnowledgeSources(result.sources, research, category),
    research: {
      status: research.status,
      verifiedSources: research.verifiedSources,
      fetchedAt: research.fetchedAt,
      error: research.error || ''
    },
    methodSteps: Array.isArray(result.methodSteps) ? result.methodSteps.map(String).slice(0, 6) : [],
    caution: String(result.caution || '').trim(),
    authority: {
      source: source.title,
      description: source.description,
      url: source.url
    }
  };
}

async function askArticle(body) {
  const { title, question, paragraphs, summary, knowledge } = body;
  if (!String(question || '').trim()) throw new Error('问题不能为空');
  const sourceText = JSON.stringify(knowledge || []).toLowerCase();
  const authority = Object.entries(AUTHORITY_SOURCES)
    .filter(([key, source]) => sourceText.includes(key) || sourceText.includes(source.title.toLowerCase()))
    .map(([, source]) => source);
  if (!authority.length) authority.push(AUTHORITY_SOURCES.fed, AUTHORITY_SOURCES.bis);
  const prompt = `你是一名严谨的财经英语导师，熟悉货币政策、财政、公司金融、资产定价和市场微观结构。
回答规则：
1. 原文怎么说：只引用用户文章中的句子，不得把自己的背景知识伪装成原文。
2. 知识库依据：说明当前文章知识卡或一般财经知识如何解释，明确区分两者。
3. 权威依据：优先使用下方权威机构背景；不得编造引用、报告标题或具体数据。
4. 证据不足时明确说明，不提供个股买卖建议或确定性收益承诺。
请输出严格 JSON，字符串内不要使用未转义的双引号：
{"answer":"直接回答","originalEvidence":[{"quote":"原文句子","interpretation":"这句话怎么支持结论"}],"knowledgeBasis":["知识库或机制依据"],"authorityBasis":[{"source":"机构名","description":"该机构提供的概念或制度背景","url":"https://..."}],"caution":"证据不足或适用边界；否则为空字符串"}

文章标题：${title || '(unknown)'}
文章摘要：${JSON.stringify(summary || {})}
文章知识卡：${JSON.stringify(knowledge || [])}
问题：${question}
权威背景：
${JSON.stringify(authority)}
原文：
${(paragraphs || []).join('\n').slice(0, 16000)}`;
  const result = await requestLLMJson(body, prompt);
  if (!result.answer && result.result?.answer) return result.result;
  if (!result.answer) {
    result.answer = result.result?.answer || '模型返回了结果，但未给出可读的回答。';
  }
  if (!Array.isArray(result.originalEvidence)) {
    result.originalEvidence = result.evidence || [];
  }
  if (!Array.isArray(result.knowledgeBasis)) result.knowledgeBasis = [];
  if (!Array.isArray(result.authorityBasis)) result.authorityBasis = authority;
  if (typeof result.caution !== 'string') result.caution = '';
  return result;
}

async function listModels(body) {
  const { baseUrl, apiKey } = await resolveModelRequest(body);
  const key = apiKey;
  if (!key) throw new Error('缺少 API Key');
  const url = (baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '') + '/models';
  const response = await fetch(url, {
    headers: { authorization: 'Bearer ' + key },
    signal: AbortSignal.timeout(20000)
  });
  if (!response.ok) throw new Error(`模型接口返回 ${response.status}: ${(await response.text()).slice(0, 200)}`);
  const data = await response.json();
  const models = [...new Set((data.data || data.models || []).map(item => typeof item === 'string' ? item : item.id).filter(Boolean))];
  if (!models.length) throw new Error('模型接口未返回可用模型');
  return models.sort();
}

async function testModelConnection(body) {
  const { baseUrl, model, apiKey } = await resolveModelRequest(body);
  const key = apiKey;
  if (!key) throw new Error('缺少 API Key');
  if (!String(model || '').trim()) throw new Error('请选择或填写模型名称');
  const url = (baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '') + '/chat/completions';
  const startedAt = Date.now();
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer ' + key
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 8,
        messages: [{ role: 'user', content: 'Reply with OK.' }]
      }),
      signal: AbortSignal.timeout(30000)
    });
  } catch (error) {
    throw new Error(`无法连接模型接口：请检查 Base URL、网络和服务商状态（${error.message || error}）`);
  }
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`模型接口返回 ${response.status}: ${text.slice(0, 300)}`);
  }
  let reply = '';
  try {
    const data = JSON.parse(text);
    const content = data.choices?.[0]?.message?.content ?? data.output_text ?? '';
    reply = Array.isArray(content)
      ? content.map(part => part?.text || '').join('').slice(0, 120)
      : String(content).slice(0, 120);
  } catch {}
  return {
    model,
    latencyMs: Date.now() - startedAt,
    reply
  };
}

async function explainWord(body) {
  const { word, sentence, contextMeaning, title, mwApiKey } = body;
  if (!word) throw new Error('缺少单词');
  const ecdict = lookupEcdictWord(word);
  const authorityKey = String(mwApiKey || process.env.MERRIAM_WEBSTER_API_KEY || '').trim();
  let authority = null;
  let authorityError = '';
  if (authorityKey) {
    try {
      authority = await lookupMerriamWebster(word, authorityKey);
    } catch (error) {
      authorityError = String(error.message || error);
    }
  }
  let modelResult = null;
  let modelError = '';
  if (body.apiKey || body.ccSwitchProviderId || KEY) {
    const ecdictReference = ecdict
      ? ecdict.senses.map(sense => `${sense.pos || ''} ${sense.zh || ''}`.trim()).join('；')
      : '(未找到)';
    const prompt = `请解析词汇“${word}”。
当前文章标题：${title || '(unknown)'}
当前句子：${sentence || '(未提供)'}
当前语境释义：${contextMeaning || '(未提供)'}
ECDICT 离线参考：${ecdictReference}

输出严格 JSON：
{"word":"","contextualMeaning":"当前语境下的准确解释","senses":[{"pos":"n./v./adj.","definition":"英文释义","zh":"中文释义","example":"英文例句","exampleZh":"例句翻译"}],"collocations":["高频搭配"],"formChanges":[{"label":"过去式 / 过去分词","value":""}],"usageNote":"易混点、语体或金融语境说明"}
要求：结合当前句子，不要把所有词典义项机械罗列；金融术语必须说明专业含义。formChanges 只填写当前词的屈折变化并标注语法类型，不要把派生词、近义词或搭配混入词形转换；无法确认时返回空数组。`;
    try {
      modelResult = await requestLLMJson(body, prompt);
      if (!Array.isArray(modelResult.senses) || !modelResult.senses.length) {
        throw new Error('词典结果缺少释义');
      }
    } catch (error) {
      modelError = String(error.message || error);
    }
  }
  if (!ecdict && !authority && !modelResult && modelError) throw new Error(modelError);
  if (!ecdict && !authority && !modelResult) {
    throw new Error(authorityError || 'ECDICT 中未找到该词，且未配置模型或权威词典');
  }
  const result = {
    word: modelResult?.word || ecdict?.word || word,
    contextualMeaning: modelResult?.contextualMeaning || ecdict?.contextualMeaning || contextMeaning || '',
    senses: modelResult?.senses?.length ? modelResult.senses : ecdict?.senses || [],
    collocations: modelResult?.collocations || ecdict?.collocations || [],
    formChanges: Array.isArray(modelResult?.formChanges) && modelResult.formChanges.length
      ? modelResult.formChanges
      : ecdict?.formChanges || [],
    usageNote: modelResult?.usageNote || ecdict?.usageNote || '',
    sources: {
      ecdict: !!ecdict,
      authority: !!authority,
      model: !!modelResult
    }
  };
  if (ecdict) result.ecdict = ecdict.ecdict;
  if (authority) result.authority = authority;
  if (authorityError) result.authorityError = authorityError;
  if (modelError) result.modelError = modelError;
  return result;
}

async function lookupMerriamWebster(word, key) {
  const normalized = String(word || '').trim().toLowerCase();
  if (!normalized) throw new Error('缺少单词');
  const url = MW_API_BASE.replace(/\/+$/, '') + '/' + encodeURIComponent(normalized) +
    '?key=' + encodeURIComponent(key);
  const response = await fetch(url, {
    headers: { 'user-agent': 'FinLens/1.0' },
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new Error(`Merriam-Webster 返回 HTTP ${response.status}`);
  const payload = await response.json();
  if (!Array.isArray(payload)) throw new Error('Merriam-Webster 返回格式无效');
  const entries = payload.filter(item => item && typeof item === 'object');
  if (!entries.length) {
    const suggestions = payload.filter(item => typeof item === 'string').slice(0, 5);
    if (suggestions.length) return { source: "Merriam-Webster Learner's", definitions: [], suggestions };
    throw new Error('Merriam-Webster 未找到该词');
  }
  const definitions = [];
  const examples = [];
  const partsOfSpeech = new Set();
  let headword = normalized;
  for (const entry of entries.slice(0, 4)) {
    headword = entry.hwi?.hw?.replace(/\*/g, '') || entry.meta?.id || headword;
    if (entry.fl) partsOfSpeech.add(String(entry.fl));
    for (const definition of entry.shortdef || []) {
      if (definition && !definitions.includes(String(definition))) definitions.push(String(definition));
    }
    const visit = value => {
      if (!value || definitions.length >= 8) return;
      if (Array.isArray(value)) return value.forEach(visit);
      if (typeof value !== 'object') return;
      if (typeof value.t === 'string' && /^\d+$/.test(value.t) && Array.isArray(value.tr)) visit(value.tr);
      for (const sentence of value.tr || []) {
        for (const example of sentence.ex || []) {
          if (example.t && !examples.includes(String(example.t))) examples.push(String(example.t));
        }
      }
      for (const definition of value.sseq || []) visit(definition);
    };
    visit(entry.def);
  }
  return {
    source: "Merriam-Webster Learner's",
    headword,
    partsOfSpeech: [...partsOfSpeech],
    definitions: definitions.slice(0, 8),
    examples: examples.slice(0, 5)
  };
}

const ECDICT_FORM_LABELS = {
  p: '过去式',
  d: '过去分词',
  i: '现在分词',
  3: '第三人称单数',
  s: '复数',
  r: '比较级',
  t: '最高级'
};

function ecdictFormChanges(exchange) {
  const byValue = new Map();
  for (const item of String(exchange || '').split('/')) {
    const separator = item.indexOf(':');
    if (separator < 1) continue;
    const code = item.slice(0, separator).trim();
    const value = item.slice(separator + 1).trim();
    const label = ECDICT_FORM_LABELS[code];
    if (!label || !value) continue;
    if (!byValue.has(value)) byValue.set(value, []);
    const labels = byValue.get(value);
    if (!labels.includes(label)) labels.push(label);
  }
  return [...byValue].map(([value, labels]) => ({
    label: labels.join(' / '),
    value
  }));
}

function lookupEcdictWord(word) {
  if (ecdictUnavailable) return null;
  try {
    if (!ecdictDb) {
      if (!fs.existsSync(ECDICT_DB_PATH)) {
        return null;
      }
      ecdictDb = new DatabaseSync(ECDICT_DB_PATH, { readOnly: true });
    }
    const row = ecdictDb.prepare(`
      SELECT word, phonetic, translation, definition, pos, exchange, tags, bnc, frq
      FROM entries
      WHERE word = ?
      LIMIT 1
    `).get(String(word || '').trim());
    if (!row) return null;
    const lines = (value) => String(value || '')
      .split(/\r?\n|\\n/)
      .map(item => item.trim())
      .filter(Boolean);
    const translations = lines(row.translation);
    const definitions = lines(row.definition);
    const fallbackPos = String(row.pos || '').split('/')[0]?.split(':')[0] || '';
    const senses = translations.slice(0, 6).map((translation, index) => {
      const match = translation.match(/^([a-z]+\.)\s*(.*)$/i);
      return {
        pos: match?.[1] || fallbackPos,
        zh: match?.[2] || translation,
        definition: definitions[index] || definitions[0] || ''
      };
    });
    return {
      word: row.word,
      contextualMeaning: senses[0]?.zh || '',
      senses,
      collocations: [],
      formChanges: ecdictFormChanges(row.exchange),
      usageNote: 'ECDICT 离线词库',
      ecdict: {
        phonetic: row.phonetic || '',
        pos: row.pos || '',
        exchange: row.exchange || '',
        tags: row.tags || '',
        bnc: row.bnc,
        frq: row.frq
      }
    };
  } catch (error) {
    ecdictUnavailable = true;
    console.error('ECDICT query failed:', String(error.message || error));
    return null;
  }
}

async function synthesizeSpeech(body) {
  const { text, voice, engine } = body;
  if (engine !== 'openai') {
    const { EdgeTTS } = await import('node-edge-tts');
    const tts = new EdgeTTS({
      voice: voice || 'en-US-AriaNeural',
      lang: 'en-US',
      timeout: 45000
    });
    const chunks = [];
    for await (const chunk of tts.streamAudio(String(text).slice(0, 12000))) {
      if (Buffer.isBuffer(chunk)) chunks.push(chunk);
    }
    if (!chunks.length) throw new Error('Edge 语音服务未返回音频');
    return { buffer: Buffer.concat(chunks), contentType: 'audio/mpeg' };
  }
  const { baseUrl, apiKey, model } = await resolveModelRequest(body);
  const key = apiKey;
  if (!key) throw new Error('缺少语音服务 API Key');
  if (!String(text || '').trim()) throw new Error('缺少朗读文本');
  const url = (baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '') + '/audio/speech';
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + key },
    body: JSON.stringify({
      model: model || 'gpt-4o-mini-tts',
      voice: voice || 'alloy',
      input: String(text).slice(0, 4000),
      response_format: 'mp3'
    }),
    signal: AbortSignal.timeout(60000)
  });
  if (!response.ok) throw new Error(`语音接口返回 ${response.status}: ${(await response.text()).slice(0, 200)}`);
  return {
    buffer: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get('content-type') || 'audio/mpeg'
  };
}

function parseProviderConfig(row) {
  let config;
  try { config = JSON.parse(row.settings_config || '{}'); } catch { config = {}; }
  const toml = String(config.config || '');
  let env = config.env;
  if (typeof env === 'string') {
    try { env = JSON.parse(env); } catch { env = {}; }
  }
  if (!env || typeof env !== 'object') env = {};
  const auth = config.auth && typeof config.auth === 'object' ? config.auth : {};
  const baseUrl = toml.match(/base_url\s*=\s*["']([^"']+)["']/i)?.[1]
    || env.OPENAI_BASE_URL
    || env.ANTHROPIC_BASE_URL
    || '';
  const model = toml.match(/^\s*model\s*=\s*["']([^"']+)["']/im)?.[1]
    || env.OPENAI_MODEL
    || env.ANTHROPIC_MODEL
    || (config.modelCatalog?.models?.[0]?.model)
    || '';
  const apiKey = auth.OPENAI_API_KEY || env.OPENAI_API_KEY || env.ANTHROPIC_API_KEY || env.ANTHROPIC_AUTH_TOKEN || '';
  const catalogModels = Array.isArray(config.modelCatalog?.models)
    ? config.modelCatalog.models.map(item => typeof item === 'string' ? item : item.model).filter(Boolean)
    : [];
  const models = [...new Set([model, ...catalogModels].filter(Boolean))];
  if (!baseUrl || !apiKey) return null;
  return {
    id: row.id,
    appType: row.app_type,
    name: row.name,
    baseUrl: baseUrl.replace(/\/+$/, ''),
    model,
    models,
    apiKey,
    current: !!row.is_current
  };
}

async function readCcSwitchProviders() {
  const dbPath = process.env.CC_SWITCH_DB || path.join(os.homedir(), '.cc-switch', 'cc-switch.db');
  if (!fs.existsSync(dbPath)) return { providers: [], source: null, error: '未找到 CC Switch 数据库' };
  const { DatabaseSync } = await import('node:sqlite');
  let db;
  try {
    db = new DatabaseSync(dbPath, { readOnly: true });
    const rows = db.prepare('SELECT id, app_type, name, settings_config, is_current FROM providers ORDER BY is_current DESC, sort_index ASC').all();
    return {
      providers: rows.map(parseProviderConfig).filter(Boolean),
      source: dbPath
    };
  } finally {
    db?.close();
  }
}

function localCredentialFile(automation = false) {
  return automation
    ? path.join(CREDENTIAL_DIR, 'automation-tests', 'credentials.json')
    : CREDENTIAL_FILE;
}

function readLocalCredentialStore(automation = false) {
  try {
    const parsed = JSON.parse(fs.readFileSync(localCredentialFile(automation), 'utf8'));
    return {
      version: 1,
      credentials: Array.isArray(parsed.credentials) ? parsed.credentials : []
    };
  } catch {
    return { version: 1, credentials: [] };
  }
}

function writeLocalCredentialStore(store, automation = false) {
  const file = localCredentialFile(automation);
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  fs.writeFileSync(file, JSON.stringify(store, null, 2), { encoding: 'utf8', mode: 0o600 });
}

function publicLocalCredential(credential) {
  const { apiKey, ...safe } = credential;
  return { ...safe, keyConfigured: Boolean(apiKey) };
}

function saveLocalCredential(body = {}) {
  const apiKey = String(body.apiKey || '').trim();
  const baseUrl = String(body.baseUrl || '').trim().replace(/\/+$/, '');
  const model = String(body.model || '').trim();
  const name = String(body.name || '手动配置').trim();
  if (!apiKey) throw new Error('缺少 API Key');
  if (!baseUrl) throw new Error('缺少 Base URL');
  if (!model) throw new Error('缺少模型名称');
  const automation = body.automation === true;
  const store = readLocalCredentialStore(automation);
  const requestedId = String(body.id || '').trim();
  let index = requestedId
    ? store.credentials.findIndex(item => item.id === requestedId)
    : store.credentials.findIndex(item => item.baseUrl === baseUrl && item.model === model);
  const now = Date.now();
  if (index < 0) {
    store.credentials.unshift({
      id: crypto.randomUUID(),
      name,
      baseUrl,
      model,
      apiKey,
      createdAt: now,
      updatedAt: now
    });
    index = 0;
  } else {
    store.credentials[index] = {
      ...store.credentials[index],
      name,
      baseUrl,
      model,
      apiKey,
      updatedAt: now
    };
  }
  store.credentials = store.credentials.slice(0, 20);
  writeLocalCredentialStore(store, automation);
  return publicLocalCredential(store.credentials[index]);
}

function deleteLocalCredential(id, automation = false) {
  const credentialId = String(id || '').trim();
  if (!credentialId) throw new Error('缺少凭据 ID');
  const store = readLocalCredentialStore(automation);
  const next = store.credentials.filter(item => item.id !== credentialId);
  writeLocalCredentialStore({ ...store, credentials: next }, automation);
  return { deleted: next.length !== store.credentials.length };
}

function publicCcSwitchProvider(provider) {
  const { apiKey, ...safe } = provider;
  return { ...safe, keyConfigured: Boolean(apiKey) };
}

async function resolveModelRequest(body = {}) {
  const localCredentialId = String(body.localCredentialId || '').trim();
  if (localCredentialId) {
    const credential = readLocalCredentialStore(body.automation === true).credentials
      .find(item => item.id === localCredentialId);
    if (!credential) {
      throw new Error('本地模型凭据不可用，请重新在 AI 设置中保存密钥');
    }
    return {
      baseUrl: credential.baseUrl,
      apiKey: credential.apiKey,
      model: String(body.model || credential.model || '').trim(),
      credentialName: credential.name
    };
  }
  const providerId = String(body.ccSwitchProviderId || '').trim();
  if (providerId) {
    const appType = String(body.ccSwitchAppType || '').trim();
    const data = await readCcSwitchProviders();
    const provider = data.providers.find(item =>
      item.id === providerId && (!appType || item.appType === appType));
    if (!provider) {
      throw new Error('CC Switch 配置不可用，请重新打开 AI 设置并导入供应商');
    }
    return {
      baseUrl: provider.baseUrl,
      apiKey: provider.apiKey,
      model: String(body.model || provider.model || '').trim(),
      providerName: provider.name
    };
  }
  return {
    baseUrl: String(body.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, ''),
    apiKey: String(body.apiKey || KEY || '').trim(),
    model: String(body.model || '').trim()
  };
}

const AUTHORITY_SOURCES = {
  fed: {
    title: 'Federal Reserve',
    description: '美国联邦储备系统负责货币政策、金融监管与支付系统，是美元利率和政策预期的一手来源。',
    url: 'https://www.federalreserve.gov/'
  },
  imf: {
    title: 'International Monetary Fund',
    description: 'IMF 提供全球经济、财政、金融稳定和跨境资本流动的官方分析。',
    url: 'https://www.imf.org/en/Publications'
  },
  bis: {
    title: 'Bank for International Settlements',
    description: 'BIS 聚焦中央银行、跨境银行、支付系统和金融稳定研究。',
    url: 'https://www.bis.org/'
  },
  ecb: {
    title: 'European Central Bank',
    description: '欧洲央行提供欧元区货币政策、金融稳定和银行监管的官方材料。',
    url: 'https://www.ecb.europa.eu/'
  },
  sec: {
    title: 'U.S. Securities and Exchange Commission',
    description: 'SEC 负责美国证券市场监管、披露要求和投资者保护。',
    url: 'https://www.sec.gov/'
  },
  worldBank: {
    title: 'World Bank Open Data',
    description: '世界银行提供发展、财政、贸易、基础设施和社会经济指标的国际可比数据。',
    url: 'https://data.worldbank.org/'
  },
  oecd: {
    title: 'OECD Data',
    description: 'OECD 提供成员国及主要经济体的经济、财政、就业、贸易和产业指标。',
    url: 'https://data.oecd.org/'
  }
};

const CLASSIFICATION_SOURCE_REGISTRY = {
  fed: {
    ...AUTHORITY_SOURCES.fed,
    key: 'fed',
    kind: 'official',
    scope: '货币政策、金融稳定、利率与支付'
  },
  imf: {
    ...AUTHORITY_SOURCES.imf,
    key: 'imf',
    kind: 'official',
    scope: '宏观、财政、金融稳定与国际经济'
  },
  bis: {
    ...AUTHORITY_SOURCES.bis,
    key: 'bis',
    kind: 'official',
    scope: '中央银行、银行、支付与金融稳定'
  },
  ecb: {
    ...AUTHORITY_SOURCES.ecb,
    key: 'ecb',
    kind: 'official',
    scope: '欧元区货币政策、银行监管与金融稳定'
  },
  sec: {
    ...AUTHORITY_SOURCES.sec,
    key: 'sec',
    kind: 'official',
    scope: '证券、披露、投资者保护与金融市场'
  },
  worldBank: {
    ...AUTHORITY_SOURCES.worldBank,
    key: 'worldBank',
    kind: 'official',
    scope: '发展、财政、贸易与基础设施指标'
  },
  oecd: {
    ...AUTHORITY_SOURCES.oecd,
    key: 'oecd',
    kind: 'official',
    scope: '经济、财政、就业、贸易与产业指标'
  },
  finra: {
    title: 'FINRA',
    description: '美国金融业监管局提供证券投资者教育、市场行为与合规资料。',
    url: 'https://www.finra.org/',
    key: 'finra',
    kind: 'official',
    scope: '证券投资者教育、市场行为与合规'
  },
  nasdaq: {
    title: 'Nasdaq',
    description: 'Nasdaq 提供市场词汇、交易与上市公司相关的市场资料。',
    url: 'https://www.nasdaq.com/',
    key: 'nasdaq',
    kind: 'official',
    scope: '市场词汇、证券交易与上市公司'
  },
  bea: {
    title: 'U.S. Bureau of Economic Analysis',
    description: 'BEA 提供国民账户、资本形成、贸易和经济统计口径。',
    url: 'https://www.bea.gov/',
    key: 'bea',
    kind: 'official',
    scope: '国民账户、资本形成、贸易与统计口径'
  },
  bls: {
    title: 'U.S. Bureau of Labor Statistics',
    description: 'BLS 提供物价、就业、工资、生产率与消费者支出统计。',
    url: 'https://www.bls.gov/',
    key: 'bls',
    kind: 'official',
    scope: '物价、就业、工资、生产率与消费者支出'
  },
  ifrs: {
    title: 'IFRS Foundation',
    description: 'IFRS 提供财务报表列报、现金流量和会计披露准则。',
    url: 'https://www.ifrs.org/',
    key: 'ifrs',
    kind: 'official',
    scope: '财务报表、现金流、会计确认与披露'
  },
  aea: {
    title: 'American Economic Association',
    description: 'AEA 提供经济学文献分类 JEL Codes 与学术研究入口。',
    url: 'https://www.aeaweb.org/',
    key: 'aea',
    kind: 'academic',
    scope: '经济学分类、金融经济学与研究方法'
  },
  nber: {
    title: 'National Bureau of Economic Research',
    description: 'NBER 提供经济学研究项目与工作论文分类。',
    url: 'https://www.nber.org/',
    key: 'nber',
    kind: 'academic',
    scope: '经济学研究项目、金融与产业分类'
  },
  crossref: {
    title: 'Crossref / DOI',
    description: 'Crossref 提供可验证的学术 DOI 元数据和出版记录。',
    url: 'https://www.crossref.org/',
    key: 'crossref',
    kind: 'academic',
    scope: '学术论文、DOI 与出版元数据'
  }
};

/* ---------- 路由 ---------- */
async function handleRequest(req, res) {
  const u = new URL(req.url, `http://${req.headers.host}`);
  let p;
  try {
    p = decodeURIComponent(u.pathname);
  } catch {
    res.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' });
    return res.end('invalid path');
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'access-control-allow-methods': 'GET,POST,OPTIONS' });
    return res.end();
  }

  if (p === '/api/health') {
    return json(res, 200, { ok: true, hasKey: !!KEY, node: process.version, ts: Date.now() });
  }

  if (p === '/api/revalidate-category' && req.method === 'POST') {
    try {
      const body = JSON.parse(await readBody(req, 6 * 1024 * 1024));
      const cards = Array.isArray(body.cards) ? body.cards.slice(0, 120) : [];
      if (!cards.length) throw new Error('没有需要核验的知识卡');
      const results = await revalidateKnowledgeCategories(cards, body.online !== false, body);
      return json(res, 200, {
        ok: true,
        results,
        coverage: Object.values(CLASSIFICATION_SOURCE_REGISTRY).map(source => ({
          key: source.key,
          title: source.title,
          scope: source.scope,
          url: source.url,
          kind: source.kind
        }))
      });
    } catch (e) {
      return json(res, 400, { ok: false, error: String(e.message || e) });
    }
  }

  if (p === '/api/pdf' && req.method === 'POST') {
    try {
      const body = JSON.parse(await readBody(req, 20 * 1024 * 1024));
      const { buffer, filename } = await renderHtmlToPdf(body.html, body.name);
      const fallbackName = filename.replace(/[^\x20-\x7E]/g, '_');
      res.writeHead(200, {
        'content-type': 'application/pdf',
        'content-length': buffer.length,
        'content-disposition': `attachment; filename="${fallbackName}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        'cache-control': 'no-store'
      });
      return res.end(buffer);
    } catch (e) {
      return json(res, 400, { ok: false, error: String(e.message || e) });
    }
  }

  if (p === '/api/feed' && req.method === 'POST') {
    try {
      const body = JSON.parse(await readBody(req));
      const result = await fetchFeedItems(body);
      return json(res, 200, { ok: true, ...result });
    } catch (e) {
      return json(res, 400, { ok: false, error: String(e.message || e) });
    }
  }

  if (p === '/api/models' && req.method === 'POST') {
    try {
      const body = JSON.parse(await readBody(req));
      return json(res, 200, { ok: true, models: await listModels(body) });
    } catch (e) {
      return json(res, 400, { ok: false, error: String(e.message || e) });
    }
  }

  if (p === '/api/test-model' && req.method === 'POST') {
    try {
      const body = JSON.parse(await readBody(req));
      return json(res, 200, { ok: true, ...(await testModelConnection(body)) });
    } catch (e) {
      return json(res, 400, { ok: false, error: String(e.message || e) });
    }
  }

  if (p === '/api/github-epub' && req.method === 'GET') {
    const resourcePath = String(u.searchParams.get('path') || '').replace(/\\/g, '/');
    if (resourcePath.includes('..') ||
        !/^01_economist\/(?:\d{4}\/)?te_\d{4}\.\d{2}\.\d{2}\/[^/]+\.epub$/i.test(resourcePath)) {
      return json(res, 400, { ok: false, error: 'EPUB 路径无效' });
    }
    try {
      const cacheDir = path.join(DATA_ROOT, 'cache', 'github');
      fs.mkdirSync(cacheDir, { recursive: true });
      const cacheFile = path.join(cacheDir, crypto.createHash('sha1').update(resourcePath).digest('hex') + '.epub');
      const rawUrl = 'https://cdn.jsdelivr.net/gh/hehonghui/awesome-english-ebooks@master/' +
        resourcePath.split('/').map(encodeURIComponent).join('/');
      let buffer;
      if (fs.existsSync(cacheFile)) {
        buffer = fs.readFileSync(cacheFile);
      } else {
        const response = await fetch(rawUrl, {
          headers: { 'user-agent': 'FinLens/1.0', 'accept-encoding': 'identity' },
          signal: AbortSignal.timeout(120000)
        });
        if (!response.ok) throw new Error(`GitHub 文件返回 ${response.status}`);
        buffer = Buffer.from(await response.arrayBuffer());
        fs.writeFileSync(cacheFile, buffer);
      }
      if (buffer.length > 20 * 1024 * 1024) throw new Error('EPUB 文件超过 20MB');
      const parsed = await extractEpubChapters(buffer);
      return json(res, 200, { ok: true, path: resourcePath, ...parsed });
    } catch (e) {
      return json(res, 502, { ok: false, error: githubErrorMessage(e, 'EPUB 下载或解析失败') });
    }
  }

  if (p === '/api/github-resource' && req.method === 'GET') {
    const key = String(u.searchParams.get('key') || '');
    const resources = {
      awesome: {
        owner: 'hehonghui',
        repo: 'awesome-english-ebooks',
        path: '01_economist',
        branch: 'master',
        description: '经济学人等英文电子书目录，适合离线阅读与导入。'
      }
    };
    const resource = resources[key];
    if (!resource) return json(res, 400, { ok: false, error: '未知 GitHub 资源' });
    const requestedPath = key === 'awesome'
      ? String(u.searchParams.get('path') || resource.path).replace(/\\/g, '/')
      : resource.path;
    if (key === 'awesome' &&
        (requestedPath.includes('..') ||
         (requestedPath !== '01_economist' && !requestedPath.startsWith('01_economist/')))) {
      return json(res, 400, { ok: false, error: 'GitHub 资源路径无效' });
    }
    try {
      const apiUrl = `https://api.github.com/repos/${resource.owner}/${resource.repo}/contents/${requestedPath}?ref=${resource.branch}`;
      const response = await fetch(apiUrl, {
        headers: {
          accept: 'application/vnd.github+json',
          'user-agent': 'FinLens/1.0'
        },
        signal: AbortSignal.timeout(20000)
      });
      if (!response.ok) throw new Error(`GitHub 返回 ${response.status}`);
      const payload = await response.json();
      return json(res, 200, {
        ok: true,
        ...resource,
        path: requestedPath,
        htmlUrl: `https://github.com/${resource.owner}/${resource.repo}/blob/${resource.branch}/${requestedPath}`,
        items: payload
      });
    } catch (e) {
      return json(res, 502, { ok: false, error: githubErrorMessage(e) });
    }
  }

  if (p === '/api/dictionary' && req.method === 'POST') {
    try {
      const body = JSON.parse(await readBody(req));
      return json(res, 200, { ok: true, result: await explainWord(body) });
    } catch (e) {
      return json(res, 400, { ok: false, error: String(e.message || e) });
    }
  }

  if (p === '/api/tts' && req.method === 'POST') {
    try {
      const body = JSON.parse(await readBody(req));
      const audio = await synthesizeSpeech(body);
      res.writeHead(200, {
        'content-type': audio.contentType,
        'content-length': audio.buffer.length,
        'cache-control': 'no-store'
      });
      return res.end(audio.buffer);
    } catch (e) {
      return json(res, 400, { ok: false, error: String(e.message || e) });
    }
  }

  if (p === '/api/document' && req.method === 'POST') {
    try {
      const body = JSON.parse(await readBody(req));
      const buffer = Buffer.from(String(body.data || ''), 'base64');
      if (!buffer.length) throw new Error('上传文件为空');
      const ext = path.extname(String(body.name || '')).toLowerCase();
      const title = path.basename(String(body.name || '上传文档'), ext);
      let paragraphs;
      if (ext === '.docx') paragraphs = extractDocxText(buffer);
      else if (ext === '.pdf') paragraphs = await extractPdfText(buffer);
      else if (ext === '.html' || ext === '.htm') paragraphs = extractParagraphs(buffer.toString('utf8')).paragraphs;
      else if (ext === '.txt' || ext === '.md') {
        paragraphs = buffer.toString('utf8')
          .replace(/â€™|â€˜/g, "'")
          .replace(/â€œ|â€/g, '"')
          .replace(/â€”/g, '—').replace(/â€“/g, '–')
          .replace(/Â/g, '')
          .split(/\n\s*\n|\n/)
          .map(line => line.trim())
          .filter(line => line.length > 25);
      } else {
        throw new Error('支持 TXT、Markdown、HTML、DOCX 和 PDF 文件');
      }
      if (!paragraphs.length) throw new Error('未从文档中提取到足够正文');
      paragraphs = validateArticleContent(paragraphs, title);
      return json(res, 200, { ok: true, title, paragraphs });
    } catch (e) {
      return json(res, 400, { ok: false, error: String(e.message || e) });
    }
  }

  if (p === '/api/credentials' && req.method === 'GET') {
    const automation = u.searchParams.get('automation') === '1';
    return json(res, 200, {
      ok: true,
      credentials: readLocalCredentialStore(automation).credentials.map(publicLocalCredential)
    });
  }

  if (p === '/api/credentials' && req.method === 'POST') {
    try {
      const body = JSON.parse(await readBody(req));
      return json(res, 200, { ok: true, credential: saveLocalCredential(body) });
    } catch (e) {
      return json(res, 400, { ok: false, error: String(e.message || e) });
    }
  }

  if (p === '/api/credentials' && req.method === 'DELETE') {
    try {
      return json(res, 200, {
        ok: true,
        ...deleteLocalCredential(
          u.searchParams.get('id'),
          u.searchParams.get('automation') === '1')
      });
    } catch (e) {
      return json(res, 400, { ok: false, error: String(e.message || e) });
    }
  }

  if (p === '/api/cc-switch' && req.method === 'GET') {
    try {
      const data = await readCcSwitchProviders();
      return json(res, 200, {
        ok: true,
        ...data,
        providers: (data.providers || []).map(publicCcSwitchProvider)
      });
    } catch (e) {
      return json(res, 400, { ok: false, error: String(e.message || e), providers: [] });
    }
  }

  if (p === '/api/recovery/latest' && req.method === 'GET') {
    try {
      if (u.searchParams.get('automation') === '1' && !ALLOW_AUTOMATION_RECOVERY) {
        return json(res, 200, { ok: true, backup: null });
      }
      const names = fs.existsSync(BACKUP_DIR)
        ? fs.readdirSync(BACKUP_DIR)
            .filter(name => name.endsWith('.json'))
            .sort()
            .reverse()
        : [];
      for (const name of names.slice(0, 20)) {
        try {
          const file = path.join(BACKUP_DIR, name);
          const backup = JSON.parse(fs.readFileSync(file, 'utf8'));
          if (!backup || typeof backup !== 'object' || !backup.settings || !backup.words) continue;
          const hasLearningData =
            (Array.isArray(backup.custom) && backup.custom.length) ||
            Object.keys(backup.words || {}).length ||
            Object.keys(backup.read || {}).length ||
            Object.keys(backup.marks || {}).length ||
            Object.keys(backup.summaries || {}).length ||
            Object.keys(backup.tutor || {}).length ||
            Object.keys(backup.knowledgeTutor || {}).length ||
            (Array.isArray(backup.exportArchive) && backup.exportArchive.length);
          if (!hasLearningData) continue;
          backup.settings = {
            ...(backup.settings || {}),
            apiKey: '',
            mwApiKey: '',
            ccSwitchProviderId: '',
            ccSwitchAppType: '',
            localCredentialId: ''
          };
          return json(res, 200, { ok: true, name, backup });
        } catch {}
      }
      return json(res, 200, { ok: true, backup: null });
    } catch (e) {
      return json(res, 400, { ok: false, error: String(e.message || e) });
    }
  }

  if (p === '/api/recovery/articles' && req.method === 'GET') {
    try {
      if (u.searchParams.get('automation') === '1') {
        return json(res, 200, { ok: true, articles: [] });
      }
      const recoveryDir = BACKUP_DIR;
      const names = fs.existsSync(recoveryDir)
        ? fs.readdirSync(recoveryDir)
            .filter(name => name.endsWith('.json'))
            .sort()
            .reverse()
        : [];
      const ids = new Set();
      const urls = new Set();
      const articles = [];
      for (const name of names.slice(0, 20)) {
        try {
          const backup = JSON.parse(fs.readFileSync(path.join(recoveryDir, name), 'utf8'));
          for (const article of Array.isArray(backup?.custom) ? backup.custom : []) {
            const id = String(article?.id || '').trim();
            const url = String(article?._url || '').trim();
            if (!id || !article?.title || ids.has(id) || (url && urls.has(url))) continue;
            ids.add(id);
            if (url) urls.add(url);
            articles.push(article);
            if (articles.length >= 100) break;
          }
          if (articles.length >= 100) break;
        } catch {}
      }
      return json(res, 200, { ok: true, articles });
    } catch (e) {
      return json(res, 400, { ok: false, error: String(e.message || e), articles: [] });
    }
  }

  if (p === '/api/backup' && req.method === 'POST') {
    try {
      const body = JSON.parse(await readBody(req));
      if (!body || typeof body !== 'object') throw new Error('备份数据格式无效');
      if (body.settings) {
        body.settings.apiKey = '';
        body.settings.mwApiKey = '';
      }
      const backupDir = u.searchParams.get('automation') === '1'
        ? path.join(BACKUP_DIR, 'automation-tests')
        : BACKUP_DIR;
      fs.mkdirSync(backupDir, { recursive: true });
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const file = path.join(backupDir, `finlens-${stamp}.json`);
      fs.writeFileSync(file, JSON.stringify(body, null, 2), 'utf8');
      const backups = fs.readdirSync(backupDir).filter(name => name.endsWith('.json')).sort().reverse();
      backups.slice(20).forEach(name => {
        try { fs.unlinkSync(path.join(backupDir, name)); } catch {}
      });
      const relativeDataPath = path.relative(DATA_ROOT, file);
      const publicPath = relativeDataPath.startsWith('..') || path.isAbsolute(relativeDataPath)
        ? file
        : `data/${relativeDataPath.split(path.sep).join('/')}`;
      return json(res, 200, { ok: true, path: publicPath, ts: Date.now() });
    } catch (e) {
      return json(res, 400, { ok: false, error: String(e.message || e) });
    }
  }

  if (p === '/api/fetch') {
    const target = u.searchParams.get('url');
    if (!target) return json(res, 400, { ok: false, error: '缺少 url 参数' });
    try {
      const isWechat = /^https?:\/\/mp\.weixin\.qq\.com\//i.test(target);
      const r = await fetch(target, {
        headers: {
          'user-agent': 'Mozilla/5.0 (compatible; FinLens/1.0) AppleWebKit/537.36 Chrome/120 Safari/537.36',
          'accept-language': isWechat ? 'zh-CN,zh;q=0.9,en;q=0.7' : 'en-US,en;q=0.9',
          ...(isWechat ? { referer: 'https://mp.weixin.qq.com/' } : {})
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
      });
      if (!r.ok) throw new Error('抓取失败 HTTP ' + r.status);
      const html = await r.text();
      if (isWechat && /环境异常|访问过于频繁|完成验证/.test(html)) {
        throw new Error('微信公众号触发访问验证，请粘贴正文或使用 RSS 桥接');
      }
      const out = extractParagraphs(html);
      if (!out.paragraphs.length) throw new Error('未能从该页面提取到正文（可能需登录、付费墙或反爬验证）');
      out.paragraphs = validateArticleContent(out.paragraphs, out.title);
      const kind = isWechat || /id=["']js_content["']/i.test(html) ? 'wechat' : 'article';
      return json(res, 200, { ok: true, ...out, kind });
    } catch (e) {
      return json(res, 502, { ok: false, error: String(e.message || e) });
    }
  }

  if (p === '/api/annotate' && req.method === 'POST') {
    try {
      const body = JSON.parse(await readBody(req));
      const art = await annotate(body);
      return json(res, 200, { ok: true, article: art });
    } catch (e) {
      return json(res, 400, { ok: false, error: String(e.message || e) });
    }
  }

  if (p === '/api/vocab-focus' && req.method === 'POST') {
    try {
      const body = JSON.parse(await readBody(req));
      const result = await generateVocabulary(body);
      return json(res, 200, { ok: true, ...result });
    } catch (e) {
      return json(res, 400, { ok: false, error: String(e.message || e) });
    }
  }

  if (p === '/api/focus-refresh' && req.method === 'POST') {
    try {
      const body = JSON.parse(await readBody(req));
      const result = await generateFocusRefresh(body);
      return json(res, 200, { ok: true, ...result });
    } catch (e) {
      return json(res, 400, { ok: false, error: String(e.message || e) });
    }
  }

  if (p === '/api/annotate-stream' && req.method === 'POST') {
    res.writeHead(200, {
      'content-type': 'application/x-ndjson; charset=utf-8',
      'cache-control': 'no-store'
    });
    const send = event => res.write(JSON.stringify(event) + '\n');
    try {
      const body = JSON.parse(await readBody(req));
      const article = await annotate(body, progress => send({ type: 'progress', ...progress }));
      send({ type: 'result', ok: true, article });
    } catch (e) {
      send({ type: 'result', ok: false, error: String(e.message || e) });
    }
    return res.end();
  }

  if (p === '/api/summary' && req.method === 'POST') {
    try {
      const body = JSON.parse(await readBody(req));
      const summary = await summarizeArticle(body);
      return json(res, 200, { ok: true, summary });
    } catch (e) {
      return json(res, 400, { ok: false, error: String(e.message || e) });
    }
  }

  if (p === '/api/mind-map' && req.method === 'POST') {
    try {
      const body = JSON.parse(await readBody(req));
      const mindMap = await generateMindMap(body);
      return json(res, 200, { ok: true, mindMap });
    } catch (e) {
      return json(res, 400, { ok: false, error: String(e.message || e) });
    }
  }

  if (p === '/api/ask' && req.method === 'POST') {
    try {
      const body = JSON.parse(await readBody(req));
      const result = await askArticle(body);
      return json(res, 200, { ok: true, result });
    } catch (e) {
      return json(res, 400, { ok: false, error: String(e.message || e) });
    }
  }

  if (p === '/api/knowledge' && req.method === 'POST') {
    try {
      const body = JSON.parse(await readBody(req));
      return json(res, 200, { ok: true, result: await generateKnowledgeDetail(body) });
    } catch (e) {
      return json(res, 400, { ok: false, error: String(e.message || e) });
    }
  }

  // 静态文件
  if (p.startsWith('/data/backups/') ||
      p.startsWith('/data/cache/') ||
      p.startsWith('/data/credentials/') ||
      p.startsWith('/data/dictionary/')) {
    res.writeHead(403);
    return res.end('forbidden');
  }
  const rel = p === '/' ? 'index.html' : p.replace(/^\/+/, '');
  const file = path.resolve(APP_ROOT, rel);
  const relative = path.relative(APP_ROOT, file);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    res.writeHead(403);
    return res.end('forbidden');
  }
  fs.readFile(file, (err, buf) => {
    if (err) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      return res.end('404 ' + rel);
    }
    res.writeHead(200, {
      'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'cache-control': 'no-cache'
    });
    res.end(buf);
  });
}

export async function startFinLensServer(options = {}) {
  configureRuntimePaths(options);
  const host = options.host || '127.0.0.1';
  const port = Number.isInteger(options.port) ? options.port : PORT;
  const server = http.createServer(handleRequest);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, resolve);
  });
  const address = server.address();
  const actualPort = typeof address === 'object' && address ? address.port : port;
  return {
    url: `http://${host}:${actualPort}`,
    port: actualPort,
    close: () => new Promise((resolve, reject) => {
      server.close(error => {
        if (error) {
          reject(error);
          return;
        }
        try {
          ecdictDb?.close();
          ecdictDb = undefined;
          ecdictUnavailable = false;
        } catch {}
        resolve();
      });
    })
  };
}

export {
  VOCAB_FOCUS_GUIDE,
  buildPrompt,
  buildCompactPrompt,
  buildVocabularyPrompt,
  buildCompactVocabularyPrompt,
  buildAnalysisPrompt,
  buildCompactAnalysisPrompt,
  buildMindMapPrompt,
  normalizeMindMap
};

const isDirectRun = process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  startFinLensServer({ port: PORT })
    .then(instance => {
      console.log(`FinLens 工作台已启动： ${instance.url}`);
      console.log(`引擎 Key：${KEY ? '已通过环境变量配置' : '未配置（离线模式可用，在线标注需在页面设置中填 Key）'}`);
    })
    .catch(error => {
      console.error(error);
      process.exitCode = 1;
    });
}
