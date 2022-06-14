// route query
const sql = (params) => {
    return `
        select user_name, elapsed_time, end_point, user_query
        from traffic.${params.module}
        order by 2 desc
        limit 100
  `;
};

// route schema
const schema = {
    description: 'Query a table or view.',
    tags: ['api'],
    summary: 'table query',
    params: {
        module: {
            type: 'string',
            description: 'The name of the module to get stats for.'
        }
    }
};

// create route
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/long_queries/:module',
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
