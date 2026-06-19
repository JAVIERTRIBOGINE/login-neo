module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: "Disallow usage or import of 'rox' API globally",
      recommended: false
    },
    messages: {
      forbidden: "'rox' usage not allowed. Use 'FeatureManager' instead."
    },
    schema: []
  },
  create(context) {
    return {
      // Detect usage like `rox` or `window.rox`
      Identifier(node) {
        if (node.name === 'rox') {
          context.report({
            node,
            messageId: 'forbidden'
          });
        }
      },
      MemberExpression(node) {
        if (node.object && node.object.name === 'window' && node.property.name === 'rox') {
          context.report({
            node,
            messageId: 'forbidden'
          });
        }
      },

      // Detect ES imports like `import rox from 'rox'` or `import * as rox from 'rox'`
      ImportDeclaration(node) {
        if (node.source && node.source.value === 'rox') {
          context.report({
            node,
            messageId: 'forbidden'
          });
        }
      },

      // Detect CommonJS imports like `const rox = require('rox')`
      CallExpression(node) {
        if (node.callee.name === 'require' && node.arguments.length && node.arguments[0].value === 'rox') {
          context.report({
            node,
            messageId: 'forbidden'
          });
        }
      }
    };
  }
};
