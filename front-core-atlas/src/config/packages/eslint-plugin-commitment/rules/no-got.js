module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow importing or requiring the "got" library',
      recommended: false
    },
    messages: {
      forbidden: "'got' library not allowed. Use 'DataManager' instead."
    },
    schema: []
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        if (node.source.value === 'got') {
          context.report({
            node,
            messageId: 'forbidden'
          });
        }
      },
      CallExpression(node) {
        if (node.callee.name === 'require' && node.arguments[0] && node.arguments[0].value === 'got') {
          context.report({
            node,
            messageId: 'forbidden'
          });
        }
      }
    };
  }
};
