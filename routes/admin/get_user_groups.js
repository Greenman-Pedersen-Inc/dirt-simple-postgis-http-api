// get_user_groups: gets a list of groups that can be applied to a user.

// route register
const getQuery = () => {
    const sql = `SELECT *
	FROM admin.types_group;`;
    return sql;
}

const schema = {
    description: " gets a list of groups that can be applied to a user.",
    tags: ['admin'],
    summary: "gets a list of groups that can be applied to a user."
}

// create route
module.exports = function(fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/get-user-groups',
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