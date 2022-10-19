// search_user: gets a list of users based on the inputted username

// route register
const getQuery = (requestBody) => {
    const sql = `SELECT user_name, first_name, last_name, email, beg_access_date, end_access_date, has_access, govt_user, organization_name, project_name, project_manager, user_type, user_group, update_date, email_date, notes, is_admin
	FROM admin.user_info
    WHERE user_name LIKE $1;`;

    return {
        query: sql,
        values: ['%' + requestBody.username + '%']
    };
};

const schema = {
    description: 'gets a list of users based on the inputted username',
    tags: ['admin'],
    summary: 'gets a list of users based on the inputted username',
    querystring: {
        username: {
            type: 'string',
            description: 'text to search on'
            // example: 'mcollins'
        }
    }
};

// create route
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/search-user',
        schema: schema,
        preHandler: fastify.auth([fastify.verifyToken]),
        handler: function (request, reply) {
            function onConnect(err, client, release) {
                if (err)
                    return reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'unable to connect to database server: ' + err
                    });

                const queryParameters = getQuery(request.query);

                client.query(queryParameters.query, queryParameters.values, function onResult(err, result) {
                    release();

                    if (err)
                        return reply.send({
                            statusCode: 500,
                            error: 'Internal Server Error',
                            message: 'unable to perform database operation: ' + err
                        });

                    reply.send(result.rows);
                });
            }

            fastify.pg.connect(onConnect);
        }
    });

    next();
};

module.exports.autoPrefix = '/admin';
