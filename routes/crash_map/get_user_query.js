// get_user_query: Gets all of the user's custom queries from the voyagerAdmin.user_queries table

// *---------------*
// route query
// *---------------*
const sql = (queryArgs) => {
    var sql = `
    SELECT * FROM usermanagement.user_queries_new WHERE user_name = '${queryArgs.userName}';
    `;
    return sql;
};

// *---------------*
// route schema
// *---------------*
const schema = {
    description: "Gets all of the user's custom queries from the voyagerAdmin.user_queries table.",
    tags: ['crash-map'],
    summary: "Gets all of the user's custom queries from the voyagerAdmin.user_queries table.",
    querystring: {
        userName: {
            type: 'string',
            description: 'User email to log into SV'
            // example: 'example@somewhere.org'
        }
    }
};

// *---------------*
// create route
// *---------------*
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/crash-map/get-user-query',
        schema: schema,
        preHandler: fastify.auth([fastify.verifyToken]),
        handler: function (request, reply) {
            request.tracker = new fastify.RequestTracker(
                request.headers.credentials,
                'crash_map',
                'get_user_query',
                JSON.stringify(request.query),
                reply
            );

            const queryArgs = request.query;
            fastify.pg.connect(onConnect);

            function onConnect(err, client, release) {
                request.tracker.start();

                if (err) {
                    request.tracker.error(err);
                    release();
                    reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'unable to connect to database server'
                    });
                } else if (queryArgs.userName == undefined) {
                    request.tracker.error('need user name');
                    release();
                    reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'need user name'
                    });
                } else {
                    try {
                        client.query(sql(request.query), function onResult(err, result) {
                            if (err) {
                                reply.code(500).send(err);
                                request.tracker.error(err);
                                release();
                            } else if (result && result.rows) {
                                request.tracker.complete();
                                release();
                                reply.send(result.rows);
                            } else {
                                request.tracker.error('no rows returned');
                                release();
                                reply.send({
                                    statusCode: 204,
                                    error: 'no data returned',
                                    message: request
                                });
                            }
                        });
                    } catch (error) {
                        request.tracker.error(error);
                        release();
                        reply.send({
                            statusCode: 500,
                            error: error,
                            message: request
                        });
                    }
                }
            }
        }
    });
    next();
};

module.exports.autoPrefix = '/v1';
