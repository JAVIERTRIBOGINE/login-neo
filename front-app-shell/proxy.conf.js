module.exports = [
  {
    context: ['/digital'],
    target: 'http://localhost:8081',
    secure: false,
    changeOrigin: true,
    logLevel: 'debug',
    bypass: function (req) {
      req.headers.origin = 'http://localhost:4500';
      req.headers.host = 'localhost:8081';
    }
  },
  {
    context: ['/resources'],
    target: 'http://localhost:8082',
    secure: false,
    changeOrigin: true,
    logLevel: 'debug'
  }
];
