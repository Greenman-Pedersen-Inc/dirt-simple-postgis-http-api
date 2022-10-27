// delete_user_query: Removes a user's custom query from the voyagerAdmin.user_queries table

// *---------------*
// route query
// *---------------*
const sql = (queryArgs) => {
    var sql = `
    DELETE FROM usermanagement.user_queries_new WHERE user_name = '${queryArgs.userName}' AND oid = ${queryArgs.oid}
    `;
    return sql;
};

// *---------------*
// route schema
// *---------------*
const schema = {
    description: "Removes a user's custom query from the voyagerAdmin.user_queries table.",
    tags: ['crash-map'],
    summary: "Removes a user's custom query from the voyagerAdmin.user_queries table.",
    querystring: {
        userName: {
            type: 'string',
            description: 'User email to log into SV'
        },
        oid: {
            type: 'string',
            description: 'unique ID for the query object'
        }
    }
};

// *---------------*
// create route
// *---------------*
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'DELETE',
        url: '/crash-map/delete-user-query',
        schema: schema,
        preHandler: fastify.auth([fastify.verifyToken]),
        handler: function (request, reply) {
            request.tracker = new fastify.RequestTracker(
                request.headers.credentials,
                'crash_map',
                'delete_user_query',
                JSON.stringify(request.query),
                reply
            );

            fastify.pg.connect(onConnect);

            function onConnect(err, client, release) {
                const queryArgs = request.query;
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
                } else if (queryArgs.oid == undefined) {
                    request.tracker.error('need oid');
                    release();
                    reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'need oid'
                    });
                } else {
                    try {
                        client.query(sql(queryArgs), function onResult(err, result) {
                            var result = {};

                            if (err) {
                                result = { success: false, error: err };
                                reply.send(result); 
                                request.tracker.error(err);
                                release();
                            }
                            else {
                                request.tracker.complete();
                                result = { success: true };
                                reply.send(result);                                
                                release();
                            }

                        });
                    } catch (err) {
                        request.tracker.error(err);
                        release();
                        reply.send({
                            statusCode: 500,
                            error: err,
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
