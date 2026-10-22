import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { shortUrl } from '../../../utils/format';

/**
 * Webhooks tab: endpoints that receive events from this key.
 */
export default class ApiKeyTabsWebhooksComponent extends Component {
    @service apiKeyInsights;
    @service hostRouter;
    @service webhookActions;

    get apiKey() {
        return this.args.resource ?? this.args.model;
    }

    get insights() {
        return this.apiKeyInsights.ensure(this.apiKey);
    }

    get rows() {
        return this.insights.webhooks.map((webhook) => ({ webhook, label: shortUrl(webhook.url) ?? webhook.url, events: Array.isArray(webhook.events) ? webhook.events.length : 0 }));
    }

    @action open(webhook) {
        this.args.close?.();
        return this.hostRouter.transitionTo('console.developers.webhooks.view', webhook.id);
    }

    @action add() {
        this.args.close?.();
        return this.webhookActions.createWebhook();
    }

    @action refresh() {
        return this.apiKeyInsights.refresh(this.apiKey);
    }
}
