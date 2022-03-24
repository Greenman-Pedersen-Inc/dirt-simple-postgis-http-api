// update_user_info: updates the categories in the user_info table based on user_name


// route register
const usersql = (requestBody) => {
    var attributes = [];
    var values = [];
    var index = 1;
    for (const  [key, value] of Object.entries(requestBody)) {
        if (key !== 'username') {
            if (value != null) {
                values.push(value);
                attributes.push(`${key} = ${'$' + index}`);
                index++;
            }
        }
        else {
            values.push(value);
            index++;
        }
    }

    const sql = `UPDATE admin.user_info
	SET ${attributes.join(',')} WHERE user_name = $1;`;

    return {
        query: sql,
        values: values
    }
}

// create route
module.exports = function(fastify, opts, next) {
    fastify.route({
        method: 'PUT',
        url: '/update-user-info',
        schema: {
            description: 'updates the categories in the user_info table based on user_name',
            tags: ['admin'],
            summary: 'updates the categories in the user_info table based on user_name',
            body: {
                type: 'object',
                properties: {
                    username: { type: 'string' },
                    beg_access_date: {type: 'string'},
                    end_access_date: {type: 'string'},
                    notes: {type: 'string'},
                    has_access: {type: 'boolean'},
                    update_date: {type: 'string'},
                    email_date: {type: 'string'},
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