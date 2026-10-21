import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { isBlank } from '@ember/utils';
import { task, timeout } from 'ember-concurrency';
import { maskKey, timeAgo } from '../../utils/format';
import isRowControlClick from '../../utils/is-row-control-click';

export default class ApiKeysIndexController extends Controller {
    @service apiKeyActions;
    @service devViewport;
    @service currentUser;
    @service intl;
    @service modalsManager;
    @service notifications;
    @service store;
    @service crud;
    @service hostRouter;
    @service abilities;

    /**
     * Queryable parameters for this controller's model
     *
     * @var {Array}
     */
    queryParams = this.apiKeyActions.queryParamsFor(['page', 'limit', 'sort', 'query', 'view_api_key', 'expires_at', 'last_used_at']);

    @tracked page = 1;
    @tracked limit;
    @tracked sort;
    @tracked query;
    @tracked view_api_key;
    @tracked expires_at;
    @tracked last_used_at;
    @tracked table;

    get isSandbox() {
        return this.currentUser.getOption('sandbox', false) === true;
    }

    /**
     * Header buttons. Extensions add to them through `developers:api-key:table:actions`.
     *
     * @var {Array}
     */
    get actionButtons() {
        return [
            {
                id: 'export',
                icon: 'long-arrow-up',
                iconClass: 'rotate-icon-45',
                text: this.intl.t('developers.common.export'),
                onClick: this.exportApiKeys,
                permission: 'developers export api-key',
            },
            {
                id: 'create',
                type: 'primary',
                icon: 'plus',
                iconPrefix: 'fas',
                text: this.intl.t('developers.api-keys.index.create'),
                onClick: this.createApiKey,
                permission: 'developers create api-key',
            },
        ];
    }

    /**
     * Bulk actions for the selected rows. Extensions add to them through `developers:api-key:table:bulk-actions`.
     *
     * @var {Array}
     */
    get bulkActions() {
        return [
            {
                id: 'bulk-delete',
                label: this.intl.t('developers.api-keys.index.delete-api'),
                icon: 'trash',
                class: 'text-red-500',
                fn: this.bulkDeleteApiCredentials,
                permission: 'developers delete api-key',
            },
        ];
    }

