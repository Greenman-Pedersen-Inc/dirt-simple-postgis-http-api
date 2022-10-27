// get_expiry_users: gets a list of users whose access will be expired after a certain date

// route register
const getQuery = (requestBody) => {
    const sql = `SELECT user_name, beg_access_date, end_access_date,organization_name, project_name, project_manager, user_type, user_group, notes
	FROM admin.user_info
    WHERE end_access_date > $1;`;

    return {
        query: sql,
        values: [requestBody.expirationDate]
    };
};

// create route
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'PUT',
        url: '/get-expiry-users',
        schema: {
            description: 'gets a list of users whose access will be expired after a certain date',
            tags: ['admin'],
            summary: 'gets a list of users whose access will be expired after a certain date',
            body: {
                type: 'object',
                properties: {
                    username: { type: 'string' },
                    expirationDate: { type: 'string' } // check if user's access exceeds this date: "2022-01-25"
                },
                required: ['username', 'expirationDate']
            }
        },
        preHandler: fastify.auth([fastify.verifyToken]),
        handler: function (request, reply) {
            request.tracker = new fastify.RequestTracker(
                request.headers.credentials,
                'admin',
                'get_expiry_users',
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
                    const queryParameters = getQuery(request.body);
    
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
                            reply.send(result.rows);
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
