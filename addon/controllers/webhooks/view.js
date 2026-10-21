import BaseController from '../base-controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { task } from 'ember-concurrency';
import { endpointHealth, HEALTH_BADGE, HEALTH_TONE } from '../../components/widget/endpoint-health';
import { RETENTION_DAYS } from '../../utils/retention';
import { shortUrl, timeAgo } from '../../utils/format';

export default class WebhooksViewController extends BaseController {
    @service webhookActions;
    @service developerMetrics;
    @service intl;
    @service notifications;
    @service hostRouter;
    @service abilities;

    @tracked health = null;
    @tracked activeTab = 'deliveries';
    retentionDays = RETENTION_DAYS;

    get webhook() {
        return this.model;
    }

    get shortUrl() {
        return shortUrl(this.webhook?.url);
    }

    get healthState() {
        if (!this.webhook) {
            return 'idle';
        }

        if (this.webhook.status === 'disabled') {
            return 'disabled';
        }

        return this.health ? endpointHealth(this.health) : 'idle';
    }

    get healthBadge() {
        return HEALTH_BADGE[this.healthState] ?? 'info';
    }

    get healthTone() {
        return HEALTH_TONE[this.healthState] ?? 'is-gray';
    }

    get isFailing() {
        return this.healthState === 'failing';
    }

    get lastDelivery() {
        return timeAgo(this.health?.last_delivery_at);
    }

    get stats() {
        const health = this.health ?? {};
        const rate = health.success_rate === null || health.success_rate === undefined ? null : Number(health.success_rate);

        return [
            {
                label: this.intl.t('developers.webhooks.view.stat-success'),
                value: rate === null ? '—' : `${rate.toFixed(1)}%`,
                hint: this.intl.t('developers.webhooks.view.stat-success-hint'),
                tone: rate !== null && rate < 95 ? 'is-down' : '',
            },
            {
                label: this.intl.t('developers.webhooks.view.stat-deliveries'),
                value: Number(health.deliveries ?? 0).toLocaleString(),
                hint: this.intl.t('developers.webhooks.view.stat-deliveries-hint', { failed: Number(health.failures ?? 0).toLocaleString() }),
            },
            {
                label: this.intl.t('developers.webhooks.view.stat-duration'),
                value: health.average_duration_ms ? `${Math.round(health.average_duration_ms)} ms` : '—',
                hint: this.intl.t('developers.webhooks.view.stat-duration-hint'),
            },
            { label: this.intl.t('developers.webhooks.view.stat-last'), value: this.lastDelivery ?? '—', hint: this.intl.t('developers.webhooks.view.stat-last-hint', { days: 7 }) },
        ];
    }

    get tabs() {
        return [
            { id: 'deliveries', label: this.intl.t('developers.webhooks.view.tab-deliveries'), icon: 'paper-plane' },
            { id: 'details', label: this.intl.t('developers.webhooks.view.tab-details'), icon: 'circle-info' },
        ];
    }

    /**
     * Header buttons. Extensions add to them through `developers:webhook:details`.
     */
    get actionButtons() {
        const webhook = this.webhook;
        const toggle = webhook?.isEnabled
            ? {
                  id: 'disable',
                  icon: 'ban',
                  text: this.intl.t('developers.webhooks.view.disable-button-text'),
                  onClick: () => this.disableWebhook(webhook),
                  permission: 'developers disable webhook',
              }
            : {
                  id: 'enable',
                  type: 'primary',
                  icon: 'check',
                  text: this.intl.t('developers.webhooks.view.enable-button-text'),
                  onClick: () => this.enableWebhook(webhook),
                  permission: 'developers enable webhook',
              };

        return this.detailsActionButtons('webhook', webhook, [
            // TODO(v2): POST webhook-endpoints/{id}/test does not exist yet.
            { id: 'test', icon: 'vial', text: this.intl.t('developers.webhooks.view.send-button-text'), disabled: true, helpText: this.intl.t('developers.common.unavailable-later') },
            { id: 'edit', icon: 'pencil', text: this.intl.t('developers.common.edit'), onClick: () => this.editWebhook(webhook), permission: 'developers update webhook' },
            toggle,
            {
                id: 'more',
                icon: 'ellipsis',
                items: [
                    { id: 'refresh', icon: 'rotate', label: this.intl.t('common.reload-data'), fn: this.reload },
                    { id: 'delete', icon: 'trash', label: this.intl.t('developers.webhooks.view.delete-button-text'), class: 'text-red-500', fn: () => this.deleteWebhook(webhook) },
                ],
            },
        ]);
    }

    @task({ restartable: true }) *loadHealth() {
        if (!this.webhook?.id) {
            return;
        }

        try {
            const data = yield this.developerMetrics.fetch.get('metrics/dev/endpoint-health', { period: '7d' });
            this.health = (data?.items ?? []).find((item) => item.id === this.webhook.id) ?? null;
        } catch {
            this.health = null;
        }
    }

    @action setTab(tab) {
        this.activeTab = tab.id;
    }

    @action editWebhook(webhook) {
        return this.webhookActions.editWebhook(webhook, {
            confirm: async (modal) => {
                const urlError = this.webhookActions.validateUrl(webhook.url);

                if (urlError) {
                    modal.setOption('urlError', urlError);
                    return;
                }

                modal.startLoading();

                try {
                    await webhook.save();
                    this.notifications.success(this.intl.t('developers.webhooks.view.update-endpoint-success-message'));
                    modal.done();
                } catch (error) {
                    this.notifications.serverError(error);
                    modal.stopLoading();
                }
            },
        });
    }

    @action deleteWebhook(webhook) {
        return this.webhookActions.deleteWebhook(webhook, {
            onDeleted: () => this.hostRouter.transitionTo('console.developers.webhooks.index'),
        });
    }

    @action disableWebhook(webhook) {
        return this.webhookActions.disableWebhook(webhook);
    }

    @action enableWebhook(webhook) {
        return this.webhookActions.enableWebhook(webhook);
    }

    @action goBack() {
        return this.hostRouter.transitionTo('console.developers.webhooks.index');
    }

    @action reload() {
        this.loadHealth.perform();
        return this.hostRouter.refresh();
    }
}
