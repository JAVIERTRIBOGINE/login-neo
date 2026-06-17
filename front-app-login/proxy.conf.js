/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-undef */

/**
 * Angular proxy configuration. This proxy only applies to localhost environments
 * Check the documentation if needed -> 
 * https://developer-portal-int-ns-docs.apps.int.aws.bancsabadell.com/Development/2-Frontend/02-Developer-Guides/02-Proteo4-Utils/data-manager/data-manager-v2#51-injecting-proteo4-tokens-in-local-development
 */
const PROXY_CONFIG = [
  {
    context: ['/lib', '/app'],
    target: 'https://apps.cdn.int.aws.bancsabadell.com',
    secure: false,
    changeOrigin: true,
    bypass: function (req) {
      req.headers['Cookie'] = req.headers['cookie'] = '';
    }
  },
  {
    context: ['/proxy'],
    target: 'https://openapi.int.es.bs',
    secure: false,
    changeOrigin: true,
    logLevel: 'debug',
    pathRewrite: {
      '^/proxy': ''
    },

    
    // Bypass function to prevent cors errors into API gateway (invalid cors request due to origin header was localhost)
    bypass: function (req, res, proxyOptions) {
      if (req.url === '/token' || req.url.startsWith('/token?') || req.url === '/') {
      return '/index.html'; // Servir index.html para que Angular maneje la ruta
      }
      req.headers['Origin'] = req.headers['origin'] = req.headers['Host'] = req.headers['host'] = 'https://int.api.bancsabadell.com';
    }
  },
  {
    context: ['/resources', '/authnRequest', '/validateSAMLResponse'],
    target: 'http://localhost:8082',
    secure: false,
    changeOrigin: true,
    logLevel: 'debug'
  }
];

module.exports = PROXY_CONFIG;
