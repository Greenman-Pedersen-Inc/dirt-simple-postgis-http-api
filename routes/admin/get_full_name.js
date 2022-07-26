// get_full_name: gets the full name of a user based on username

// route register
const getQuery = (requestBody) => {
    const sql = `SELECT CONCAT(first_name, ' ', last_name) "fullName" FROM admin.user_info
    WHERE LOWER(user_name) = LOWER($1);`;

    return {
        query: sql,
        values: [requestBody.User]
    };
};

const schema = {
    description: 'gets the full name of a user based on username',
    tags: ['admin'],
    summary: 'gets the full name of a user based on username',
    querystring: {
        User: {
            type: 'string',
            description: 'username',
            example: 'mcollins'
        }
    }
};

// create route
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/get-full-name',
        schema: schema,
        preHandler: fastify.auth([fastify.verifyToken]),
        handler: function (request, reply) {
            function onConnect(err, client, release) {
                if (err)
                    return reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'unable to connect to database server: ' + err
                    });
                else if (request.query.User === undefined || request.query.User === '' || request.query.User === null) {
                    return reply.send({
                        statusCode: 500,
                        error: 'Missing User attribute',
                        message: 'No username specified'
                    });
                }

                const queryParameters = getQuery(request.query);

                client.query(queryParameters.query, queryParameters.values, function onResult(err, result) {
                    release();

                    if (err)
                        return reply.send({
                            statusCode: 500,
                            error: 'Internal Server Error',
                            message: 'unable to perform database operation: ' + err
                        });
                    if (result.rows.length <= 0) reply.send(null);
                    else reply.send(result.rows[0]);
                });
            }

            fastify.pg.connect(onConnect);
        }
    });

    next();
};

module.exports.autoPrefix = '/admin';
