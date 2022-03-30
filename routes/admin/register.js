// route register
const crypto = require('crypto');

const usersql = (requestBody) => {
    var securePassword = saltHashPassword(requestBody.pass);
    var attributes = [];
    var values = [];
    var paramValues = [];
    var index = 1;
    for (const [key, value] of Object.entries(requestBody)) {
        if (key === 'username') attributes.push('user_name');
        else if (key === 'pass') attributes.push('password');
        else attributes.push(key);

        if (key === 'pass') values.push(securePassword);
        else values.push(value);

        paramValues.push('$' + index);
        index++;
    }

    const sql = `INSERT INTO admin.user_info(${attributes.join(',')})
	VALUES (${paramValues.join(',')});`;

    return {
        query: sql,
        values: values
    };
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
        url: '/register',
        schema: {
            description: 'register new user',
            tags: ['admin'],
            summary: 'register new user',
            body: {
                type: 'object',
                properties: {
                    username: { type: 'string' },
                    pass: { type: 'string' },
                    email: { type: 'string' },
                    first_name: { type: 'string' },
                    last_name: { type: 'string' },
                    beg_access_date: { type: 'string' },
                    end_access_date: { type: 'string' },
                    govt_user: { type: 'boolean', default: false },
                    organization_name: { type: 'string' },
                    project_name: { type: 'string' },
                    project_manager: { type: 'string' },
                    user_type: { type: 'string' },
                    user_group: { type: 'string' },
                    notes: { type: 'string' },
                    is_admin: { type: 'boolean', default: false }
                },
                required: ['username', 'pass', 'email']
            }
        },
        preHandler: fastify.auth([fastify.verifyToken]),
        handler: function (request, reply) {
            function onConnect(err, client, release) {
                if (err) {
                    release();

                    return reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'unable to connect to database server: ' + err,
                        success: false
                    });
                } else {
                    try {
                        const queryParameters = usersql(request.body);

                        client.query(queryParameters.query, queryParameters.values, function onResult(err, result) {
                            release();

                            if (err) {
                                return reply.send({
                                    statusCode: 500,
                                    error: 'Internal Server Error',
                                    message: 'unable to perform database operation: ' + err
                                });
                            } else {
                                reply.send({success: true});
                            }
                        });
                    } catch (error) {
                        release();

                        reply.send({
                            statusCode: 500,
                            error: 'issue with query',
                            message: request,
                            success: false
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
