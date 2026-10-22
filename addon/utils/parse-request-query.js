const TOKEN = /(\w+)(:|>=|<=|>|<)("[^"]*"|\S+)/g;

/**
 * Splits a requests search box value into free text and operator filters.
 *
 *   status:5xx method:POST path:/v1/orders* key:flb_live ip:1.2.3.4 version:2024-03-12 duration>1000
 *
 * Tokens map to the generic filter operator suffixes core-api supports; the
 * rest stays the free-text `query`.
 */
export default function parseRequestQuery(value) {
    const params = {};
    let query = String(value ?? '');

    query = query.replace(TOKEN, (match, field, operator, raw) => {
        const token = raw.replace(/^"|"$/g, '');

        switch (field.toLowerCase()) {
            case 'status': {
                const klass = token.match(/^([1-5])xx$/i);

                if (klass) {
                    params.status_code_gte = Number(klass[1]) * 100;
                    params.status_code_lt = Number(klass[1]) * 100 + 100;
                } else if (/^\d{3}$/.test(token)) {
                    params.status_code = Number(token);
                } else {
                    return match;
                }

                return '';
            }
            case 'method':
                params.method = token.toUpperCase();
                return '';
            case 'path':
                params.path = token;
                return '';
            case 'key':
                params.key = token;
                return '';
            case 'ip':
                params.ip_address = token;
                return '';
            case 'version':
                params.version = token;
                return '';
            case 'source':
                params.source = token;
                return '';
            case 'duration': {
                const ms = Number(token);

                if (!Number.isFinite(ms)) {
                    return match;
                }

                const seconds = ms / 1000;

                if (operator === '>' || operator === '>=') {
                    params.duration_gte = seconds;
                } else if (operator === '<' || operator === '<=') {
                    params.duration_lte = seconds;
                } else {
                    params.duration = seconds;
                }

                return '';
            }
            default:
                return match;
        }
    });

    return { query: query.replace(/\s+/g, ' ').trim(), params };
}
