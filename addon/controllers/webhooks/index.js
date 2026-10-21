import BaseController from '../base-controller';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { isBlank } from '@ember/utils';
import { timeout } from 'ember-concurrency';
import { task } from 'ember-concurrency-decorators';
import fromStore from '@fleetbase/ember-core/decorators/legacy-from-store';
import fetchFrom from '@fleetbase/ember-core/decorators/legacy-fetch-from';
import { endpointHealth, HEALTH_BADGE } from '../../components/widget/endpoint-health';
import { RETENTION_DAYS } from '../../utils/retention';

export default class WebhooksIndexController extends BaseController {
    @service webhookActions;
    @service devViewport;
    @service developerMetrics;
    @service currentUser;
    @service intl;
    @service hostRouter;
    @service abilities;

    @tracked page = 1;
    @tracked limit;
    @tracked sort;
    @tracked query;
    @tracked status;
    @tracked api_credential_uuid;
    @tracked version;
    @tracked table;

    /**
     * Endpoint health for the last 7 days keyed by endpoint id, joined client side.
     * TODO(v1.1): append success_rate_24h, failures_24h and last_delivery_at to the endpoint payload.
     */
    @tracked healthById = {};

    constructor() {
        super(...arguments);
        this.loadHealth.perform();
    }

    queryParams = this.webhookActions.queryParamsFor(['page', 'limit', 'sort', 'query', 'status', 'api_credential_uuid', 'version']);

    @fetchFrom('webhook-endpoints/versions') apiVersions;
    @fromStore('api-credential', { limit: -1 }) apiCredentials;

    retentionDays = RETENTION_DAYS;

    get isSandbox() {
        return this.currentUser.getOption('sandbox', false) === true;
    }

    /**
     * Header buttons. Extensions add to them through `developers:webhook:table:actions`.
     */
    get actionButtons() {
        return [
            {
                id: 'create',
                type: 'primary',
                icon: 'plus',
                iconPrefix: 'fas',
                text: this.intl.t('developers.webhooks.index.button-text'),
                onClick: this.createWebhook,
                permission: 'developers create webhook',
            },
        ];
    }

    get failingCount() {
        return Object.values(this.healthById).filter((item) => item.health === 'failing').length;
    }

    get columns() {
        return [
            {
                id: 'url',
                label: this.intl.t('developers.webhooks.index.endpoint'),
                valuePath: 'url',
                sortable: false,
                resizable: true,
                cellComponent: 'table/cell/identity',
                resourceType: 'webhook-endpoint',
                permission: 'developers view webhook',
                action: this.viewWebhook,
                wrapperClass: 'max-w-full',
                showStatusDot: true,
                statusPath: (webhook) => this.healthFor(webhook).health ?? webhook.status,
                badges: (webhook) => this.badgesFor(webhook),
                badgeLimit: 2,
            },
            {
                id: 'status',
                label: this.intl.t('developers.common.status'),
                valuePath: 'status',
                width: 120,
                sortable: false,
                filterable: true,
                filterLabel: this.intl.t('developers.common.status'),
                filterComponent: 'filter/select',
                filterOptions: [
                    { label: this.intl.t('developers.webhooks.status.enabled'), value: 'enabled' },
                    { label: this.intl.t('developers.webhooks.status.disabled'), value: 'disabled' },
                ],
                cellComponent: 'webhook/status-cell',
                cellComponentArgs: { healthFor: this.healthFor },
            },
            {
                id: 'events',
                label: this.intl.t('developers.webhooks.index.events'),
                valuePath: 'events',
                width: 160,
                sortable: false,
                cellComponent: 'webhook/events-cell',
            },
            {
                id: 'api-credential',
                label: this.intl.t('developers.webhooks.index.credential'),
                valuePath: 'api_credential_name',
                width: 160,
                hidden: this.devViewport.below(1024),
                sortable: false,
                filterable: true,
                filterParam: 'api_credential_uuid',
                filterLabel: this.intl.t('developers.webhooks.index.credential'),
                filterComponent: 'filter/select',
                filterOptionLabel: 'fullName',
                filterOptionValue: 'id',
                filterOptions: this.apiCredentials,
                cellComponent: 'webhook/credential-cell',
            },
            {
                id: 'success',
                label: this.intl.t('developers.webhooks.index.success-7d'),
                valuePath: 'id',
                width: 90,
                hidden: this.devViewport.below(1280),
                sortable: false,
                align: 'right',
                cellComponent: 'webhook/success-cell',
                cellComponentArgs: { healthFor: this.healthFor },
            },
            {
                id: 'last-delivery',
                label: this.intl.t('developers.webhooks.index.last-delivery'),
                valuePath: 'id',
                width: 130,
                hidden: this.devViewport.below(1100),
                sortable: false,
                cellComponent: 'webhook/last-delivery-cell',
                cellComponentArgs: { healthFor: this.healthFor },
            },
            {
                id: 'version',
                label: this.intl.t('developers.common.version'),
                valuePath: 'version',
                width: 90,
                hidden: this.devViewport.below(1440),
                sortable: false,
                filterable: true,
                filterLabel: this.intl.t('developers.common.version'),
                filterComponent: 'filter/select',
                filterOptions: this.apiVersions,
                cellClassNames: 'dev-mono',
            },
            {
                id: 'row-actions',
                label: '',
                cellComponent: 'table/cell/dropdown',
                ddButtonText: false,
                ddButtonIcon: 'ellipsis-h',
                ddButtonIconPrefix: 'fas',
                ddMenuLabel: null,
                cellClassNames: 'overflow-visible',
                wrapperClass: 'flex items-center justify-end mx-2',
                align: 'right',
                sticky: 'right',
                width: 50,
                actions: [
                    { id: 'view-webhook', label: this.intl.t('developers.webhooks.actions.view'), icon: 'paper-plane', fn: this.viewWebhook, permission: 'developers view webhook' },
                    {
                        id: 'test-webhook',
                        label: this.intl.t('developers.webhooks.actions.test'),
                        icon: 'vial',
                        fn: this.testWebhook,
                        disabled: true,
                        helpText: this.intl.t('developers.common.unavailable-later'),
                    },
                    { id: 'edit-webhook', label: this.intl.t('developers.webhooks.actions.edit'), icon: 'pencil', fn: this.editWebhook, permission: 'developers update webhook' },
                    { separator: true },
                    {
                        id: 'disable-webhook',
                        label: this.intl.t('developers.webhooks.actions.disable'),
                        icon: 'ban',
                        fn: this.disableWebhook,
                        permission: 'developers disable webhook',
                        isVisible: (webhook) => webhook.isEnabled,
                    },
                    {
                        id: 'enable-webhook',
                        label: this.intl.t('developers.webhooks.actions.enable'),
                        icon: 'check',
                        fn: this.enableWebhook,
                        permission: 'developers enable webhook',
                        isVisible: (webhook) => !webhook.isEnabled,
                    },
                    {
                        id: 'delete-webhook',
                        label: this.intl.t('developers.webhooks.actions.delete'),
                        icon: 'trash',
                        fn: this.deleteWebhook,
                        class: 'text-red-700 hover:text-red-800',
                        permission: 'developers delete webhook',
                    },
                ],
            },
        ];
    }

