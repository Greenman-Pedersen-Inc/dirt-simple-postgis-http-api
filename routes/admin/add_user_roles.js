// add_user_roles: adds rows in the admin.user_roles table. Each row corresponds to one role for a user.


// route register
const getQuery = (userName, roleId) => {
    const sql = `INSERT INTO admin.user_roles(user_name, role_id, role_name)
	VALUES ($1, $2, (SELECT role_name from admin.roles WHERE role_id = $2))`;

    return {
        query: sql,
        values: [userName, roleId]
    }
}

// create route
module.exports = function(fastify, opts, next) {
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
                    roles: {type: 'string'}     // string of comma seperated values: "1,2,4"
                },
                required: ['username', 'roles']
            }
        },
        handler: function(request, reply) {
            function onConnect(err, client, release) {
                if (err) return reply.send({
                    "statusCode": 500,
                    "error": "Internal Server Error",
                    "message": "unable to connect to database server: " + err
                })

                var promises = [];
                const roleList = request.body.roles.split(',');
                roleList.forEach(role => {
                    const queryParameters = getQuery(request.body.username, role);
                    const promise = new Promise((resolve, reject) => {
                        try {
                            const res = client.query(queryParameters.query, queryParameters.values);
                            return resolve(res);
                        } catch (err) {
                            return reject(error);
                        }
                    });
                    promises.push(promise);
                });

                Promise.all(promises).then((returnData) => {
                    reply.send( {success: true} );
                }).catch(error => {
                    return reply.send({
                        "statusCode": 500,
                        "error": err,
                        "message": 'issue with adding roles for user' + request.body.username,
                        success: false
                    });
                });
            }

            fastify.pg.connect(onConnect);
        }
    });

    next();
}

module.exports.autoPrefix = '/admin'