import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class WebhooksIndexRoute extends Route {
  @service store;
  @service fetch;
  @service loader;

  queryParams = {
    page: {
      refreshModel: true,
    },
    limit: {
      refreshModel: true,
    },
    sort: {
      refreshModel: true,
    },
  };

  @action loading(transition) {
    this.loader.showOnInitialTransition(
      transition,
      'section.next-view-section',
      'Loading webhooks...'
    );
  }

  model(params) {
    return this.store.query('webhook-endpoint', params);
  }

  async setupController(controller, model) {
    super.setupController(controller, model);

    // load all webhook events
    controller.webhookEvents = await this.fetch.cachedGet(
      `webhook-endpoints/events`,
      {},
      { expirationInterval: 1 }
    );
    controller.apiVersions = await this.fetch.cachedGet(
      `webhook-endpoints/versions`,
      {},
      { expirationInterval: 1 }
    );
    controller.apiCredentials = await this.store.findAll(`api-credential`);
  }
}
