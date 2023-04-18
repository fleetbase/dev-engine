import Model, { attr } from '@ember-data/model';
import { computed } from '@ember/object';
import { format as formatDate, isValid as isValidDate, formatDistanceToNow } from 'date-fns';

export default class ApiRequestLogModel extends Model {
    /** @ids */
    @attr('string') company_uuid;
    @attr('string') api_credential_uuid;
    @attr('string') public_id;

    /** @attributes */
    @attr('string') api_credential_name;
    @attr('string') method;
    @attr('string') path;
    @attr('string') full_url;
    @attr('string') status_code;
    @attr('string') reason_phrase;
    @attr('number') duration;
    @attr('string') ip_address;
    @attr('string') version;
    @attr('string') source;
    @attr('string') content_type;
    @attr('raw') related_resources;
    @attr('raw') related;
    @attr('raw') query_params;
    @attr('raw') request_headers;
    @attr('raw') request_body;
    @attr('raw') request_raw_body;
    @attr('raw') response_headers;
    @attr('raw') response_body;
    @attr('raw') response_raw_body;

    /** @dates */
    @attr('date') deleted_at;
    @attr('date') created_at;
    @attr('date') updated_at;

    /** @computed */
    @computed('status_code', 'reason_phrase') get status() {
        return `${this.status_code} ${this.reason_phrase}`;
    }

    @computed('method', 'path') get description() {
        return `${this.method} /${this.path}`;
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
