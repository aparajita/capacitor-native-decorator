module.exports = {
  extends: ['@aparajita/base'],
  overrides: [
    {
      files: ['./cli/make-ios-plugin.ts'],
      parserOptions: {
        tsconfigRootDir: '.',
        project: './tsconfig-cli.json'
      }
    }
  ]
}
