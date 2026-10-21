import { module, test } from 'qunit';
import { setupTest } from 'dummy/tests/helpers';

class IntlStub {
    t(key) {
        return key;
    }
}

class EmptyServiceStub {}

/**
 * Other engines (Fleetbase AI) open the key dialogs through this service, so
 * its public surface must stay as it was.
 */
module('Unit | Service | api-key-actions', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.owner.register('service:intl', IntlStub);
        this.owner.register('service:universe', EmptyServiceStub);
        this.owner.register('service:host-router', EmptyServiceStub);
    });

    test('it keeps the shared dialog and transition API', function (assert) {
        const service = this.owner.lookup('service:api-key-actions');

        ['createApiKey', 'editApiKey', 'renameApiKey', 'rollApiKey', 'deleteApiKey', 'viewApiKey', 'viewRequestLogs', 'watchChannel', 'exportApiKeys', 'queryParamsFor'].forEach((method) => {
            assert.strictEqual(typeof service[method], 'function', `${method} is a function`);
        });

        assert.strictEqual(typeof service.modal.create, 'function');
        assert.strictEqual(typeof service.modal.edit, 'function');
        assert.strictEqual(typeof service.transition.list, 'function');
        assert.strictEqual(service.registryResource, 'api-key');
        assert.strictEqual(service.tableRegistry, 'developers:api-key:table');
    });

    test('it offers the expiration choices the API accepts', function (assert) {
        const service = this.owner.lookup('service:api-key-actions');

        assert.deepEqual(
            service.expirationChoices.map((choice) => choice.value),
            ['never', 'immediately', 'in 1 hour', 'in 24 hours', 'in 3 days', 'in 7 days']
        );
    });
});
