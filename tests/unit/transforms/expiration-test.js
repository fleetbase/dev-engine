import { module, test } from 'qunit';
import { setupTest } from 'dummy/tests/helpers';

module('Unit | Transform | expiration', function (hooks) {
    setupTest(hooks);

    test('it serializes relative expiration strings untouched', function (assert) {
        const transform = this.owner.lookup('transform:expiration');

        for (const option of ['never', 'immediately', 'in 1 hour', 'in 24 hours', 'in 3 days', 'in 7 days']) {
            assert.strictEqual(transform.serialize(option), option);
        }
    });

    test('it serializes dates to ISO strings', function (assert) {
        const transform = this.owner.lookup('transform:expiration');
        const date = new Date('2026-08-28T12:00:00.000Z');

        assert.strictEqual(transform.serialize(date), '2026-08-28T12:00:00.000Z');
    });

    test('it serializes empty and invalid values to null', function (assert) {
        const transform = this.owner.lookup('transform:expiration');

        assert.strictEqual(transform.serialize(null), null);
        assert.strictEqual(transform.serialize(undefined), null);
        assert.strictEqual(transform.serialize(new Date('not a date')), null);
        assert.strictEqual(transform.serialize(12345), null);
    });

    test('it deserializes datetime strings and timestamps to dates', function (assert) {
        const transform = this.owner.lookup('transform:expiration');

        assert.strictEqual(transform.deserialize('2026-08-28T12:00:00.000Z').getTime(), Date.parse('2026-08-28T12:00:00.000Z'));
        assert.strictEqual(transform.deserialize('2026-08-28T12:00:00+0000').getTime(), Date.parse('2026-08-28T12:00:00+00:00'));
        assert.strictEqual(transform.deserialize(1756382400000).getTime(), 1756382400000);
        assert.strictEqual(transform.deserialize(null), null);
        assert.strictEqual(transform.deserialize(undefined), undefined);
        assert.strictEqual(transform.deserialize({}), null);
    });
});
