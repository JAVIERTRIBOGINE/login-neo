import { defineConfig } from 'rolldown';

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
 * @param {Object} options.pkg - El package.json del paquete (para leer dependencies/peerDependencies)
 * @param {Array} options.plugins - Plugins extra si hacen falta
 *
 * Nota: las declaraciones .d.ts se generan mediante `tsc --emitDeclarationOnly`
 * (configurado en el script build:ts de cada paquete), ya que rollup-plugin-dts
 * no es compatible con las APIs internas de Rolldown.
 */
export const createRolldownConfig = ({ input, pkg, plugins = [] }) => {
  const external = createExternalMatcher(pkg);

  return defineConfig({
    input,
    external,
    plugins: [...plugins],
    output: [
      // Módulos preservados para el export "development"
      {
        dir: './development',
        format: 'esm',
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: '[name].js'
      },
      // Bundle único para el export "default"
      {
        file: './index.js',
        sourcemap: true,
        format: 'esm',
        // inlineDynamicImports era la opción de Rollup; en Rolldown se usa codeSplitting: false
        codeSplitting: false
      }
    ]
  });
};
