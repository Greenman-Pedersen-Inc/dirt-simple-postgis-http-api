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
            const queryArgs = request.query;

            function onConnect(err, client, release) {
                if (err) {
                    release();
                    reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'unable to connect to database server'
                    });
                } else if (queryArgs.userName == undefined) {
                    release();
                    reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'need user name'
                    });
                } else {
                    try {
                        client.query(sql(queryArgs), function onResult(err, result) {
                            release();

                            if (err) {
                                reply.send(err);
                            } else if (result && result.rows) {
                                reply.send(result.rows);
                            } else {
                                reply.code(204);
                            }
                        });
                    } catch (error) {
                        release();

                        reply.send({
                            statusCode: 500,
                            error: error,
                            message: request
                        });
                    }
                }
            }

            fastify.pg.connect(onConnect);
        }
    });
    next();
};

module.exports.autoPrefix = '/v1';
