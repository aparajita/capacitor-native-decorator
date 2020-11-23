# ws-capacitor-native-decorator

This package adds a **@​​native** decorator to TypeScript, which fundamentally changes the way we write and call Capacitor plugins.

[Motivation](#motivation)<br>
[Features](#features)<br>
[Installation](#installation)<br>
[Usage](#usage)

## Motivation

Have you ever wished you could pass values to and receive a value from a plugin without needing to construct/deconstruct and object?

Have you ever wished your plugins could leverage the full power of TypeScript code when running native?

Have you ever wished you could manage state and add TypeScript convenience methods in your plugin classes without having it disappear when running native?

Have you ever wished you didn't have to maintain the `ios/Plugin/Plugin.m` file manually?

**I know I have.**

### The mysterious `platforms` array

By default, a newly created plugin contains a single value in the `platforms` array passed to the superclass constructor: `'web'`. This tells Capacitor that *all* of the code in the plugin class will *completely* disappear on native platforms. On a native platform, calls to any instance methods that exist in both the TypeScript plugin class and the native plugin will automatically be routed to the native code. Calls to any other instance methods will silently disappear into the void — which wasn’t quite what I expected.

Haven’t you ever wished you could keep some code and state in the TypeScript class and some in the native plugin? You may think that the solution is to add the other platforms to the `platforms` array. So you set the `platforms` array to `['web', 'ios', 'android']`, and run your code on iOS or Android... and none of your native code gets called. That's because the TypeScript code is kept, but no automatic mapping of TypeScript methods to native methods happens.

What many developers may not know is that Capacitor does provide a way to call a plugin method from TypeScript: `Capacitor.toNative()`. So it is *technically* possible to keep your TypeScript code and call native methods, but  *practically* speaking it almost isn’t, because the interface of `toNative()` is cumbersome to say the least, and requires huge amounts of boilerplate code.

**@​​native** solves all these problems, and much more.

## Features

**@​​native** is a TypeScript method decorator. It’s quite simple to use. You just add it before an instance method declaration, like this:

```typescript
import { native } from 'ws-capacitor-native-decorator';

export type DataType = string | number | boolean | Array<any> | Object | null | Date;

export class MyPlugin
  extends WebPlugin
  implements WSBiometricAuthPlugin {
  
  private _storageCount = 0;
  
  constructor() {
    super({
      name: 'MyPlugin',
      platforms: ['web', 'ios', 'android']
    });
  }
  
  // This is usable even on native platforms!
  get storageCount() {
    return this._storageCount;
  }
  
  // 👇🏼 Here's where the magic happens. Be sure to include the ().
  @native()
  private setStringItem(key: string, data: string): Promise<void> {
    // Your web implementation goes here. On native platforms
    // this code won't be used, but the method's interface is the same!
  }
  
  // More magic!
  @native()
  private getStringItem(key: string): Promise<string> {
    // Web implementation goes here. Same interface on native platforms.
  }
  
  setItem(key: string, data: DataType): Promise<void> {
    // I'll leave convertToString() up to you :)
    this._storageCount += 1;
    this.setStringItem(key, convertToString(data));
    return Promise.resolve();
  }
  
  getItem(key: string): Promise<DataType> {
    // I'll leave convertFromString() up to you :)
    return Promise.resolve(convertFromString(this.getStringItem(key)));
  }
}

// And in a file that uses MyPlugin...
async function storeCount(count: number) {
  await plugin.setItem('count', count);
}

async function retrieveCount(): number {
  // getItem() returns a bare DataType, **not** an object
  const count = await plugin.getItem('count');
  
  // Use a type guard so we can return it as a number
  if (typeof count === 'number') {
    return count;
  }
  
  // Oops, this shouldn't happen...
}
```

There are quite a number of interesting points to make about this code.

**Mix and match TypeScript and native methods**
When you add the `@native` decorator to a method, it does all of the hard work of calling `Capacitor.toNative()` and returning its result for you. Anything marked `@native` will automatically route to native code when called from the TS/JS world, while still allowing you to keep all of your lovely TypeScript plugin code.

For example, in the above code, the public API to the plugin is pure TypeScript code, which then calls private methods that will execute native code. (NOTE: `@native` methods do not have to be private, they can just as easily be public.) This is *incredibly* powerful. Why? Because now the API to your plugin can be changed and extended without having to change the native code.

As in the example above, you can modify the parameters going into the native method and the result coming back. Or you can add or remove to either. Go wild! Anything you can do in TypeScript, you can now do with native plugins.

Because you have free access to TypeScript when running native, you can let your native code focus on things only it *can* do, or on things it does best. Lets face it — it's way easier to do most stuff in TypeScript than in Swift or Java. And anything native code does has to be duplicated across iOS and Android in two different languages and SDKs. So having the ability to move code out of native and into TypeScript is a huge win.

**Natural calling syntax**
Looking at the code above, you may have noticed that separate, non-object parameters are being passed to and returned from a method that is marked native. You may be scratching your head and thinking, ”Wait, how is that possible? I thought we have to pass and return an object, even for a single value! (Grrrrr...)”

The `@native` decorator makes this possible in two ways:

- Parameters passed in are marshalled into an object before being passed as options to the native code (as required by Capacitor). The keys of the object are the parameter names as declared in the method signature. If there is only a single parameter which is a plain object, it is passed as is.
- If the object returned by a native method contains a single property, the call to the method resolves to the bare value of that property. In any other case, the call resolves to the returned object.

For example:

```typescript
// This call to setStringItem...
this.setStringItem("foo", "bar")

// passes this options object to the native code
{ "key": "foo", "data": "bar" }

// A call to this method...
@native()
setObject(value: Object): Promise<void> {}

plugin.setObject({ name: "Max", age: 32 })

// would pass this options object to the native code
{ "name": "Max", "age": 32 }

// If the native implementation of a @native method returns this...
{ value: "foobar" }  // The property name is irrelevant, it can be anything

// a call to that method would resolve to the bare string:
"foobar"
```

**Plugin.m generation**
When you install this package, a `make-ios-plugin` binary is installed. Executing that binary parses the `dist/plugin.js` file generated by `tsc` and automatically generates the `ios/Plugin/Plugin.m` file necessary to make your native iOS methods callable. Whenever you add, remove or rename `@native` methods, `Plugin.m` will stay in sync, which means one less thing to maintain (and get wrong). Woo hoo! 🎉

## Installation

```sh
pnpm install ws-capacitor-native-decorator tslib # 'pnpm add' also works
npm install ws-capacitor-native-decorator tslib
yarn add ws-capacitor-native-decorator tslib
```

`tslib` contains the code that implements decorators. It is tree shaken by `rollup` during the build, so adds very little code.

Not using [pnpm](https://pnpm.js.org/)? You owe it to yourself to give it a try. It’s faster, better with monorepos, and uses *way, way* less disk space than the alternatives.

## Usage

Once you have installed the packages, there are a few steps you need to take to wire `@native` into your plugin.

##### 1. Modify `platforms`

Change the constructor of your plugin to look like this (where `MyPlugin` is your plugin’s name):

```typescript
constructor() {
  super({
    name: 'MyPlugin',
    platforms: ['web', 'ios', 'android']
  });
  
  // Your custom code here
}
```

##### 2. Modify `tsconfig.js`

Add the following to your `tsconfig.js` if they are not already there:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "importHelpers": true
  }
}
```

##### 3. Modify `rollup.config.js`

Your `rollup.config.js` should look something like this:

```js
import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';

export default {
  input: 'dist/esm/index.js',
  output: {
    file: 'dist/plugin.js',
    format: 'iife',
    name: 'MyGreatPlugin',
    globals: {
      '@capacitor/core': 'capacitorExports',
    },
    sourcemap: true,
  },
  plugins: [
    nodeResolve({
      // allowlist of dependencies to bundle in
      // @see https://github.com/rollup/plugins/tree/master/packages/node-resolve#resolveonly
      resolveOnly: [
        'tslib',
        'ws-capacitor-native-decorator'
      ],
    }),
    commonjs(),
  ],
};
```

The important thing is to include `'tslib'` and `'ws-capacitor-native-decorator'` in the `resolveOnly` array.

##### 4. Call `make-ios-plugin` in the `build` script

Add ` && make-ios-plugin` to the `build` script in `package.json`. It will look something like this:

```
"build": "npm run clean && tsc && rollup -c rollup.config.js && make-ios-plugin"
```

##### 5. Add `@native() ` to your native methods

Just add `@native()` above the TypeScript implementation of any methods that have a native implementation, and you’re all set!
