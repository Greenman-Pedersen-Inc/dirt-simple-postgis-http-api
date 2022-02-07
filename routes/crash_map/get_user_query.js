// get_user_query: Gets all of the user's custom queries from the voyagerAdmin.user_queries table

// *---------------*
// route query
// *---------------*
const sql = (queryArgs) => {
    var sql = `
    SELECT * FROM usermanagement.user_queries WHERE user_name = '${queryArgs.userName}';
    `;
    return sql;
  }

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
            description: 'User email to log into SV',
            example: 'example@somewhere.org'
        }
    }
}

// *---------------*
// create route
// *---------------*
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/crash-map/get-user-query',
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

                client.query(
                    sql(queryArgs),
                    function onResult(err, result) {
                        release()
                        reply.send(err || result.rows)
                    }
                )
            }
        }
    })
    next()
}

module.exports.autoPrefix = '/v1'