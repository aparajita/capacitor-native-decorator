#! /usr/bin/env node
// $1 (optional) - path to the plugin.js file

import { existsSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';

const pluginMTemplate = `#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(__plugin__, "__plugin__",
__methods__
)
`;

const pluginEntryTemplate =
  '  CAP_PLUGIN_METHOD(__method__, CAPPluginReturnPromise);';

const pluginNameRE = /class\s+\w+\s+extends\s+core\.WebPlugin\s+\{\s*constructor\(\)\s*\{\s*super\(\{\s*name:\s*(['"])(.+?)\1\s*,/m;
const decoraterRE = /__decorate\(\[\s*native\(\)\s*],\s*(\w+)\.prototype,\s*"(.+?)",\s*null\);/gm;

const iosPath = path.join('ios', 'Plugin');
const pluginMPath = path.join(iosPath, 'Plugin.m');
let pluginPath: string;

function main() {
  checkPaths();

  try {
    const plugin = readFileSync(pluginPath, 'utf-8');
    const nameMatch = plugin.match(pluginNameRE);

    if (!nameMatch) {
      fail(`The plugin name could not be found in ${pluginPath}`);
    }

    const pluginName = nameMatch[2];

    const nativeMethods = [...plugin.matchAll(decoraterRE)].reduce(
      (result, match) => {
        result.push(pluginEntryTemplate.replace('__method__', match[2]));
        return result;
      },
      [],
    );

    const template = pluginMTemplate
      .replaceAll('__plugin__', pluginName)
      .replace('__methods__', nativeMethods.join('\n'));

    writeFileSync(pluginMPath, template, { encoding: 'utf-8' });
    console.log(`✅  Created ${pluginMPath}`);
  } catch (e) {
    fail(e.message);
  }
}

function checkPaths() {
  // Make sure the iOS plugin has been generated
  if (!existsSync(iosPath)) {
    fail('Couldn’t find the ios plugin — did you run `capacitor add ios`?');
  }

  pluginPath = path.join('dist', 'plugin.js');

  if (process.argv[2]) {
    pluginPath = process.argv[2];
  }

  if (!existsSync(pluginPath)) {
    fail('Couldn’t find the web plugin, run build first');
  }
}

function fail(message: string) {
  console.error('❌  ' + message);
  process.exit(1);
}

main();
