/**
 * A decorator that converts a JavaScript method into a native call.
 */
import { CallOptions, PluginError } from './definitions';
import { Capacitor, PluginResultData, WebPlugin } from '@capacitor/core';

const nativeMethodsProperty = '__native_methods__';
let nativeMethods: Set<string>;

export function native() {
  return function (
    target: any,
    methodName: string,
    descriptor: PropertyDescriptor,
  ) {
    // target is the class prototype. If the class does not yet
    // have a __native_methods__ property, add it now.
    const targetClass = target.constructor;

    if (!targetClass.hasOwnProperty(nativeMethodsProperty)) {
      // We'll use a set to easily ensure that no matter how
      // many times the plugin is instantiated, the class property
      // will only contain the set of unique native method names.
      nativeMethods = new Set();

      Object.defineProperty(targetClass, nativeMethodsProperty, {
        configurable: false,
        enumerable: false,
        writable: false,
        value: nativeMethods,
      });
    }

    nativeMethods.add(methodName);

    const originalMethod = descriptor.value;

    descriptor.value = function (options?: CallOptions) {
      if (Capacitor.isNative) {
        return callNativeMethod(this as WebPlugin, methodName, options);
      } else {
        return originalMethod.call(this, options);
      }
    };

    return descriptor;
  };
}

function callNativeMethod<T extends WebPlugin>(
  plugin: T,
  methodName: string,
  options?: CallOptions,
): Promise<any> {
  return new Promise((resolve, reject) => {
    const resolver = (data?: PluginResultData) => {
      // If there is only one property in data, return it bare
      if (data) {
        const keys = Object.keys(data);

        if (keys.length === 1) {
          return resolve(data[keys[0]]);
        }
      }

      resolve(data);
    };

    // @ts-ignore - toNative() is only defined in native environments,
    // and this function is only called in native environments.
    Capacitor.toNative(plugin.config.name, methodName, options, {
      resolve: (data?: PluginResultData) => {
        resolver(data);
      },
      reject: (error: PluginError) => {
        reject(error);
      },
    });
  });
}
