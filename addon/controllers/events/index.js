import BaseController from '../base-controller';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { isBlank } from '@ember/utils';
import { task, timeout } from 'ember-concurrency';
import fetchFrom from '@fleetbase/ember-core/decorators/legacy-fetch-from';
import fromStore from '@fleetbase/ember-core/decorators/legacy-from-store';
import { RETENTION_DAYS } from '../../utils/retention';

export default class EventsIndexController extends BaseController {
    @service filters;
    @service devViewport;
    @service intl;
    @service hostRouter;
    @service abilities;
    @service developerPanels;

    /**
     * All event types.
     */
    @fetchFrom('webhook-endpoints/events') webhookEvents;

    /**
     * All api credentials.
     */
    @fromStore('api-credential', { limit: -1 }) apiCredentials;

    queryParams = this.registeredQueryParams('event', ['query', 'page', 'limit', 'sort', 'event', 'created_at', 'source', 'api_credential_uuid', 'method']);

    @tracked page = 1;
    @tracked limit = 40;
    @tracked sort = '-id';
    @tracked query;
    @tracked created_at;
    @tracked event;
    @tracked source;
    @tracked api_credential_uuid;
    @tracked method;
    @tracked table;
    retentionDays = RETENTION_DAYS;

    get credentialNames() {
        const names = {};

        (this.apiCredentials ?? []).forEach((credential) => {
            names[credential.id] = credential.name ?? credential.key;
        });

        return names;
    }

    get columns() {
        return [
            {
                id: 'event',
                label: this.intl.t('developers.common.event'),
                valuePath: 'event',
                sortable: false,
                cellComponent: 'table/cell/identity',
                resourceType: 'api-event',
                permission: 'developers view event',
                action: this.openEvent,
                wrapperClass: 'max-w-full',
                labelPath: 'event',
                badges: (event) => [{ key: 'description', label: event.description, class: 'dev-identity-badge-plain' }],
                badgeLimit: 1,
                filterable: true,
                filterParam: 'event',
                filterLabel: this.intl.t('developers.common.event-type'),
                filterComponent: 'filter/select',
                filterOptions: this.webhookEvents,
            },
            {
                id: 'source',
                label: this.intl.t('developers.common.source'),
                valuePath: 'source',
                width: 130,
                sortable: false,
                filterable: true,
                filterLabel: this.intl.t('developers.common.source'),
                filterComponent: 'filter/select',
                filterOptions: [
                    { label: this.intl.t('developers.events.sources.api'), value: 'api' },
                    { label: this.intl.t('developers.events.sources.console'), value: 'console' },
                ],
                cellComponent: 'api-event/source-cell',
            },
            {
                id: 'method',
                label: this.intl.t('developers.logs.index.http-method'),
                valuePath: 'method',
                width: 100,
                sortable: false,
                hidden: true,
                filterable: true,
                filterLabel: this.intl.t('developers.logs.index.http-method'),
                filterComponent: 'filter/multi-option',
                filterOptions: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
                cellComponent: 'api-request-log/method-cell',
            },
            {
                id: 'api-credential',
                label: this.intl.t('developers.webhooks.index.credential'),
                valuePath: 'api_credential_uuid',
                width: 170,
                hidden: this.devViewport.below(1100),
                sortable: false,
                filterable: true,
                filterParam: 'api_credential_uuid',
                filterLabel: this.intl.t('developers.webhooks.index.credential'),
                filterComponent: 'filter/select',
                filterOptionLabel: 'fullName',
                filterOptionValue: 'id',
                filterOptions: this.apiCredentials,
                cellComponent: 'api-event/credential-cell',
                cellComponentArgs: { names: this.credentialNames },
            },
            {
                id: 'public-id',
                label: this.intl.t('developers.common.id'),
                valuePath: 'public_id',
                width: 160,
                hidden: this.devViewport.below(1280),
                sortable: false,
                cellComponent: 'api-key/key-cell',
            },
            {
                id: 'created-at',
                label: this.intl.t('developers.common.time'),
                valuePath: 'created_at',
                width: 150,
                sortable: false,
                filterable: true,
                filterParam: 'created_at',
                filterLabel: this.intl.t('developers.common.date'),
                filterComponent: 'filter/date',
                cellComponent: 'api-request-log/time-cell',
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
                    { id: 'open', label: this.intl.t('developers.common.open'), icon: 'bolt', fn: this.openEvent, permission: 'developers view event' },
                    {
                        id: 'open-page',
                        label: this.intl.t('developers.common.open-full-page'),
                        icon: 'arrow-up-right-from-square',
                        fn: this.openFullPage,
                        permission: 'developers view event',
                    },
                    { id: 'copy-id', label: this.intl.t('developers.events.actions.copy-id'), icon: 'copy', fn: this.copyId },
                    { id: 'copy-json', label: this.intl.t('developers.events.actions.copy-json'), icon: 'code', fn: this.copyJson },
                ],
            },
        ];
    }

    get emptyState() {
        return {
            icon: 'bolt',
            title: this.intl.t('developers.events.empty.title'),
            message: this.intl.t('developers.events.empty.message', { days: RETENTION_DAYS }),
        };
    }

    search = task({ restartable: true }, async ({ target: { value } }) => {
        if (isBlank(value)) {
            this.query = null;
            return;
        }

        await timeout(250);

        if (this.page > 1) {
            this.page = 1;
        }

        this.query = value;
    });

    @action openEvent(event) {
        return this.developerPanels.openEvent(event);
    }

    @action openFullPage(event) {
        return this.hostRouter.transitionTo('console.developers.events.view', event);
    }

    @action copyId(event) {
        return navigator.clipboard?.writeText(event.public_id);
    }

    @action copyJson(event) {
        return navigator.clipboard?.writeText(JSON.stringify(event.data ?? {}, null, 2));
    }

    @action reload() {
        return this.hostRouter.refresh();
    }
}
