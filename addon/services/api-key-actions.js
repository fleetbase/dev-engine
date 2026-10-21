import ResourceActionService from '@fleetbase/ember-core/services/resource-action';
import { action } from '@ember/object';
import { getOwner } from '@ember/application';
import { later } from '@ember/runloop';
import { format as formatDate } from 'date-fns';
import getWithDefault from '@fleetbase/ember-core/utils/get-with-default';
import { maskKey } from '../utils/format';

/**
 * API key actions shared by the Developers console and other engines (for example Fleetbase AI).
 *
 * Create and roll are two-step dialogs: the form, then a reveal step that shows
 * the credential once with copy and an acknowledgement gate. The list never
 * shows the secret again.
 *
 * TODO(v1.1): the backend returns `secret` as a hash of the key on every
 * response today. Once it generates an independent one-time secret and hides
 * it from list responses, the reveal step shows the real secret with no other change here.
 */
export default class ApiKeyActionsService extends ResourceActionService {
    expirationOptions = ['never', 'immediately', 'in 1 hour', 'in 24 hours', 'in 3 days', 'in 7 days'];

    constructor() {
        super(...arguments);
        this.initialize('api-credential', { permissionPrefix: 'developers', mountPrefix: 'console.developers', registryResource: 'api-key' });
    }

    get developerPanels() {
        // The panels service lives in this engine, so resolve it through the engine's own owner.
        return getOwner(this).lookup('service:developer-panels') ?? null;
    }

    transition = {
        list: () => this.transitionTo('api-keys.index'),
    };

    modal = {
        create: (...args) => this.createApiKey(...args),
        edit: (...args) => this.editApiKey(...args),
        roll: (...args) => this.rollApiKey(...args),
        rename: (...args) => this.renameApiKey(...args),
        delete: (...args) => this.deleteApiKey(...args),
    };

    panel = {
        view: (...args) => this.viewApiKey(...args),
    };

    /**
     * The expiration options with translated labels for a Select.
     */
    get expirationChoices() {
        return this.expirationOptions.map((value) => ({ value, label: this.intl.t(`developers.api-keys.expiration.${value.replace(/\s+/g, '-')}`) }));
    }

    /**
     * Opens the key detail drawer.
     */
    @action viewApiKey(apiKey) {
        const panels = this.developerPanels;

        if (panels) {
            return panels.openApiKey(apiKey, { actionButtons: this.panelActionButtons(apiKey) });
        }

        return this.editApiKey(apiKey);
    }

    panelActionButtons(apiKey) {
        return [
            { id: 'edit', icon: 'pencil', size: 'sm', text: this.intl.t('developers.common.edit'), onClick: () => this.editApiKey(apiKey), permission: 'developers update api-key' },
            { id: 'roll', icon: 'rotate', size: 'sm', text: this.intl.t('developers.api-keys.actions.roll'), onClick: () => this.rollApiKey(apiKey), permission: 'developers roll api-key' },
            {
                id: 'more',
                icon: 'ellipsis',
                size: 'sm',
                items: [
                    { id: 'requests', icon: 'terminal', label: this.intl.t('developers.api-keys.actions.view-requests'), fn: () => this.viewRequestLogs(apiKey) },
                    { id: 'channel', icon: 'tower-broadcast', label: this.intl.t('developers.api-keys.actions.watch-channel'), fn: () => this.watchChannel(apiKey) },
                    { id: 'rename', icon: 'i-cursor', label: this.intl.t('developers.api-keys.actions.rename'), fn: () => this.renameApiKey(apiKey) },
                    { separator: true },
                    { id: 'delete', icon: 'trash', label: this.intl.t('developers.api-keys.actions.delete'), class: 'text-red-500', fn: () => this.deleteApiKey(apiKey) },
                ],
            },
        ];
    }

