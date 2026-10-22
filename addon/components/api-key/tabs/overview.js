import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { RETENTION_DAYS } from '../../../utils/retention';
import { shortUrl } from '../../../utils/format';

/**
 * Overview tab: usage tiles and bar strip from the request log sample, details,
 * linked webhooks and channel, and the activity we can read from the record.
 */
export default class ApiKeyTabsOverviewComponent extends Component {
    @service apiKeyInsights;
    @service apiKeyActions;
    @service developerPanels;
    @service hostRouter;
    @service intl;

    retentionDays = RETENTION_DAYS;

    get apiKey() {
        return this.args.resource ?? this.args.model;
    }

    get insights() {
        return this.apiKeyInsights.ensure(this.apiKey);
    }

    get origins() {
        const origins = this.apiKey?.browser_origins;

        return Array.isArray(origins) ? origins.filter(Boolean) : [];
    }

    get channelName() {
        return `api.${this.apiKey?.id}`;
    }

    get lastRequest() {
        return this.insights.logs[0] ?? null;
    }

    get linkedWebhooks() {
        return this.insights.webhooks.map((webhook) => ({ webhook, label: shortUrl(webhook.url) ?? webhook.url, status: webhook.status }));
    }

    get activity() {
        const items = [];

        if (this.apiKey?.updated_at && this.apiKey.updated_at !== this.apiKey.created_at) {
            items.push({ key: 'updated', tone: 'wait', at: this.apiKey.updated_at });
        }

        if (this.apiKey?.last_used_at) {
            items.push({ key: 'last-used', tone: 'ok', at: this.apiKey.last_used_at });
        }

        items.push({ key: 'created', tone: 'ok', at: this.apiKey?.created_at });

        const sorted = items.sort((a, b) => new Date(b.at) - new Date(a.at));

        return sorted.map((item, index) => ({ ...item, isLast: index === sorted.length - 1 }));
    }

    @action edit() {
        return this.apiKeyActions.editApiKey(this.apiKey);
    }

    @action roll() {
        return this.apiKeyActions.rollApiKey(this.apiKey);
    }

    @action openWebhook(webhook) {
        this.args.close?.();
        return this.hostRouter.transitionTo('console.developers.webhooks.view', webhook.id);
    }

    @action watchChannel() {
        this.args.close?.();
        return this.hostRouter.transitionTo('console.developers.sockets.view', this.channelName);
    }

    @action viewRequests() {
        this.args.close?.();
        return this.apiKeyActions.viewRequestLogs(this.apiKey);
    }

    @action refresh() {
        return this.apiKeyInsights.refresh(this.apiKey);
    }
}
