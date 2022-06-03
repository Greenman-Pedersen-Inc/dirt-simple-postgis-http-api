// route authenticate
const crypto = require('crypto');

function sql(requestBody) {
    var buffer = crypto.randomBytes(64);
    var leaseToken = buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/\=/g, '');
    var securePassword = saltHashPassword(requestBody.pass);
    var expiryTime = new Date();

    expiryTime.setHours(expiryTime.getHours() + 4);
    expiryTime = expiryTime.getTime();

    var sqlString = `
        SELECT
            CASE WHEN user_count = 1 THEN admin.CLEAN_TABLE('${requestBody.username.toLowerCase()}', '${leaseToken}', ${expiryTime})
                 ELSE '-1000'
            END as token
        FROM (
            SELECT COUNT(*) AS user_count
            FROM admin.user_info
            WHERE user_name = '${requestBody.username.toLowerCase()}'
            AND password = '${securePassword}'
        ) AS count_query
    `;

    return sqlString;
}

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
        url: '/authenticate',
        schema: {
            description: 'authenticate user and return token',
            tags: ['admin'],
            summary: 'authenticate user and return token',
            body: {
                type: 'object',
                properties: {
                    username: { type: 'string' },
                    pass: { type: 'string' }
                },
                required: ['username', 'pass']
            }
        },
        handler: function (request, reply, done) {
            function onConnect(err, client, release) {
                if (err) {
                    release();

                    return reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'unable to connect to database server: ' + err
                    });
                } else {
                    try {
                        client.query(sql(request.body), function onResult(err, result) {
                            release();

                            if (err) {
                                return reply.send({
                                    statusCode: 500,
                                    error: 'Internal Server Error: Inner Query Error',
                                    message: 'unable to perform database operation: ' + err
                                });
                            } else {
                                if (result.rows && result.rows.length > 0) {
                                    if (result.rows[0].token === '-1000') {
                                        result.rows = {
                                            description: 'user/password authentication unsuccesful!',
                                            tokenError: -1000
                                        };
                                    } else {
                                        reply.send(err || result.rows);
                                    }
                                } else {
                                    reply.send({
                                        description: 'user/password authentication unsuccesful!',
                                        tokenError: -1001
                                    });
                                }
                            }
                        });
                    } catch (error) {
                        release();

                        return reply.send({
                            statusCode: 500,
                            error: 'Internal Server Error: Outer Query Error',
                            message: 'unable to perform database operation: ' + error
                        });
                    }
                }
            }

            fastify.pg.connect(onConnect);
        }
    });

    next();
};

module.exports.autoPrefix = '/admin';
