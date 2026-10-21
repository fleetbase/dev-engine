import BaseController from '../base-controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { isBlank } from '@ember/utils';
import { format } from 'date-fns';

const MAX_MESSAGES = 2000;

/**
 * The live channel viewer. Keeps every message of the session (capped), with
 * pause, clear, type and text filters, pretty / raw rendering, timestamp
 * density and a newline-delimited JSON download. Connection, subscription,
 * denial, kick-out and reconnect states are first-class.
 */
export default class SocketsViewController extends BaseController {
    @service hostRouter;
    @service intl;
    @service socket;
    @service socketChannels;
    @service developerPanels;
    @service notifications;

    /** connecting | subscribed | denied | kicked | reconnecting | error | closed */
    @tracked connection = 'connecting';
    @tracked reason = null;
    @tracked messages = [];
    @tracked buffered = [];
    @tracked paused = false;
    @tracked showData = true;
    @tracked showLifecycle = true;
    @tracked showErrors = true;
    @tracked query = '';
    @tracked eventType = null;
    @tracked timeFormat = 'ms';
    @tracked expandedIds = new Set();
    @tracked startedAt = null;
    @tracked channel = null;
    #cleanup = [];

    get channelName() {
        return this.model?.name;
    }

    get channelType() {
        return this.socketChannels.typeOf(this.channelName);
    }

    get iconTone() {
        return { company: 'is-purple', api: 'is-green', custom: 'is-blue' }[this.channelType] ?? 'is-gray';
    }

    get connectionBadge() {
        return { subscribed: 'success', connecting: 'warning', reconnecting: 'warning', denied: 'danger', kicked: 'danger', error: 'danger', closed: 'inactive' }[this.connection] ?? 'info';
    }

    get isSubscribed() {
        return this.connection === 'subscribed';
    }

    get isDenied() {
        return this.connection === 'denied';
    }

    get isNoToken() {
        return (
            this.isDenied &&
            String(this.reason ?? '')
                .toLowerCase()
                .includes('no_token')
        );
    }

    get dataCount() {
        return this.messages.filter((message) => message.kind === 'data').length;
    }

    get lifecycleCount() {
        return this.messages.filter((message) => message.kind === 'lifecycle').length;
    }

    get errorCount() {
        return this.messages.filter((message) => message.kind === 'error').length;
    }

    get rate() {
        if (!this.startedAt || this.dataCount === 0) {
            return null;
        }

        const seconds = Math.max(1, (Date.now() - this.startedAt.getTime()) / 1000);

        return (this.dataCount / seconds).toFixed(2);
    }

    get eventTypes() {
        return Array.from(new Set(this.messages.filter((message) => message.event).map((message) => message.event))).sort();
    }

    get visibleMessages() {
        const query = this.query.trim().toLowerCase();

        return this.messages
            .filter((message) => {
                if (message.kind === 'data' && !this.showData) return false;
                if (message.kind === 'lifecycle' && !this.showLifecycle) return false;
                if (message.kind === 'error' && !this.showErrors) return false;
                if (!isBlank(this.eventType) && message.event !== this.eventType) return false;
                if (query && !message.searchText.includes(query)) return false;
                return true;
            })
            .map((message) => ({ ...message, time: this.formatTime(message.at), expanded: this.expandedIds.has(message.id) }));
    }

    get hiddenCount() {
        return this.messages.length - this.visibleMessages.length;
    }

    get hasFilters() {
        return !this.showData || !this.showLifecycle || !this.showErrors || !isBlank(this.eventType) || this.query.trim() !== '';
    }

    get timeFormats() {
        return [
            { value: 'time', label: this.intl.t('developers.sockets.view.time-format-time') },
            { value: 'ms', label: this.intl.t('developers.sockets.view.time-format-ms') },
            { value: 'relative', label: this.intl.t('developers.sockets.view.time-format-relative') },
        ];
    }

