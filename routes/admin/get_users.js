// get_users: gets a list of all Safety Voyager users 

// route register
const getQuery = () => {
    const sql = `SELECT user_name, beg_access_date, end_access_date,organization_name, project_name, project_manager, user_type, user_group, notes
	FROM admin.user_info;`;
    return sql;
}

const schema = {
    description: "gets a list of all Safety Voyager users .",
    tags: ['admin'],
    summary: "gets a list of all Safety Voyager users ."
}

// create route
module.exports = function(fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/get-users',
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