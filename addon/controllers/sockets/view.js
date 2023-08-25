import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { format } from 'date-fns';

export default class SocketsViewController extends Controller {
    /**
     * Inject the `router` service
     *
     * @var {Service}
     */
    @service hostRouter;

    /**
     * Inject the `socket` service
     *
     * @var {Service}
     */
    @service socket;

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
                // Push an event or notification for socket connection here
                this.events.pushObject({
                    time: format(new Date(), this.consoleDateFormat),
                    content: 'Socket connection error!',
                    color: 'red',
                });
            }
        })();

        // Listen for socket connection
        (async () => {
            // eslint-disable-next-line no-unused-vars
            for await (let event of socket.listener('connect')) {
                // Push an event or notification for socket connection here
                this.events.pushObject({
                    time: format(new Date(), this.consoleDateFormat),
                    content: 'Socket is connected',
                    color: 'green',
                });
            }
        })();

        // Listed on company channel
        const channel = socket.subscribe(model.name);

        // Listen for channel subscription
        (async () => {
            // eslint-disable-next-line no-unused-vars
            for await (let event of channel.listener('subscribe')) {
                // Push an event or notification for channel subscription here
                this.events.pushObject({
                    time: format(new Date(), this.consoleDateFormat),
                    content: `Socket subscribed to channel '${model.name}'`,
                    color: 'blue',
                });
            }
        })();

        // Listen for channel subscription
        (async () => {
            for await (let data of channel) {
                this.events.pushObject({
                    time: format(new Date(), this.consoleDateFormat),
                    content: JSON.stringify(data, undefined, 2),
                    color: 'green',
                });
            }
        })();

        // disconnect when transitioning
        this.hostRouter.on('routeWillChange', () => {
            channel.close();
            this.events = [];
        });
    }
}
