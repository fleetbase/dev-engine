import { isBlank } from '@ember/utils';
import { formatDistanceToNowStrict, format as formatDate, isValid } from 'date-fns';

/**
 * Masks the middle of an API key: `flb_live_z2c4…pzWfR`.
 *
 * @param {String} key
 * @param {Number} head characters kept after the prefix
 * @param {Number} tail characters kept at the end
 * @returns {String|null}
 */
export function maskKey(key, head = 4, tail = 5) {
    if (typeof key !== 'string' || key.length === 0) {
        return null;
    }

    const match = key.match(/^(flb_(?:live|test)_)(.+)$/);
    const prefix = match ? match[1] : '';
    const body = match ? match[2] : key;

    if (body.length <= head + tail + 1) {
        return key;
    }

    return `${prefix}${body.slice(0, head)}…${body.slice(-tail)}`;
}

/**
 * Milliseconds as a short duration: `184 ms`, `2.4 s`.
 */
export function formatMs(value) {
    const ms = Number(value);

    if (!Number.isFinite(ms)) {
        return null;
    }

    if (ms >= 1000) {
        return `${(ms / 1000).toFixed(ms >= 10000 ? 0 : 1)} s`;
    }

    return `${Math.round(ms)} ms`;
}

/**
 * Seconds (how core-api stores durations) as a short duration.
 */
export function formatSeconds(value) {
    const seconds = Number(value);

    if (!Number.isFinite(seconds)) {
        return null;
    }

    return formatMs(seconds * 1000);
}

/**
 * `2 min ago`, or null when blank.
 */
export function timeAgo(value) {
    if (isBlank(value)) {
        return null;
    }

    const date = value instanceof Date ? value : new Date(value);

    if (!isValid(date)) {
        return null;
    }

    return `${formatDistanceToNowStrict(date)} ago`;
}

/**
 * `Oct 14, 12:36:41`.
 */
export function timeStamp(value, pattern = 'MMM d, HH:mm:ss') {
    if (isBlank(value)) {
        return null;
    }

    const date = value instanceof Date ? value : new Date(value);

    if (!isValid(date)) {
        return null;
    }

    return formatDate(date, pattern);
}

/**
 * The host and path of a URL without scheme or query: `api.acme.com/hooks/fleetbase`.
 */
export function shortUrl(value) {
    if (typeof value !== 'string' || value.length === 0) {
        return null;
    }

    try {
        const url = new URL(value);

        return `${url.host}${url.pathname === '/' ? '' : url.pathname}`;
    } catch {
        return value.replace(/^https?:\/\//, '');
    }
}

/**
 * Bytes of a string or object as `1.2 KB`.
 */
export function byteSize(value) {
    if (isBlank(value)) {
        return null;
    }

    const text = typeof value === 'string' ? value : JSON.stringify(value);
    const bytes = new Blob([text]).size;

    if (bytes < 1024) {
        return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * The status class of an HTTP status code: `2xx`, `4xx`, `5xx`.
 */
export function statusClass(code) {
    const number = parseInt(code, 10);

    if (!Number.isFinite(number)) {
        return null;
    }

    return `${Math.floor(number / 100)}xx`;
}

/**
 * The badge status for an HTTP status code.
 */
export function statusTone(code) {
    const number = parseInt(code, 10);

    if (!Number.isFinite(number)) {
        return 'info';
    }

    if (number >= 500) {
        return 'danger';
    }

    if (number >= 400) {
        return 'warning';
    }

    if (number >= 200 && number < 300) {
        return 'success';
    }

    return 'info';
}
