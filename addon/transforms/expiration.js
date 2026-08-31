import Transform from '@ember-data/serializer/transform';

/**
 * Transform for expiration attributes which the API accepts as either a
 * datetime or a relative expiration string ('never', 'immediately',
 * 'in 1 hour', 'in 24 hours', ...) resolved server side.
 *
 * Deserializes like the standard `date` transform so date reads keep
 * returning `Date` instances, but serializes strings untouched — the
 * `date` transform serializes any non-Date value to `null`, which
 * silently discards a selected relative expiration.
 */
export default class ExpirationTransform extends Transform {
    deserialize(serialized) {
        const type = typeof serialized;

        if (type === 'string') {
            let offset = serialized.indexOf('+');

            if (offset !== -1 && serialized.length - 5 === offset) {
                offset += 3;
                return new Date(serialized.slice(0, offset) + ':' + serialized.slice(offset));
            }

            return new Date(serialized);
        }

        if (type === 'number') {
            return new Date(serialized);
        }

        if (serialized === null || serialized === undefined) {
            return serialized;
        }

        return null;
    }

    serialize(deserialized) {
        if (typeof deserialized === 'string') {
            return deserialized;
        }

        if (deserialized instanceof Date && !isNaN(deserialized)) {
            return deserialized.toISOString();
        }

        return null;
    }
}
