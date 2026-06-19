export const jsConfig = {
  '*.{js,mjs,cjs,ts}': [
    'eslint --quiet --color --cache --cache-location .eslintcache --ignore-path .gitignore --fix',
    'prettier --ignore-path .gitignore  --write'
  ]
};
