/* eslint-disable ember/no-get -- records and identity stubs are read by path, so `get` is the point */
import { get } from '@ember/object';
import { isBlank } from '@ember/utils';
import { maskKey, shortUrl, timeAgo, statusTone } from './format';

function first(record, ...paths) {
    for (const path of paths) {
        const value = get(record ?? {}, path);

        if (!isBlank(value)) {
            return value;
        }
    }

    return null;
}

function isExpired(record) {
    const expiresAt = get(record ?? {}, 'expires_at');

    if (isBlank(expiresAt)) {
        return false;
    }

    const date = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);

    return !Number.isNaN(date.getTime()) && date.getTime() < Date.now();
}

/** An opener that hands the record to the engine's panel service. */
function panelOpener(owner, method) {
    return (record) => {
        const panels = owner.lookup('service:developer-panels');

        if (!panels || typeof panels[method] !== 'function') {
            return false;
        }

        panels[method](record);

        return true;
    };
}

/** An opener that transitions to a route inside the engine. */
function routeOpener(owner, routeName) {
    return (record) => {
        const router = owner.lookup('service:host-router') ?? owner.lookup('service:router');

        if (!router || !record) {
            return false;
        }

        router.transitionTo(`console.developers.${routeName}`, record);

        return true;
    };
}

/**
 * Descriptors for the Developers resources: how an identity cell, a select
 * option and a hover summary render an API key, a webhook endpoint, an event,
 * a request log, a delivery attempt and a socket channel.
 */
