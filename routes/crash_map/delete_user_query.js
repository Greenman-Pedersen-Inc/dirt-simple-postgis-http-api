// delete_user_query: Removes a user's custom query from the voyagerAdmin.user_queries table

// *---------------*
// route query
// *---------------*
const sql = (queryArgs) => {
    var sql = `
    DELETE FROM usermanagement.user_queries_new WHERE user_name = '${queryArgs.userName}' AND oid = ${queryArgs.oid}
    `;
    return sql;
  }

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
            description: 'User email to log into SV',
        },
        oid: {
            type: 'string',
            description: 'unique ID for the query object',
        }
    }
}

// *---------------*
// create route
// *---------------*
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'DELETE',
        url: '/crash-map/delete-user-query',
        schema: schema,
        handler: function (request, reply) {
            fastify.pg.connect(onConnect)

            function onConnect(err, client, release) {
                if (err) return reply.send({
                    "statusCode": 500,
                    "error": "Internal Server Error",
                    "message": "unable to connect to database server"
                });

                var queryArgs = request.query;
                if (queryArgs.userName == undefined) {
                    return reply.send({
                        "statusCode": 500,
                        "error": "Internal Server Error",
                        "message": "need user name"
                    });
                }
                if (queryArgs.oid == undefined) {
                    return reply.send({
                        "statusCode": 500,
                        "error": "Internal Server Error",
                        "message": "need oid"
                    });
                }

                client.query(
                    sql(queryArgs),
                    function onResult(err, result) {
                        release();
                        var result = {};
                        if (err) result = {success: false, error: err}
                        else result = {success: true}
                        reply.send(err || result)
                    }
                )
            }
        }
    })
    next()
}

module.exports.autoPrefix = '/v1'