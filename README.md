<div class="markdown-body">

# capacitor-native-decorator&nbsp;&nbsp;[![npm version](https://badge.fury.io/js/@aparajita%2Fcapacitor-native-decorator.svg)](https://badge.fury.io/js/@aparajita%2Fcapacitor-native-decorator)

### ❗️This package is now deprecated. Please read below if you are using Capacitor 4.

After spending many hours tracing through and reading through the Capacitor 4 source code and doing some experimentation with different coding conventions, I have come to the conclusion that this package is no longer needed.

### Issues this package was originally designed to solve

This package was originally created to solve several issues:

1. The need to manually maintain the `Plugin.m` file for iOS.
2. The inability to use non-native methods in a class on native platforms.
3. The necessity to unwrap single return values from an object.

#1 was a convenient side-effect of solving #2 and #3. In reality, it isn’t that important, as the API for a plugin doesn’t change that much.

#2 is no longer a problem with Capacitor 4. You can call any method on a plugin object, even if it’s not native.

#3 is easily solved by using object deconstruction.

### Issues created by this package

There are three issues this package created:

1. It was relying on private API within Capacitor that could change in the future, thus preventing users of this package from upgrading to the latest version of Capacitor.
2. It was circumventing the Capacitor plugin method calling mechanism entirely, which eventually could lead to unexpected behavior in future versions of Capacitor.
3. It did not support lazy loading of plugins, which is now the recommended way.

Using standard Capacitor mechanisms instead of this package solves all of these issues.

> **Note:** When plugins are lazy loaded, **all** of the methods in the plugin class must be async and return a Promise.

### The remaining Capacitor issue

There is one problem with Capacitor 4 that needs to be solved if you want to get the most flexibility in your plugins. While you **can** call non-native methods in a plugin class, because of the way Capacitor implements plugins, within non-native plugin methods you **can’t** call native methods via `this`.

Why would you want to do this? There are two main advantages:

- It allows you to create hybrid plugins that are part TypeScript, part native code. By putting as much functionality in TypeScript as possible, that’s one less language in which to write and test code.
- You can use TypeScript methods to provide a more natural syntax for calling native methods, as is shown in the example below.

This can be achieved by storing the plugin reference returned by `registerPlugin` (which is actually a bare Proxy) inside your plugin class and calling native methods via that reference. Here is an example of how to do this:

```typescript
// definitions.ts
export interface AwesomePlugin extends WebPlugin {
  setItem(key: string, value: unknown): Promise<void>
  getItem(key: string): Promise<unknown>
}

// base.ts
export abstract class AwesomeBase extends WebPlugin implements AwesomePlugin {
  private readonly _plugin: AwesomePlugin

  constructor(plugin: AwesomePlugin) {
    super()
    this._plugin = plugin
  }

  abstract setItem(key: string, value: unknown): Promise<void>

  abstract getItem(key: string): Promise<unknown>
}

// web.ts
export class AwesomeWeb extends AwesomeBase {
  async setItem(key: string, value: unknown): Promise<void> {
    return localStorage.setItem(key, value)
  }

  async getItem(key: string): Promise<unknown> {
    return Promise.resolve(localStorage.getItem(key))
  }
}

// native.ts
export class AwesomeNative extends AwesomeBase {
  async nativeSetItem({
    key,
    value
  }: {
    key: string
    value: unknown
  }): Promise<void> {
    // Code is never called, but we have to keep TS happy
    return Promise.resolve()
  }

  async setItem(key: string, value: unknown): Promise<void> {
    // We can't use `this` directly, we have to use the Capacitor plugin reference
    return this._plugin.nativeSetItem({ key, value })
  }

  async nativeGetItem({ key }: { key: string }): Promise<unknown> {
    // Code is never called, but we have to keep TS happy
    return Promise.resolve(undefined)
  }

  async getItem(key: string): Promise<unknown> {
    // We can't use `this` directly, we have to use the Capacitor plugin reference
    const { value } = await this._plugin.nativeGetItem({ key })
    return Promise.resolve(value)
  }
}

// index.ts
import { registerPlugin } from '@capacitor/core'
import type { AwesomePlugin } from './definitions'

const proxy = registerPlugin<AwesomePlugin>('AwesomeNative', {
  web: async () =>
    import('./web').then((module) => new module.AwesomeWeb(proxy)),
  ios: async () =>
    import('./native').then((module) => new module.AwesomeNative(proxy)),
  android: async () =>
    import('./native').then((module) => new module.AwesomeNative(proxy))
})

export * from './definitions'
export { proxy as Awesome }

// somefile.ts
import { Awesome } from '@awesome/awesome'

async function setCredentials(credentials: {
  username: string
  password: string
}) {
  await Awesome.setItem('credentials', JSON.stringify(credentials))
}

async function getCredentials(): Promise<{
  username: string
  password: string
}> {
  const credentials = await Awesome.getItem('credentials')
  return JSON.parse(credentials)
}
```

```swift
// ios/Plugin/Plugin.m
#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(AwesomeNative, "AwesomeNative",
  CAP_PLUGIN_METHOD(nativeSetItem, CAPPluginReturnPromise);
  CAP_PLUGIN_METHOD(nativeGetItem, CAPPluginReturnPromise);
)
```

And so on with the other native files. Some examples:

[capacitor-biometric-auth](https://github.com/aparajita/capacitor-biometric-auth)

</div>