export default function buildDevelopersResourceDescriptors(owner) {
    return [
        {
            key: 'api-credential',
            labelKey: 'developers.resource.api-credential',
            icon: 'key',
            modelNames: ['api-credential'],
            aliases: ['api-key'],
            polymorphicTypes: ['Fleetbase\\Models\\ApiCredential', 'core:api-credential'],
            permission: 'developers view api-key',
            statusTones: { live: 'text-green-500', test: 'text-yellow-500', expired: 'text-red-500' },
            title: (key) => first(key, 'name') ?? maskKey(get(key, 'key')),
            identifier: (key) => maskKey(get(key, 'key')),
            image: () => ({ icon: 'key' }),
            status: (key) => (isExpired(key) ? 'expired' : get(key, 'test_mode') ? 'test' : 'live'),
            selectDetails: (key) => [maskKey(get(key, 'key')), get(key, 'test_mode') ? 'test' : 'live', timeAgo(get(key, 'last_used_at'))],
            facts: (key) => [
                { label: 'Key', value: maskKey(get(key, 'key')) },
                { label: 'Environment', value: get(key, 'test_mode') ? 'test' : 'live', format: 'humanize' },
                { label: 'Last used', value: get(key, 'last_used_at'), format: 'date' },
                { label: 'Expires', value: get(key, 'expires_at'), format: 'date' },
                { label: 'Created', value: get(key, 'created_at'), format: 'date' },
            ],
            open: panelOpener(owner, 'openApiKey'),
        },
        {
            key: 'webhook-endpoint',
            labelKey: 'developers.resource.webhook-endpoint',
            icon: 'globe',
            modelNames: ['webhook-endpoint'],
            aliases: ['webhook'],
            polymorphicTypes: ['Fleetbase\\Models\\WebhookEndpoint', 'core:webhook-endpoint'],
            permission: 'developers view webhook',
            statusTones: { enabled: 'text-green-500', disabled: 'text-gray-400', failing: 'text-red-500', degraded: 'text-yellow-500' },
            title: (endpoint) => shortUrl(get(endpoint, 'url')) ?? first(endpoint, 'public_id'),
            identifier: (endpoint) => first(endpoint, 'description'),
            image: () => ({ icon: 'globe' }),
            status: (endpoint) => first(endpoint, 'health_status', 'status'),
            selectDetails: (endpoint) => [first(endpoint, 'description'), first(endpoint, 'mode')],
            facts: (endpoint) => [
                { label: 'URL', value: get(endpoint, 'url') },
                { label: 'Status', value: get(endpoint, 'status'), format: 'humanize' },
                { label: 'Mode', value: get(endpoint, 'mode'), format: 'humanize' },
                { label: 'Version', value: get(endpoint, 'version') },
                { label: 'Created', value: get(endpoint, 'created_at'), format: 'date' },
            ],
            open: routeOpener(owner, 'webhooks.view'),
        },
        {
            key: 'api-event',
            labelKey: 'developers.resource.api-event',
            icon: 'bolt',
            modelNames: ['api-event'],
            aliases: ['event'],
            polymorphicTypes: ['Fleetbase\\Models\\ApiEvent', 'core:api-event'],
            permission: 'developers view event',
            title: (event) => first(event, 'event', 'public_id'),
            identifier: (event) => first(event, 'public_id'),
            image: (event) => ({ icon: eventIcon(get(event, 'event')) }),
            selectDetails: (event) => [first(event, 'description')],
            facts: (event) => [
                { label: 'Description', value: get(event, 'description') },
                { label: 'Source', value: get(event, 'source'), format: 'humanize' },
                { label: 'Created', value: get(event, 'created_at'), format: 'date' },
            ],
            open: panelOpener(owner, 'openEvent'),
        },
        {
            key: 'api-request-log',
            labelKey: 'developers.resource.api-request-log',
            icon: 'terminal',
            modelNames: ['api-request-log'],
            aliases: ['request', 'log'],
            polymorphicTypes: ['Fleetbase\\Models\\ApiRequestLog', 'core:api-request-log'],
            permission: 'developers view log',
            statusTones: { success: 'text-green-500', warning: 'text-yellow-500', danger: 'text-red-500', info: 'text-gray-400' },
            title: (log) => first(log, 'path', 'public_id'),
            identifier: (log) => first(log, 'public_id'),
            image: () => ({ icon: 'terminal' }),
            status: (log) => statusTone(get(log, 'status_code')),
            selectDetails: (log) => [first(log, 'method'), first(log, 'status_code')],
            facts: (log) => [
                { label: 'Method', value: get(log, 'method') },
                { label: 'Status', value: get(log, 'status_code') },
                { label: 'Duration', value: get(log, 'duration') },
                { label: 'IP', value: get(log, 'ip_address') },
                { label: 'Time', value: get(log, 'created_at'), format: 'date' },
            ],
            open: panelOpener(owner, 'openRequest'),
        },
        {
            key: 'webhook-request-log',
            labelKey: 'developers.resource.webhook-request-log',
            icon: 'paper-plane',
            modelNames: ['webhook-request-log'],
            aliases: ['attempt', 'delivery'],
            polymorphicTypes: ['Fleetbase\\Models\\WebhookRequestLog', 'core:webhook-request-log'],
            permission: 'developers view webhook',
            statusTones: { successful: 'text-green-500', failed: 'text-red-500', pending: 'text-yellow-500' },
            title: (attempt) => first(attempt, 'api_event.event', 'public_id'),
            identifier: (attempt) => first(attempt, 'public_id'),
            image: () => ({ icon: 'paper-plane' }),
            status: (attempt) => first(attempt, 'status'),
            open: panelOpener(owner, 'openAttempt'),
        },
        {
            key: 'socket-channel',
            labelKey: 'developers.resource.socket-channel',
            icon: 'tower-broadcast',
            modelNames: ['socket-channel'],
            aliases: ['channel'],
            polymorphicTypes: ['socket-channel'],
            permission: 'developers view socket',
            statusTones: { allowed: 'text-green-500', denied: 'text-red-500', unknown: 'text-gray-400', watching: 'text-green-500' },
            title: (channel) => first(channel, 'name'),
            identifier: (channel) => first(channel, 'description'),
            image: (channel) => ({ icon: channelIcon(get(channel, 'type')) }),
            status: (channel) => first(channel, 'access', 'status') ?? 'unknown',
            open: routeOpener(owner, 'sockets.view'),
        },
    ];
}

/** An icon for an event type from its resource prefix. */
export function eventIcon(eventName) {
    const prefix = typeof eventName === 'string' ? eventName.split('.')[0] : '';

    return (
        {
            order: 'box',
            payload: 'boxes-stacked',
            entity: 'cube',
            waypoint: 'location-dot',
            driver: 'id-card',
            vehicle: 'truck',
            fleet: 'truck-ramp-box',
            contact: 'address-book',
            place: 'map-pin',
            chat_message: 'comment',
            chat_channel: 'comments',
            chat_participant: 'user-group',
            chat_receipt: 'check-double',
            chat_log: 'file-lines',
            service_quote: 'file-invoice-dollar',
            service_rate: 'tags',
            service_area: 'draw-polygon',
            purchase_rate: 'receipt',
            vendor: 'store',
            user: 'user',
        }[prefix] ?? 'bolt'
    );
}

/** An icon for a socket channel from its type. */
export function channelIcon(type) {
    return (
        {
            company: 'building',
            api: 'key',
            custom: 'headphones',
            user: 'user',
            driver: 'id-card',
        }[type] ?? 'tower-broadcast'
    );
}