    /**
     * Columns for table component.
     *
     * @var {Array}
     */
    get columns() {
        return [
            {
                id: 'name',
                label: this.intl.t('developers.api-keys.index.key'),
                valuePath: 'name',
                sortable: false,
                resizable: true,
                cellComponent: 'table/cell/identity',
                resourceType: 'api-credential',
                permission: 'developers view api-key',
                action: this.viewApiKey,
                wrapperClass: 'max-w-full',
                badgeLimit: 2,
                badges: (apiKey) => this.badgesFor(apiKey),
                showStatusDot: true,
            },
            {
                id: 'key',
                label: this.intl.t('developers.api-keys.index.public-key'),
                valuePath: 'key',
                width: 190,
                sortable: false,
                resizable: true,
                cellComponent: 'api-key/key-cell',
            },
            {
                id: 'expires-at',
                label: this.intl.t('developers.api-keys.index.expiry'),
                valuePath: 'expires_at',
                width: 130,
                sortable: false,
                filterable: true,
                filterParam: 'expires_at',
                filterLabel: this.intl.t('developers.api-keys.index.expiry'),
                filterComponent: 'filter/date',
                cellComponent: 'api-key/expiry-cell',
            },
            {
                id: 'last-used',
                label: this.intl.t('developers.api-keys.index.last-used'),
                valuePath: 'last_used_at',
                width: 130,
                hidden: this.devViewport.below(1100),
                sortable: false,
                filterable: true,
                filterParam: 'last_used_at',
                filterLabel: this.intl.t('developers.api-keys.index.last-used'),
                filterComponent: 'filter/date',
                cellComponent: 'api-key/last-used-cell',
            },
            {
                id: 'created-at',
                label: this.intl.t('developers.common.created'),
                valuePath: 'createdAtShort',
                width: 150,
                hidden: this.devViewport.below(1280),
                sortable: false,
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
                    { id: 'view-api-key', label: this.intl.t('developers.api-keys.actions.view'), icon: 'eye', fn: this.viewApiKey, permission: 'developers view api-key' },
                    {
                        id: 'view-request-logs',
                        label: this.intl.t('developers.api-keys.actions.view-requests'),
                        icon: 'terminal',
                        fn: this.viewRequestLogs,
                        permission: 'developers list log',
                    },
                    {
                        id: 'watch-channel',
                        label: this.intl.t('developers.api-keys.actions.watch-channel'),
                        icon: 'tower-broadcast',
                        fn: this.watchChannel,
                        permission: 'developers view socket',
                    },
                    { separator: true },
                    { id: 'edit-api-key', label: this.intl.t('developers.api-keys.actions.edit'), icon: 'pencil', fn: this.editApiKey, permission: 'developers update api-key' },
                    { id: 'rename-api-key', label: this.intl.t('developers.api-keys.actions.rename'), icon: 'i-cursor', fn: this.renameApiKey, permission: 'developers update api-key' },
                    { id: 'roll-api-key', label: this.intl.t('developers.api-keys.actions.roll'), icon: 'rotate', fn: this.rollApiKey, permission: 'developers roll api-key' },
                    { separator: true },
                    {
                        id: 'delete-api-key',
                        label: this.intl.t('developers.api-keys.actions.delete'),
                        icon: 'trash',
                        fn: this.deleteApiKey,
                        class: 'text-red-700 hover:text-red-800',
                        permission: 'developers delete api-key',
                    },
                ],
            },
        ];
    }

    /**
     * Identity badges: environment and expiry state.
     */
    badgesFor(apiKey) {
        const badges = [];
        const expiresAt = apiKey.expires_at ? new Date(apiKey.expires_at) : null;
        const now = Date.now();

        if (expiresAt && expiresAt.getTime() < now) {
            badges.push({ key: 'expired', label: this.intl.t('developers.api-keys.badges.expired'), class: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200' });
        } else if (expiresAt && expiresAt.getTime() - now < 30 * 86400000) {
            badges.push({
                key: 'expiring',
                label: this.intl.t('developers.api-keys.badges.expiring', { when: timeAgo(expiresAt)?.replace(' ago', '') ?? '' }),
                class: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
            });
        }

        if (apiKey.test_mode) {
            badges.push({ key: 'test', label: this.intl.t('developers.common.test'), class: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' });
        } else {
            badges.push({ key: 'live', label: this.intl.t('developers.common.live'), class: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' });
        }

        return badges;
    }

    /**
     * The empty-state copy for the table.
     */
    get emptyState() {
        return {
            icon: 'key',
            title: this.isSandbox ? this.intl.t('developers.api-keys.empty.title-test') : this.intl.t('developers.api-keys.empty.title-live'),
            message: this.intl.t('developers.api-keys.empty.message'),
            action: { label: this.intl.t('developers.api-keys.index.create'), icon: 'plus', onClick: this.createApiKey, permission: 'developers create api-key' },
        };
    }

    /**
     * The search task.
     *
     * @void
     */
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

    // Dialogs and navigation live in the api-key-actions service so other engines can open them too.
    @action createApiKey(...args) {
        return this.apiKeyActions.createApiKey(...args);
    }

    @action editApiKey(...args) {
        return this.apiKeyActions.editApiKey(...args);
    }

    @action viewApiKey(...args) {
        return this.apiKeyActions.viewApiKey(...args);
    }

    @action renameApiKey(...args) {
        return this.apiKeyActions.renameApiKey(...args);
    }

    @action rollApiKey(...args) {
        return this.apiKeyActions.rollApiKey(...args);
    }

    @action deleteApiKey(...args) {
        return this.apiKeyActions.deleteApiKey(...args);
    }

    @action viewRequestLogs(...args) {
        return this.apiKeyActions.viewRequestLogs(...args);
    }

    @action watchChannel(...args) {
        return this.apiKeyActions.watchChannel(...args);
    }

    @action exportApiKeys() {
        return this.apiKeyActions.exportApiKeys();
    }

    /**
     * Bulk deletes selected `api-credential` via confirm prompt
     *
     * @void
     */
    @action bulkDeleteApiCredentials() {
        const selected = this.table?.selectedRows ?? [];

        this.crud.bulkDelete(selected, {
            modelNamePath: 'name',
            acceptButtonText: this.intl.t('developers.api-keys.index.delete-accept-button-text'),
            onSuccess: () => {
                this.hostRouter.refresh();
            },
        });
    }

    /**
     * Reload data.
     */
    @action reload() {
        return this.hostRouter.refresh();
    }

    @action async openDeepLinkedApiKey() {
        const apiKeyId = this.view_api_key;

        if (!apiKeyId) {
            return;
        }

        try {
            const apiKey = this.store.peekRecord('api-credential', apiKeyId) ?? (await this.store.findRecord('api-credential', apiKeyId));
            this.editApiKey(apiKey, { onDecline: this.clearDeepLinkedApiKey, onFinish: this.clearDeepLinkedApiKey });
        } catch (_) {
            this.notifications.warning(this.intl.t('developers.api-keys.index.deep-link-error'));
            this.clearDeepLinkedApiKey();
        }
    }

    @action clearDeepLinkedApiKey() {
        if (!this.view_api_key) {
            return;
        }

        this.view_api_key = null;
        this.hostRouter.transitionTo({ queryParams: { view_api_key: null } });
    }

    maskKey(key) {
        return maskKey(key);
    }

    /**
     * Row clicks open the record unless the click landed on a control inside the row.
     */
    @action rowClick(row) {
        if (isRowControlClick()) {
            return;
        }

        return this.viewApiKey(row);
    }
}
