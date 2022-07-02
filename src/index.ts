import { name, version } from './package.json'

console.log(`loaded ${name} v${version}`)

export * from './definitions'
export * from './native-decorator'
