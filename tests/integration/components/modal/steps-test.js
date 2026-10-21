import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | modal/steps', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders numbered steps with their states', async function (assert) {
        this.set('steps', [
            { label: 'Details', state: 'done' },
            { label: 'Save the secret', state: 'active' },
        ]);

        await render(hbs`<Modal::Steps @steps={{this.steps}} />`);

        assert.dom('.dev-step').exists({ count: 2 });
        assert.dom('.dev-step:nth-child(1)').hasClass('is-done');
        assert.dom('.dev-step:nth-child(2)').hasClass('is-active');
        assert.dom('.dev-step:nth-child(2) .dev-step-num').hasText('2');
        assert.dom('.dev-step:nth-child(2) .dev-step-label').hasText('Save the secret');
    });
});
