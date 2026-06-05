import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { task } from 'ember-concurrency';

export default class WidgetDevelopersKpiTileComponent extends Component {
    @service fetch;

    @tracked data = null;
    @tracked error = null;

    constructor() {
        super(...arguments);
        this.load.perform();
    }

    get metric() {
        return this.data?.metrics?.[this.args.metric] ?? {};
    }

    get title() {
        return this.args.title ?? this.metric.label ?? 'Metric';
    }

    get value() {
        const value = this.metric.value ?? 0;

        if (this.metric.format === 'percent') {
            return `${value}%`;
        }

        if (this.metric.format === 'duration') {
            return `${Number(value).toLocaleString()}ms`;
        }

        return Number(value).toLocaleString();
    }

    get deltaText() {
        const delta = this.metric.delta_percent;

        if (typeof delta !== 'number') {
            return 'Current';
        }

        return `${delta > 0 ? '+' : ''}${delta}%`;
    }

    get deltaStatus() {
        const delta = this.metric.delta_percent;

        if (typeof delta !== 'number' || delta === 0) {
            return 'info';
        }

        const positive = delta > 0;
        const isGood = this.metric.inverse ? !positive : positive;

        return isGood ? 'success' : 'danger';
    }

    get accentClass() {
        return `developers-kpi-accent-${this.args.accent ?? 'blue'}`;
    }

    @task *load() {
        try {
            this.data = yield this.fetch.get('metrics/dev/kpis', { period: this.args.period ?? '30d' });
            this.error = null;
        } catch (error) {
            this.error = error?.message ?? 'Unable to load metric';
        }
    }

    @action refresh() {
        this.load.perform();
    }
}
