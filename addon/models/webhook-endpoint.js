import Model, { attr } from '@ember-data/model';
import { computed } from '@ember/object';
import { format as formatDate, isValid as isValidDate, formatDistanceToNow } from 'date-fns';

export default class WebhookEndpointModel extends Model {
    /** @ids */
    @attr('string') company_uuid;
    @attr('string') created_by_uuid;
    @attr('string') updated_by_uuid;

    /** @attributes */
    @attr('string') api_credential_uuid;
    @attr('string') api_credential_name;
    @attr('string') url;
    @attr('string') version;
    @attr('string') description;
    @attr('string', { defaultValue: 'test' }) mode;
    @attr('array', { defaultValue: [] }) events;
    @attr('boolean') is_listening_on_all_events;
    @attr('string', { defaultValue: 'enabled' }) status;

    /** @dates */
    @attr('date') deleted_at;
    @attr('date') created_at;
    @attr('date') updated_at;

    /** @computed */
    @computed('api_credential_uuid') get receivingFromAllApiCredentials() {
        return !this.api_credential_uuid;
    }

    @computed('status') get isEnabled() {
        return this.status === 'enabled';
    }

    @computed('mode') get isTestMode() {
        return this.mode === 'test';
    }

    @computed('events.[]') get eventTypes() {
        return Array.from(this.events ?? []).join(', ');
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
}
