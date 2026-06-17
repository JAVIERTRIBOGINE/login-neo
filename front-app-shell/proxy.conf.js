module.exports = [
  {
    context: ['/resources'],
    target: 'http://localhost:8082',
    secure: false,
    changeOrigin: true,
    logLevel: 'debug'
  }
];
