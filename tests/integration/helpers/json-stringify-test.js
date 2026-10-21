import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Helper | json-stringify', function (hooks) {
    setupRenderingTest(hooks);

    test('it pretty-prints the value as JSON', async function (assert) {
        this.set('inputValue', { id: 1234, status: 'created' });

        await render(hbs`{{json-stringify this.inputValue}}`);

        assert.dom(this.element).hasText('{ "id": 1234, "status": "created" }');
    });
});
