// add_user_roles: adds rows in the admin.user_roles table. Each row corresponds to one role for a user.

// route register
const getQuery = (modules) => {
    // const getQuery = (userName, moduleId) => {
    const sql = `INSERT INTO admin.user_module(user_id, module_id)
	VALUES ((SELECT internal_id from admin.user_info WHERE user_name = $1), UNNEST(ARRAY[${modules}]))`;
    // const sql = `INSERT INTO admin.user_module(user_id, module_id)
    // VALUES ((SELECT internal_id from admin.user_info WHERE user_name = $1), $2)`;

    return sql;
    // return {
    //     query: sql,
    //     values: [userName]
    // };
};

// create route
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'POST',
        url: '/add-user-roles',
        schema: {
            description: 'adds rows in the admin.user_roles table. Each row corresponds to one role for a user.',
            tags: ['admin'],
            summary: 'adds rows in the admin.user_roles table. Each row corresponds to one role for a user.',
            body: {
                type: 'object',
                properties: {
                    username: { type: 'string' },
                    modules: { type: 'string' } // string of comma seperated values: "1,2,4"
                },
                required: ['username', 'modules']
            }
        },
        preHandler: fastify.auth([fastify.verifyToken]),
        handler: function (request, reply) {
            request.tracker = new fastify.RequestTracker(
                request.headers.credentials,
                'admin',
                'add_user_roles',
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
                    const query = getQuery(request.body.modules);
                    client.query(query, [request.body.username], function onResult(err, result) {
                        
                        if (err) {
                            request.tracker.error(err);
                            release();
                            reply.send({
                                statusCode: 500,
                                error: err,
                                message: 'issue with adding roles for user ' + request.body.username,
                                success: false
                            });
                        }
                        else {
                            request.tracker.complete();
                            release();
                            reply.send({ success: true });
                        }
                    });                    
                }
            }
        }
    });

    next();
};

module.exports.autoPrefix = '/admin';
