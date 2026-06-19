module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow access to global window.Bs* variables',
      recommended: false
    },
    messages: {
      forbidden: "Access to 'window.{{ name }}' is not allowed."
    },
    schema: []
  },
  create(context) {
    return {
      MemberExpression(node) {
        const isGlobalWindow = node.object.type === 'Identifier' && node.object.name === 'window';

        const isBsProperty =
          node.property && node.property.type === 'Identifier' && node.property.name.startsWith('Bs');

        if (isGlobalWindow && isBsProperty) {
          context.report({
            node,
            messageId: 'forbidden',
            data: {
              name: node.property.name
            }
          });
        }
      }
    };
  }
};
