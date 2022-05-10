// check_user_expiry: checks if the user's access will be expired after a certain date

// route register
const getQuery = (requestBody) => {
    const sql = `SELECT user_name
	FROM admin.user_info
    WHERE user_name = $1 AND end_access_date > $2;`;
  
    return {
        query: sql,
        values: [requestBody.username, requestBody.expirationDate]
    }
}

// create route
module.exports = function(fastify, opts, next) {
    fastify.route({
        method: 'PUT',
        url: '/check-user-expiry:',
        schema: {
            description: "checks if the user's access will be expired after a certain date",
            tags: ['admin'],
            summary: "checks if the user's access will be expired after a certain date",
            body: {
                type: 'object',
                properties: {
                    username: { type: 'string' },
                    expirationDate: { type: 'string' },     // check if user's access exceeds this date: "2022-01-25"
                },
                required: ['username', 'expirationDate']
            }
        },
        handler: function(request, reply) {
            function onConnect(err, client, release) {
                if (err) return reply.send({
                    "statusCode": 500,
                    "error": "Internal Server Error",
                    "message": "unable to connect to database server: " + err
                })

                const queryParameters = getQuery(request.body);
                
                client.query(
                    queryParameters.query, queryParameters.values,
                    function onResult(err, result) {
                        release();

                        if (err) return reply.send({
                            "statusCode": 500,
                            "error": "Internal Server Error",
                            "message": "unable to perform database operation: " + err,
                        })

                        if (result.rows.length === 0) {
                            reply.send({ expired: false })
                        }
                        else {
                            reply.send({ expired: true })
                        }
                    }
                )
            }

            fastify.pg.connect(onConnect);
        }
    });

    next();
}

module.exports.autoPrefix = '/admin'