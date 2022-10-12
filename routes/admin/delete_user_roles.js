// delete_user_roles: deletes all rows from the admin.user_roles table based on user_name

// route register
const usersql = (requestBody) => {
    const sql = `DELETE FROM admin.user_module
    WHERE user_id = (SELECT internal_id from admin.user_info WHERE LOWER(user_name) = LOWER($1))
    `;

    var values = [requestBody.username];

    return {
        query: sql,
        values: values
    };
};

// create route
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'DELETE',
        url: '/delete-user-roles',
        schema: {
            description: 'deletes all rows from the admin.user_roles table based on user_name',
            tags: ['admin'],
            summary: 'deletes all rows from the admin.user_roles table based on user_name',
            body: {
                type: 'object',
                properties: {
                    username: { type: 'string' }
                },
                required: ['username']
            }
        },
        preHandler: fastify.auth([fastify.verifyToken]),
        handler: function (request, reply) {
            request.tracker = new fastify.RequestTracker(
                request.headers.credentials,
                'admin',
                'check_user_expiry',
                JSON.stringify(request.params)
            );

            fastify.pg.connect(onConnect);

            function onConnect(err, client, release) {
                request.tracker.start();
                if (err) {
                    request.tracker.error(err);
                    release();
                    reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'unable to connect to database server: ' + err
                    });
                }
                else {
                    const queryParameters = usersql(request.body);
    
                    client.query(queryParameters.query, queryParameters.values, function onResult(err, result) {
                        if (err) {
                            request.tracker.error(err);
                            release();
                            reply.send({
                                statusCode: 500,
                                error: 'Internal Server Error',
                                message: 'unable to perform database operation: ' + err
                            });                        
                        }
                        else {
                            request.tracker.complete();
                            reply.send({ success: true });
                            release();
                        }
                    });

                }

            }
        }
    });

    next();
};

module.exports.autoPrefix = '/admin';
