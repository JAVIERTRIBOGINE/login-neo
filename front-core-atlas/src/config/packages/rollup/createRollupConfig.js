import esbuild from 'rollup-plugin-esbuild';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { dts } from 'rollup-plugin-dts';

const moduleExtensions = ['.mjs', '.js', '.json', '.node', '.ts'];

const sharedPlugins = [
  resolve({ extensions: moduleExtensions }),
  esbuild({
    include: /\.[jt]sx?$/,
    minify: true,
    target: 'es2020',
    jsx: 'transform'
  }),
  commonjs(),
  json()
];

const getPackageName = (moduleId) => {
  if (moduleId.startsWith('@')) {
    return moduleId.split('/').slice(0, 2).join('/');
  }

  return moduleId.split('/')[0];
};

const createExternalMatcher = (pkg) => {
  const externalPackages = new Set([
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {})
  ]);

  return (moduleId) => {
    if (moduleId.startsWith('.') || moduleId.startsWith('/') || moduleId.startsWith('\0')) {
      return false;
    }

    return externalPackages.has(getPackageName(moduleId));
  };
};

/**
 * @param {Object} options
 * @param {string} options.input - Ruta de entrada (ej: src/index.ts)
 * @param {Object} options.pkg - El package.json del paquete (para leer main/module)
 * @param {Array} options.plugins - Plugins extra si hacen falta
 */
export const createRollupConfig = ({ input, pkg, plugins = [] }) => {
  const external = createExternalMatcher(pkg);

  return [
    // Bundle
    {
      input,
      output: [
        {
          dir: './development',
          format: 'esm',
          preserveModules: true,
          preserveModulesRoot: 'src',
          entryFileNames: '[name].js'
        },
        {
          file: './index.js',
          sourcemap: true,
          format: 'esm',
          inlineDynamicImports: true
        }
      ],
      external,
      plugins: [...sharedPlugins, ...plugins]
    },

    // Types (declarations .d.ts)
    {
      input,
      output: {
        dir: './types',
        format: 'esm',
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: '[name].d.ts'
      },
      plugins: [dts()],
      external
    }
  ];
};
