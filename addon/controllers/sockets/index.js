import BaseController from '../base-controller';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { isBlank } from '@ember/utils';
import fromStore from '@fleetbase/ember-core/decorators/legacy-from-store';
import { maskKey, timeAgo } from '../../utils/format';
import isRowControlClick from '../../utils/is-row-control-click';

export default class SocketsIndexController extends BaseController {
    @service modalsManager;
    @service devViewport;
    @service socketChannels;
    @service intl;
    @service notifications;
    @service currentUser;
    @service hostRouter;
    @service abilities;

    @tracked type = null;
    @tracked query = null;
    @tracked table;

    /**
     * All api credentials.
     */
    @fromStore('api-credential', { limit: -1 }) apiCredentials;

    /**
     * Header buttons. Extensions add to them through `developers:socket:table:actions`.
     */
    get actionButtons() {
        return [
            {
                id: 'listen-on-custom-channel',
                type: 'magic',
                icon: 'headphones',
                iconPrefix: 'fas',
                text: this.intl.t('developers.sockets.index.button-text'),
                onClick: this.listenOnCustomChannel,
                permission: 'developers view socket',
            },
        ];
    }

    get columns() {
        return [
            {
                id: 'name',
                label: this.intl.t('developers.sockets.index.channel'),
                valuePath: 'name',
                sortable: false,
                cellComponent: 'table/cell/identity',
                resourceType: 'socket-channel',
                permission: 'developers view socket',
                action: this.watchChannel,
                wrapperClass: 'max-w-full dev-mono-identity',
                showStatusDot: true,
                statusPath: (channel) => channel.access ?? 'unknown',
                badges: (channel) =>
                    channel.watching
                        ? [{ key: 'watching', label: this.intl.t('developers.sockets.index.watching'), class: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' }]
                        : [],
                popover: false,
            },
            { id: 'type', label: this.intl.t('developers.sockets.index.type'), valuePath: 'type', width: 100, sortable: false, cellComponent: 'channel/type-cell' },
            { id: 'source', label: this.intl.t('developers.common.source'), valuePath: 'source', width: 180, hidden: this.devViewport.below(1100), sortable: false },
            { id: 'access', label: this.intl.t('developers.sockets.index.access'), valuePath: 'access', width: 140, sortable: false, cellComponent: 'channel/access-cell' },
            { id: 'activity', label: this.intl.t('developers.sockets.index.last-activity'), valuePath: 'activity', width: 180, hidden: this.devViewport.below(1280), sortable: false },
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
                    { id: 'watch', label: this.intl.t('developers.sockets.index.watch'), icon: 'tower-broadcast', fn: this.watchChannel, permission: 'developers view socket' },
                    { id: 'copy', label: this.intl.t('developers.sockets.index.copy-name'), icon: 'copy', fn: this.copyName },
                    {
                        id: 'forget',
                        label: this.intl.t('developers.sockets.index.forget'),
                        icon: 'trash',
                        class: 'text-red-700',
                        fn: this.forgetChannel,
                        isVisible: (channel) => channel.type === 'custom',
                    },
                ],
            },
        ];
    }

    get segments() {
        const counts = this.allChannels.reduce((acc, channel) => ({ ...acc, [channel.type]: (acc[channel.type] ?? 0) + 1 }), {});

        return [
            { label: this.intl.t('developers.common.all'), param: 'type', value: null, count: this.allChannels.length },
            { label: this.intl.t('developers.sockets.types.company'), param: 'type', value: 'company', count: counts.company ?? 0 },
            { label: this.intl.t('developers.sockets.types.api'), param: 'type', value: 'api', count: counts.api ?? 0 },
            { label: this.intl.t('developers.sockets.types.custom'), param: 'type', value: 'custom', count: counts.custom ?? 0 },
        ];
    }