    /**
     * Step 1: the form. Step 2: the credential shown once.
     *
     * @void
     */
    @action createApiKey() {
        const formPermission = 'developers create api-key';
        const isSandbox = this.currentUser.getOption('sandbox') || false;
        const apiKey = this.store.createRecord('api-credential', {
            test_mode: isSandbox,
            browser_origins: [],
        });

        return this.modalsManager.show('modals/api-key-form', {
            title: this.intl.t('developers.api-keys.create.title'),
            modalClass: 'dev-modal modal-lg',
            acceptButtonText: this.intl.t('developers.api-keys.create.accept'),
            acceptButtonIcon: 'check',
            acceptButtonIconPrefix: 'fas',
            acceptButtonDisabled: this.abilities.cannot(formPermission),
            declineButtonIcon: 'times',
            declineButtonIconPrefix: 'fas',
            keepOpen: true,
            step: 'form',
            isNew: true,
            isSandbox,
            acknowledged: false,
            revealed: null,
            expirationChoices: this.expirationChoices,
            formPermission,
            apiKey,
            setExpiration: (value) => {
                apiKey.expires_at = value || null;
            },
            setOrigins: (origins) => {
                apiKey.browser_origins = origins;
            },
            toggleAck: (checked) => {
                this.modalsManager.setOption('acknowledged', checked);
                this.modalsManager.setOption('acceptButtonDisabled', !checked);
            },
            confirm: async (modal) => {
                if (modal.getOption('step') === 'reveal') {
                    modal.done();
                    return this.hostRouter.refresh();
                }

                if (this.abilities.cannot(formPermission)) {
                    return this.notifications.warning(this.intl.t('common.permissions-required-for-changes'));
                }

                modal.startLoading();

                try {
                    await apiKey.save();
                    modal.setOption('revealed', { key: apiKey.key, secret: apiKey.secret, name: apiKey.name });
                    modal.setOption('step', 'reveal');
                    modal.setOption('title', this.intl.t('developers.api-keys.create.reveal-title'));
                    modal.setOption('acceptButtonText', this.intl.t('developers.api-keys.create.done'));
                    modal.setOption('acceptButtonIcon', 'check');
                    modal.setOption('hideDeclineButton', true);
                    modal.setOption('closeButton', false);
                    modal.setOption('keyboard', false);
                    modal.setOption('acceptButtonDisabled', true);
                    modal.stopLoading();
                    this.notifications.success(this.intl.t('developers.api-keys.index.new-api-key-message'));
                } catch (error) {
                    this.notifications.serverError(error);
                    modal.stopLoading();
                }
            },
            decline: (modal) => {
                if (apiKey.isNew) {
                    apiKey.unloadRecord();
                }

                modal.done();
            },
        });
    }

    /**
     * Opens the dialog to edit an API key: name, expiration and browser origins.
     *
     * @void
     */
    @action editApiKey(apiKey, options = {}) {
        const formPermission = 'developers update api-key';
        const apiKeyName = getWithDefault(apiKey, 'name', this.intl.t('developers.api-keys.index.untitled'));

        return this.modalsManager.show('modals/api-key-form', {
            title: this.intl.t('developers.api-keys.edit.title', { apiKeyName }),
            modalClass: 'dev-modal modal-lg',
            acceptButtonText: this.intl.t('developers.api-keys.edit.accept'),
            acceptButtonIcon: 'save',
            acceptButtonDisabled: this.abilities.cannot(formPermission),
            declineButtonIcon: 'times',
            declineButtonIconPrefix: 'fas',
            step: 'form',
            isNew: false,
            isSandbox: Boolean(apiKey.test_mode),
            readOnly: this.abilities.cannot(formPermission),
            expirationChoices: this.expirationChoices,
            formPermission,
            apiKey,
            setExpiration: (value) => {
                apiKey.expires_at = value || null;
            },
            setOrigins: (origins) => {
                apiKey.browser_origins = origins;
            },
            confirm: async (modal) => {
                if (this.abilities.cannot(formPermission)) {
                    return this.notifications.warning(this.intl.t('common.permissions-required-for-changes'));
                }

                modal.startLoading();

                try {
                    await apiKey.save();
                    this.notifications.success(this.intl.t('developers.api-keys.index.edit-api-key-message'));
                    return this.hostRouter.refresh();
                } catch (error) {
                    this.notifications.serverError(error);
                    modal.stopLoading();
                }
            },
            decline: (modal) => {
                if (apiKey.hasDirtyAttributes) {
                    apiKey.rollbackAttributes();
                }

                modal.done();
            },
            ...options,
        });
    }

    /**
     * Rename only.
     *
     * @void
     */
    @action renameApiKey(apiKey, options = {}) {
        const formPermission = 'developers update api-key';
        const apiKeyName = getWithDefault(apiKey, 'name', this.intl.t('developers.api-keys.index.untitled'));

        return this.modalsManager.show('modals/rename-api-key-form', {
            title: this.intl.t('developers.api-keys.rename.title', { apiKeyName }),
            modalClass: 'dev-modal',
            acceptButtonText: this.intl.t('developers.api-keys.rename.accept'),
            acceptButtonIcon: 'check',
            acceptButtonDisabled: this.abilities.cannot(formPermission),
            apiKey,
            formPermission,
            confirm: async (modal) => {
                modal.startLoading();

                try {
                    await apiKey.save();
                    this.notifications.success(this.intl.t('developers.api-keys.index.rename-api-key-success-message', { apiKeyName: apiKey.name }));
                    modal.done();
                } catch (error) {
                    this.notifications.serverError(error);
                    modal.stopLoading();
                }
            },
            decline: (modal) => {
                if (apiKey.hasDirtyAttributes) {
                    apiKey.rollbackAttributes();
                }

                modal.done();
            },
            ...options,
        });
    }

