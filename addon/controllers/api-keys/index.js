import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action, computed } from '@ember/object';
import { isBlank } from '@ember/utils';
import { not } from '@ember/object/computed';
import { timeout } from 'ember-concurrency';
import { later } from '@ember/runloop';
import { task } from 'ember-concurrency-decorators';
import { format as formatDate } from 'date-fns';
import getWithDefault from '@fleetbase/ember-core/utils/get-with-default';

export default class ApiKeysIndexController extends Controller {
    @service currentUser;
    @service intl;
    @service modalsManager;
    @service notifications;
    @service store;
    @service crud;
    @service fetch;
    @service theme;
    @service hostRouter;
    @service universe;
    @service abilities;

    /**
     * Queryable parameters for this controller's model
     *
     * @var {Array}
     */
    queryParams = ['page', 'limit', 'sort'];

    /**
     * Expiration options for api keys
     *
     * @var {Array}
     */
    expirationOptions = ['never', 'immediately', 'in 1 hour', 'in 24 hours', 'in 3 days', 'in 7 days'];

    /**
     * Tracks the current console environment mode
     *
     * @memberof ApiKeysIndexController
     */
    @tracked testMode = false;

    /**
     * The current page of data being viewed
     *
     * @var {Integer}
     */
    @tracked page = 1;

    /**
     * The maximum number of items to show per page
     *
     * @var {Integer}
     */
    @tracked limit;

    /**
     * The param to sort the data on, the param with prepended `-` is descending
     *
     * @var {String}
     */
    @tracked sort;

    /**
     * The param to query the data by
     *
     * @var {String}
     */
    @tracked query;

    /**
     * Checks if console environment is in live mode
     *
     * @memberof ApiKeysIndexController
     */
    @not('isTestMode') isLiveMode;

    /**
     * Checks if console environment is in test mode
     *
     * @memberof ApiKeysIndexController
     */
    @computed('testMode') get isTestMode() {
        return this.testMode === true;
    }

    /**
     * gets the user selected key to view data from
     *
     * @memberof ApiKeysIndexController
     */
    @computed('currentUser.options.testKey') get testKey() {
        return this.currentUser.getOption('testKey');
    }

    /**
     * Columns for table component.
     *
     * @var {Array}
     */
    @tracked columns = [
        {
            sticky: true,
            label: this.intl.t('developers.common.name'),
            valuePath: 'name',
            cellComponent: 'table/cell/anchor',
            permission: 'developers view api-key',
            action: this.editApiKey,
            resizable: true,
            sortable: false,
        },
        {
            label: this.intl.t('developers.api-keys.index.public-key'),
            valuePath: 'key',
            sortable: false,
            resizable: true,
            cellComponent: 'click-to-copy',
        },
        {
            label: this.intl.t('developers.api-keys.index.secret-key'),
            valuePath: 'secret',
            sortable: false,
            resizable: true,
            width: 100,
            cellComponent: 'click-to-reveal',
            cellComponentArgs: {
                clickToCopy: true,
                wrapperClass: 'w-72',
            },
        },
        {
            label: this.intl.t('developers.api-keys.index.enviroment'),
            valuePath: 'environment',
            sortable: false,
            resizable: true,
            cellComponent: 'table/cell/status',
        },
        {
            label: this.intl.t('developers.api-keys.index.expiry'),
            valuePath: 'expiresAt',
            sortable: false,
            tooltip: true,
            resizable: true,
            cellClassNames: 'overflow-visible',
        },
        {
            label: this.intl.t('developers.api-keys.index.last-used'),
            valuePath: 'lastUsed',
            sortable: false,
            tooltip: true,
            resizable: true,
            cellClassNames: 'overflow-visible',
        },
        {
            label: this.intl.t('developers.common.created'),
            valuePath: 'createdAt',
            sortable: false,
            tooltip: true,
            resizable: true,
            cellClassNames: 'overflow-visible',
        },
        {
            label: '',
            cellComponent: 'table/cell/dropdown',
            ddButtonText: false,
            ddButtonIcon: 'ellipsis-h',
            ddButtonIconPrefix: 'fas',
            ddMenuLabel: 'API Key Actions',
            cellClassNames: 'overflow-visible',
            wrapperClass: 'flex items-center justify-end mx-2',
            align: 'right',
            sticky: 'right',
            width: 60,
            actions: [
                {
                    label: this.intl.t('developers.api-keys.index.edit-key'),
                    fn: this.editApiKey,
                    permission: 'developers view api-key',
                },
                {
                    label: this.intl.t('developers.api-keys.index.roll-key'),
                    fn: this.rollApiKey,
                    permission: 'developers roll api-key',
                },
                {
                    label: this.intl.t('developers.api-keys.index.view-logs'),
                    fn: this.viewRequestLogs,
                    permission: 'developers view log',
                },
                {
                    label: this.intl.t('developers.api-keys.index.delete-key'),
                    fn: this.deleteApiKey,
                    className: 'text-red-700 hover:text-red-800',
                    permission: 'developers delete api-key',
                },
            ],
        },
    ];

