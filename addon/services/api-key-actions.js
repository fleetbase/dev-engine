import ResourceActionService from '@fleetbase/ember-core/services/resource-action';
import { action } from '@ember/object';

/**
 * API key actions shared by the Developers console and other engines (for example Fleetbase AI).
 */
export default class ApiKeyActionsService extends ResourceActionService {
    expirationOptions = ['never', 'immediately', 'in 1 hour', 'in 24 hours', 'in 3 days', 'in 7 days'];

    constructor() {
        super(...arguments);
        this.initialize('api-credential', { permissionPrefix: 'developers', mountPrefix: 'console.developers' });
    }

    transition = {
        list: () => this.transitionTo('api-keys.index'),
    };

    modal = {
        create: (...args) => this.createApiKey(...args),
        edit: (...args) => this.editApiKey(...args),
    };

    /**
     * Toggles modal to create a new API key
     *
     * @void
     */
    @action createApiKey() {
        const formPermission = 'developers create api-key';
        const apiKey = this.store.createRecord('api-credential', {
            test_mode: this.currentUser.getOption('sandbox') || false,
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
     * Opens the dialog to edit an API key
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
}
