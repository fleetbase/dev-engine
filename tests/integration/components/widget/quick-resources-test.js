import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | widget/quick-resources', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders developer resource shortcuts', async function (assert) {
        await render(hbs`<Widget::QuickResources />`);

        assert.dom('.developers-dashboard-widget').exists();
        assert.dom('.developers-resource-link').exists({ count: 5 });
        assert.dom('.developers-resource-link').includesText('API Keys');
        assert.dom('.developers-resource-link').includesText('Webhooks');
    });
});
