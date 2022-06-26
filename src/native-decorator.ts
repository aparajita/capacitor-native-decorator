/**
 * A decorator that converts a JavaScript class method into a native call.
 */
import type { PluginCallback, PluginResultData } from '@capacitor/core'
import { Capacitor } from '@capacitor/core'
import type { CapacitorInstance } from '@capacitor/core/types/definitions-internal'
import type { CallOptions, PluginError } from './definitions'
import { PluginReturnType } from './definitions'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Func = (...args: any[]) => any

type WrappedFunction = (
  optionsOrCallback?: CallOptions | PluginCallback,
  callback?: PluginCallback
) => Promise<unknown>

interface DecoratedClassPrototype {
  getRegisteredPluginName: () => string
}
/* eslint-enable */

function isFunction(value: unknown): value is Func {
  return typeof value === 'function'
}

async function callNativePromise(
  name: string,
  methodName: string,
  options?: CallOptions
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const resolver = (data: PluginResultData | null): void => {
      // If there is only one property in data, return it bare
      if (data) {
        const keys = Object.keys(data)

        if (keys.length === 1) {
          resolve(data[keys[0]])
          return
        }
      }

      resolve(data)
    }

    // Capacitor is actually of type CapacitorInstance
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const cap = Capacitor as CapacitorInstance

    cap
      .nativePromise<CallOptions, PluginResultData | null>(
        name,
        methodName,
        options
      )
      .then((data: PluginResultData | null) => {
        resolver(data)
      })
      .catch((error: PluginError) => {
        reject(error)
      })
  })
}

function wrappedFunction(
  pluginName: string,
  methodName: string,
  returnType: PluginReturnType,
  originalMethod: Func
): WrappedFunction {
  return async function (
    optionsOrCallback?: CallOptions | PluginCallback,
    callback?: PluginCallback
  ): Promise<unknown> {
    let options: CallOptions | undefined
    let cb: PluginCallback | undefined

    if (typeof optionsOrCallback === 'object') {
      options = optionsOrCallback

      if (typeof callback === 'function') {
        cb = callback
      }
    } else if (typeof optionsOrCallback === 'function') {
      cb = optionsOrCallback
    }

    if (Capacitor.isNativePlatform()) {
      if (returnType === PluginReturnType.promise) {
        return callNativePromise(pluginName, methodName, options)
      } else {
        // Capacitor is actually of type CapacitorInstance
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        const cap = Capacitor as CapacitorInstance

        return Promise.resolve(
          cap.nativeCallback<CallOptions>(pluginName, methodName, options, cb)
        )
      }
    } else {
      // In the context of an instance method call
      // (which is what got us here), `this` is the instance.
      /* eslint-disable @typescript-eslint/no-unsafe-return,@typescript-eslint/no-invalid-this */
      if (options) {
        if (cb) {
          // @ts-expect-error: See above comment
          return originalMethod.call(this, options, cb)
        }

        // @ts-expect-error: See above comment
        return originalMethod.call(this, options)
      }

      if (cb) {
        // @ts-expect-error: See above comment
        return originalMethod.call(this, cb)
      }

      // @ts-expect-error: See above comment
      return originalMethod.call(this)
    }
  }
}

export function native(
  returnType: PluginReturnType = PluginReturnType.promise
) {
  return function (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/explicit-module-boundary-types
    target: any,
    methodName: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    if (isFunction(descriptor.value)) {
      const originalMethod = descriptor.value
      let prototype: DecoratedClassPrototype

      //  We only support instance methods, that's what Capacitor supports.
      //  If target is an instance method, target is an object.
      if (typeof target === 'object') {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        prototype = target as DecoratedClassPrototype
      } else {
        throw new Error('@native can only be used with instance class methods')
      }
      /* eslint-enable */

      // The class has to implement the instance method
      // getRegisteredPluginName().
      if (typeof prototype.getRegisteredPluginName === 'function') {
        const pluginName = prototype.getRegisteredPluginName()
        descriptor.value = wrappedFunction(
          pluginName,
          methodName,
          returnType,
          originalMethod
        )
      } else {
        throw new Error(
          'Classes that use @native must implement the method getRegisteredPluginName(): string'
        )
      }
    } else {
      throw new Error('@native can only be used with instance class methods')
    }

    return descriptor
  }
}
