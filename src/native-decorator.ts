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

    // This can be done at compile time, so do it now
    const parameters = Capacitor.isNative
      ? getParameterNames(originalMethod)
      : [];

    descriptor.value = function (...args: any[]) {
      if (Capacitor.isNative) {
        return callNativeMethod(this, methodName, parameters, args);
      } else {
        return originalMethod.apply(this, args);
      }
    };

    return descriptor;
  };
}

function callNativeMethod<T extends WebPlugin>(
  plugin: T,
  methodName: string,
  parameters: string[],
  args: any[],
): Promise<any> {
  return new Promise((resolve, reject) => {
    const options = marshalOptions(parameters, args);

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

function isObject(object: any) {
  return (
    typeof object === 'object' && !Array.isArray(object) && object !== null
  );
}

function marshalOptions(parameters: string[], args: any[]): CallOptions {
  // If there is only one parameter and the arg is a plain object,
  // that can be passed directly as the native plugin call options.
  if (args.length === 1 && isObject(args[0])) {
    return args[0];
  }

  // Marshal the arguments into an object
  const options: CallOptions = {};

  for (let i = 0; i < parameters.length; i++) {
    options[parameters[i]] = args[i];
  }

  return options;
}

// Taken from https://github.com/kilianc/node-introspect
const argumentsRegExp = /\(([\s\S]*?)\)/;
const replaceRegExp = /[ ,\n\r\t]+/;

function getParameterNames(func: Function) {
  const args = argumentsRegExp.exec(func.toString())[1].trim();

  if (args.length === 0) {
    return [];
  }

  return args.split(replaceRegExp);
}
