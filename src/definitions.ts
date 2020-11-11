import {
  PluginResultData,
  PluginResultError,
} from '@capacitor/core';

/**
 * The options that are passed to a native plugin.
 */
export type CallOptions = { [key: string]: any };

/**
 * A function that is called when a native plugin calls resolve().
 */
export type CallResolveFunc = (data?: PluginResultData) => void;

/**
 * A function that an adapter returns if it wants to customize
 * the results returned by a native call to resolve().
 *
 * After creating/modifying the data you want to return, call resolve(myData).
 *
 * Example:
 *
 * function resolver(resolve: CallResolveFunc, data: PluginResultData) {
 *   data.homer = 'marge'
 *   resolve(data)
 * }
 *
 * @param {CallResolveFunc} resolve - Must be called to resolve the plugin call
 * @param {PluginResultData} data - The data returned by PluginCall.resolve()
 */
export type CallResolver = (
  resolve: CallResolveFunc,
  data: PluginResultData,
) => void;

/**
 * Capacitor plugins may also return an error code.
 */
export interface PluginError extends PluginResultError {
  code?: string;
}

/**
 * A function that is called when a native plugin calls reject().
 */
export type CallRejectFunc = (error: PluginError) => void;

/**
 * A function that an adapter returns if it wants to customize
 * the error returned by a native call to reject().
 *
 * After creating/modifying the error you want to return, call reject(myError).
 *
 * Example:
 *
 * function rejecter(error: CallRejectFunc, error: PluginError) {
 *   error.homer = 'marge'
 *   reject(error)
 * }
 *
 * @param {CallRejectFunc} reject - Must be called to reject the plugin call
 * @param {PluginError} error - The error object returned by PluginCall.reject()
 */
export type CallRejecter = (reject: CallRejectFunc, error: PluginError) => void;

/**
 * A native adapter may modify the options passed to a native plugin.
 * When a plugin method is called, if an OptionsAdapter was provided
 * on the adapter, it is called with the marshalled options passed to
 * the JavaScript method. The OptionsAdapter may modify the options
 * or return entirely new options.
 *
 * Example:
 *
 * function makeOptions(options: CallOptions) {
 *   options.homer = 'marge'
 *   return options
 * }
 */
export type OptionsAdapter = (options: CallOptions) => CallOptions;

/**
 * A native adapter must either be an object with this interface,
 * or a callable that returns an object with this interface.
 */
export interface NativeAdapterDetails {
  options?: CallOptions | OptionsAdapter;
  resolver?: CallResolver;
  rejecter?: CallRejecter;
}

export type NativeAdapterFunc = (options: CallOptions) => NativeAdapterDetails;

export type NativeAdapter = NativeAdapterDetails | NativeAdapterFunc;
