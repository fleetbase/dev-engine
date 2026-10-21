import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { timeStamp } from '../../utils/format';
import { formatDistanceToNowStrict } from 'date-fns';

/**
 * The expiry column: Never, "in 18 days" (amber under 30 days), or Expired (red).
 */
export default class ApiKeyExpiryCellComponent extends Component {
    @service intl;

    get expiresAt() {
        const value = this.args.row?.expires_at ?? this.args.value;

        if (!value) {
            return null;
        }

        const date = value instanceof Date ? value : new Date(value);

        return Number.isNaN(date.getTime()) ? null : date;
    }

    get state() {
        const date = this.expiresAt;

        if (!date) {
            return 'never';
        }

        const delta = date.getTime() - Date.now();

        if (delta < 0) {
            return 'expired';
        }

        if (delta < 30 * 86400000) {
            return 'soon';
        }

        return 'later';
    }

    get text() {
        const date = this.expiresAt;

        switch (this.state) {
            case 'never':
                return this.intl.t('developers.common.never');
            case 'expired':
                return this.intl.t('developers.api-keys.badges.expired');
            case 'soon':
                return this.intl.t('developers.api-keys.expiry-in', { when: formatDistanceToNowStrict(date) });
            default:
                return timeStamp(date, 'yyyy-MM-dd');
        }
    }

    get title() {
        return this.expiresAt ? timeStamp(this.expiresAt, 'yyyy-MM-dd HH:mm') : null;
    }

    get badgeStatus() {
        return this.state === 'expired' ? 'danger' : 'warning';
    }

    get showBadge() {
        return this.state === 'expired' || this.state === 'soon';
    }
}
