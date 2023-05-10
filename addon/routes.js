import buildRoutes from 'ember-engines/routes';

export default buildRoutes(function () {
    this.route('home', { path: '/' }, function () {
        this.route('index', { path: '/' });
    });
    this.route('api-keys', function () {
        this.route('index', { path: '/' });
    });
    this.route('webhooks', function () {
        this.route('index', { path: '/' });
        this.route('view', { path: '/:id' });
    });
    this.route('sockets', function () {
        this.route('index', { path: '/' });
        this.route('view', { path: '/:name' });
    });
    this.route('events', function () {
        this.route('index', { path: '/' });
        this.route('view', { path: '/:public_id' });
    });
    this.route('logs', function () {
        this.route('index', { path: '/' });
        this.route('view', { path: '/:public_id' });
    });
});
