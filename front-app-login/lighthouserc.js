module.exports = {
  ci: {
      collect: {
          startServerCommand: 'npm run start',
          url: ['http://localhost:4200']
      },
      upload: {
          target:'filesystem',
          outputDir: './lhci'
      },
  },
};
