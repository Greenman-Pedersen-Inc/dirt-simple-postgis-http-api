// reset_password: Initiates the password reset process for a specified user.
var crypto = require('crypto');

// route register
const sql = (requestBody) => {
    // create a buffer that will be the token to send to the user
    const buffer = crypto.randomBytes(64);
    // replace characters that might be annoying to send in a url
    const leaseToken = buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/\=/g, '');
    // create an expiry for
    let expiryTime = new Date();

    expiryTime.setHours(expiryTime.getMinutes() + 10);
    expiryTime = expiryTime.getTime();

    const sql = `INSERT INTO admin.reset_lease(user_name, token, expiration) VALUES (${requestBody.username}, ${leaseToken}, ${expiryTime});`;
    return sql;
};

const schema = {
    description: 'Initiates the password reset process for a specified user.',
    tags: ['admin'],
    summary: 'Initiates the password reset process for a specified user.',
    body: {
        type: 'object',
        properties: {
            username: { type: 'string' }
        },
        required: ['username', 'pass']
    }
};

// create route
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'POST',
        url: '/reset-password',
        schema: schema,
        handler: function (request, reply) {
            function onConnect(err, client, release) {
                if (err)
                    return reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'unable to connect to database server: ' + err
                    });

                client.query(sql(request.body), function onResult(err, result) {
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
