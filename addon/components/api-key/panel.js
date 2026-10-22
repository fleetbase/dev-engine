import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { task } from 'ember-concurrency';
import { shortUrl, timeAgo } from '../../utils/format';
import { endpointHealth, HEALTH_BADGE } from '../widget/endpoint-health';

/**
 * The API key detail drawer: facts, linked webhook endpoints and the key's
 * channel, recent requests. Opened by the developer-panels service.
 */
export default class ApiKeyPanelComponent extends Component {
    @service store;
    @service hostRouter;
    @service apiKeyActions;
    @service currentUser;

    @tracked webhooks = [];
    @tracked requests = [];
    @tracked error = null;

    constructor() {
        super(...arguments);
        this.load.perform();
    }

    get apiKey() {
        return this.args.resource ?? this.args.model;
    }

    get isExpired() {
        const { expires_at } = this.apiKey ?? {};

        if (!expires_at) {
            return false;
        }

        return new Date(expires_at).getTime() < Date.now();
    }

    get environmentBadge() {
        if (this.isExpired) {
            return { status: 'danger', text: 'Expired' };
        }

        return this.apiKey?.test_mode ? { status: 'warning', text: 'Test' } : { status: 'success', text: 'Live' };
    }

    get origins() {
        const origins = this.apiKey?.browser_origins;

        return Array.isArray(origins) ? origins : [];
    }

    get channelName() {
        return `api.${this.apiKey?.id}`;
    }

    get linkedWebhooks() {
        return this.webhooks.map((webhook) => {
            const health = endpointHealth({ status: webhook.status, success_rate: webhook.success_rate, deliveries: webhook.deliveries, failures: webhook.failures });

            return { webhook, shortUrl: shortUrl(webhook.url), health, badge: HEALTH_BADGE[health] };
        });
    }

    get recentRequests() {
        return this.requests.map((log) => ({ log, when: timeAgo(log.created_at) }));
    }

    @task *load() {
        const apiKey = this.apiKey;

        if (!apiKey?.id) {
            return;
        }

        try {
            const [webhooks, requests] = yield Promise.all([
                this.store.query('webhook-endpoint', { api_credential_uuid: apiKey.id, limit: 10 }),
                this.store.query('api-request-log', { key: apiKey.id, limit: 6, sort: '-created_at' }),
            ]);

            this.webhooks = Array.from(webhooks);
            this.requests = Array.from(requests);
            this.error = null;
        } catch (error) {
            this.error = error?.message ?? 'Unable to load';
        }
    }

    @action openWebhook(webhook) {
        this.args.close?.();
        return this.hostRouter.transitionTo('console.developers.webhooks.view', webhook);
    }

    @action watchChannel() {
        this.args.close?.();
        return this.apiKeyActions.watchChannel(this.apiKey);
    }

    @action viewRequests() {
        this.args.close?.();
        return this.apiKeyActions.viewRequestLogs(this.apiKey);
    }

    @action openRequest(log) {
        return this.hostRouter.transitionTo('console.developers.logs.view', log);
    }

    @action edit() {
        return this.apiKeyActions.editApiKey(this.apiKey);
    }
}
