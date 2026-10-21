import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { debounce, cancel } from '@ember/runloop';

/**
 * Tracks the window width so list controllers can hide low-priority columns
 * on narrower screens through the ember-ui `column.hidden` flag, which keeps
 * the fixed-layout tables from squishing or overflowing.
 */
export default class DevViewportService extends Service {
    @tracked width = typeof window !== 'undefined' ? window.innerWidth : 1440;

    constructor() {
        super(...arguments);

        if (typeof window !== 'undefined') {
            this._onResize = () => {
                this._timer = debounce(this, this.measure, 120);
            };
            window.addEventListener('resize', this._onResize);
        }
    }

    willDestroy() {
        super.willDestroy(...arguments);

        if (typeof window !== 'undefined' && this._onResize) {
            window.removeEventListener('resize', this._onResize);
        }

        cancel(this._timer);
    }

    measure() {
        this.width = window.innerWidth;
    }

    /**
     * True when the viewport is narrower than `px`.
     */
    below(px) {
        return this.width < px;
    }
}
