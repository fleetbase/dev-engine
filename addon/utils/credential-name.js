/**
 * The API appends the key to credential names, e.g. `Test Key (flb_live_…)`.
 * Lists and headers show the name alone; the key has its own cell.
 */
export default function credentialName(value) {
    if (typeof value !== 'string') {
        return value;
    }

    return value.replace(/\s*\((flb|sk|pk)_[a-z]+_[A-Za-z0-9]+\)\s*$/, '').trim() || value;
}
