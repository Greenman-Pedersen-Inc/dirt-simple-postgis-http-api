// get_menu_info: gets a list of all menu modules and their meta data

// route register
const getQuery = () => {
    const sql = `SELECT * FROM usermanagement.module;`;
    return sql;
};

const schema = {
    description: 'gets a list of all menu modules and their meta data.',
    tags: ['admin'],
    summary: 'gets a list of all menu modules and their meta data.',
    params: {
        username: {
            type: 'string',
            description: 'The name of the user to return modules for.'
        }
    }
};

// create route
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/get-menu-info/:username',
        schema: schema,
        preHandler: fastify.auth([fastify.verifyToken]),
        handler: function (request, reply) {
            function onConnect(err, client, release) {
                if (err) {
                    reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'unable to connect to database server: ' + err
                    });
                } else {
                    const query = getQuery();
                    const requestTracker = new fastify.RequestTracker(
                        request.params,
                        'admin',
                        'get-menu-info',
                        JSON.stringify(request.params)
                    );

                    client.query(query, function onResult(err, result) {
                        release();

                        if (err) {
                            reply.send({
                                statusCode: 500,
                                error: 'Internal Server Error',
                                message: 'unable to perform database operation: ' + err
                            });
                            requestTracker.error(err);
                        } else {
                            reply.send(result.rows);
                            requestTracker.complete();
                        }
                    });
                }
            }

            fastify.pg.connect(onConnect);
        }
    });

    next();
};

module.exports.autoPrefix = '/admin';
