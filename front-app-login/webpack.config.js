// eslint-disable-next-line @typescript-eslint/no-var-requires
const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mf = require('@angular-architects/module-federation/webpack');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');
const share = mf.share;

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
        './loginApplication': './src/bootstrap/bootstrap-child.module.ts',
        './AuthorizeComponent': './src/app/login/presentation/pages/authorize/authorize.component.ts',
        './GetTokensComponent': './src/app/login/presentation/pages/get-tokens/get-tokens.component.ts',
        './LoginComponent': './src/app/login/presentation/pages/login/login.component.ts',
        './SamlMfe': './src/app/saml-flow/presentation/pages/resources/resources.component.ts',
        './ACSComponent': './src/app/saml-flow/presentation/pages/acs/acs.component.ts',
        './GetAuthorizationRequestComponent': './src/app/saml-flow/presentation/pages/get-authorization-request/get-authorization-request.component.ts',
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
