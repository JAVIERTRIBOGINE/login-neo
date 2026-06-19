module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow usage of axios',
      recommended: false
    },
    messages: {
      forbidden: "'axios' usage not allowed. Use 'DataManager' instead."
    },
    schema: []
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        if (node.source.value === 'axios') {
          context.report({
            node,
            messageId: 'forbidden'
          });
        }
      },
      CallExpression(node) {
        if (node.callee.name === 'axios') {
          context.report({
            node,
            messageId: 'forbidden'
          });
        }
      }
    };
  }
};
