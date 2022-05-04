// update_password: gets the user's new password, encrypts it, and stores it in the database

const crypto = require('crypto');

const usersql = (requestBody) => {
    var securePassword = saltHashPassword(requestBody.pass);

    const sql = `UPDATE admin.user_info
	SET password = '${securePassword}' WHERE user_name = $1;`;
    return sql;
};

function sha512(password, salt) {
    var hash = crypto.createHmac('sha512', salt); /** Hashing algorithm sha512 */
    hash.update(password);
    var value = hash.digest('hex');
    return {
        salt: salt,
        passwordHash: value
    };
}

function saltHashPassword(userpassword) {
    var salt = 'gpiisthebestcompanytoworkforifanybodyasks'; /** Gives us salt of length 16 */
    var passwordData = sha512(userpassword, salt);

    return passwordData.passwordHash;
}

// create route
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'PUT',
        url: '/update-pw',
        schema: {
            description: `gets the user's new password, encrypts it, and stores it in the database`,
            tags: ['admin'],
            summary: `gets the user's new password, encrypts it, and stores it in the database`,
            body: {
                type: 'object',
                properties: {
                    username: { type: 'string' },
                    pass: { type: 'string' }
                },
                required: ['username', 'pass']
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

                // console.log(request.body)
                const values = [request.body.username];
                client.query(usersql(request.body), values, function onResult(err, result) {
                    release();

                    if (err)
                        return reply.send({
                            statusCode: 500,
                            error: 'Internal Server Error',
                            message: 'unable to perform database operation: ' + err,
                            success: false
                        });

                    reply.send({ success: true });
                });
            }

            fastify.pg.connect(onConnect);
        }
    });

    next();
};

module.exports.autoPrefix = '/admin';
