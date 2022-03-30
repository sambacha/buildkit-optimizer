/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://disco3.io/license
 */

import type { Compiler, Module } from 'webpack';

interface ModuleData {
  resourceResolveData?: { descriptionFileData?: { typings?: string } };
}

export class BuildOptimizerWebpackPlugin {
  apply(compiler: Compiler) {
    compiler.hooks.normalModuleFactory.tap('BuildOptimizerWebpackPlugin', (nmf) => {
      nmf.hooks.module.tap('BuildOptimizerWebpackPlugin', (module: Module, data: ModuleData) => {
        if (data.resourceResolveData?.descriptionFileData) {
          // Only TS packages should use Build Optimizer.
          // Notes:
          // - a TS package might not have defined typings but still use .d.ts files next to their
          // .js files. We don't cover that case because the Angular Package Format (APF) calls for
          // using the Typings field and Build Optimizer is geared towards APF. Maybe we could
          // provide configuration options to the plugin to cover that case if there's demand.
          // - a JS-only package that also happens to provides typings will also be flagged by this
          // check. Not sure there's a good way to skip those.
          const skipBuildOptimizer = !data.resourceResolveData.descriptionFileData.typings;
          module.factoryMeta = { ...module.factoryMeta, skipBuildOptimizer };
        }

        return module;
      });
    });
  }
}
