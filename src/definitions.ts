import type { PluginResultError } from '@capacitor/core'

/**
 * The options that are passed to a native plugin.
 */
export type CallOptions = Record<string, unknown>

/**
 * Capacitor plugins may also return an error code.
 */
export interface PluginError extends PluginResultError {
  code?: string
}

/**
 * The type of plugin call.
 */
export enum PluginReturnType {
  /**
   * The plugin call returns no data **and** will never reject.
   * If you return no data but might reject, use `PluginReturnType.promise`,
   * otherwise the promise on the TypeScript side will not reject.
   */
  none,

  /**
   * The plugin call returns data and/or it might reject.
   */
  promise,

  /**
   * The plugin call is passing a callback to be called repeatedly.
   * The native plugin will mark the call `keepAlive` and will
   * repeatedly resolve.
   */
  callback
}

export interface DecoratedNativePlugin {
  getRegisteredPluginName: () => string
}
