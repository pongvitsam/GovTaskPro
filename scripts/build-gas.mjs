import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import { gzipSync } from 'zlib';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const distHtml = join(root, 'dist-gas', 'index.html');
const gasDir = join(root, 'gas');
const outIndex = join(gasDir, 'Index.html');

/** gzip + base64 stays HTML-safe and much smaller than raw/base64 JS */
const B64_CHUNK = 45 * 1024;

mkdirSync(gasDir, { recursive: true });

for (const name of readdirSync(gasDir)) {
  if (/^AppJs\d+\.html$/i.test(name) || name === 'Stylesheet.html' || name === 'Boot.html') {
    unlinkSync(join(gasDir, name));
  }
}

let html = readFileSync(distHtml, 'utf8');
html = html.replace(/<script\s+type="module"\s+crossorigin>/g, '<script>');
html = html.replace(/<script\s+type="module">/g, '<script>');

const openRe = /<script\b([^>]*)>/i;
const openMatch = openRe.exec(html);
if (!openMatch) throw new Error('No <script> found in dist/index.html');

const openAttr = openMatch[1] || '';
const openIdx = openMatch.index;
const openEnd = openIdx + openMatch[0].length;
if (/\bsrc\s*=/.test(openAttr)) throw new Error('Expected inlined script bundle, found external src');

const closeIdx = html.lastIndexOf('</script>');
if (closeIdx < openEnd) throw new Error('No closing </script> found');

const scriptInner = html.slice(openEnd, closeIdx);

let styleInner = '';
const styleMatch = html.match(/<style\b[^>]*>([\s\S]*?)<\/style>/i);
if (styleMatch) {
  styleInner = styleMatch[1].replace(/<\/style/gi, '<\\/style');
}

const gz = gzipSync(Buffer.from(scriptInner, 'utf8'), { level: 9 });
const b64 = gz.toString('base64');
const chunks = [];
for (let i = 0; i < b64.length; i += B64_CHUNK) {
  chunks.push(b64.slice(i, i + B64_CHUNK));
}
if (chunks.length === 0) chunks.push('');

const appJsNames = [];
chunks.forEach((chunk, i) => {
  const name = `AppJs${i + 1}`;
  appJsNames.push(name);
  const part = `<script>window.__GTP_B64=(window.__GTP_B64||'')+"${chunk}";</script>`;
  writeFileSync(join(gasDir, `${name}.html`), part, 'utf8');
});

writeFileSync(
  join(gasDir, 'Boot.html'),
  `<script>
(function(){
  function bootFail(err){
    var el=document.getElementById('root');
    if(el) el.innerHTML='<div style="font-family:sans-serif;padding:2rem;text-align:center;color:#b91c1c">โหลดแอพไม่สำเร็จ<br><small>'+String(err&&err.message||err)+'</small></div>';
    console.error(err);
  }
  try {
    var b64=window.__GTP_B64||'';
    delete window.__GTP_B64;
    var bin=atob(b64);
    var bytes=new Uint8Array(bin.length);
    for (var i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
    if (typeof DecompressionStream === 'undefined') {
      bootFail(new Error('เบราว์เซอร์ไม่รองรับ DecompressionStream'));
      return;
    }
    var stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    new Response(stream).arrayBuffer().then(function(buf){
      var js=new TextDecoder('utf-8').decode(buf);
      (0,eval)(js);
    }).catch(bootFail);
  } catch (err) { bootFail(err); }
})();
</script>`,
  'utf8'
);

if (styleInner) {
  writeFileSync(join(gasDir, 'Stylesheet.html'), `<style>\n${styleInner}\n</style>`, 'utf8');
}

const styleInclude = styleInner ? `    <?!= include('Stylesheet'); ?>` : '';
const jsIncludes = [
  ...appJsNames.map((n) => `    <?!= include('${n}'); ?>`),
  `    <?!= include('Boot'); ?>`,
].join('\n');

const indexHtml = `<!DOCTYPE html>
<html lang="th">
  <head>
    <base target="_top">
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>GovTaskPro</title>
${styleInclude}
  </head>
  <body>
    <div id="root"></div>
${jsIncludes}
  </body>
</html>
`;

writeFileSync(outIndex, indexHtml, 'utf8');

const sizes = appJsNames.map((n) => {
  const len = readFileSync(join(gasDir, `${n}.html`), 'utf8').length;
  return `${n}=${Math.round(len / 1024)}KB`;
});

console.log(
  `Wrote Index + Stylesheet + Boot + ${appJsNames.length} gzip chunks ` +
  `(${Math.round(gz.length / 1024)} KB gz / ${Math.round(b64.length / 1024)} KB b64 / ${Math.round(scriptInner.length / 1024)} KB js): ${sizes.join(', ')}`
);

for (const n of appJsNames) {
  const content = readFileSync(join(gasDir, `${n}.html`), 'utf8');
  const payload = content.replace(/^<script>/, '').replace(/<\/script>$/, '');
  if (payload.includes('<')) {
    throw new Error(`${n}.html payload contains "<"`);
  }
  if (content.length > 90 * 1024) {
    throw new Error(`${n}.html is too large (${Math.round(content.length / 1024)} KB)`);
  }
}
