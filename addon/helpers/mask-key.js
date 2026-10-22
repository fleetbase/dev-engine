import { helper } from '@ember/component/helper';
import { maskKey } from '../utils/format';

export default helper(function maskKeyHelper([key, head, tail]) {
    return maskKey(key, head, tail);
});
