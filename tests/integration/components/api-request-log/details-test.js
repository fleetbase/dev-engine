import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | api-request-log/details', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders', async function (assert) {
        // Set any properties with this.set('myProperty', 'value');
        // Handle any actions with this.set('myAction', function(val) { ... });

        await render(hbs`<ApiRequestLog::Details />`);

        assert.dom(this.element).hasText('');

        // Template block usage:
        await render(hbs`
      <ApiRequestLog::Details>
        template block text
      </ApiRequestLog::Details>
    `);

        assert.dom(this.element).hasText('template block text');
    });
});
