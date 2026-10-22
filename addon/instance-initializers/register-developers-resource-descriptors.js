import buildDevelopersResourceDescriptors from '../utils/resource-descriptors';

/**
 * Registers the Developers resource descriptors (API keys, webhook endpoints,
 * events, request logs, delivery attempts, socket channels) with the resource
 * registry ember-ui provides, so identity cells, select options and hover
 * summaries render them. Runs with the engine instance so the openers reach
 * the engine's panel service and router.
 */
export function initialize(engineInstance) {
    let registry;

    try {
        registry = engineInstance.lookup('service:resource-registry');
    } catch {
        registry = null;
    }

    if (!registry || typeof registry.registerDescriptors !== 'function') {
        return;
    }

    registry.registerDescriptors(buildDevelopersResourceDescriptors(engineInstance));
}

export default {
    name: 'register-developers-resource-descriptors',
    initialize,
};
