'use strict';

/**
 * @fileoverview ESLint custom rule: no-dev-version
 *
 * Detecta versiones con el patrón `.dev.<número>` en las dependencias
 * definidas en package.json.
 *
 * Contexto: Verdaccio gestiona la sincronización de versiones con Artefactory.
 * Una versión con `.dev.<número>` indica un artefacto de desarrollo local
 * que no debe llegar al repositorio remoto.
 *
 * Ejemplo de versión inválida: "1.2.3.dev.1698765432123"
 *
 * Usa el parser `parsers/plain-text` — no requiere jsonc-eslint-parser.
 */

// Captura versiones generadas por Verdaccio: "1.2.3-dev.1698765432123" o "1.2.3.dev.1698765432123"
const DEV_VERSION_PATTERN = /[.-]dev\.\d+/;
const DEPENDENCY_FIELDS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];

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
        'Prohíbe versiones con sufijo .dev.<número> en las dependencias del package.json. ' +
        'Estas versiones son artefactos de desarrollo local no válidos para publicar.',
      category: 'Versioning',
      recommended: true
    },
    messages: {
      devVersionFound:
        '[no-dev-version] La dependencia "{{dep}}" tiene una versión no válida: "{{version}}". ' +
        'Las versiones con sufijo .dev.<número> son artefactos de desarrollo local y no deben ' +
        'estar presentes al hacer commit. Reemplázala por una versión estable.'
    },
    schema: [
      {
        type: 'object',
        properties: {
          dependencyFields: {
            type: 'array',
            items: { type: 'string' },
            uniqueItems: true,
            default: DEPENDENCY_FIELDS
          }
        },
        additionalProperties: false
      }
    ]
  },

  create(context) {
    const filename = typeof context.getFilename === 'function' ? context.getFilename() : context.filename;

    if (!filename.endsWith('package.json')) return {};

    const options = context.options[0] || {};
    const dependencyFields = options.dependencyFields || DEPENDENCY_FIELDS;

    return {
      'Program:exit'(programNode) {
        const src = typeof context.getSourceCode === 'function' ? context.getSourceCode() : context.sourceCode;
        const text = src.getText();

        let pkg;
        try {
          pkg = JSON.parse(text);
        } catch {
          return;
        }

        for (const field of dependencyFields) {
          const deps = pkg[field];
          if (!deps || typeof deps !== 'object') continue;

          for (const [dep, version] of Object.entries(deps)) {
            if (typeof version !== 'string' || !DEV_VERSION_PATTERN.test(version)) continue;

            const loc = findStringLocation(text, JSON.stringify(version));
            context.report({
              node: programNode,
              loc: loc ?? programNode.loc.start,
              messageId: 'devVersionFound',
              data: { dep, version }
            });
          }
        }
      }
    };
  }
};
