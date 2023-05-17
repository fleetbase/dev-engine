import Model, { attr } from '@ember-data/model';
import { computed } from '@ember/object';
import { format as formatDate, isValid as isValidDate, formatDistanceToNow } from 'date-fns';

export default class ApiCredentialModel extends Model {
    /** @ids */
    @attr('string') user_uuid;
    @attr('string') company_uuid;

    /** @attributes */
    @attr('string') name;
    @attr('string') key;
    @attr('string') secret;
    @attr('boolean', { defaultValue: false }) test_mode;
    @attr('string') api;
    @attr('raw') browser_origins;

    /** @dates */
    @attr('date') last_used_at;
    @attr('date') expires_at;
    @attr('date') deleted_at;
    @attr('date') created_at;
    @attr('date') updated_at;

    /** @computed */
    @computed('name', 'key') get fullName() {
        if (this.name) {
            return `${this.name} (${this.key})`;
        }
        return `${this.key}`;
    }

    @computed('test_mode') get isTestKey() {
        return this.test_mode === true;
    }

    @computed('test_mode') get environment() {
        return this.test_mode ? 'Test' : 'Live';
    }

    @computed('updated_at') get updatedAgo() {
        if (!isValidDate(this.updated_at)) {
            return null;
        }
        return formatDistanceToNow(this.updated_at);
    }

    @computed('updated_at') get updatedAt() {
        if (!isValidDate(this.updated_at)) {
            return null;
        }
        return formatDate(this.updated_at, 'PPP p');
    }

    @computed('updated_at') get updatedAtShort() {
        if (!isValidDate(this.updated_at)) {
            return null;
        }
        return formatDate(this.updated_at, 'PP');
    }

    @computed('created_at') get createdAgo() {
        if (!isValidDate(this.created_at)) {
            return null;
        }
        return formatDistanceToNow(this.created_at);
    }

    @computed('created_at') get createdAt() {
        if (!isValidDate(this.created_at)) {
            return null;
        }
        return formatDate(this.created_at, 'PPP p');
    }

    @computed('created_at') get createdAtShort() {
        if (!isValidDate(this.created_at)) {
            return null;
        }
        return formatDate(this.created_at, 'PP');
    }

    @computed('last_used_at') get lastUsed() {
        if (!this.last_used_at || !isValidDate(this.last_used_at)) {
            return 'Never used';
        }

        return formatDate(this.last_used_at, 'PPP p');
    }

    @computed('expires_at') get expiresAt() {
        if (!this.expires_at || !isValidDate(this.expires_at)) {
            return 'Never';
        }

        return formatDate(this.expires_at, 'PPP p');
    }
}
