<div class="markdown-body">

# capacitor-native-decorator&nbsp;&nbsp;[![npm version](https://badge.fury.io/js/@aparajita%2Fcapacitor-native-decorator.svg)](https://badge.fury.io/js/@aparajita%2Fcapacitor-native-decorator)

This package adds a `@native` decorator to TypeScript, which fundamentally changes the way we write and call Capacitor plugins.

👉 **This package only works with Capacitor 4.**

[Motivation](#motivation)<br>
[Features](#features)<br>
[Installation](#installation)<br>
[Usage](#usage)<br>
[Example](#example)

## Motivation

In the process of developing Capacitor plugins, I built up a big wish list:

- I wish I only had to make one TypeScript version of my plugins for all platforms.

- I wish I could pass values to a plugin without constructing an object.

- I wish I could receive a single value from a plugin without needing to deconstruct an object.

- I wish my plugins could leverage the full power of TypeScript code when running native.

- I wish I could manage state and add TypeScript convenience methods in my plugin classes without having it disappear when running native.

- I wish I didn’t have to maintain the `ios/Plugin/Plugin.m` file manually.

Thus was born `@native`. With `@native`, I — and you — get all of these things and more!

### Where did my code go?

On native platforms, calls to any instance methods that exist in both the TypeScript plugin class and the native plugin will automatically be routed to the native code. Calls to any other instance methods will silently disappear into the void — which wasn’t quite what I expected when I first encountered this.

Have you ever wished you could keep some code and state in the TypeScript class and some in the native plugin? You may think that the solution is to register your code on the other platforms, but when you run your code on iOS or Android, none of your native code gets called. That’s because the TypeScript code is kept, but no automatic mapping of TypeScript methods to native methods happens.

What you may not know is that Capacitor **does** provide a way to call a plugin method from TypeScript: `Capacitor.nativeCallback()` and `Capacitor.nativePromise()`. So it is _technically_ possible to keep your TypeScript code and call native methods, but _practically_ speaking it isn’t, because the interface of those methods is cumbersome and requires a lot of boilerplate code.

`@native` solves all these problems, and much more.

## Features

`@native` is a TypeScript method decorator. It’s quite simple to use. You just add it before an instance method declaration, like this:

`definitions.ts`

```typescript
import { DecoratedNativePlugin } from '@aparajita/capacitor-native-decorator'

// Always extend DecoratedNativePlugin, this ensures you implement
// getRegisteredPluginName(), which @native needs at runtime.
export interface AwesomePlugin extends DecoratedNativePlugin {
  getStorageCount: () => Promise<number>
  setItem: (key: string, data: string | number) => Promise<void>
  getItem: (key: string) => Promise<string>
  getTime: (callback: PluginCallback) => Promise<string>
}
```

`web.ts`

```typescript
import { native, PluginReturnType } from '@aparajita/capacitor-native-decorator'
import { AwesomePlugin } from './definitions'
import { PluginCallback } from '@capacitor/core'

export class Awesome extends WebPlugin implements AwesomePlugin {
  private _storageCount = 0

  // This is usable even on native platforms!
  getStorageCount(): Promise<number> {
    return Promise.resolve(this._storageCount)
  }

  // IMPORTANT: This has to be defined because at runtime @native needs your
  // *registered* plugin name, and when your code is minimized the actual
  // name will be different. This is declared in DecoratedNativePlugin.
  getRegisteredPluginName(): string {
    return 'Awesome'
  }

  /*
    👇🏼 Here's where the 🪄magic happens.
    
    Like any method that will be native, it has to be async and should
    return a Promise. By default, @native assumes the method will return
    a Promise that might reject.
  */
  @native()
  private async setStringItem(options: {
    key: string
    value: string
  }): Promise<void> {
    // Your web implementation goes here. On native platforms
    // this code won't be used, but the method's interface is the same!
    localStorage.setItem(key, data)
    return Promise.resolve()
  }

  // No need to specify the return type, by default it's a promise with data.
  // Note that even though this is a native call, it is returning a bare string,
  // not an object! @native automatically unwraps single values returned by
  // native code.
  @native()
  private async getStringItem({ key: string }): Promise<string> {
    // Web implementation goes here. Same interface on native platforms.
    return Promise.resolve(localStorage.getItem(key))
  }

  // We can also use callback methods with @native! Be sure to specify
  // it as such with the return type.
  @native(PluginReturnType.callback)
  async getTime(callback: PluginCallback): Promise<string> {
    window.setTimeout(() => {
      // PluginCallback expects to be passed a data object
      callback({ time: new Date().toString() })
    })

    // On the web, the pluginCallId can be anything, it isn't used
    return Promise.resolve('getTime')
  }

  // This is the method you will call to set an item. More natural
  // because you don't have to construct an object. Plus we can implement
  // code in the TypeScript world and still access the native code.
  async setItem(key: string, value: string | number): Promise<void> {
    this._storageCount += 1
    return this.setStringItem({ key, data: String(value) })
  }

  // This is the method you will call to get an item. More natural
  // because you don't have to construct an object.
  async getItem(key: string): Promise<string> {
    return this.getStringItem({ key })
  }
}
```

`Plugin.m`

Note that `make-ios-plugin` will generate this for you!

```swift
#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

// Generated by @aparajita/capacitor-native-decorator/make-ios-plugin

CAP_PLUGIN(Awesome, "Awesome",
  CAP_PLUGIN_METHOD(setStringItem, CAPPluginReturnPromise);
  CAP_PLUGIN_METHOD(getStringItem, CAPPluginReturnPromise);
  CAP_PLUGIN_METHOD(getTime, CAPPluginReturnCallback);
)
```

`Plugin.swift`

```swift
@objc(BiometricAuth)
public class Awesome: CAPPlugin {
  @objc func setStringItem(_ call: CAPPluginCall) {
    // storeValue is defined by you somewhere
    storeValue(call.getString("key"), call.getString("value))
    call.resolve()
  }

  @objc func getStringItem(_ call: CAPPluginCall) {
    var value = ""

    if let key = call.getString("key") {
      // getValue is defined by you somewhere
      value = getValue(key)
    }

    call.resolve(["value": value])
  }

  @objc func getTime(_ call: CAPPluginCall) {
    // This has to be done for callback methods
    // so you can repeatedly resolve().
    call.keepAlive = true

    DispatchQueue.main.async {
      Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { timer in
        call.resolve([
          "time": Date().description
        ])
      }
    }
  }
}
```

And in a file that uses Awesome...

```ts
import { Awesome } from 'myplugin'

async function storeCount(count: number): Promise<void> {
  await Awesome.setItem('count', count)
  console.log(`${await Awesome.getStorageCount()} item(s) stored`)
}

async function retrieveCount(): Promise<number> {
  const count = await Awesome.getItem('count')
  return Number(count)
}

async function startClock(): Promise<string> {
  return Awesome.getTime(({ time }) => {
    console.log(time)
  })
}
```

There are quite a number of interesting points to make about this code.

### Mix and match TypeScript and native methods

When you add the `@native` decorator to a method, it does all of the hard work of calling `Capacitor.nativePromise()` or `Capacitor.nativeCallback()` and returning its result for you. Anything marked `@native` will automatically route to native code when called from the TS/JS world, while still allowing you to keep all of your lovely TypeScript plugin code.

For example, in the above code, some of the public API to the plugin is pure TypeScript code, which then calls private methods that will execute native code. This is _incredibly_ powerful. Why? Because now the API to your plugin can be changed and extended without having to change the native code.

As in the example above, you can modify the parameters going into the native method and the result coming back. Or you can add or remove to either. Go wild! Anything you can do in TypeScript, you can now do with native plugins.

Because you have free access to TypeScript when running native, you can let your native code focus on things only it can do, or on things it does best. Lets face it — it's way easier to do most stuff in TypeScript than in Swift or Java. And anything native code does has to be duplicated across iOS and Android in two different languages and SDKs. So having the ability to move code out of native and into TypeScript is a huge win.

### Natural calling syntax

Looking at the code above, you may have noticed that the `@native getStringItem()` returns `Promise<string>` and not `Promise<SomeObjectWithAString>`. You may be scratching your head and thinking, “Wait, how is that possible? I thought we have to return an object, even for a single value.”

The `@native` decorator makes this possible. If the object returned by a native method contains a single property, `@native` unwraps the value and the call to the method resolves to the bare value of that property. In any other case, the call resolves to the returned object.

For example:

```typescript
// If the native implementation of a @native method returns this...
{
  value: 'foobar'
} // The property name is irrelevant, it can be anything

// a call to that method would resolve to the bare string:
;('foobar')
```

### Plugin.m generation

When you install this package, a `make-ios-plugin` binary is installed. Executing that binary parses the `dist/plugin.js` file generated by `tsc` and automatically generates the `ios/Plugin/Plugin.m` file necessary to make your native iOS methods callable. Whenever you add, remove or rename `@native` methods, `Plugin.m` will stay in sync, which means one less thing to maintain (and get wrong). Woo hoo! 🎉

### Are decorators safe to use?

In short, absolutely.

The TypeScript documentation says this about decorators: “Decorators are an experimental feature that may change in future releases.”

Decorators may _**change**_, but there is no chance they are going away, because they are heavily used by a little framework called Angular made by a little company called Google. In fact, the story goes that Microsoft implemented decorators in TypeScript because Google wanted them for Angular and threatened to fork TypeScript in order to get them.

In addition, decorators are currently a [Stage 3 proposal](https://github.com/tc39/proposal-decorators) for the JavaScript language, and the proposed implementation will allow this plugin to continue working with some minor changes. Having reached Stage 3, it’s only a matter of time (historically speaking) until decorators become part of JavaScript.

So don’t be scared off by the “experimental” label on decorators. The experiment was a success.

### But I’m loading web code I don’t need!

On really, really cheap phones with limited memory and CPU, every extra byte of JavaScript incurs a cost. But here’s the thing:

- In a production app, your JavaScript/TypeScript code is minimized to a fraction of its original size.

- If an app is going to crash or slow down because of a few hundred extra bytes in a plugin, then you probably cannot afford to add any other functionality — and thus code — to your app either.

So unless your app has to run on extremely memory-challenged phones, the advantages you get from `@native` are well worth any extra overhead.

## Installation

```shell
pnpm add @aparajita/capacitor-native-decorator tslib
```

Not using [pnpm](https://pnpm.io/)? You owe it to yourself to give it a try. It’s actually the official package manager used by the Vue team. It’s faster, better with monorepos, and uses _way, way_ less disk space than the alternatives.

## Usage

Once you have installed the packages, there are a few steps you need to take to wire `@native` into your plugin.

#### 1. Extend your interface from `DecoratedNativePlugin`

At runtime `@native` needs to know the **registered** name of your plugin. This cannot be determined from the **declared** name, because when your code is minimized the names are changed and do not match the registered name.

`@native` relies on you implementing a `getRegisteredPluginName` method that returns the registered name. To ensure you don’t forget to implement this method and implement it with the proper signature, you shoud extend your plugin interface from `DecoratedNativePlugin`:

```typescript
import { DecoratedNativePlugin } from '@aparajita/capacitor-native-decorator'

export interface AwesomePlugin extends DecoratedNativePlugin {
  // your methods here
}
```

#### 2. Modify `registerPlugin`

Change the `index.ts` of your plugin to look like this (where `Awesome` is your plugin’s name):

```typescript
import { registerPlugin } from '@capacitor/core'
import type { AwesomePlugin } from './definitions'
import { Awesome } from './web'

// Because we are using the @native decorator, we have one version
// of the TS code to rule them all, and there is no need to lazy load.
// And our code is available on all platforms. 😁
const plugin = new Awesome()

registerPlugin<AwesomePlugin>('Awesome', {
  web: plugin,
  ios: plugin,
  android: plugin
})

// We do NOT export the result of registerPlugin, because that would
// circumvent the magic the @native decorator does.
export * from './definitions'
export { plugin as Awesome }
```

#### 3. Modify `tsconfig.js`

Add the following to your `tsconfig.js` if it is not already there:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "importHelpers": true
  }
}
```

#### 4. Modify `rollup.config.js`

You need to tell `rollup` about `@native` by adding three items:

```js
export default {
  input: 'dist/esm/index.js',
  output: [
    {
      file: 'dist/plugin.js',
      format: 'iife',
      name: 'capacitorAwesome', // My plugin name
      globals: {
        '@capacitor/core': 'capacitorExports',

        // ===> You need to add this <===
        '@aparajita/capacitor-native-decorator': 'capacitorNativeDecorator'
        // ===============================
      },
      sourcemap: true,
      inlineDynamicImports: true
    },
    {
      file: 'dist/plugin.cjs.js',
      format: 'cjs',
      sourcemap: true,
      inlineDynamicImports: true
    }
  ],

  // ===> You need to add the second item here <===
  external: ['@capacitor/core', '@aparajita/capacitor-native-decorator'],

  // ===> You need to add this <===
  context: 'window'
}
```

#### 5. Add `@native() ` to your native methods

Import the `native` decorator function:

```ts
import { native } from '@aparajita/capacitor-native-decorator'
```

Now you can add the `@native()` decorator above the TypeScript implementation of any methods that have a native implementation.

Pass the return type of your methods to `@native()`:

- `PluginReturnType.none` – The plugin call returns no data **and** will never reject. If you return no data but might reject, use `PluginReturnType.promise`, otherwise the promise on the TypeScript side will not reject.
- `PluginReturnType.promise` – The plugin call returns data and/or it might reject. If you pass nothing to `@native()` this is the default.
- `PluginReturnType.callback` – The plugin call is passing a callback to be called repeatedly. The native plugin will mark the call `keepAlive` and will repeatedly `resolve()`.

> **IMPORTANT:** Any plugin class method that will be called in a native context **must** return a Promise, even if it is not decorated with `@native()`. If a method will **only** be used on the web, it does not need to return a Promise.

#### 6. Call `make-ios-plugin` in the `build` script

Somewhere in your `package.json` scripts, you will want to call `make-ios-plugin` to automatically create the `Plugin.m` file for iOS. For example:

```
"build": "pnpm run clean && tsc && rollup -c rollup.config.js && pnpm make"
"make": "make-ios-plugin"
```

## Example

A complete working example of `@native` can be found in the [capacitor-secure-storage plugin](https://github.com/aparajita/capacitor-secure-storage). There you can find almost all of the features of `@native` used:

- Returning non-object values
- Public and private native API
- Wrapping native calls with TypeScript code
- Keeping state in the Typescript class

I hope you find it useful!

</div>
