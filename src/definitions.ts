import { PluginResultError } from '@capacitor/core';

/**
 * The options that are passed to a native plugin.
 */
export type CallOptions = { [key: string]: any };

/**
 * Capacitor plugins may also return an error code.
 */
export interface PluginError extends PluginResultError {
  code?: string;
}
