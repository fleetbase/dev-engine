import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | widget/quick-resources', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders developer resource shortcuts', async function (assert) {
        await render(hbs`<Widget::QuickResources />`);

        assert.dom('.developers-dashboard-widget').exists();
        assert.dom('.dev-quick-grid .dev-quick-link').exists({ count: 6 });
        assert.dom('.dev-quick-grid').includesText('Create API key');
        assert.dom('.dev-quick-grid').includesText('Add webhook endpoint');
        assert.dom('.dev-quick-grid').includesText('Channels');
    });
});
