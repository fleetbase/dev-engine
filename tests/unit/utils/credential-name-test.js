import { module, test } from 'qunit';
import credentialName from '@fleetbase/dev-engine/utils/credential-name';

module('Unit | Utility | credential-name', function () {
    test('it strips the key the API appends to credential names', function (assert) {
        assert.strictEqual(credentialName('Test Key (flb_live_z2c4wXmikX0ykDUpzWfR)'), 'Test Key');
        assert.strictEqual(credentialName('Mobile app (flb_test_abc123)'), 'Mobile app');
    });

    test('it leaves other values alone', function (assert) {
        assert.strictEqual(credentialName('Plain name'), 'Plain name');
        assert.strictEqual(credentialName('(flb_live_abc)'), '(flb_live_abc)');
        assert.strictEqual(credentialName(null), null);
        assert.strictEqual(credentialName(undefined), undefined);
    });
});
