// get_roles: gets a list of roles that can be applied to a user.

// route register
const getQuery = () => {
    const sql = `SELECT *
	FROM admin.roles;`;
    return sql;
}

const schema = {
    description: "gets a list of roles that can be applied to a user.",
    tags: ['admin'],
    summary: "gets a list of roles that can be applied to a user."
}

// create route
module.exports = function(fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/get-roles',
        schema: schema,
        handler: function(request, reply) {
            function onConnect(err, client, release) {
                if (err) return reply.send({
                    "statusCode": 500,
                    "error": "Internal Server Error",
                    "message": "unable to connect to database server: " + err
                })

                const query = getQuery();
                
                client.query(
                    query,
                    function onResult(err, result) {
                        release();

                        if (err) return reply.send({
                            "statusCode": 500,
                            "error": "Internal Server Error",
                            "message": "unable to perform database operation: " + err,
                        })

                        reply.send(result.rows);
                    }
                )
            }

            fastify.pg.connect(onConnect);
        }
    });

    next();
}

module.exports.autoPrefix = '/admin'