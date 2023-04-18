import Model, { attr, belongsTo } from '@ember-data/model';
import { computed } from '@ember/object';
import { format as formatDate, isValid as isValidDate, formatDistanceToNow } from 'date-fns';

export default class WebhookRequestLogModel extends Model {
    /** @ids */
    @attr('string') public_id;
    @attr('string') company_uuid;
    @attr('string') webhook_uuid;
    @attr('string') api_credential_uuid;
    @attr('string') api_event_uuid;

    /** @relationships */
    @belongsTo('api-event') api_event;

    /** @attributes */
    @attr('string') method;
    @attr('string') status_code;
    @attr('string') reason_phrase;
    @attr('string') url;
    @attr('number') attempt;
    @attr('raw') response;
    @attr('raw') headers;
    @attr('raw') meta;

    /** @dates */
    @attr('date') sent_at;
    @attr('date') deleted_at;
    @attr('date') created_at;
    @attr('date') updated_at;

    /** @computed */
    @computed('status_code') get result() {
        return this.status_code.startsWith('2') ? 'succeeded' : 'failed';
    }

    @computed('status_code', 'reason_phrase') get status() {
        return `${this.status_code} ${this.reason_phrase}`;
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

    @computed('sent_at') get sentAgo() {
        if (!isValidDate(this.sent_at)) {
            return null;
        }

        return formatDistanceToNow(this.sent_at);
    }

    @computed('sent_at') get sentAt() {
        if (!isValidDate(this.sent_at)) {
            return null;
        }
        return formatDate(this.sent_at, 'PPP p');
    }
}
