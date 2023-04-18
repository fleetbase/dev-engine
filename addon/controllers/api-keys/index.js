import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action, computed } from '@ember/object';
import { isBlank } from '@ember/utils';
import { not } from '@ember/object/computed';
import { timeout } from 'ember-concurrency';
import { task } from 'ember-concurrency-decorators';

export default class ApiKeysIndexController extends Controller {
    @service currentUser;
    @service modalsManager;
    @service notifications;
    @service store;
    @service fetch;
    @service theme;
    @service hostRouter;
    @tracked testMode;
    @tracked page = 1;
    @tracked limit;
    @tracked sort;
    @tracked query;
    @not('isTestMode') isLiveMode;

    @computed('testMode') get isTestMode() {
        return this.testMode === true;
    }

    @computed('currentUser.options.testKey') get testKey() {
        return this.currentUser.getOption('testKey');
    }

    @computed('@model.@each.test_mode') get testKeys() {
        return this.model.filter((apiKey) => apiKey.test_mode);
    }

    queryParams = ['page', 'limit', 'sort'];
    expirationOptions = ['never', 'immediately', 'in 1 hour', 'in 24 hours', 'in 3 days', 'in 7 days'];

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

    constructor() {
        super(...arguments);

        this.testMode = this.currentUser.getOption('sandbox', false);
    }

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
        this.hostRouter.refresh();
    }

    /**
     * Toggles modal to create a new API key
     *
     * @void
     */
    @action createApiKey() {
        const apiKey = this.store.createRecord('api-credential');

        this.editApiKey(apiKey, {
            title: 'New API Key',
            acceptButtonIcon: 'check',
            acceptButtonIconPrefix: 'fas',
            apiKey,
        });
    }

    /**
     * Toggles modal to create a new API key
     *
     * @void
     */
    @action editApiKey(apiKey, options = {}) {
        // const changeset = new Changeset(apiKey, lookupValidator(ApiCredentialValidations), ApiCredentialValidations);

        this.modalsManager.show('modals/api-key-form', {
            title: 'Edit API Key',
            acceptButtonIcon: 'save',
            apiKey,
            expirationOptions: this.expirationOptions,
            testMode: this.currentUser.getOption('sandbox') || false,
            setExpiration: ({ target }) => {
                apiKey.expires_at = target.value || null;
            },
            confirm: (modal, done) => {
                modal.startLoading();

                apiKey
                    .save()
                    .then((apiKey) => {
                        this.notifications.success('New API Credentials created.');
                        this.table.addRow(apiKey);
                        return done();
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
                        this.table.removeRow(apiKey);
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
     * Toggles dialog to roll API key
     *
     * @void
     */
    @action rollApiKey(apiKey) {
        this.modalsManager.show('modals/roll-api-key', {
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
                        replaceTableRow(this.table, apiKey, 'id');
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
            setFormat: ({ target }) => {
                this.modalsManager.setOption('format', target.value || null);
            },
            confirm: (modal, done) => {
                const format = modal.getOption('format') || 'xlsx';
                modal.startLoading();
                this.fetch
                    .download(
                        `api-credentials/export`,
                        {
                            format,
                        },
                        {
                            fileName: `api-credentials-${moment().format('YYYY-MM-DD-HH:mm')}.${format}`,
                        }
                    )
                    .then(() => {
                        setTimeout(() => {
                            return done();
                        }, 600);
                    })
                    .catch((error) => {
                        modal.stopLoading();
                        this.notifications.serverError(error, 'Unable to download API credentials export.');
                    });
            },
        });
    }
}
