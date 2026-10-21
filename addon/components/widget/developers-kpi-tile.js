import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

/**
 * One KPI tile. Reads its metric from the shared developer-metrics service,
 * which fetches `metrics/dev/kpis` once per period for all tiles.
 */
export default class WidgetDevelopersKpiTileComponent extends Component {
    @service developerMetrics;
    @service intl;

    constructor() {
        super(...arguments);

        if (!this.developerMetrics.kpis && !this.developerMetrics.loadKpis.isRunning) {
            this.developerMetrics.loadKpis.perform();
        }
    }

    get isLoading() {
        return this.developerMetrics.loadKpis.isRunning && !this.developerMetrics.kpis;
    }

    get error() {
        return this.developerMetrics.kpisError;
    }

    get metric() {
        return this.developerMetrics.metrics[this.args.metric] ?? {};
    }

    get title() {
        return this.args.title ?? this.metric.label ?? 'Metric';
    }

    get value() {
        const value = this.metric.value ?? 0;

        if (this.metric.format === 'percent') {
            return `${Number(value).toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
        }

        if (this.metric.format === 'duration') {
            return `${Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })} ms`;
        }

        return Number(value).toLocaleString();
    }

    get hasDelta() {
        return typeof this.metric.delta_percent === 'number';
    }

    get deltaText() {
        const delta = this.metric.delta_percent;

        if (!this.hasDelta) {
            return this.intl.t('developers.dashboard.kpi.no-previous');
        }

        const sign = delta > 0 ? '+' : '';

        if (this.metric.format === 'percent') {
            return `${sign}${delta} pt`;
        }

        return `${sign}${delta}%`;
    }

    get deltaStatus() {
        const delta = this.metric.delta_percent;

        if (!this.hasDelta || delta === 0) {
            return 'info';
        }

        const positive = delta > 0;
        const isGood = this.metric.inverse ? !positive : positive;

        return isGood ? 'success' : 'danger';
    }

    get footnote() {
        return this.args.footnote ?? this.intl.t('developers.dashboard.kpi.vs-previous', { period: this.developerMetrics.period });
    }

    @action refresh() {
        this.developerMetrics.refreshKpis();
    }
}
