import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { task } from 'ember-concurrency';

export default class WidgetEndpointHealthComponent extends Component {
    @service fetch;

    @tracked data = null;
    @tracked error = null;

    constructor() {
        super(...arguments);
        this.load.perform();
    }

    get items() {
        return this.data?.items ?? [];
    }

    statusClass(item) {
        if (item.failures > 0 || item.success_rate < 95) {
            return 'text-rose-600 dark:text-rose-300';
        }

        return 'text-emerald-600 dark:text-emerald-300';
    }

    @task *load() {
        try {
            this.data = yield this.fetch.get('metrics/dev/endpoint-health', { period: this.args.period ?? '30d' });
            this.error = null;
        } catch (error) {
            this.error = error?.message ?? 'Unable to load endpoints';
        }
    }

    @action refresh() {
        this.load.perform();
    }
}
