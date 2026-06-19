module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow usage of XMLHttpRequest API',
      recommended: false
    },
    messages: {
      forbidden: "'XMLHttpRequest' usage not allowed. Use 'DataManager' instead."
    },
    schema: []
  },
  create(context) {
    return {
      Identifier(node) {
        if (node.name === 'XMLHttpRequest') {
          context.report({
            node,
            messageId: 'forbidden'
          });
        }
      },
      NewExpression(node) {
        if (node.callee.name === 'XMLHttpRequest') {
          context.report({
            node,
            messageId: 'forbidden'
          });
        }
      }
    };
  }
};
