import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action, computed } from '@ember/object';
import fromStore from '@fleetbase/ember-core/decorators/from-store';

export default class SocketsIndexController extends Controller {
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
     * Inject the `currentUser` service
     *
     * @var {Service}
     */
    @service currentUser;

    /**
     * Inject the `store` service
     *
     * @var {Service}
     */
    @service store;

    /**
     * All columns applicable for orders
     *
     * @var {Array}
     */
    @tracked columns = [
        {
            label: '',
            width: '12%',
            sortable: false,
            cellComponent: 'table/cell/link-to',
            linkText: 'Watch Channel',
            linkClass: 'btn btn-default btn-xs flex flex-row-reverse',
            linkIcon: 'arrow-right',
            linkIconClass: 'ml-2',
            route: 'sockets.view',
            cellClassNames: 'no-underline',
        },
        {
            label: 'Channel',
            valuePath: 'name',
            width: '88%',
            cellComponent: 'click-to-copy',
        },
    ];

    /**
     * All api credentials.
     *
     * @memberof SocketsIndexController
     */
    @fromStore('api-credential', { limit: -1 }) apiCredentials;

    /**
     * Get all available known socket channels
     *
     * @readonly
     * @memberof SocketsIndexController
     */
    @computed('apiCredentials.@each.id', 'currentUser.companyId') get channels() {
        const channels = [];
        const apiCredentials = this.apiCredentials ?? [];

        for (let index = 0; index < apiCredentials.length; index++) {
            const apiCredential = apiCredentials.objectAt(index);

            if (!apiCredential?.id) {
                continue;
            }

            channels.push({
                name: `api.${apiCredential.id}`,
                source: apiCredentials,
            });
        }

        channels.pushObject({
            name: `company.${this.currentUser.companyId}`,
        });

        return channels;
    }

    /**
     * Link user to full event log view
     *
     * @void
     */
    @action onRowClick(row) {
        return this.transitionToRoute('sockets.view', row);
    }

    /**
     * Prompt dialog to allow user to listen on a custom socket channel
     *
     * @void
     */
    @action listenOnCustomChannel() {
        this.modalsManager.show('modals/listen-custom-channel', {
            title: 'Listen on a custom channel',
            acceptButtonText: 'Listen',
            acceptButtonIcon: 'headphones',
            declineButtonIcon: 'times',
            declineButtonIconPrefix: 'fas',
            channelId: null,
            confirm: (modal) => {
                modal.startLoading();
                const channelId = modal.getOption('channelId');

                return this.transitionToRoute('sockets.view', { name: channelId });
            },
        });
    }
}
