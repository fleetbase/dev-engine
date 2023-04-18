import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class LogsIndexRoute extends Route {
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
    version: {
      refreshModel: true,
    },
    method: {
      refreshModel: true,
    },
    key: {
      refreshModel: true,
    },
    created_at: {
      refreshModel: true,
    },
  };

  @action loading(transition) {
    this.loader.showOnInitialTransition(
      transition,
      'section.next-view-section',
      'Loading logs...'
    );
  }

  model(params) {
    return this.store.query('api-request-log', params);
  }

  // async setupController(controller, model) {
  //     super.setupController(controller, model);
  //     // load filterable data
  //     controller.apiVersions = await this.fetch.cachedGet(`webhook-endpoints/versions`);
  //     controller.apiCredentials = await this.store.findAll(`api-credential`);
  // }
}
