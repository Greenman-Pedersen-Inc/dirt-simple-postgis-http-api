// route query
const sql = (params) => {
    return `
        with token_duration_info as (
            select
                to_char(TO_TIMESTAMP(min(request_time)/1000), 'DD/MM/YYYY') as access_date,
                age(
                    TO_TIMESTAMP(max(request_time)/1000),
                    TO_TIMESTAMP(min(execution_time)/1000)
                ) as duration,
                user_name
            from traffic.crash_map
            group by token, user_name
        )
        select * from token_duration_info
        where duration > make_interval(0,0,0,0,0,1)
        order by 1 asc
  `;
};

// route schema
const schema = {
    description: 'Query a table or view.',
    tags: ['api'],
    summary: 'table query'
};

// create route
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/token_duration',
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
