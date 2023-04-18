import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class SocketsIndexRoute extends Route {
  @service store;
  @service fetch;
  @service currentUser;
  @service loader;

  @action loading(transition) {
    this.loader.showOnInitialTransition(
      transition,
      'section.next-view-section',
      'Loading websockets...'
    );
  }

  model() {
    return this.store.findAll('api-credential');
  }

  async setupController(controller, model) {
    super.setupController(controller, model);

    controller.channels = this.getActiveWebSockets(model);
  }

  /**
   * Generate rows of active websocket channels
   *
   * @param {Array} sources
   * @return {Array}
   */
  getActiveWebSockets(apiCredentials = []) {
    const channels = [];

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
}