    get emptyState() {
        return {
            icon: 'globe',
            title: this.isSandbox ? this.intl.t('developers.webhooks.empty.title-test') : this.intl.t('developers.webhooks.empty.title-live'),
            message: this.intl.t('developers.webhooks.empty.message'),
            action: { label: this.intl.t('developers.webhooks.index.button-text'), icon: 'plus', onClick: this.createWebhook, permission: 'developers create webhook' },
        };
    }

    @action healthFor(webhook) {
        const item = this.healthById[webhook?.id] ?? null;

        if (!item) {
            return { health: webhook?.status === 'disabled' ? 'disabled' : null, badge: null };
        }

        return item;
    }

    badgesFor(webhook) {
        const badges = [];

        if (webhook.is_listening_on_all_events) {
            badges.push({ key: 'all-events', label: this.intl.t('developers.webhooks.badges.all-events'), class: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' });
        }

        badges.push(
            webhook.mode === 'test'
                ? { key: 'test', label: this.intl.t('developers.common.test'), class: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' }
                : { key: 'live', label: this.intl.t('developers.common.live'), class: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' }
        );

        return badges;
    }

    @task loadHealth = function* () {
        try {
            const data = yield this.developerMetrics.fetch.get('metrics/dev/endpoint-health', { period: '7d' });
            const byId = {};

            (data?.items ?? []).forEach((item) => {
                const health = endpointHealth(item);
                byId[item.id] = { ...item, health, badge: HEALTH_BADGE[health] };
            });

            this.healthById = byId;
        } catch {
            this.healthById = {};
        }
    };

    @task({ restartable: true }) *search({ target: { value } }) {
        if (isBlank(value)) {
            this.query = null;
            return;
        }

        yield timeout(250);

        if (this.page > 1) {
            this.page = 1;
        }

        this.query = value;
    }

    // Webhook dialogs live in the webhook-actions service so other engines can open them too.
    @action createWebhook(...args) {
        return this.webhookActions.createWebhook(...args);
    }

    @action editWebhook(...args) {
        return this.webhookActions.editWebhook(...args);
    }

    @action deleteWebhook(...args) {
        return this.webhookActions.deleteWebhook(...args);
    }

    @action disableWebhook(...args) {
        return this.webhookActions.disableWebhook(...args);
    }

    @action enableWebhook(...args) {
        return this.webhookActions.enableWebhook(...args);
    }

    // TODO(v2): POST webhook-endpoints/{id}/test does not exist yet.
    @action testWebhook() {
        return null;
    }

    @action viewWebhook(webhook) {
        return this.webhookActions.viewWebhook(webhook);
    }

    @action reload() {
        this.loadHealth.perform();
        return this.hostRouter.refresh();
    }
}
