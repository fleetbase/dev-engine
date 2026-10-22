import Service, { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { next } from '@ember/runloop';
import { action } from '@ember/object';
import { task } from 'ember-concurrency';

export const PERIODS = ['7d', '30d', '90d', '180d', '365d'];

/**
 * The dashboard's period and the KPI payload for it. Widgets only receive
 * `@widget` and `@options` from the dashboard grid, so the period lives here
 * and every widget reads it. KPIs are fetched once per period and shared by
 * the eight tiles instead of eight identical requests.
 */
export default class DeveloperMetricsService extends Service {
    @service fetch;
    @tracked period = '30d';
    @tracked kpis = null;
    @tracked kpisError = null;
    #kpisByPeriod = new Map();

    get periods() {
        return PERIODS;
    }

    get periodDays() {
        return parseInt(this.period, 10) || 30;
    }

    /**
     * The metric objects keyed by name: `{label, value, format, inverse, delta_percent}`.
     */
    get metrics() {
        return this.kpis?.metrics ?? {};
    }

    /**
     * True when the organization has no API traffic and no keys yet.
     */
    get isFirstIntegration() {
        const { metrics } = this;

        if (!this.kpis) {
            return false;
        }

        return Number(metrics.api_requests?.value ?? 0) === 0 && Number(metrics.active_api_keys?.value ?? 0) === 0;
    }

    @action setPeriod(period) {
        if (!PERIODS.includes(period) || period === this.period) {
            return;
        }

        this.period = period;
        this.loadKpis.perform();
    }

    /**
     * Widgets call this while rendering; the fetch starts on the next run loop
     * so nothing read during render is updated inside the same computation.
     */
    ensureKpis() {
        if (this.kpis || this.#kpisRequested === this.period) {
            return;
        }

        this.#kpisRequested = this.period;
        next(this, () => this.loadKpis.perform());
    }

    #kpisRequested = null;

    /**
     * Loads the KPIs for the current period, reusing a response already seen
     * unless `force` is set.
     */
    @task({ restartable: true }) *loadKpis(force = false) {
        const { period } = this;

        if (!force && this.#kpisByPeriod.has(period)) {
            this.kpis = this.#kpisByPeriod.get(period);
            this.kpisError = null;
            return this.kpis;
        }

        try {
            const kpis = yield this.fetch.get('metrics/dev/kpis', { period });
            this.#kpisByPeriod.set(period, kpis);
            this.kpis = kpis;
            this.kpisError = null;
            return kpis;
        } catch (error) {
            this.kpisError = error?.message ?? 'Unable to load metrics';
            return null;
        }
    }

    @action refreshKpis() {
        return this.loadKpis.perform(true);
    }

    /**
     * Fetches one of the `metrics/dev/*` endpoints for the current period.
     */
    fetchForPeriod(endpoint, params = {}) {
        return this.fetch.get(`metrics/dev/${endpoint}`, { period: this.period, ...params });
    }
}
