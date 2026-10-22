import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { task } from 'ember-concurrency';

function withShare(items = []) {
    const max = Math.max(...items.map((item) => Number(item.value ?? 0)), 1);

    return items.map((item) => ({ ...item, share: Math.max(2, Math.round((Number(item.value ?? 0) / max) * 100)), valueText: Number(item.value ?? 0).toLocaleString() }));
}

export default class WidgetEventStreamComponent extends Component {
    @service developerMetrics;

    @tracked data = null;
    @tracked error = null;

    constructor() {
        super(...arguments);
        this.load.perform();
    }

    get period() {
        return this.developerMetrics.period;
    }

    get types() {
        return withShare((this.data?.types ?? []).slice(0, 6));
    }

    get sources() {
        return withShare(this.data?.sources ?? []);
    }

    get total() {
        return Number(this.data?.total ?? 0).toLocaleString();
    }

    @task({ restartable: true }) *load() {
        try {
            this.data = yield this.developerMetrics.fetchForPeriod('events');
            this.error = null;
        } catch (error) {
            this.error = error?.message ?? 'Unable to load events';
        }
    }

    @action refresh() {
        this.load.perform();
    }
}
