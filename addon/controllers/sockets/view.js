import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { isBlank } from '@ember/utils';
import { format } from 'date-fns';
import config from 'ember-get-config';

export default class SocketsViewController extends Controller {
    /**
     * Inject the router service
     *
     * @var {Service}
     */
    @service hostRouter;

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

    createSocketClusterClient() {
        const socketConfig = { ...config.socket };

        if (isBlank(socketConfig.hostname)) {
            socketConfig.hostname = window.location.hostname;
        }

        return socketClusterClient.create(socketConfig);
    }

    /**
     * Opens socket and logs all incoming events.
     *
     * @memberof SocketsViewController
     */
    @action async watchSocket(model) {
        // create socketcluster client
        const socket = this.createSocketClusterClient();

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
