// eslint-disable-next-line @typescript-eslint/no-var-requires
const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mf = require('@angular-architects/module-federation/webpack');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { execFileSync } = require('child_process');
const share = mf.share;

const bootstrapChildPath = path.join(__dirname, 'src/bootstrap/bootstrap-child.module.ts');
if (!fs.existsSync(bootstrapChildPath)) {
  execFileSync(process.execPath, [path.join(__dirname, 'src/_templates/setup.js'), 'local'], {
    cwd: __dirname,
    stdio: 'inherit',
  });
}
const resolveFromRoot = (projectPath) => path.resolve(__dirname, projectPath);

const sharedMappings = new mf.SharedMappings();
sharedMappings.register(path.join(__dirname, 'tsconfig.json'), [
  /* mapped paths to share */
]);

module.exports = {
  output: {
    uniqueName: 'login',
    publicPath: 'auto'
  },
  optimization: {
    runtimeChunk: false
  },
  resolve: {
    alias: {
      ...sharedMappings.getAliases()
    }
  },
  experiments: {
    outputModule: true
  },
  plugins: [
    new ModuleFederationPlugin({
      library: { type: 'module' },

      name: 'login',
      filename: 'remoteEntry.js',
      exposes: {
        './loginApplication': resolveFromRoot('src/bootstrap/bootstrap-child.module.ts'),
        './AuthorizeComponent': resolveFromRoot('src/app/login/presentation/pages/authorize/authorize.component.ts'),
        './GetTokensComponent': resolveFromRoot('src/app/login/presentation/pages/get-tokens/get-tokens.component.ts'),
        './LoginComponent': resolveFromRoot('src/app/login/presentation/pages/login/login.component.ts'),
        './SamlMfe': resolveFromRoot('src/app/saml-flow/presentation/pages/resources/resources.component.ts'),
        './ACSComponent': resolveFromRoot('src/app/saml-flow/presentation/pages/acs/acs.component.ts'),
        './GetAuthorizationRequestComponent': resolveFromRoot('src/app/saml-flow/presentation/pages/get-authorization-request/get-authorization-request.component.ts'),
      },

      // For hosts (please adjust)
      // remotes: {
      //     "mfe1": "http://localhost:3000/remoteEntry.js",
      // },

      shared: share({
        '@angular/core': { singleton: true, strictVersion: true, requiredVersion: 'auto' },
        '@angular/common': { singleton: true, strictVersion: true, requiredVersion: 'auto' },
        '@angular/common/http': { singleton: true, strictVersion: true, requiredVersion: 'auto' },
        '@angular/router': { singleton: true, strictVersion: true, requiredVersion: 'auto' },
        rxjs: { singleton: true, strictVersion: true, requiredVersion: 'auto', includeSecondaries: true },
        '@ngrx/store': { singleton: true, strictVersion: true, requiredVersion: 'auto' },
        '@proteo/ng-bootstrap': { singleton: true, strictVersion: true, requiredVersion: 'auto' },
        '@proteo/ng-routing': { singleton: true, strictVersion: true, requiredVersion: 'auto' },

        ...sharedMappings.getDescriptors()
      })
    }),
    sharedMappings.getPlugin()
  ]
};
