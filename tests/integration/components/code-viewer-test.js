import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { setComponentTemplate } from '@ember/component';
import templateOnly from '@ember/component/template-only';

module('Integration | Component | code-viewer', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        // ember-prism is not part of the dummy build; a plain <pre> stands in for its CodeBlock.
        this.owner.register('component:code-block', setComponentTemplate(hbs`<pre>{{@code}}</pre>`, templateOnly()));
    });

    test('it shows pretty JSON with a toolbar and switches to raw', async function (assert) {
        this.set('value', { id: 'order_1', status: 'created' });

        await render(hbs`<CodeViewer @value={{this.value}} @title="Payload" />`);

        assert.dom('.dev-code-title').hasText('Payload');
        assert.dom('.dev-code-meta').exists();
        assert.dom('.dev-code-body').includesText('"id": "order_1"');

        await click('.dev-segmented .dev-segment:nth-child(2)');
        assert.dom('.dev-code-body').includesText('{"id":"order_1","status":"created"}');
    });

    test('it shows the empty text when there is nothing to display', async function (assert) {
        this.set('value', {});

        await render(hbs`<CodeViewer @value={{this.value}} @emptyText="No body" />`);

        assert.dom('.dev-code-empty').hasText('No body');
        assert.dom('.dev-code-body').doesNotExist();
    });
});
