'use strict';

/**
 * Adapts a legacy ESLint v8 rule (uses context.getFilename())
 * to work with ESLint v9+ flat config (uses context.filename).
 */
function adaptRule(rule) {
  return {
    ...rule,
    create(context) {
      if (typeof context.getFilename !== 'function') {
        context = new Proxy(context, {
          get(target, prop) {
            if (prop === 'getFilename') return () => target.filename;
            return target[prop];
          }
        });
      }
      return rule.create(context);
    }
  };
}

module.exports = { adaptRule };