    /**
     * Every known channel: company, one per credential, and remembered custom ones.
     */
    get allChannels() {
        const channels = [];
        const credentials = this.apiCredentials ?? [];
        const companyId = this.currentUser.companyId;

        channels.push(
            this.decorate({
                name: `company.${companyId}`,
                type: 'company',
                source: this.currentUser.user?.company_name ?? this.intl.t('developers.sockets.types.company'),
                description: this.intl.t('developers.sockets.index.company-description'),
            })
        );

        for (let index = 0; index < credentials.length; index++) {
            const credential = credentials.objectAt ? credentials.objectAt(index) : credentials[index];

            if (!credential?.id) {
                continue;
            }

            channels.push(
                this.decorate({
                    name: `api.${credential.id}`,
                    type: 'api',
                    source: credential.name ?? maskKey(credential.key),
                    environment: credential.test_mode ? 'test' : 'live',
                    description: this.intl.t('developers.sockets.index.api-description', { name: credential.name ?? maskKey(credential.key) }),
                })
            );
        }

        for (const name of this.socketChannels.customChannels) {
            channels.push(
                this.decorate({
                    name,
                    type: 'custom',
                    source: this.intl.t('developers.sockets.index.custom-source'),
                    description: this.intl.t('developers.sockets.index.custom-description'),
                })
            );
        }

        return channels;
    }

    decorate(channel) {
        const state = this.socketChannels.stateFor(channel.name);
        const lastActivity = state.lastActivityAt ? `${timeAgo(state.lastActivityAt)}${state.lastEvent ? ` · ${state.lastEvent}` : ''}` : null;

        return {
            ...channel,
            resourceType: 'socket-channel',
            access: state.access ?? 'unknown',
            reason: state.reason ?? null,
            watching: Boolean(state.watching),
            activity: lastActivity ?? this.intl.t('developers.sockets.index.no-activity'),
        };
    }

    get channels() {
        let channels = this.allChannels;

        if (!isBlank(this.type)) {
            channels = channels.filter((channel) => channel.type === this.type);
        }

        if (!isBlank(this.query)) {
            const query = this.query.toLowerCase();
            channels = channels.filter(
                (channel) =>
                    channel.name.toLowerCase().includes(query) ||
                    String(channel.source ?? '')
                        .toLowerCase()
                        .includes(query)
            );
        }

        return channels;
    }

    @action search({ target: { value } }) {
        this.query = isBlank(value) ? null : value;
    }

    @action watchChannel(channel) {
        return this.hostRouter.transitionTo('console.developers.sockets.view', channel.name);
    }

    @action copyName(channel) {
        return navigator.clipboard?.writeText(channel.name).then(() => this.notifications.info(this.intl.t('developers.code-viewer.copied')));
    }

    @action forgetChannel(channel) {
        this.socketChannels.forgetChannel(channel.name);
    }

    /**
     * Prompt dialog to allow user to listen on a custom socket channel
     */
    @action listenOnCustomChannel() {
        this.modalsManager.show('modals/listen-custom-channel', {
            title: this.intl.t('developers.sockets.index.listen-channel-title'),
            modalClass: 'dev-modal modal-lg',
            acceptButtonText: this.intl.t('developers.sockets.index.listen-channel-button-text'),
            acceptButtonIcon: 'headphones',
            acceptButtonScheme: 'magic',
            declineButtonIcon: 'times',
            declineButtonIconPrefix: 'fas',
            channelId: null,
            remember: true,
            error: null,
            rules: this.socketChannels.prefixRules,
            toggleRemember: (checked) => this.modalsManager.setOption('remember', checked),
            confirm: (modal) => {
                const channelId = String(modal.getOption('channelId') ?? '').trim();
                const error = this.socketChannels.validateName(channelId);

                if (error) {
                    modal.setOption('error', error);
                    return;
                }

                if (modal.getOption('remember')) {
                    this.socketChannels.rememberChannel(channelId);
                }

                modal.done();
                return this.hostRouter.transitionTo('console.developers.sockets.view', channelId);
            },
        });
    }

    @action reload() {
        return this.hostRouter.refresh();
    }

    /**
     * Row clicks open the record unless the click landed on a control inside the row.
     */
    @action rowClick(row) {
        if (isRowControlClick()) {
            return;
        }

        return this.watchChannel(row);
    }
}
