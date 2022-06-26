import type { PluginResultError } from '@capacitor/core'

/**
 * The options that are passed to a native plugin.
 */
export type CallOptions = Record<string, never>

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
  none,
  promise,
  callback
}

export interface DecoratedNativePlugin {
  getRegisteredPluginName: () => string
}
