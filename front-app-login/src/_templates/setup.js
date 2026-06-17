/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs');
const mustache = require('mustache');

/**
 * Path to directory with templates
 */
const directoryPath = './src/_templates/files';

/**
 * Path to directory output after mustache render templates
 */
const directoryOutputPath = './src/bootstrap';

/**
 * Get type of configuration file from command line arguments
 */
const conf = require(`./conf/${process.argv[2]}.json`);

/**
 * Read all files names from directory and filters only templates
 */
const filesPaths = fs.readdirSync(directoryPath);
const templates = filesPaths.filter((f) => f.match(/\.template$/));

/**
 * The path to the bootstrap source directory.
 * @type {string}
 */
if (!fs.existsSync(directoryOutputPath)) {
  fs.mkdirSync(directoryOutputPath);
}

/**
 * Render templates and write to files inside folder
 */
templates.forEach((template) => {
  const file = fs.readFileSync(`${directoryPath}/${template}`);
  const render = mustache.render(file.toString(), conf);

  fs.writeFileSync(`./src/bootstrap/${template.replace('.template', '')}`, render);
});