    /**
     * Roll a key in two steps: choose when the old key expires and confirm the
     * password, then save the new credential shown once.
     *
     * @void
     */
    @action async rollApiKey(apiKey, options = {}) {
        const formPermission = 'developers roll api-key';
        const apiKeyName = getWithDefault(apiKey, 'name', this.intl.t('developers.api-keys.index.untitled'));
        const dependents = await this.loadDependents(apiKey);

        return this.modalsManager.show('modals/roll-api-key-form', {
            title: this.intl.t('developers.api-keys.roll.title', { apiKeyName }),
            modalClass: 'dev-modal modal-lg',
            acceptButtonText: this.intl.t('developers.api-keys.roll.accept'),
            acceptButtonIcon: 'rotate',
            acceptButtonDisabled: this.abilities.cannot(formPermission),
            declineButtonIcon: 'times',
            declineButtonIconPrefix: 'fas',
            keepOpen: true,
            step: 'form',
            expiration: 'in 24 hours',
            expirationChoices: this.expirationOptions.map((value) => ({ value, label: this.intl.t(`developers.api-keys.roll.expire.${value.replace(/\s+/g, '-')}`) })),
            password: null,
            acknowledged: false,
            revealed: null,
            dependents,
            user: this.currentUser.user,
            formPermission,
            apiKey,
            setExpiration: (value) => {
                this.modalsManager.setOption('expiration', value);
            },
            toggleAck: (checked) => {
                this.modalsManager.setOption('acknowledged', checked);
                this.modalsManager.setOption('acceptButtonDisabled', !checked);
            },
            viewRequestLogs: () => this.viewRequestLogs(apiKey),
            confirm: async (modal) => {
                if (modal.getOption('step') === 'reveal') {
                    modal.done();
                    return this.hostRouter.refresh();
                }

                if (this.abilities.cannot(formPermission)) {
                    return this.notifications.warning(this.intl.t('common.permissions-required-for-changes'));
                }

                modal.startLoading();

                try {
                    const response = await this.fetch.patch(
                        `api-credentials/roll/${apiKey.id}`,
                        { password: modal.getOption('password'), expiration: modal.getOption('expiration') },
                        { normalizeToEmberData: true }
                    );
                    const rolled = response?.apiCredential ?? response ?? apiKey;
                    modal.setOption('revealed', { key: rolled.key ?? apiKey.key, secret: rolled.secret ?? apiKey.secret, name: apiKeyName });
                    modal.setOption('step', 'reveal');
                    modal.setOption('title', this.intl.t('developers.api-keys.roll.reveal-title'));
                    modal.setOption('acceptButtonText', this.intl.t('developers.api-keys.create.done'));
                    modal.setOption('acceptButtonIcon', 'check');
                    modal.setOption('hideDeclineButton', true);
                    modal.setOption('closeButton', false);
                    modal.setOption('keyboard', false);
                    modal.setOption('acceptButtonDisabled', true);
                    modal.stopLoading();
                    this.notifications.success(this.intl.t('developers.api-keys.index.roll-api-key-success-message', { apiKeyName }));
                } catch (error) {
                    modal.setOption('error', error?.message ?? this.intl.t('developers.api-keys.index.roll-api-key-error-message'));
                    modal.stopLoading();
                }
            },
            ...options,
        });
    }

    /**
     * Delete with the dependents named.
     *
     * @void
     */
    @action async deleteApiKey(apiKey, options = {}) {
        const apiKeyName = getWithDefault(apiKey, 'name', this.intl.t('developers.api-keys.index.untitled'));
        const dependents = await this.loadDependents(apiKey);

        return this.modalsManager.confirm({
            title: this.intl.t('developers.api-keys.delete.title', { apiKeyName }),
            body: this.intl.t('developers.api-keys.delete.body', { count: dependents.webhooks.length }),
            acceptButtonText: this.intl.t('developers.api-keys.delete.accept'),
            acceptButtonScheme: 'danger',
            acceptButtonIcon: 'trash',
            confirm: async (modal) => {
                modal.startLoading();

                try {
                    await apiKey.destroyRecord();
                    this.notifications.success(this.intl.t('developers.api-keys.index.delete-api-key-success-message', { apiKeyName }));
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
     * Requests pre-filtered by this key.
     */
    @action viewRequestLogs(apiKey) {
        return this.hostRouter.transitionTo('console.developers.logs.index', { queryParams: { key: apiKey.id } });
    }

    /**
     * The key's own socket channel.
     */
    @action watchChannel(apiKey) {
        return this.hostRouter.transitionTo('console.developers.sockets.view', `api.${apiKey.id}`);
    }

    /**
     * Export the list.
     */
    @action exportApiKeys() {
        return this.modalsManager.show('modals/export-form', {
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
                    await this.fetch.download('api-credentials/export', { format }, { fileName: `api-credentials-${formatDate(new Date(), 'yyyy-MM-dd-HH:mm')}.${format}` });
                    later(this, () => modal.done(), 600);
                } catch (error) {
                    this.notifications.serverError(error, this.intl.t('developers.api-keys.index.export-api-error-message'));
                    modal.stopLoading();
                }
            },
        });
    }

    /**
     * Webhook endpoints that receive from this key.
     */
    async loadDependents(apiKey) {
        try {
            const webhooks = await this.store.query('webhook-endpoint', { api_credential_uuid: apiKey.id, limit: 25 });

            return { webhooks: webhooks.toArray ? webhooks.toArray() : Array.from(webhooks), channel: `api.${apiKey.id}` };
        } catch {
            return { webhooks: [], channel: `api.${apiKey.id}` };
        }
    }

    /**
     * A display label for a key.
     */
    labelFor(apiKey) {
        return apiKey?.name ?? maskKey(apiKey?.key);
    }
}
