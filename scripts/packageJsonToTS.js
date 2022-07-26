const fs = require('fs')
const pkg = require('../package.json')

/*
  This script converts the package.json file to a TypeScript file.
  Why? Because if we import package.json in a TypeScript file, it will
  insert the entire package.json object into the global scope and we
  only want the properties we care about.
 */
const keysToExport = ['name', 'version']
const exportLines = keysToExport
  .map((key) => `${key}: '${pkg[key]}'`)
  .join(',\n  ')
const constPkg = 'const pkg = {\n  _exports_\n}\n'.replace(
  '_exports_',
  exportLines
)

fs.writeFileSync('src/pkg.ts', `${constPkg}\nexport default pkg\n`)
