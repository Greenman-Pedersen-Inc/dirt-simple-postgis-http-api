// get_user_roles: gets a list of roles for a specific user

// route register
const getQuery = () => {
    const sql = `
    SELECT title from admin.user_module_access
    WHERE user_id = (SELECT internal_id from admin.user_info WHERE LOWER(user_name) = LOWER($1))
    ORDER BY title;
    `;
    return sql;
};

const schema = {
    description: 'gets a list of roles for a specific user.',
    tags: ['admin'],
    summary: 'gets a list of roles for a specific user.',
    querystring: {
        userName: {
            type: 'string',
            description: 'User email to log into SV'
        }
    }
};

// create route
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/get-user-roles',
        schema: schema,
        preHandler: fastify.auth([fastify.verifyToken]),
        handler: function (request, reply) {
            const queryArgs = request.query;

            function onConnect(err, client, release) {
                if (err) {
                    release();
                    return reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'unable to connect to database server: ' + err
                    });
                } else if (queryArgs.userName === undefined || queryArgs.userName === '') {
                    release();
                    return reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'need user name'
                    });
                }

                const query = getQuery(queryArgs.userName);

                client.query(query, [queryArgs.userName], function onResult(err, result) {
                    release();

                    if (err) {
                        return reply.send({
                            statusCode: 500,
                            error: 'Internal Server Error',
                            message: 'unable to perform database operation: ' + err
                        });
                    }
                    reply.send(result.rows);
                });
            }

            fastify.pg.connect(onConnect);
        }
    });

    next();
};

module.exports.autoPrefix = '/admin';
