'use strict';

// The dummy app only needs the source locale; the other locales are built by the host console.
module.exports = function () {
    return {
        includeLocales: ['en-us'],
        errorOnMissingTranslations: false,
    };
};
