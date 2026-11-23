// Regenerates src/i18n/<lang>.json from src/i18n/en.json with Sarvam AI.
// Usage: SARVAM_API_KEY=... node scripts/translate-ui.mjs [lang ...]
// Only keys missing from a language file are translated, so hand-fixed strings are kept.
import fs from 'node:fs';
import path from 'node:path';

const KEY = process.env.SARVAM_API_KEY;
if (!KEY) { console.error('Set SARVAM_API_KEY'); process.exit(1); }
const dir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../src/i18n');
const en = JSON.parse(fs.readFileSync(path.join(dir, 'en.json'), 'utf8'));
const LANGS = { hi: 'Hindi', bn: 'Bengali', ta: 'Tamil', te: 'Telugu', mr: 'Marathi', gu: 'Gujarati', kn: 'Kannada',
  ml: 'Malayalam', pa: 'Punjabi', od: 'Odia', as: 'Assamese', ur: 'Urdu' };
const wanted = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(LANGS);

const placeholders = (s) => (s.match(/\{\w+\}/g) || []).sort().join(',');

async function post(url, body) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await fetch(url, { method: 'POST', headers: { 'api-subscription-key': KEY, 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (r.ok) return r.json();
    if (r.status < 500 && r.status !== 429) throw new Error(`${r.status} ${await r.text()}`);
    await new Promise((res) => setTimeout(res, 1500 * (attempt + 1)));
  }
  throw new Error('Sarvam kept failing');
}

async function chunk(langName, entries) {
  const sys = `You translate the user interface of a B2B sales CRM used by Indian sales teams into ${langName}. `
    + `Write every value in ${langName} script, short and natural like a button or label in a well-made Indian app. `
    + 'Only these terms stay in Latin letters: CRM, SQL, SQLs, BANT, ICP, L1, L2, L3, AE, BDR, CFO, FBP, IST, ICP. Translate every other English word. "Save" means saving a form, never saving money; "Log" means record. '
    + 'Keep every placeholder like {n} or {name} exactly as is. Reply with one JSON object with the same keys and nothing else.';
  const res = await post('https://api.sarvam.ai/v1/chat/completions', {
    model: 'sarvam-105b', temperature: 0, max_tokens: 4000, reasoning_effort: null,
    messages: [{ role: 'system', content: sys }, { role: 'user', content: JSON.stringify(Object.fromEntries(entries), null, 1) }],
  });
  const txt = res.choices?.[0]?.message?.content ?? '';
  const m = txt.match(/\{[\s\S]*\}/);
  return m ? JSON.parse(m[0].replace(/[\u0000-\u001f]+/g, ' ')) : {};
}

async function single(code, text) {
  const target = `${code === 'od' ? 'od' : code}-IN`;
  const r = await post('https://api.sarvam.ai/translate', { input: text, source_language_code: 'en-IN', target_language_code: target, model: 'sarvam-translate:v1' });
  return r.translated_text;
}

for (const code of wanted) {
  const file = path.join(dir, `${code}.json`);
  const out = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  const todo = Object.entries(en).filter(([k]) => !(k in out));
  for (let i = 0; i < todo.length; i += 20) {
    const part = todo.slice(i, i + 20);
    let got = {};
    try { got = await chunk(LANGS[code], part); } catch (e) { console.warn(code, 'chunk failed:', e.message); }
    for (const [k, v] of part) {
      let t = typeof got[k] === 'string' ? got[k].trim() : '';
      const untranslated = t && /[a-z]{4,}/i.test(v) && t.replace(/\{\w+\}/g, '') === v.replace(/\{\w+\}/g, '');
      if (!t || untranslated || placeholders(t) !== placeholders(v)) {
        try { t = await single(code, v); } catch { t = ''; }
        const untranslated = t && /[a-z]{4,}/i.test(v) && t.replace(/\{\w+\}/g, '') === v.replace(/\{\w+\}/g, '');
      if (!t || untranslated || placeholders(t) !== placeholders(v)) { console.warn(code, 'kept English for', k); continue; }
      }
      out[k] = t;
    }
  }
  const ordered = Object.fromEntries(Object.keys(en).filter((k) => k in out).map((k) => [k, out[k]]));
  fs.writeFileSync(file, JSON.stringify(ordered, null, 2) + '\n');
  console.log(code, Object.keys(ordered).length, '/', Object.keys(en).length);
}
