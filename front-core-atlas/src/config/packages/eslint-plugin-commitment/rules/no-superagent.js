module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow importing or requiring the "superagent" library',
      recommended: false
    },
    messages: {
      forbidden: "'superagent' library not allowed. Use 'DataManager' instead."
    },
    schema: []
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        if (node.source.value === 'superagent') {
          context.report({
            node,
            messageId: 'forbidden'
          });
        }
      },
      CallExpression(node) {
        if (node.callee.name === 'require' && node.arguments[0] && node.arguments[0].value === 'superagent') {
          context.report({
            node,
            messageId: 'forbidden'
          });
        }
      }
    };
  }
};
