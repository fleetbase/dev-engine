import { module, test } from 'qunit';
import { setupTest } from 'dummy/tests/helpers';
import { format as formatDate } from 'date-fns';

module('Unit | Model | api credential', function (hooks) {
    setupTest(hooks);

    // Replace this with your real tests.
    test('it exists', function (assert) {
        let store = this.owner.lookup('service:store');
        let model = store.createRecord('api-credential', {});
        assert.ok(model);
    });

    test('it serializes relative expiration strings untouched for the API to resolve', function (assert) {
        const store = this.owner.lookup('service:store');

        for (const option of ['never', 'immediately', 'in 1 hour', 'in 24 hours', 'in 3 days', 'in 7 days']) {
            const model = store.createRecord('api-credential', { expires_at: option });
            assert.strictEqual(model.serialize().expires_at, option);
            model.unloadRecord();
        }
    });

    test('it serializes an expiration date to an ISO string', function (assert) {
        const store = this.owner.lookup('service:store');
        const model = store.createRecord('api-credential', { expires_at: new Date('2026-08-28T12:00:00.000Z') });

        assert.strictEqual(model.serialize().expires_at, '2026-08-28T12:00:00.000Z');
    });

    test('it deserializes an expiration datetime for display', function (assert) {
        const store = this.owner.lookup('service:store');
        const model = store.push(store.normalize('api-credential', { uuid: 'api_credential_uuid', expires_at: '2026-08-28T12:00:00.000Z' }));

        assert.true(model.expires_at instanceof Date);
        assert.strictEqual(model.expiresAt, formatDate(new Date('2026-08-28T12:00:00.000Z'), 'yyyy-MM-dd HH:mm'));
    });
});
