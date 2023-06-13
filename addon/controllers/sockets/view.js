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
        /** 
        @todo make this work later
        this.socket.listen(model.name, ({ data }) => {
            this.events.pushObject({
                time: format(new Date(), 'PPPP'),
                content: JSON.stringify(data, undefined, 2),
            });
        });
        **/

        // create socketcluster client
        const socket = this.socket.instance();

        // listen on company channel
        const channel = socket.subscribe(model.name);

        // listen to channel for events
        await channel.listener('subscribe').once();

        // get incoming data and console out
        for await (let data of channel) {
            this.events.pushObject({
                time: format(new Date(), 'PPPP'),
                content: JSON.stringify(data, undefined, 2),
            });
        }

        // disconnect when transitioning
        this.hostRouter.on('routeWillChange', () => {
            channel.close();
        });
    }
}
