module.exports = {
  extends: ['@aparajita/base'],
  overrides: [
    {
      files: ['./cli/make-ios-plugin.ts'],
      parserOptions: {
        project: './tsconfig-cli.json'
      }
    }
  ]
}
