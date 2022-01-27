// route register
const crypto = require('crypto')

const usersql = (requestBody) => {
    var securePassword = saltHashPassword(requestBody.pass)

    return `INSERT INTO admin.user_info(user_name, password, email)
	VALUES ('${requestBody.username}', '${securePassword}', '${requestBody.email}');`;
}

function sha512(password, salt) {
    var hash = crypto.createHmac('sha512', salt); /** Hashing algorithm sha512 */
    hash.update(password);
    var value = hash.digest('hex');
    return {
        salt: salt,
        passwordHash: value
    };
};

function saltHashPassword(userpassword) {
    var salt = 'gpiisthebestcompanytoworkforifanybodyasks'; /** Gives us salt of length 16 */
    var passwordData = sha512(userpassword, salt);

    return passwordData.passwordHash;
}

// create route
module.exports = function(fastify, opts, next) {
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
                    email: { type: 'string' }
                },
                required: ['username', 'pass', 'email']
            }
        },
        handler: function(request, reply) {
            function onConnect(err, client, release) {
                if (err) return reply.send({
                    "statusCode": 500,
                    "error": "Internal Server Error",
                    "message": "unable to connect to database server: " + err
                })

                // console.log(request.body)

                client.query(
                    usersql(request.body),
                    function onResult(err, result) {
                        release()

                        if (err) return reply.send({
                            "statusCode": 500,
                            "error": "Internal Server Error",
                            "message": "unable to perform database operation: " + err
                        })

                        reply.send(err || result.rows)
                    }
                )
            }

            fastify.pg.connect(onConnect);
        }
    });

    next();
}

module.exports.autoPrefix = '/admin'