import BaseController from '../base-controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { format } from 'date-fns';

export default class SocketsViewController extends BaseController {
    @service hostRouter;
    @service intl;
    @service socket;

    /**
     * Header buttons. Extensions add to them through `developers:socket:details`.
     *
     * @var {Array}
     */
    get actionButtons() {
        return this.detailsActionButtons('socket', this.model, [
            { id: 'back', icon: 'long-arrow-left', iconPrefix: 'fas', text: this.intl.t('developers.common.back'), onClick: this.goBack },
        ]);
    }

    /**
     * Incoming events logged from socket
     *
     * @memberof SocketsViewController
     */
    @tracked events = [];

    /**
     * Date format to use for socket console events.
     *
     * @memberof SocketsViewController
     */
    consoleDateFormat = 'MMM-dd HH:mm';

    /**
     * Sends the user back.
     *
     * @memberof SocketsViewController
     */
    @action goBack() {
        return window.history.back();
    }

    /**
     * Whether the last subscription attempt was refused. Cleared when the
     * channel subscribes (the socket service resubscribes channels it lost
     * for token reasons) and when leaving the page.
     *
     * @memberof SocketsViewController
     */
    @tracked subscriptionFailed = false;

    /**
     * The "Awaiting events..." indicator only makes sense while the channel can
     * still deliver something.
     *
     * @memberof SocketsViewController
     */
    get isAwaitingEvents() {
        return this.events.length > 0 && !this.subscriptionFailed;
    }

    /**
     * Appends a line to the console output.
     *
     * @param {String} content
     * @param {String} color tailwind color name
     * @memberof SocketsViewController
     */
    logEvent(content, color) {
        // Reassigned rather than mutated so the tracked property invalidates.
        this.events = [...this.events, { time: format(new Date(), this.consoleDateFormat), content, color }];
    }

    /**
     * Describes a refused subscription. Authorization refusals from the socket
     * server arrive as an `AuthError` with a short snake_case `reason`.
     *
     * @param {String} channelName
     * @param {Error} error
     * @return {String}
     * @memberof SocketsViewController
     */
    describeSubscribeFailure(channelName, error) {
        if (error && error.name === 'AuthError') {
            return this.intl.t('developers.sockets.view.socket-subscribe-denied', { modelName: channelName, reason: error.reason || error.message });
        }

        return this.intl.t('developers.sockets.view.socket-subscribe-failed', { modelName: channelName, message: error ? error.message : '' });
    }

    /**
     * Opens socket and logs all incoming events.
     *
     * @memberof SocketsViewController
     */
    @action async watchSocket(model) {
        // Create SocketClusterClient
        const socket = this.socket.instance();

        // Listen for socket connection errors
        (async () => {
            // eslint-disable-next-line no-unused-vars
            for await (let event of socket.listener('error')) {
                this.logEvent(this.intl.t('developers.sockets.view.socket-connection-error'), 'red');
            }
        })();

        // Listen for socket connection
        (async () => {
            // eslint-disable-next-line no-unused-vars
            for await (let event of socket.listener('connect')) {
                this.logEvent(this.intl.t('developers.sockets.view.socket-connected'), 'green');
            }
        })();

        // Subscribe to the channel
        const channel = socket.subscribe(model.name);

        // Listen for channel subscription
        (async () => {
            // eslint-disable-next-line no-unused-vars
            for await (let event of channel.listener('subscribe')) {
                this.subscriptionFailed = false;
                this.logEvent(this.intl.t('developers.sockets.view.socket-subscribed', { modelName: model.name }), 'blue');
            }
        })();

        // Listen for a refused subscription, e.g. a channel this user is not
        // authorized to see. Without this the page would wait silently forever.
        (async () => {
            for await (let { error } of channel.listener('subscribeFail')) {
                this.subscriptionFailed = true;
                this.logEvent(this.describeSubscribeFailure(model.name, error), 'red');
            }
        })();

        // Listen for the server removing the subscription (for example when the
        // socket token expired). The socket service resubscribes when it can, and
        // the subscribe listener above logs that.
        (async () => {
            for await (let { message } of channel.listener('kickOut')) {
                this.logEvent(this.intl.t('developers.sockets.view.socket-kicked-out', { modelName: model.name, reason: message }), 'red');
            }
        })();

        // Listen for channel data
        (async () => {
            for await (let data of channel) {
                this.logEvent(JSON.stringify(data, undefined, 2), 'green');
            }
        })();

        // disconnect when transitioning
        this.hostRouter.on('routeWillChange', () => {
            channel.close();
            this.events = [];
            this.subscriptionFailed = false;
        });
    }
}
