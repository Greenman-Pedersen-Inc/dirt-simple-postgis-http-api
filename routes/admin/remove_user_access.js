// remove_user_access: 'updates the has_access field in the admin.user_roles table'


// route register
const usersql = (requestBody) => {
    const sql = `UPDATE admin.user_info
	SET has_access = false, update_date = NOW() 
    ${requestBody.notes ? `, notes = $2` : ''}
    WHERE user_name = $1;`;

    var values = [requestBody.username];
    if (requestBody.notes) values.push(requestBody.notes);
    
    return {
        query: sql,
        values: values
    }
}

// create route
module.exports = function(fastify, opts, next) {
    fastify.route({
        method: 'PUT',
        url: '/remove-user-access',
        schema: {
            description: 'updates the has_access field in the admin.user_roles table',
            tags: ['admin'],
            summary: 'updates the has_access field in the admin.user_roles table',
            body: {
                type: 'object',
                properties: {
                    username: { type: 'string' },
                    notes: { type: 'string' }
                },
                required: ['username']
            }
        },
        handler: function(request, reply) {
            function onConnect(err, client, release) {
                if (err) return reply.send({
                    "statusCode": 500,
                    "error": "Internal Server Error",
                    "message": "unable to connect to database server: " + err
                })

                const queryParameters = usersql(request.body);
                
                client.query(
                    queryParameters.query, queryParameters.values,
                    function onResult(err, result) {
                        release();

                        if (err) return reply.send({
                            "statusCode": 500,
                            "error": "Internal Server Error",
                            "message": "unable to perform database operation: " + err,
                            success: false
                        })

                        reply.send({success: true})
                    }
                )
            }

            fastify.pg.connect(onConnect);
        }
    });

    next();
}

module.exports.autoPrefix = '/admin'