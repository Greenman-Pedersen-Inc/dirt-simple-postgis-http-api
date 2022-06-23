// get_menu_info: gets a list of all menu modules and their meta data

// route register
const getQuery = (username) => {
    const sql = `SELECT * FROM admin.module;`;
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
            const query = getQuery(request.params.username);

            request.tracker = new fastify.RequestTracker(
                request.headers.credentials,
                'admin',
                'get-menu-info',
                JSON.stringify(request.params)
            );

            if (request.params.username == undefined) {
                reply.code(400).send('no user name specified');
            } else {
                fastify.pg
                    .connect()
                    .then((client) => {
                        client
                            .query(query)
                            .then((result) => {
                                if (result.rows && result.rows.length > 0) {
                                    reply.code(200).send(result.rows);
                                } else {
                                    reply.code(204).send();
                                }

                                request.tracker.complete();
                            })
                            .catch((error) => {
                                reply.code(500).send(error);
                                request.tracker.error(error);
                            })
                            .then(() => {
                                client.end();
                            });
                    })
                    .catch((error) => {
                        reply.code(500).send(error);
                        request.tracker.error(error);
                    });
            }
        }
    });

    next();
};

module.exports.autoPrefix = '/admin';
