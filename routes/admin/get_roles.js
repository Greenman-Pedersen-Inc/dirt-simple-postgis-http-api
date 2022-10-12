// get_roles: gets a list of roles that can be applied to a user.

// route register
const getQuery = () => {
    const sql = `SELECT internal_id, title, description, default_module
    FROM admin.module
    ORDER BY default_module, title;`;
    return sql;
};

const schema = {
    description: 'gets a list of roles that can be applied to a user.',
    tags: ['admin'],
    summary: 'gets a list of roles that can be applied to a user.'
};

// create route
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/get-roles',
        schema: schema,
        preHandler: fastify.auth([fastify.verifyToken]),
        handler: function (request, reply) {
            request.tracker = new fastify.RequestTracker(
                request.headers.credentials,
                'admin',
                'get_roles',
                JSON.stringify(request.params)
            );

            fastify.pg.connect(onConnect);

            function onConnect(err, client, release) {
                request.tracker.start();
                if (err) {
                    request.tracker.error(err);
                    release();
                    reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'unable to connect to database server: ' + err
                    });
                }
                else {
                    const query = getQuery();
    
                    client.query(query, function onResult(err, result) {
                        if (err) {
                            request.tracker.error(err);
                            release();
                            reply.send({
                                statusCode: 500,
                                error: 'Internal Server Error',
                                message: 'unable to perform database operation: ' + err
                            });                        
                        }
                        else {
                            request.tracker.complete();
                            reply.send(result.rows);
                            release();
                        }
                    });

                }
            }
        }
    });

    next();
};

module.exports.autoPrefix = '/admin';
