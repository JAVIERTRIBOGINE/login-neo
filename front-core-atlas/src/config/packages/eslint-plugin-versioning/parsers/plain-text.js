'use strict';

/**
 * Minimal ESLint parser for plain-text files (e.g. pnpm-lock.yaml).
 *
 * Devuelve un AST mínimo con un nodo `Program` vacío, lo que permite a las
 * reglas acceder al texto fuente via `context.getSourceCode().getText()`.
 * No interpreta la sintaxis del fichero; la validación se hace sobre el texto.
 */
module.exports = {
  parse(code) {
    const lines = code.split('\n');
    return {
      type: 'Program',
      body: [],
      range: [0, code.length],
      loc: {
        start: { line: 1, column: 0 },
        end: { line: lines.length, column: (lines[lines.length - 1] ?? '').length }
      },
      tokens: [],
      comments: []
    };
  }
};
