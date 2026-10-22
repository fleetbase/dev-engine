import { setupApplicationTest as upstreamSetupApplicationTest, setupRenderingTest as upstreamSetupRenderingTest, setupTest as upstreamSetupTest } from 'ember-qunit';
import { setupIntl } from 'ember-intl/test-support';
import Service from '@ember/service';

/**
 * The host console provides `hostRouter`; the dummy app registers a stub so
 * engine units that inject it can be looked up. Tests override it as needed.
 */
class HostRouterStub extends Service {
    currentRouteName = 'console.developers.index';
    currentURL = '/developers';
    transitionTo() {}
    refresh() {}
    urlFor() {
        return '/';
    }
    on() {}
    off() {}
    one() {}
}

/**
 * The console grants permissions through its own ability setup; the dummy app
 * allows everything unless a test registers its own abilities stub.
 */
class AbilitiesStub extends Service {
    can() {
        return true;
    }
    cannot() {
        return false;
    }
}

function registerHostStubs(hooks) {
    hooks.beforeEach(function () {
        if (!this.owner.hasRegistration('service:host-router')) {
            this.owner.register('service:host-router', HostRouterStub);
        }

        this.owner.unregister('service:abilities');
        this.owner.register('service:abilities', AbilitiesStub);
    });
}

// This file exists to provide wrappers around ember-qunit's
// test setup functions. This way, you can easily extend the setup that is
// needed per test type.

function setupApplicationTest(hooks, options) {
    upstreamSetupApplicationTest(hooks, options);

    // Additional setup for application tests can be done here.
    //
    // For example, if you need an authenticated session for each
    // application test, you could do:
    //
    // hooks.beforeEach(async function () {
    //   await authenticateSession(); // ember-simple-auth
    // });
    //
    // This is also a good place to call test setup functions coming
    // from other addons:
    //
    // setupIntl(hooks); // ember-intl
    // setupMirage(hooks); // ember-cli-mirage
}

function setupRenderingTest(hooks, options) {
    upstreamSetupRenderingTest(hooks, options);
    setupIntl(hooks, 'en-us');
    registerHostStubs(hooks);

    // Additional setup for rendering tests can be done here.
}

function setupTest(hooks, options) {
    upstreamSetupTest(hooks, options);
    registerHostStubs(hooks);

    // Additional setup for unit tests can be done here.
}

export { setupApplicationTest, setupRenderingTest, setupTest };
