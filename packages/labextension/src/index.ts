import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
} from '@jupyterlab/application';

import { IStatusBar } from '@jupyterlab/statusbar';

import { ITranslator } from '@jupyterlab/translation';

import { MemoryUsage } from './memoryUsage';

import { CpuUsage } from './cpuUsage';

/**
 * Initialization data for the jupyter-resource-usage-mem extension.
 */
const memory_extension: JupyterFrontEndPlugin<void> = {
  id: '@jupyter-server/resource-usage:memory-status-item',
  autoStart: true,
  requires: [IStatusBar, ITranslator],
  activate: (
    app: JupyterFrontEnd,
    statusBar: IStatusBar,
    translator: ITranslator
  ) => {
    const item = new MemoryUsage(translator);

    statusBar.registerStatusItem(memory_extension.id, {
      item,
      align: 'left',
      rank: 3,
      isActive: () => item.model.metricsAvailable,
      activeStateChanged: item.model.stateChanged,
    });
  },
};

// export default memory_extension;
  
/**
 * Initialization data for the jupyter-resource-usage-cpu extension.
 */
const cpu_extension: JupyterFrontEndPlugin<void> = {
  id: '@jupyter-server/resource-usage:cpu-status-item',
  autoStart: true,
  requires: [IStatusBar, ITranslator],
  activate: (
    app: JupyterFrontEnd,
    statusBar: IStatusBar,
    translator: ITranslator,
  ) => {
    const item = new CpuUsage(translator);

    statusBar.registerStatusItem(cpu_extension.id, {
      item,
      align: 'left',
      rank: 1,
      isActive: () => item.model.metricsAvailable,
      activeStateChanged: item.model.stateChanged,
    });
  },
};
    
export default cpu_extension;