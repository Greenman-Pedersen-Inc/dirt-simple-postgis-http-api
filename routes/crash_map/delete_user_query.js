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
            function onConnect(err, client, release) {
                const queryArgs = request.query;

                if (err) {
                    release();
                    return reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'unable to connect to database server'
                    });
                } else if (queryArgs.userName == undefined) {
                    release();
                    return reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'need user name'
                    });
                } else if (queryArgs.oid == undefined) {
                    release();

                    return reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'need oid'
                    });
                } else {
                    try {
                        client.query(sql(queryArgs), function onResult(err, result) {
                            release();
                            var result = {};
                            if (err) result = { success: false, error: err };
                            else result = { success: true };
                            reply.send(err || result);
                            // client.query(sql(queryArgs), function onResult(err, result) {
                            //     release();

                            //     reply.send(err || result.rows);
                        });
                    } catch (err) {
                        release();

                        reply.send({
                            statusCode: 500,
                            error: err,
                            message: request
                        });
                    }
                }
            }

            fastify.pg.connect(onConnect);
        },
        onRequest: async (req, res) => {
            req.controller = new AbortController();
            res.raw.setTimeout(typeof customTimeout == 'undefined' ? fastify.globalTimeout : customTimeout, () => {
                req.controller.abort();
                res.send(new Error('Server Timeout'));
                res.send = (payload) => res;
            });
        }
    });
    next();
};

module.exports.autoPrefix = '/v1';
