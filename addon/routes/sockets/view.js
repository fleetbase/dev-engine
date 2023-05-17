import Route from '@ember/routing/route';

export default class SocketsViewRoute extends Route {
    model({ name }) {
        return { name };
    }

    async setupController(controller, model) {
        controller.watchSocket(model);
    }
}
