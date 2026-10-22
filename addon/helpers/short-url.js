import { helper } from '@ember/component/helper';
import { shortUrl } from '../utils/format';

export default helper(function shortUrlHelper([value]) {
    return shortUrl(value);
});
