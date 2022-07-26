// get_user_feedback: gets a list of all user feedback

// route register
const getQuery = () => {
    const sql = `SELECT id, user_name, label, title, open_location, description, crash_description, 
    filter_description, crash_filter, status, image_byte_array_string FROM admin.user_feedback;`;
    return sql;
};

const schema = {
    description: 'gets a list of all user feedback',
    tags: ['admin'],
    summary: 'gets a list of all user feedback.'
};

// create route
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/get-user-feedback',
        schema: schema,
        preHandler: fastify.auth([fastify.verifyToken]),
        handler: function (request, reply) {
            function onConnect(err, client, release) {
                if (err)
                    return reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'unable to connect to database server: ' + err
                    });

                const query = getQuery();

                client.query(query, function onResult(err, result) {
                    release();

                    if (err)
                        return reply.send({
                            statusCode: 500,
                            error: 'Internal Server Error',
                            message: 'unable to perform database operation: ' + err
                        });

                    reply.send(result.rows);
                });
            }

            fastify.pg.connect(onConnect);
        }
    });

    next();
};

module.exports.autoPrefix = '/admin';
