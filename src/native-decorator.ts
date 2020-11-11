/**
 * A decorator that converts a JavaScript method into a native call.
 */
import { CallOptions, CallRejectFunc, CallResolveFunc, NativeAdapter, NativeAdapterDetails } from './definitions'
import { Capacitor, PluginResultData, PluginResultError } from '@capacitor/core'

export function native(adapter?: NativeAdapter) {
  return function (
    _target: any,
    methodName: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    // This can be done at compile time, so do it now
    const parameters = Capacitor.isNative
      ? getParameterNames(originalMethod)
      : [];

    descriptor.value = function (...args: any[]) {
      if (Capacitor.isNative) {
        return callNativeMethod.call(
          this,
          adapter,
          methodName,
          parameters,
          args,
        );
      } else {
        return originalMethod.apply(this, args);
      }
    };

    return descriptor;
  };
}

function callNativeMethod(
  adapter: NativeAdapter,
  methodName: string,
  parameters: string[],
  args: any[],
) {
  const details = getAdapterDetails(adapter, parameters, args);

  return new Promise((resolve, reject) => {
    let resolveFunc: CallResolveFunc;

    if (details.resolver) {
      resolveFunc = (data?: PluginResultData) =>
        details.resolver(resolve, data);
    } else {
      resolveFunc = (data?: PluginResultData) => {
        // If there is only one property in data, return it bare
        if (data) {
          const keys = Object.keys(data);

          if (keys.length === 1) {
            return resolve(data[keys[0]]);
          }
        }

        resolve(data);
      };
    }

    let rejectFunc: CallRejectFunc;

    if (details.rejecter) {
      rejectFunc = (error: PluginResultError) =>
        details.rejecter(reject, error);
    } else {
      rejectFunc = reject;
    }

    Capacitor.toNative(this.config.name, methodName, details.options, {
      resolve: (data?: PluginResultData) => {
        resolveFunc(data);
      },
      reject: (error: PluginResultError) => {
        rejectFunc(error);
      },
    });
  });
}

function getAdapterDetails(
  adapter: NativeAdapter,
  parameters: string[],
  args: any[],
) {
  let details: NativeAdapterDetails = {};
  const options = marshalOptions(parameters, args);

  if (adapter) {
    // If we have an adapter, check to see if it's an object or a function.
    if (typeof adapter === 'function') {
      details = adapter(options);
    } else {
      details = adapter;

      // If there is an options adapter, call it
      if (typeof details.options === 'function') {
        details.options = details.options(options);
      }
    }
  } else {
    // If there is no adapter, just pass the options
    details.options = options;
  }

  return details;
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
const kArgumentsRegExp = /\(([\s\S]*?)\)/;
const kReplaceRegExp = /[ ,\n\r\t]+/;

function getParameterNames(func: Function) {
  const args = kArgumentsRegExp.exec(func.toString())[1].trim();

  if (args.length === 0) {
    return [];
  }

  return args.split(kReplaceRegExp);
}
