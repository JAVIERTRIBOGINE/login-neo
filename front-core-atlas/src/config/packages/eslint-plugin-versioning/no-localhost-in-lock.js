'use strict';

/**
 * @fileoverview ESLint custom rule: no-localhost-in-lock
 *
 * Detecta URLs que contengan "localhost" en lock files:
 *   - package-lock.json  (JSON parseado internamente, campo "resolved")
 *   - pnpm-lock.yaml     (texto plano, campo "tarball")
 *
 * Contexto: Verdaccio puede estar configurado temporalmente apuntando a un
 * registry local (localhost) durante el desarrollo. Si ese estado llega al
 * repositorio remoto, los pipelines de CI/CD fallarán al intentar resolver
 * paquetes desde una dirección inaccesible.
 *
 * Usa el parser `parsers/plain-text` — no requiere jsonc-eslint-parser ni yaml-eslint-parser.
 */

const LOCALHOST_PATTERN = /localhost(:\d+)?/i;

/**
 * Devuelve { line, column } de la primera aparición de `search` en `source`.
 * @param {string} source
 * @param {string} search
 * @returns {{ line: number, column: number } | null}
 */
function findStringLocation(source, search) {
  const idx = source.indexOf(search);
  if (idx < 0) return null;
  const before = source.slice(0, idx);
  const lines = before.split('\n');
  return { line: lines.length, column: lines[lines.length - 1].length };
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Prohíbe URLs que apunten a localhost en los lock files (package-lock.json, pnpm-lock.yaml). ' +
        'Indica que Verdaccio u otro registry local está referenciado, lo que romperá ' +
        'la resolución de paquetes en entornos remotos (CI/CD, otros desarrolladores).',
      category: 'Versioning',
      recommended: true
    },
    messages: {
      localhostUrlFound:
        '[no-localhost-in-lock] La dependencia "{{dep}}" (versión {{version}}) contiene una URL ' +
        'apuntando a localhost: "{{url}}". Las URLs de tipo localhost no son válidas en el ' +
        'repositorio remoto. Regenera el package-lock.json apuntando al registry oficial de Verdaccio.',
      localhostUrlFoundInPnpmLock:
        '[no-localhost-in-lock] El paquete "{{dep}}" tiene una URL de localhost en pnpm-lock.yaml: "{{url}}". ' +
        'Regenera el lockfile apuntando al registry oficial de Verdaccio.'
    },
    schema: []
  },

  create(context) {
    const filename = typeof context.getFilename === 'function' ? context.getFilename() : context.filename;

    // ── package-lock.json (JSON parseado internamente) ────────────────────────
    if (filename.endsWith('package-lock.json')) {
      return {
        'Program:exit'(programNode) {
          const src = typeof context.getSourceCode === 'function' ? context.getSourceCode() : context.sourceCode;
          const text = src.getText();

          let lock;
          try {
            lock = JSON.parse(text);
          } catch {
            return;
          }

          const packages = lock.packages ?? {};
          for (const [pkgPath, pkgInfo] of Object.entries(packages)) {
            if (!pkgInfo || typeof pkgInfo !== 'object') continue;
            const url = pkgInfo.resolved ?? '';
            if (!url || !LOCALHOST_PATTERN.test(url)) continue;

            const dep = pkgPath.replace(/^.*node_modules\//, '') || pkgPath;
            const version = pkgInfo.version ?? '<desconocida>';
            const loc = findStringLocation(text, url);

            context.report({
              node: programNode,
              loc: loc ?? programNode.loc.start,
              messageId: 'localhostUrlFound',
              data: { dep, version, url }
            });
          }
        }
      };
    }

    // ── pnpm-lock.yaml (texto plano) ──────────────────────────────────────────
    if (filename.endsWith('pnpm-lock.yaml')) {
      return {
        'Program:exit'(programNode) {
          const src = typeof context.getSourceCode === 'function' ? context.getSourceCode() : context.sourceCode;
          const lines = src.getText().split('\n');

          // Captura: tarball: http://localhost:... (con o sin comillas)
          const TARBALL_LOCALHOST_RE = /tarball:\s+['"]?(https?:\/\/localhost[^'"\s]*)/i;

          lines.forEach((line, i) => {
            const match = TARBALL_LOCALHOST_RE.exec(line);
            if (!match) return;

            const url = match[1];
            context.report({
              node: programNode,
              loc: { line: i + 1, column: line.indexOf(url) },
              messageId: 'localhostUrlFoundInPnpmLock',
              data: { dep: '<desconocido>', url }
            });
          });
        }
      };
    }

    return {};
  }
};
