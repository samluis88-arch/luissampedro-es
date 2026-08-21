// Build mínimo: sustituye <!-- INCLUDE:nombre --> por src/partials/nombre.html
// y copia css/assets/static a dist/. Sin dependencias.

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');

const PAGES_DIR = path.join(SRC, 'pages');
const PARTIALS_DIR = path.join(SRC, 'partials');

function clearDir(dir) {
  // No borramos la carpeta en sí (en Windows/OneDrive puede quedar con el
  // directorio bloqueado tras crearlo). Vaciamos su contenido en su lugar.
  fs.mkdirSync(dir, { recursive: true });
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    fs.rmSync(p, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
  }
}

function copyDir(from, to) {
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dest = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(src, dest);
    else fs.copyFileSync(src, dest);
  }
}

function resolveIncludes(html, seen) {
  return html.replace(/<!--\s*INCLUDE:([a-z0-9-]+)\s*-->/gi, (match, name) => {
    if (seen.has(name)) {
      throw new Error(`Include circular o repetido: ${name}`);
    }
    const partialPath = path.join(PARTIALS_DIR, `${name}.html`);
    if (!fs.existsSync(partialPath)) {
      throw new Error(`Parcial no encontrado: ${name} (${partialPath})`);
    }
    const partialHtml = fs.readFileSync(partialPath, 'utf8');
    return resolveIncludes(partialHtml, new Set(seen).add(name));
  });
}

function build() {
  clearDir(DIST);

  // Páginas
  const pageFiles = fs.readdirSync(PAGES_DIR).filter(f => f.endsWith('.html'));
  for (const file of pageFiles) {
    const raw = fs.readFileSync(path.join(PAGES_DIR, file), 'utf8');
    const resolved = resolveIncludes(raw, new Set());

    const name = path.basename(file, '.html');
    const outPath = name === 'index'
      ? path.join(DIST, 'index.html')
      : path.join(DIST, name, 'index.html');

    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, resolved, 'utf8');
    console.log(`✓ ${file} -> ${path.relative(ROOT, outPath)}`);
  }

  // Estáticos
  copyDir(path.join(SRC, 'css'), path.join(DIST, 'css'));
  copyDir(path.join(SRC, 'assets'), path.join(DIST, 'assets'));
  copyDir(path.join(SRC, 'static'), DIST); // favicon.ico, preview.jpg, robots.txt, sitemap.xml en la raíz

  console.log('Build completo.');
}

build();
