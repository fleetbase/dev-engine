import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { task } from 'ember-concurrency';
import { shortUrl, timeAgo } from '../../utils/format';

/**
 * The health vocabulary every webhook surface shares: healthy ≥ 99.5%,
 * degraded ≥ 95%, failing below, with a 10-consecutive-failure guard.
 */
export function endpointHealth(item = {}) {
    if (item.status === 'disabled') {
        return 'disabled';
    }

    const rate = Number(item.success_rate);
    const failures = Number(item.failures ?? 0);
    const deliveries = Number(item.deliveries ?? 0);

    if (deliveries === 0) {
        return 'idle';
    }

    if (rate < 95 || failures >= 10) {
        return 'failing';
    }

    if (rate < 99.5) {
        return 'degraded';
    }

    return 'healthy';
}

export const HEALTH_BADGE = {
    healthy: 'success',
    degraded: 'warning',
    failing: 'danger',
    disabled: 'inactive',
    idle: 'info',
};

export const HEALTH_TONE = {
    healthy: 'is-green',
    degraded: 'is-amber',
    failing: 'is-red',
    disabled: 'is-gray',
    idle: 'is-gray',
};

export default class WidgetEndpointHealthComponent extends Component {
    @service developerMetrics;
    @service hostRouter;

    @tracked data = null;
    @tracked error = null;

    constructor() {
        super(...arguments);
        this.load.perform();
    }

    get period() {
        return this.developerMetrics.period;
    }

    get items() {
        return (this.data?.items ?? []).map((item) => {
            const health = endpointHealth(item);

            return {
                ...item,
                health,
                badge: HEALTH_BADGE[health],
                tone: HEALTH_TONE[health],
                shortUrl: shortUrl(item.url),
                lastDelivery: timeAgo(item.last_delivery_at),
                rateText: item.success_rate === null || item.success_rate === undefined ? '—' : `${Number(item.success_rate).toFixed(1)}%`,
            };
        });
    }

    @task({ restartable: true }) *load() {
        try {
            this.data = yield this.developerMetrics.fetchForPeriod('endpoint-health');
            this.error = null;
        } catch (error) {
            this.error = error?.message ?? 'Unable to load endpoints';
        }
    }

    @action refresh() {
        this.load.perform();
    }

    @action open(item) {
        return this.hostRouter.transitionTo('console.developers.webhooks.view', item.id);
    }
}
