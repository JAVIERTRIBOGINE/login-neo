const fs = require('fs');
const path = require('path');
const pkgPath = path.join(process.cwd(), 'dist', 'package.json');
if (fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  if (pkg.publishConfig) {
    delete pkg.publishConfig;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
    console.log('  [postbuild] publishConfig stripped from dist/package.json');
  }
}
