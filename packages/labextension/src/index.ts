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
const extension: JupyterFrontEndPlugin<void> = {
  id: '@jupyter-server/resource-usage:memory-status-item',
  autoStart: true,
  requires: [IStatusBar, ITranslator],
  activate: (
    app: JupyterFrontEnd,
    statusBar: IStatusBar,
    translator: ITranslator
  ) => {

    const memItem = new MemoryUsage(translator);
    const cpuItem = new CpuUsage(translator);

    statusBar.registerStatusItem('cpuItem', {
      item: cpuItem,
      align: 'left',
      rank: 1,
      isActive: () => cpuItem.model.metricsAvailable,
      activeStateChanged: cpuItem.model.stateChanged,
    });

    statusBar.registerStatusItem('memoryItem', {
      item: memItem,
      align: 'left',
      rank: 2,
      isActive: () => memItem.model.metricsAvailable,
      activeStateChanged: memItem.model.stateChanged,
    });

  },
};

export default extension;
  