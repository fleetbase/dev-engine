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

export default class ApiKeysIndexController extends Controller {
    /**
     * Inject the `currentUser` service
     *
     * @var {Service}
     */
    @service currentUser;

    /**
     * Inject the `modalsManager` service
     *
     * @var {Service}
     */
    @service modalsManager;

    /**
     * Inject the `notifications` service
     *
     * @var {Service}
     */
    @service notifications;

    /**
     * Inject the `store` service
     *
     * @var {Service}
     */
    @service store;

    /**
     * Inject the `crud` service
     *
     * @var {Service}
     */
    @service crud;

    /**
     * Inject the `fetch` service
     *
     * @var {Service}
     */
    @service fetch;

    /**
     * Inject the `theme` service
     *
     * @var {Service}
     */
    @service theme;

    /**
     * Inject the `hostRouter` service
     *
     * @var {Service}
     */
    @service hostRouter;

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
            label: 'Name',
            valuePath: 'name',
            cellComponent: 'table/cell/anchor',
            action: this.editApiKey,
            width: '10%',
            sortable: false,
        },
        {
            label: 'Public Key',
            valuePath: 'key',
            width: '20%',
            sortable: false,
            cellComponent: 'click-to-copy',
        },
        {
            label: 'Secret Key',
            valuePath: 'secret',
            width: '20%',
            sortable: false,
            cellComponent: 'click-to-reveal',
        },
        {
            label: 'Environment',
            valuePath: 'environment',
            width: '12%',
            sortable: false,
            cellComponent: 'table/cell/status',
        },
        {
            label: 'Expiry',
            valuePath: 'expiresAt',
            sortable: false,
            width: '10%',
            tooltip: true,
            cellClassNames: 'overflow-visible',
        },
        {
            label: 'Last Used',
            valuePath: 'lastUsed',
            sortable: false,
            width: '10%',
            tooltip: true,
            cellClassNames: 'overflow-visible',
        },
        {
            label: 'Created',
            valuePath: 'createdAt',
            sortable: false,
            width: '10%',
            tooltip: true,
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
            width: '10%',
            align: 'right',
            actions: [
                { label: 'Edit key...', fn: this.editApiKey },
                { label: 'Roll key...', fn: this.rollApiKey },
                { label: 'View request logs...', fn: this.viewRequestLogs },
                {
                    label: 'Delete key...',
                    fn: this.deleteApiKey,
                    className: 'text-red-700 hover:text-red-800',
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
        const apiKey = this.store.createRecord('api-credential', {
            test_mode: this.testMode,
        });

        this.editApiKey(apiKey, {
            title: 'New API Key',
            acceptButtonIcon: 'check',
            acceptButtonIconPrefix: 'fas',
            successMessage: 'New API Credentials created.',
            apiKey,
        });
    }

    /**
     * Toggles modal to create a new API key
     *
     * @void
     */
    @action editApiKey(apiKey, options = {}) {
        this.modalsManager.show('modals/api-key-form', {
            title: 'Edit API Key',
            acceptButtonIcon: 'save',
            successMessage: 'API Credentials changes saved.',
            expirationOptions: this.expirationOptions,
            testMode: this.currentUser.getOption('sandbox') || false,
            apiKey,
            setExpiration: ({ target }) => {
                apiKey.expires_at = target.value || null;
            },
            confirm: (modal, done) => {
                modal.startLoading();

                apiKey
                    .save()
                    .then(() => {
                        this.notifications.success(modal.getOption('successMessage'));
                        return this.hostRouter.refresh().finally(() => {
                            done();
                        });
                    })
                    .catch((error) => {
                        this.notifications.serverError(error);
                        modal.stopLoading();
                    });
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
        this.modalsManager.show('modals/rename-api-key-form', {
            title: `Rename (${apiKey.name || 'Untitled'}) API Key`,
            apiKey,
            confirm: (modal, done) => {
                modal.startLoading();

                apiKey
                    .save()
                    .then((apiKey) => {
                        this.notifications.success(`API credential renamed to (${apiKey.name || 'Untitled'}).`);
                        return done();
                    })
                    .catch((error) => {
                        this.notifications.serverError(error);
                        modal.stopLoading();
                    });
            },
        });
    }

    /**
     * Toggles dialog to delete API key
     *
     * @void
     */
    @action deleteApiKey(apiKey) {
        this.modalsManager.confirm({
            title: `Delete (${apiKey.name || 'Untitled'}) API Key`,
            body: 'Are you sure you want to delete this API key? All of your data assosciated with this API key will become unreachable. This action cannot be undone.',
            confirm: (modal, done) => {
                modal.startLoading();

                apiKey
                    .destroyRecord()
                    .then((apiKey) => {
                        this.notifications.success(`API credential (${apiKey.name || 'Untitled'}) removed.`);
                        return this.hostRouter.refresh().finally(() => {
                            done();
                        });
                    })
                    .catch((error) => {
                        this.notifications.serverError(error);
                        modal.stopLoading();
                    });
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
            acceptButtonText: 'Delete API Credentials',
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
        this.modalsManager.show('modals/roll-api-key-form', {
            title: `Roll (${apiKey.name || 'Untitled'}) API Key`,
            modalClass: 'roll-key-modal',
            acceptButtonText: 'Roll API Key',
            user: this.currentUser.user,
            expirationOptions: this.expirationOptions,
            setExpiration: ({ target }) => {
                apiKey.expires_at = target.value || null;
            },
            viewRequestLogs: this.viewRequestLogs,
            password: null,
            apiKey,
            confirm: (modal, done) => {
                modal.startLoading();
                this.fetch
                    .patch(
                        `api-credentials/roll/${apiKey.id}`,
                        {
                            password: modal.getOption('password'),
                            expiration: apiKey.get('expires_at'),
                        },
                        { normalizeToEmberData: true }
                    )
                    .then((apiKey) => {
                        this.notifications.success(`API credential (${apiKey.name || 'Untitled'}) rolled.`);
                        return done();
                    })
                    .catch((error) => {
                        modal.stopLoading();
                        this.notifications.serverError(error, 'Unable to roll api credentials.');
                    });
            },
        });
    }

    /**
     * Redirects user to request logs for this api key
     *
     * @void
     */
    @action viewRequestLogs(apiKey) {
        return this.transitionToRoute('logs.index', {
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
            title: `Export API Credentials`,
            acceptButtonText: 'Download',
            formatOptions: ['csv', 'xlsx', 'xls', 'html', 'pdf'],
            format: 'xlsx',
            setFormat: ({ target }) => {
                this.modalsManager.setOption('format', target.value || null);
            },
            confirm: (modal, done) => {
                modal.startLoading();

                const format = modal.getOption('format', 'xlsx');

                this.fetch
                    .download(
                        `api-credentials/export`,
                        {
                            format,
                        },
                        {
                            fileName: `api-credentials-${formatDate(new Date(), 'yyyy-MM-dd-HH:mm')}.${format}`,
                        }
                    )
                    .then(() => {
                        later(
                            this,
                            () => {
                                return done();
                            },
                            600
                        );
                    })
                    .catch((error) => {
                        modal.stopLoading();
                        this.notifications.serverError(error, 'Unable to download API credentials export.');
                    });
            },
        });
    }
}
