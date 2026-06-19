module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow usage of global fetch API',
      recommended: false
    },
    messages: {
      forbidden: "'fetch' usage not allowed. Use 'DataManager' instead."
    },
    schema: []
  },
  create(context) {
    return {
      Identifier(node) {
        if (node.name === 'fetch') {
          context.report({
            node,
            messageId: 'forbidden'
          });
        }
      },
      MemberExpression(node) {
        if (node.object.name === 'window' && node.property.name === 'fetch') {
          context.report({
            node,
            messageId: 'forbidden'
          });
        }
      }
    };
  }
};
