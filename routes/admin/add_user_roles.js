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
            function onConnect(err, client, release) {
                if (err)
                    return reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'unable to connect to database server: ' + err
                    });

                const query = getQuery(request.body.modules); 
                client.query(query, [request.body.username], function onResult(err, result) {
                    release();

                    if (err) {
                        return reply.send({
                            statusCode: 500,
                            error: err,
                            message: 'issue with adding roles for user ' + request.body.username,
                            success: false
                        });
                    }

                    reply.send({ success: true });
                });

                // var promises = [];
                // const modulesList = request.body.modules.split(',');
                // modulesList.forEach((module) => {
                //     const queryParameters = getQuery(request.body.username, parseInt(module));
                //     const promise = new Promise((resolve, reject) => {
                //         try {
                //             const res = client.query(queryParameters.query, queryParameters.values);
                //             return resolve(res);
                //         } catch (err) {
                //             return reject(error);
                //         }
                //     });
                //     promises.push(promise);
                // });

                // Promise.all(promises)
                //     .then((returnData) => {
                //         release();
                //         reply.send({ success: true });
                //     })
                //     .catch((error) => {
                //         release();
                //         return reply.send({
                //             statusCode: 500,
                //             error: err,
                //             message: 'issue with adding roles for user ' + request.body.username,
                //             success: false
                //         });
                //     });
            }

            fastify.pg.connect(onConnect);
        }
    });

    next();
};

module.exports.autoPrefix = '/admin';
