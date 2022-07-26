// reset_password: Initiates the password reset process for a specified user.
var crypto = require('crypto');
var nodemailer = require('nodemailer');

// route register
const sql = (requestBody) => {
    const username = requestBody.username;
    // create a buffer that will be the token to send to the user
    const buffer = crypto.randomBytes(64);
    // replace characters that might be annoying to send in a url
    const leaseToken = buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/\=/g, '');
    // create an expiry for
    let expiryTime = new Date();

    expiryTime.setMinutes(expiryTime.getMinutes() + 10);
    expiryTime = expiryTime.getTime();

    const sql = `
        DELETE FROM admin.reset_lease where user_name = '${username}';
        INSERT INTO admin.reset_lease(user_name, token, expiration) VALUES ('${username}', '${leaseToken}', ${expiryTime});
        SELECT '${leaseToken}' as token;
        SELECT COUNT(*) = 1 as verified from admin.user_info where user_name = '${username}';
    `;
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
        required: ['username']
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

                try {
                    client.query(sql(request.body), function onResult(err, result) {
                        release();

                        if (err) {
                            return reply.send({
                                statusCode: 500,
                                error: 'Internal Server Error',
                                message: 'unable to perform database operation: ' + err
                            });
                        } else {
                            try {
                                let token = result[2].rows[0].token;
                                let emailAddress = request.body.username;
                                let userVerification = result[3].rows[0].verified;
                                let transporter = nodemailer.createTransport({
                                    host: 'mail.njvoyager.org',
                                    port: 587,
                                    secure: false, // true for 465, false for other ports
                                    auth: {
                                        user: 'admin@njvoyager.org',
                                        pass: 'NJDOT2020!GPI'
                                    },
                                    tls: { rejectUnauthorized: false } // disable certificate checking
                                });

                                let body = 'You recently requested to reset your password';
                                body += `<br><br><a href="https://gpi.services/voyager/reset/?token=${token}&username=${emailAddress}">Click here to reset your password</a>`;
                                body += '<br><br>Your password is confidential and should never be shared with others.';
                                body += '<br><br>Yours truly,';
                                body += '<br>The NJ Voyager Team</p>';

                                let mailOptions = {
                                    from: 'admin@njvoyager.org',
                                    to: emailAddress,
                                    subject: 'NJ Voyager Password Reset',
                                    html: body
                                };

                                if (userVerification) {
                                    reply.code(200);
                                    reply.send({ success: true });

                                    transporter.sendMail(mailOptions, function (error, info) {
                                        if (error) {
                                            console.log(error);
                                        } else {
                                            console.log('Email sent: ' + info.response);
                                        }
                                    });
                                } else {
                                    reply.code(500);
                                    reply.send({ success: false, info: 'user does not exist' });
                                }
                            } catch (error) {
                                console.log(error);
                            }
                        }
                    });
                } catch (error) {
                    return reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: error
                    });
                }
            }

            fastify.pg.connect(onConnect);
        }
    });

    next();
};

module.exports.autoPrefix = '/admin';
