import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class EventsIndexRoute extends Route {
  @service store;
  @service fetch;
  @service loader;

  queryParams = {
    query: {
      refreshModel: true,
    },
    page: {
      refreshModel: true,
    },
    limit: {
      refreshModel: true,
    },
    sort: {
      refreshModel: true,
    },
    created_at: {
      refreshModel: true,
    },
    event: {
      refreshModel: true,
    },
  };

  @action loading(transition) {
    this.loader.showOnInitialTransition(
      transition,
      'section.next-view-section',
      'Loading events...'
    );
  }

  model(params) {
    return this.store.query('api-event', params);
  }

  // async setupController(controller, model) {
  //     super.setupController(controller, model);
  //     // load all webhook events
  //     controller.webhookEvents = await this.fetch.cachedGet(`webhook-endpoints/events`);
  // }
}
