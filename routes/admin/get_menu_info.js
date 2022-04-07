// get_menu_info: gets a list of all menu modules and their meta data

// route register
const getQuery = () => {
    const sql = `SELECT * FROM usermanagement.module;`;
    return sql;
}

const schema = {
    description: "gets a list of all menu modules and their meta data.",
    tags: ['admin'],
    summary: "gets a list of all menu modules and their meta data."
}

// create route
module.exports = function(fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/get-menu-info',
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