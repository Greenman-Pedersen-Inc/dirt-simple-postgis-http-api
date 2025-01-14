// update_password: gets the user's new password, encrypts it, and stores it in the database

const crypto = require('crypto');

const usersql = (requestBody) => {
    const expiryTime = new Date();
    const username = requestBody.username;
    const token = requestBody.token;
    const securePassword = saltHashPassword(requestBody.password);

    const sql = `
        UPDATE admin.user_info SET password = '${securePassword}' WHERE user_name = '${username}' AND (            
            SELECT count(*) > 0
            FROM admin.reset_lease
            where expiration > ${expiryTime.getTime()}
            and token = '${token}'
            and user_name = '${username}'
        );
        DELETE FROM admin.reset_lease where user_name = '${username}'`;
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
        method: 'POST',
        url: '/update-password',
        schema: {
            description: `gets the user's new password, encrypts it, and stores it in the database`,
            tags: ['admin'],
            summary: `gets the user's new password, encrypts it, and stores it in the database`,
            body: {
                type: 'object',
                properties: {
                    username: { type: 'string' },
                    password: { type: 'string' },
                    token: { type: 'string' }
                },
                required: ['username', 'password', 'token']
            }
        },
        handler: function (request, reply) {
            function onConnect(err, client, release) {
                if (err)
                    return reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'unable to connect to database server: ' + err
                    });

                try {
                    client.query(usersql(request.body), function onResult(err, result) {
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
                } catch (error) {
                    return reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: error,
                        success: false
                    });
                }
            }

            fastify.pg.connect(onConnect);
        }
    });

    next();
};

module.exports.autoPrefix = '/admin';
