import { helper } from '@ember/component/helper';
import { formatMs, formatSeconds } from '../utils/format';

/**
 * `{{dev-duration value unit="s"}}` for core-api durations stored in
 * seconds, `{{dev-duration value}}` for milliseconds.
 */
export default helper(function devDurationHelper([value], { unit = 'ms' } = {}) {
    return unit === 's' ? formatSeconds(value) : formatMs(value);
});
