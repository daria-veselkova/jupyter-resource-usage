// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { VDomModel, VDomRenderer } from '@jupyterlab/apputils';

import { URLExt } from '@jupyterlab/coreutils';

import { TextItem } from '@jupyterlab/statusbar';

import { ServerConnection } from '@jupyterlab/services';

import {
  nullTranslator,
  ITranslator,
  TranslationBundle,
} from '@jupyterlab/translation';

import { Poll } from '@lumino/polling';

import React from 'react';

import { resourceItem } from './text';

/**
 * A VDomRenderer for showing cpu usage by a kernel.
 */
export class CpuUsage extends VDomRenderer<CpuUsage.Model> {
  /**
   * Construct a new cpu usage status item.
   */
  constructor(translator?: ITranslator) {
    super(new CpuUsage.Model({ refreshRate: 5000 }));
    this.translator = translator || nullTranslator;
    this._trans = this.translator.load('jupyterlab');
  }

  /**
   * Render the memory usage status item.
   */
  render(): JSX.Element {
    if (!this.model) {
      return <div></div>;
    }
    let text: string;
    if (this.model.cpuLimit === null) {
      text = this._trans.__(
        'CPU: %1',
        this.model.currentCpu.toFixed(Private.DECIMAL_PLACES),
      );
    } else {
      text = this._trans.__(
        'CPU: %1 / %2',
        this.model.currentCpu.toFixed(Private.DECIMAL_PLACES),
        this.model.cpuLimit,
      );
    }
    if (!this.model.usageWarning) {
      return (
        <TextItem
          title={this._trans.__('Current cpu usage')}
          source={text}
        />
      );
    } else {
      return (
        <TextItem
          title={this._trans.__('Current cpu usage')}
          source={text}
          className={resourceItem}
        />
      );
    }
  }

  protected translator: ITranslator;
  private _trans: TranslationBundle;
}

/**
 * A namespace for CpuUsage statics.
 */
export namespace CpuUsage {
  /**
   * A VDomModel for the cpu usage status item.
   */
  export class Model extends VDomModel {
    /**
     * Construct a new cpu usage model.
     *
     * @param options: the options for creating the model.
     */
    constructor(options: Model.IOptions) {
      super();
      this._poll = new Poll<Private.IMetricRequestResult>({
        factory: () => Private.factory(),
        frequency: {
          interval: options.refreshRate,
          backoff: true,
        },
        name: '@jupyterlab/statusbar:CpuUsage#metrics',
      });
      this._poll.ticked.connect((poll) => {
        const { payload, phase } = poll.state;
        if (phase === 'resolved') {
          this._updateMetricsValues(payload);
          return;
        }
        if (phase === 'rejected') {
          const oldMetricsAvailable = this._metricsAvailable;
          this._metricsAvailable = false;
          this._currentCpu = 0;
          this._cpuLimit = null;

          if (oldMetricsAvailable) {
            this.stateChanged.emit();
          }
          return;
        }
      });
    }

    /**
     * Whether the metrics server extension is available.
     */
    get metricsAvailable(): boolean {
      return this._metricsAvailable;
    }

    /**
     * The current cpu usage percent
     */
    get cpuPercent(): number {
        return this._cpuPercent;
    }

    /**
     * The current memory usage/
     */
    get currentCpu(): number {
      return this._currentCpu;
    }

    /**
     * The current memory limit, or null if not specified.
     */
    get cpuLimit(): number | null {
      return this._cpuLimit;
    }

    /**
     * The warning for memory usage.
     */
    get usageWarning(): boolean {
      return this._warn;
    }

    /**
     * Dispose of the memory usage model.
     */
    dispose(): void {
      super.dispose();
      this._poll.dispose();
    }

    /**
     * Given the results of the metrics request, update model values.
     */
    private _updateMetricsValues(
      value: Private.IMetricRequestResult | null
    ): void {
      const oldMetricsAvailable = this._metricsAvailable;
      const oldCpuPercent = this._cpuPercent;
      const oldCurrentCpu = this._currentCpu;
      const oldCpuLimit = this._cpuLimit;
      const oldUsageWarning = this._warn;

      if (value === null) {
        this._metricsAvailable = false;
        this._cpuPercent = 0;
        this._currentCpu = 0;
        this._cpuLimit = null;
        this._warn = false;
      } else {
        const cpuPercent = value.cpu_percent;
        const cpuLimit = value.cpu_count
          ? value.cpu_count : null;
        const currentCpu = cpuPercent / 100;
        const usageWarning = value.limits.cpu
          ? value.limits.cpu.warn : false;

        this._metricsAvailable = true;
        this._cpuPercent = cpuPercent;
        this._currentCpu = currentCpu;
        this._cpuLimit = cpuLimit
          ? cpuLimit : null;
        this._warn = usageWarning;
      }

      if (
        this._cpuPercent !== oldCpuPercent ||
        this._currentCpu !== oldCurrentCpu ||
        this._cpuLimit !== oldCpuLimit ||
        this._metricsAvailable !== oldMetricsAvailable ||
        this._warn !== oldUsageWarning
      ) {
        this.stateChanged.emit(void 0);
      }
    }

    private _cpuPercent = 0;
    private _currentCpu = 0;
    private _cpuLimit: number | null = null;
    private _metricsAvailable = false;
    private _poll: Poll<Private.IMetricRequestResult>;
    private _warn = false;
  }

  /**
   * A namespace for Model statics.
   */
  export namespace Model {
    /**
     * Options for creating a MemoryUsage model.
     */
    export interface IOptions {
      /**
       * The refresh rate (in ms) for querying the server.
       */
      refreshRate: number;
    }
  }
}
/**
 * A namespace for module private statics.
 */
namespace Private {
  /**
    * The number of decimal places to use when rendering memory usage.
  */
  export const DECIMAL_PLACES = 3;
  
  /**
   * Settings for making requests to the server.
   */
  const SERVER_CONNECTION_SETTINGS = ServerConnection.makeSettings();

  /**
   * The url endpoint for making requests to the server.
   */
  const METRIC_URL = URLExt.join(
    SERVER_CONNECTION_SETTINGS.baseUrl,
    'api/metrics/v1'
  );

  /**
   * The shape of a response from the metrics server extension.
   */
  export interface IMetricRequestResult {
    cpu_percent: number;
    cpu_count: number;
    limits: {
      cpu?: {
        warn: boolean;
      };
    };
  }

  /**
   * Make a request to the backend.
   */
  export async function factory(): Promise<IMetricRequestResult> {
    const request = ServerConnection.makeRequest(
      METRIC_URL,
      {},
      SERVER_CONNECTION_SETTINGS
    );
    const response = await request;
    return await response.json();
  }
}