    /**
     * The search task.
     *
     * @void
     */
    @task({ restartable: true }) *search({ target: { value } }) {
        // if no query don't search
        if (isBlank(value)) {
            this.query = null;
            return;
        }

        // timeout for typing
        yield timeout(250);

        // reset page for results
        if (this.page > 1) {
            this.page = 1;
        }

        // update the query param
        this.query = value;
    }

    /**
     * Toggle test mode
     *
     * @void
     */
    @action toggleTestMode(testMode = false) {
        this.currentUser.setOption('sandbox', testMode);
        this.testMode = testMode;
        this.theme.setEnvironment();
        this.store.unloadAll();
        this.hostRouter.refresh().then(() => {
            this.currentUser.setOption('testKey', this.model?.firstObject?.key);
        });
    }

    /**
     * Toggle test key
     *
     * @void
     */
    @action toggleTestKey({ target: { value } }) {
        if (isBlank(value)) {
            this.currentUser.setOption('testKey', null);
            return;
        }

        this.currentUser.setOption('testKey', value);
    }

    /**
     * Toggles modal to create a new API key
     *
     * @void
     */
    @action createApiKey() {
        const formPermission = 'developers create api-key';
        const apiKey = this.store.createRecord('api-credential', {
            test_mode: this.testMode,
        });

        this.editApiKey(apiKey, {
            title: this.intl.t('developers.api-keys.index.new-api-key-title'),
            acceptButtonIcon: 'check',
            acceptButtonIconPrefix: 'fas',
            acceptButtonDisabled: this.abilities.cannot(formPermission),
            acceptButtonHelpText: this.abilities.cannot(formPermission) ? this.intl.t('common.unauthorized') : null,
            successMessage: this.intl.t('developers.api-keys.index.new-api-key-message'),
            formPermission,
            apiKey,
            confirm: async (modal) => {
                modal.startLoading();

                if (this.abilities.cannot(formPermission)) {
                    return this.notifications.warning(this.intl.t('common.permissions-required-for-changes'));
                }

                try {
                    await apiKey.save();
                    this.notifications.success(modal.getOption('successMessage'));
                    return this.hostRouter.refresh();
                } catch (error) {
                    this.notifications.serverError(error);
                    modal.stopLoading();
                }
            },
        });
    }

    /**
     * Toggles modal to create a new API key
     *
     * @void
     */
    @action editApiKey(apiKey, options = {}) {
        const formPermission = 'developers update api-key';
        this.modalsManager.show('modals/api-key-form', {
            title: this.intl.t('developers.api-keys.index.edit-api-key-title'),
            acceptButtonIcon: 'save',
            acceptButtonDisabled: this.abilities.cannot(formPermission),
            acceptButtonHelpText: this.abilities.cannot(formPermission) ? this.intl.t('common.unauthorized') : null,
            successMessage: this.intl.t('developers.api-keys.index.edit-api-key-message'),
            expirationOptions: this.expirationOptions,
            testMode: this.currentUser.getOption('sandbox') || false,
            apiKey,
            formPermission,
            setExpiration: ({ target }) => {
                apiKey.expires_at = target.value || null;
            },
            confirm: async (modal) => {
                modal.startLoading();

                if (this.abilities.cannot(formPermission)) {
                    return this.notifications.warning(this.intl.t('common.permissions-required-for-changes'));
                }

                try {
                    await apiKey.save();
                    this.notifications.success(modal.getOption('successMessage'));
                    return this.hostRouter.refresh();
                } catch (error) {
                    this.notifications.serverError(error);
                    modal.stopLoading();
                }
            },
            ...options,
        });
    }

    /**
     * Toggles modal to create a new API key
     *
     * @void
     */
    @action renameApiKey(apiKey) {
        const formPermission = 'developers update api-key';
        const apiKeyName = getWithDefault(apiKey, 'name', this.intl.t('developers.api-keys.index.untitled'));

        this.modalsManager.show('modals/rename-api-key-form', {
            title: this.intl.t('developers.api-keys.index.rename-api-key-title', { apiKeyName }),
            acceptButtonDisabled: this.abilities.cannot(formPermission),
            acceptButtonHelpText: this.abilities.cannot(formPermission) ? this.intl.t('common.unauthorized') : null,
            apiKey,
            formPermission,
            confirm: async (modal) => {
                modal.startLoading();

                try {
                    await apiKey.save();
                    this.notifications.success(this.intl.t('developers.api-keys.index.rename-api-key-success-message', { apiKeyName }));
                    modal.done();
                } catch (error) {
                    this.notifications.serverError(error);
                    modal.stopLoading();
                }
            },
        });
    }

