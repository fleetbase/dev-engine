import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { task } from 'ember-concurrency';
import { timeAgo, formatMs } from '../../utils/format';

const ICONS = { webhook: 'paper-plane', event: 'bolt', api_request: 'terminal' };

function toneFor(item) {
    const status = String(item.status ?? '').toLowerCase();
    const code = parseInt(status, 10);

    if (status === 'failed' || status === 'error' || code >= 400) {
        return 'bad';
    }

    if (status === 'pending' || status === 'retrying') {
        return 'wait';
    }

    return 'ok';
}

export default class WidgetDeveloperActivityComponent extends Component {
    @service developerMetrics;
    @service developerPanels;
    @service store;

    @tracked data = null;
    @tracked error = null;

    constructor() {
        super(...arguments);
        this.load.perform();
    }

    get items() {
        return (this.data?.items ?? []).map((item) => ({
            ...item,
            icon: ICONS[item.type] ?? 'circle',
            tone: toneFor(item),
            when: timeAgo(item.created_at),
            duration: item.duration_ms ? formatMs(item.duration_ms) : null,
        }));
    }

    @task({ restartable: true }) *load() {
        try {
            this.data = yield this.developerMetrics.fetch.get('metrics/dev/activity', { limit: 12 });
            this.error = null;
        } catch (error) {
            this.error = error?.message ?? 'Unable to load activity';
        }
    }

    @action refresh() {
        this.load.perform();
    }
}
