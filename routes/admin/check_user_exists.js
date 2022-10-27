// check_user_exists: checks if a username exists already

// route register
const getQuery = (requestBody) => {
    const sql = `SELECT COUNT(1)::integer
	FROM admin.user_info
    WHERE user_name = $1`;

    return {
        query: sql,
        values: [requestBody.username]
    };
};


// create route
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/check-user-exists',
        schema: {
            description: "checks if a username exists already",
            tags: ['admin'],
            summary: "checks if a username exists already",
            querystring: {
                username: {
                    type: 'string',
                    description: 'User email to log into SV'
                }
            }
        },
        preHandler: fastify.auth([fastify.verifyToken]),
        handler: function (request, reply) {
            request.tracker = new fastify.RequestTracker(
                request.headers.credentials,
                'admin',
                'check_user_exists',
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

                const queryParameters = getQuery(request.query);
                if (request.query.username == undefined) {
                    request.tracker.error('need username');
                    release();
                    reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'need username'
                    });
                }
                else {
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
                            release();
                            if (result.rows.length === 0) {
                                reply.send({ exists: false });
                            } else {
                                if (result.rows[0].count > 0) reply.send({ exists: true });
                                else reply.send({ exists: false });
                            }                        
                        }
                    });

                }

            }
        }
    });

    next();
};

module.exports.autoPrefix = '/admin';
