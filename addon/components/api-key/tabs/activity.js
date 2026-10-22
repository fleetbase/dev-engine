import Component from '@glimmer/component';

/**
 * Activity tab: what the record itself tells us. A full audit trail needs the
 * activities resource filtered by subject (v1.1).
 */
export default class ApiKeyTabsActivityComponent extends Component {
    get apiKey() {
        return this.args.resource ?? this.args.model;
    }

    get items() {
        const items = [];
        const apiKey = this.apiKey ?? {};

        if (apiKey.expires_at) {
            items.push({ key: 'expires', tone: new Date(apiKey.expires_at) < new Date() ? 'bad' : 'wait', at: apiKey.expires_at });
        }

        if (apiKey.updated_at && apiKey.updated_at !== apiKey.created_at) {
            items.push({ key: 'updated', tone: 'wait', at: apiKey.updated_at });
        }

        if (apiKey.last_used_at) {
            items.push({ key: 'last-used', tone: 'ok', at: apiKey.last_used_at });
        }

        items.push({ key: 'created', tone: 'ok', at: apiKey.created_at });

        const sorted = items.sort((a, b) => new Date(b.at) - new Date(a.at));

        return sorted.map((item, index) => ({ ...item, isLast: index === sorted.length - 1 }));
    }
}
