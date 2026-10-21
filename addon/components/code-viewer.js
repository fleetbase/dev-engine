import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { isBlank } from '@ember/utils';
import copyToClipboard from '@fleetbase/ember-core/utils/copy-to-clipboard';
import { byteSize } from '../utils/format';

/**
 * A code block with a toolbar: Copy, Pretty / Raw, Wrap, and optionally
 * "Copy as cURL". Wraps the ember-prism `CodeBlock`.
 *
 * @param {Object|String} value the JSON value or string to show
 * @param {String} language prism language, default `json`
 * @param {String} title the toolbar label
 * @param {String} curl a cURL command to offer on the toolbar
 * @param {String} emptyText shown when there is nothing to display
 */
export default class CodeViewerComponent extends Component {
    @service notifications;
    @service intl;
    @tracked mode = 'pretty';
    @tracked wrap = false;

    get language() {
        return this.args.language ?? 'json';
    }

    get isJson() {
        return this.language === 'json';
    }

    get isPretty() {
        return this.mode === 'pretty';
    }

    get hasContent() {
        const { value } = this.args;

        if (isBlank(value)) {
            return false;
        }

        if (typeof value === 'object' && Object.keys(value).length === 0) {
            return false;
        }

        return true;
    }

    get prettyCode() {
        const { value } = this.args;

        if (typeof value === 'string') {
            try {
                return JSON.stringify(JSON.parse(value), null, 2);
            } catch {
                return value;
            }
        }

        return JSON.stringify(value, null, 2);
    }

    get rawCode() {
        const { value } = this.args;

        return typeof value === 'string' ? value : JSON.stringify(value);
    }

    get code() {
        return this.isPretty ? this.prettyCode : this.rawCode;
    }

    get size() {
        return this.hasContent ? byteSize(this.rawCode) : null;
    }

    @action setMode(mode) {
        this.mode = mode;
    }

    @action toggleWrap() {
        this.wrap = !this.wrap;
    }

    @action copy() {
        return copyToClipboard(this.code).then(() => {
            this.notifications.info(this.intl.t('developers.code-viewer.copied'));
        });
    }

    @action copyCurl() {
        return copyToClipboard(this.args.curl).then(() => {
            this.notifications.info(this.intl.t('developers.code-viewer.copied-curl'));
        });
    }
}
