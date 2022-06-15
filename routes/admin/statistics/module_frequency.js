// route query
const sql = (params) => {
    return `
        select * from traffic.aggregate_counts;
    `;
};

// route schema
const schema = {
    description: 'Return the frequency of service calls made to each module in the platform.',
    tags: ['api'],
    summary: 'table query'
};

// create route
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/module_frequency',
        schema: schema,
        // preHandler: fastify.auth([fastify.verifyToken]),
        handler: function (request, reply) {
            fastify.pg.connect(onConnect);

            function onConnect(error, client, release) {
                if (error) {
                    reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: error
                    });
                } else {
                    client.query(sql(request.params, request.query), function onResult(err, result) {
                        release();
                        reply.send(err || result.rows);
                    });
                }
            }
        }
    });
    next();
};

module.exports.autoPrefix = '/admin/statistics';
