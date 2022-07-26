// create route
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/',
        schema: {
            hide: true
        },
        preHandler: fastify.auth([fastify.verifyToken]),
        handler: function (request, reply) {
            reply.sendFile('index.html');
        }
    });
    next();
};
