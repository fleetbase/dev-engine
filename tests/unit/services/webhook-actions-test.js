import { module, test } from 'qunit';
import { setupTest } from 'dummy/tests/helpers';

class IntlStub {
    t(key) {
        return key;
    }
}

class EmptyServiceStub {}

module('Unit | Service | webhook-actions', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.owner.register('service:intl', IntlStub);
        this.owner.register('service:universe', EmptyServiceStub);
        this.owner.register('service:host-router', EmptyServiceStub);
    });

    test('it keeps the shared dialog API', function (assert) {
        const service = this.owner.lookup('service:webhook-actions');

        ['createWebhook', 'editWebhook', 'deleteWebhook', 'enableWebhook', 'disableWebhook', 'viewWebhook', 'validateUrl', 'queryParamsFor'].forEach((method) => {
            assert.strictEqual(typeof service[method], 'function', `${method} is a function`);
        });

        assert.strictEqual(service.registryResource, 'webhook');
    });

    test('validateUrl mirrors the public URL rule', function (assert) {
        const service = this.owner.lookup('service:webhook-actions');

        assert.strictEqual(service.validateUrl('https://api.acme.com/hooks'), null);
        assert.strictEqual(service.validateUrl(''), 'developers.webhooks.form.url-required');
        assert.strictEqual(service.validateUrl('not a url'), 'developers.webhooks.form.url-invalid');
        assert.strictEqual(service.validateUrl('ftp://acme.com/x'), 'developers.webhooks.form.url-invalid');
        assert.strictEqual(service.validateUrl('http://localhost:3000/hooks'), 'developers.webhooks.form.url-private');
        assert.strictEqual(service.validateUrl('http://192.168.1.4/hooks'), 'developers.webhooks.form.url-private');
    });
});
