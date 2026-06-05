import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { task } from 'ember-concurrency';

export default class WidgetEventStreamComponent extends Component {
    @service fetch;

    @tracked data = null;
    @tracked error = null;

    constructor() {
        super(...arguments);
        this.load.perform();
    }

    get types() {
        return this.data?.types ?? [];
    }

    get sources() {
        return this.data?.sources ?? [];
    }

    @task *load() {
        try {
            this.data = yield this.fetch.get('metrics/dev/events', { period: this.args.period ?? '30d' });
            this.error = null;
        } catch (error) {
            this.error = error?.message ?? 'Unable to load events';
        }
    }

    @action refresh() {
        this.load.perform();
    }
}
