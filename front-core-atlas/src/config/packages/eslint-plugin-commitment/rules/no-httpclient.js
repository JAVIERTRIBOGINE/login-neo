module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow usage of HttpClient from @angular/common/http',
      recommended: false
    },
    messages: {
      forbidden: "'HttpClient' usage not allowed. Use 'DataManager' instead."
    },
    schema: []
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        if (
          node.source.value === '@angular/common/http' &&
          node.specifiers.some((s) => s.imported.name === 'HttpClient' || s.imported.name === 'HttpClientModule')
        ) {
          context.report({
            node,
            messageId: 'forbidden'
          });
        }
      },
      NewExpression(node) {
        if (node.callee.name === 'HttpClient') {
          context.report({
            node,
            messageId: 'forbidden'
          });
        }
      }
    };
  }
};