    /**
     * Toggles dialog to delete API key
     *
     * @void
     */
    @action deleteApiKey(apiKey) {
        const apiKeyName = getWithDefault(apiKey, 'name', this.intl.t('developers.api-keys.index.untitled'));
        this.modalsManager.confirm({
            title: this.intl.t('developers.api-keys.index.delete-api-key-title', { apiKeyName }),
            body: this.intl.t('developers.api-keys.index.delete-api-key-body'),
            confirm: async (modal) => {
                modal.startLoading();

                try {
                    await apiKey.destroyRecord();
                    this.notifications.success(this.intl.t('developers.api-keys.index.delete-api-key-title', { apiKeyName }));
                    return this.hostRouter.refresh();
                } catch (error) {
                    this.notifications.serverError(error);
                    modal.stopLoading();
                }
            },
        });
    }

    /**
     * Bulk deletes selected `api-credential` via confirm prompt
     *
     * @param {Array} selected an array of selected models
     * @void
     */
    @action bulkDeleteApiCredentials() {
        const selected = this.table.selectedRows;

        this.crud.bulkDelete(selected, {
            acceptButtonText: this.intl.t('developers.api-keys.index.delete-accept-button-text'),
            onSuccess: () => {
                this.hostRouter.refresh();
            },
        });
    }

    /**
     * Toggles dialog to roll API key
     *
     * @void
     */
    @action rollApiKey(apiKey) {
        const formPermission = 'developers roll api-key';
        const apiKeyName = getWithDefault(apiKey, 'name', this.intl.t('developers.api-keys.index.untitled'));

        this.modalsManager.show('modals/roll-api-key-form', {
            title: this.intl.t('developers.api-keys.index.roll-api-key', { apiKeyName }),
            modalClass: 'roll-key-modal',
            acceptButtonText: this.intl.t('developers.api-keys.index.roll-api-key-button-text'),
            acceptButtonDisabled: this.abilities.cannot(formPermission),
            acceptButtonHelpText: this.abilities.cannot(formPermission) ? this.intl.t('common.unauthorized') : null,
            user: this.currentUser.user,
            expirationOptions: this.expirationOptions,
            setExpiration: ({ target }) => {
                apiKey.expires_at = target.value || null;
            },
            viewRequestLogs: this.viewRequestLogs,
            password: null,
            formPermission,
            apiKey,
            confirm: async (modal) => {
                modal.startLoading();

                try {
                    await this.fetch.patch(
                        `api-credentials/roll/${apiKey.id}`,
                        { password: modal.getOption('password'), expiration: apiKey.get('expires_at') },
                        { normalizeToEmberData: true }
                    );
                    this.notifications.success(this.intl.t('developers.api-keys.index.roll-api-key-success-message', { apiKeyName }));
                    modal.done();
                } catch (error) {
                    this.notifications.serverError(error, this.intl.t('developers.api-keys.index.roll-api-key-error-message'));
                    modal.stopLoading();
                }
            },
        });
    }

    /**
     * Redirects user to request logs for this api key
     *
     * @void
     */
    @action viewRequestLogs(apiKey) {
        return this.hostRouter.transitionTo('console.developers.logs.index', {
            queryParams: { key: apiKey.id },
        });
    }

    /**
     * Toggles dialog to export API credentials
     *
     * @void
     */
    @action exportApiKeys() {
        this.modalsManager.show('modals/export-form', {
            title: this.intl.t('developers.api-keys.index.export-api'),
            acceptButtonText: this.intl.t('developers.api-keys.index.export-api-accept-button-text'),
            formatOptions: ['csv', 'xlsx', 'xls', 'html', 'pdf'],
            format: 'xlsx',
            setFormat: ({ target }) => {
                this.modalsManager.setOption('format', target.value || null);
            },
            confirm: async (modal) => {
                modal.startLoading();

                const format = modal.getOption('format', 'xlsx');

                try {
                    await this.fetch.download(
                        `api-credentials/export`,
                        {
                            format,
                        },
                        {
                            fileName: `api-credentials-${formatDate(new Date(), 'yyyy-MM-dd-HH:mm')}.${format}`,
                        }
                    );
                    later(
                        this,
                        () => {
                            return modal.done();
                        },
                        600
                    );
                } catch (error) {
                    this.notifications.serverError(error, this.intl.t('developers.api-keys.index.export-api-error-message'));
                    modal.stopLoading();
                }
            },
        });
    }

    /**
     * Reload data.
     */
    @action reload() {
        return this.hostRouter.refresh();
    }
}
