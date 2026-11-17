const isUseEffectName = (node) =>
  node?.name === 'useEffect' || node?.value === 'useEffect';

const isUseEffectProperty = (node) => {
  const key = node.type === 'MemberExpression' ? node.property : node.key;
  return (!node.computed || key?.type === 'Literal') && isUseEffectName(key);
};

const resolveReference = (node, sourceCode) =>
  sourceCode.getScope(node).references
    .find((reference) => reference.identifier === node)?.resolved;

const isReactRequire = (node, sourceCode) =>
  node?.type === 'CallExpression' &&
  node.callee.type === 'Identifier' && node.callee.name === 'require' &&
  node.arguments.length === 1 && node.arguments[0].value === 'react' &&
  !(resolveReference(node.callee, sourceCode)?.defs.length > 0);

// shortcut: direct bindings only, add data-flow checks for indirect ones.
const isReactObject = (node, sourceCode) => {
  if (isReactRequire(node, sourceCode)) return true;
  if (node?.type !== 'Identifier') return false;
  return resolveReference(node, sourceCode)?.defs.some((definition) =>
    (definition.type === 'ImportBinding' &&
      definition.parent.source.value === 'react' &&
      ['ImportDefaultSpecifier', 'ImportNamespaceSpecifier']
        .includes(definition.node.type)) ||
    (definition.type === 'Variable' &&
      isReactRequire(definition.node.init, sourceCode))
  ) === true;
};

/** @type {import('eslint').Rule.RuleModule} */
const noUseEffect = {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow React useEffect imports and access.' },
    schema: [],
    messages: {
      banned: 'React useEffect is banned. Remove this import or access.',
    },
  },
  create(context) {
    const report = (node) => context.report({ node, messageId: 'banned' });
    return {
      ImportDeclaration(node) {
        if (node.source.value !== 'react') return;
        node.specifiers.filter((specifier) =>
          specifier.type === 'ImportSpecifier' &&
          isUseEffectName(specifier.imported)
        ).forEach(report);
      },
      ExportNamedDeclaration(node) {
        if (node.source?.value !== 'react') return;
        node.specifiers.filter((specifier) =>
          isUseEffectName(specifier.local)
        ).forEach(report);
      },
      ExportAllDeclaration(node) {
        if (node.source.value === 'react') report(node);
      },
      MemberExpression(node) {
        if (isUseEffectProperty(node) &&
            isReactObject(node.object, context.sourceCode)) report(node);
      },
      VariableDeclarator(node) {
        if (node.id.type !== 'ObjectPattern' ||
            !isReactObject(node.init, context.sourceCode)) return;
        node.id.properties.filter(isUseEffectProperty).forEach(report);
      },
    };
  },
};

/** @satisfies {import('eslint').Linter.Config} */
export const useEffectBan = {
  files: ['**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}'],
  plugins: { pinned: { rules: { 'no-use-effect': noUseEffect } } },
  rules: { 'pinned/no-use-effect': 'error' },
};