    formatTime(date) {
        if (this.timeFormat === 'relative' && this.startedAt) {
            const seconds = (date.getTime() - this.startedAt.getTime()) / 1000;
            return `+${seconds.toFixed(1)}s`;
        }

        return format(date, this.timeFormat === 'ms' ? 'HH:mm:ss.SSS' : 'HH:mm:ss');
    }

    /**
     * Appends a message; buffers while paused.
     */
    push(message) {
        const entry = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            at: new Date(),
            kind: 'data',
            event: null,
            resourceId: null,
            eventId: null,
            text: null,
            payload: null,
            tone: 'ok',
            ...message,
        };

        entry.searchText = [entry.event, entry.resourceId, entry.eventId, entry.text, entry.payload ? JSON.stringify(entry.payload) : ''].filter(Boolean).join(' ').toLowerCase();

        if (this.paused) {
            this.buffered = [...this.buffered, entry].slice(-MAX_MESSAGES);
            return;
        }

        this.messages = [...this.messages, entry].slice(-MAX_MESSAGES);
    }

    logLifecycle(text, tone = 'ok', extra = {}) {
        this.push({ kind: tone === 'bad' ? 'error' : 'lifecycle', text, tone, ...extra });
    }

    /**
     * Describes a refused subscription. Authorization refusals from the socket
     * server arrive as an `AuthError` with a short snake_case `reason`.
     */
    describeSubscribeFailure(channelName, error) {
        if (error && error.name === 'AuthError') {
            return this.intl.t('developers.sockets.view.socket-subscribe-denied', { modelName: channelName, reason: error.reason || error.message });
        }

        return this.intl.t('developers.sockets.view.socket-subscribe-failed', { modelName: channelName, message: error ? error.message : '' });
    }

    /**
     * Opens the socket and logs everything that happens on the channel.
     */
    @action async watchSocket(model) {
        this.reset();
        this.startedAt = new Date();

        const name = model.name;
        const socket = this.socket.instance();
        const listen = (emitter, event, handler) => {
            const listener = emitter.listener(event);
            (async () => {
                for await (const payload of listener) {
                    if (this.isDestroyed) break;
                    handler(payload);
                }
            })();
            this.#cleanup.push(() => emitter.closeListener?.(event));
        };

        listen(socket, 'error', () => {
            this.connection = this.isSubscribed ? 'reconnecting' : 'error';
            this.logLifecycle(this.intl.t('developers.sockets.view.socket-connection-error'), 'bad');
        });

        listen(socket, 'connect', () => {
            this.logLifecycle(this.intl.t('developers.sockets.view.socket-connected-to', { host: socket.options?.hostname ?? '' }), 'ok', { event: 'connect' });
        });

        listen(socket, 'connecting', () => {
            if (this.connection !== 'connecting') {
                this.connection = 'reconnecting';
                this.logLifecycle(this.intl.t('developers.sockets.view.reconnecting'), 'wait', { event: 'reconnect' });
            }
        });

        const channel = socket.subscribe(name);
        this.channel = channel;

        listen(channel, 'subscribe', () => {
            this.connection = 'subscribed';
            this.reason = null;
            this.socketChannels.update(name, { access: 'allowed', reason: null, watching: true });
            this.logLifecycle(this.intl.t('developers.sockets.view.subscribed-rule', { modelName: name, rule: this.ruleFor(name) }), 'ok', { event: 'subscribe' });
        });

        listen(channel, 'subscribeFail', ({ error }) => {
            this.connection = 'denied';
            this.reason = error?.reason || error?.message || 'unknown';
            this.socketChannels.update(name, { access: 'denied', reason: this.reason, watching: false });
            this.logLifecycle(this.describeSubscribeFailure(name, error), 'bad', { event: 'subscribeFail' });
        });

        listen(channel, 'kickOut', ({ message }) => {
            this.connection = 'kicked';
            this.reason = message;
            this.logLifecycle(this.intl.t('developers.sockets.view.socket-kicked-out', { modelName: name, reason: message }), 'bad', { event: 'kickOut' });
        });

        (async () => {
            for await (const data of channel) {
                if (this.isDestroyed) break;
                this.receive(name, data);
            }
        })();

        this.#cleanup.push(() => channel.close());
        this.hostRouter.one('routeWillChange', this.teardown);
    }

    receive(name, data) {
        const payload = data && typeof data === 'object' ? data : { value: data };
        const event = payload.event ?? payload.type ?? payload.name ?? null;
        const resourceId = payload.data?.id ?? payload.data?.public_id ?? payload.id ?? null;
        const eventId = payload.id && String(payload.id).startsWith('event_') ? payload.id : (payload.event_id ?? null);

        this.socketChannels.recordMessage(name, event);
        this.push({ kind: 'data', event, resourceId, eventId, payload, tone: 'ok' });
    }

    ruleFor(name) {
        const prefix = String(name).split('.')[0];

        return (
            {
                company: 'company.<your company>',
                api: 'api.<your credential>',
                user: 'user.<member>',
                driver: 'driver.<your driver>',
            }[prefix] ?? prefix
        );
    }

    @action teardown() {
        this.#cleanup.forEach((fn) => {
            try {
                fn();
            } catch {
                // listener already closed
            }
        });
        this.#cleanup = [];
        this.channel = null;

        if (this.channelName) {
            this.socketChannels.update(this.channelName, { watching: false });
        }

        this.connection = 'closed';
    }

    reset() {
        this.teardown();
        this.messages = [];
        this.buffered = [];
        this.paused = false;
        this.connection = 'connecting';
        this.reason = null;
        this.expandedIds = new Set();
    }

    @action retry() {
        this.watchSocket(this.model);
    }

    @action togglePause() {
        this.paused = !this.paused;

        if (!this.paused && this.buffered.length) {
            this.messages = [...this.messages, ...this.buffered].slice(-MAX_MESSAGES);
            this.buffered = [];
        }
    }

    @action clear() {
        this.messages = [];
        this.buffered = [];
        this.expandedIds = new Set();
    }

    @action toggleKind(kind) {
        if (kind === 'data') this.showData = !this.showData;
        if (kind === 'lifecycle') this.showLifecycle = !this.showLifecycle;
        if (kind === 'error') this.showErrors = !this.showErrors;
    }

    @action setQuery(event) {
        this.query = event.target.value ?? '';
    }

    @action setEventType(value) {
        this.eventType = value || null;
    }

    @action setTimeFormat(value) {
        this.timeFormat = value;
    }

    @action clearFilters() {
        this.showData = true;
        this.showLifecycle = true;
        this.showErrors = true;
        this.eventType = null;
        this.query = '';
    }

    @action toggleExpanded(message) {
        const next = new Set(this.expandedIds);

        if (next.has(message.id)) {
            next.delete(message.id);
        } else {
            next.add(message.id);
        }

        this.expandedIds = next;
    }

    @action copyPayload(message, event) {
        event?.stopPropagation?.();
        return navigator.clipboard?.writeText(JSON.stringify(message.payload, null, 2)).then(() => this.notifications.info(this.intl.t('developers.code-viewer.copied')));
    }

    @action openEvent(message, event) {
        event?.stopPropagation?.();

        if (message.eventId) {
            return this.hostRouter.transitionTo('console.developers.events.view', message.eventId);
        }
    }

    @action download() {
        const lines = this.messages.map((message) =>
            JSON.stringify({ at: message.at.toISOString(), kind: message.kind, event: message.event, text: message.text, payload: message.payload })
        );
        const blob = new Blob([lines.join('\n')], { type: 'application/x-ndjson' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');

        anchor.href = url;
        anchor.download = `${this.channelName}-${format(new Date(), 'yyyyMMdd-HHmmss')}.ndjson`;
        anchor.click();
        URL.revokeObjectURL(url);
    }

    @action unsubscribe() {
        this.teardown();
    }

    @action goBack() {
        return this.hostRouter.transitionTo('console.developers.sockets.index');
    }

    @action forget() {
        this.socketChannels.forgetChannel(this.channelName);
        return this.goBack();
    }
}
