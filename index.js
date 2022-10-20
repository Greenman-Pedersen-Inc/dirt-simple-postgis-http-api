// This line must come before importing any instrumented module.
const tracer = require('dd-trace').init({
    env: 'stability-update',
    logInjection: true,
    profiling: true,
    'appsec.enabled': true
});

const path = require('path');
const config = require('./config');
const fastify = require('fastify')({
    logger: true
});

const { maxHeaderSize } = require('http');
const globalTimeout = 7500;

/**
 * Log requests made to the server in an administrative database for further analysis.
 *
 * @param {*} request
 * @param {*} reply
 * @param {*} done
 */
function RequestTracker(credentials, module, end_point, user_query, reply) {
    const self = this;

    this.start = function () {
        self.request_time = Date.now();
    };
    this.complete = function () {
        try {
            const execution_time = Date.now();
            const queryString = `
                INSERT INTO traffic.${module}(
                    user_name, token, request_time, execution_time, end_point, user_query)
                    VALUES ('${credentials.username}','${credentials.token}', ${self.request_time}, ${execution_time}, '${end_point}', '${user_query}');
            `;
            fastify.pg.connect((err, client, release) => {
                onConnect(err, client, release, queryString);
            });
        } catch (error) {
            reply.code(500).send(error);
        }
    };
    this.error = function (error) {
        try {
            const execution_time = Date.now();
            let errorString;
            if (typeof error === 'object') {
                errorString = error.message;
            } else if (typeof error === 'string') {
                errorString = error;
            }
            const queryString = `
                INSERT INTO traffic.${module}(
                    user_name, token, request_time, execution_time, end_point, user_query, error)
                    VALUES ('${credentials.username}','${credentials.token}', ${self.request_time}, ${execution_time}, '${end_point}', '${user_query}', '${errorString}');
            `;
            fastify.pg.connect((err, client, release) => {
                onConnect(err, client, release, queryString);
            });
        } catch (error) {
            reply.code(500).send(error);
        }
    };

    function onConnect(error, client, release, queryString) {
        // console.log(queryString);
        if (error) {
            release();

            return {
                statusCode: 500,
                error: 'Internal Server Error',
                message: 'unable to connect to database server: ' + error
            };
        } else {
            try {
                client.query(queryString, function onResult(error, result) {
                    release();

                    if (error) {
                        return {
                            statusCode: 500,
                            error: 'Internal Server Error: Inner Query Error',
                            message: 'unable to perform database operation: ' + error
                        };
                    }
                });
            } catch (error) {
                release();

                return {
                    statusCode: 500,
                    error: 'Internal Server Error: Outer Query Error',
                    message: 'unable to perform database operation: ' + error
                };
            }
        }
    }

    if (typeof credentials === 'string') {
        credentials = JSON.parse(credentials);
    }
}

function verifyToken(request, reply, next) {
    // console.log(request.headers)
    const sql = (headers) => {
        let token;
        const currentTime = new Date().getTime();

        if (headers.token) {
            token = headers.token;
        } else if (headers.credentials && typeof headers.credentials === 'object') {
            token = headers.credentials.token;
        } else if (typeof headers.credentials === 'string') {
            token = JSON.parse(headers.credentials).token;
        }

        const query = `SELECT Cast(COUNT(*) as int) FROM admin.lease where token = '${token}' and expiration >= ${currentTime}`;

        return query;
    };

    function onConnect(error, client, release) {
        if (error) {
            release();
            reply.code(500).send(error);
        } else {
            try {
                client.query(sql(request.headers), function onResult(error, result) {
                    release();

                    if (error) {
                        reply.send({
                            statusCode: 500,
                            error: 'Internal Server Error: Inner Query Error',
                            message: 'unable to perform database operation: ' + error
                        });
                    } else {
                        if (result.rows.map((row) => row.count).reduce((acc, count) => acc + count, 0) > 0) {
                            next();
                        } else {
                            reply.send({ description: 'token validation unsuccesful!', tokenError: -999 });
                        }
                    }
                });
            } catch (error) {
                release();

                reply.send({
                    statusCode: 500,
                    error: 'Internal Server Error: Outer Query Error',
                    message: 'unable to perform database operation: ' + error
                });
            }
        }
    }

    fastify.pg.connect(onConnect);

    // done();
}

function requestTimeout(client, reply, requestTracker, timeout = globalTimeout) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            client
                .then(() => {
                    let error = new Error('Server Timeout');
                    reply.send(error);
                    reply.send = (payload) => reply;
                    requestTracker.error(error);
                })
                .catch((error) => {
                    reply.send(new Error(error.stack));
                    reply.send = (payload) => reply;
                    requestTracker.error(error);
                })
                .end();
        }, timeout);
    });
}

// this is the default timeout for replys, can be overwritten at the route level with "customTimeout" variable
fastify.decorate('RequestTracker', RequestTracker);
fastify.decorate('verifyToken', verifyToken);
fastify.decorate('requestTimeout', requestTimeout);

fastify.register(require('fastify-auth'));

// postgres connection
fastify.register(require('fastify-postgres'), {
    connectionString: config.db,
    query_timeout: 5000
});

// compression - add x-protobuf
fastify.register(require('fastify-compress'), {
    customTypes: /^text\/|\+json$|\+text$|\+xml|x-protobuf$/
});

// cache
fastify.register(require('fastify-caching'), {
    privacy: 'private',
    expiresIn: config.cache
});

// CORS
fastify.register(require('fastify-cors'), {
    exposedHeaders: 'exportCount'
});

// swagger
fastify.register(require('fastify-swagger'), {
    exposeRoute: true,
    swagger: config.swagger
});

// routes
fastify.register(require('fastify-autoload'), {
    dir: path.join(__dirname, 'routes')
});

fastify.route({
    method: 'GET',
    url: '/tiles/:layer/:z/:x/:y',
    schema: {
        hide: true
    },
    handler: function (request, reply) {
        const directoryPath = path.join(request.params.layer, request.params.z, request.params.x);
        const fileName = `${request.params.y}.mvt`;
        const fullPath = path.join(directoryPath, fileName);

        console.log(fastify);

        try {
            reply.header('Content-Type', 'application/x-protobuf');
            reply.sendFile(fullPath, '', { rootPathOffset: 1 });
        } catch (error) {
            console.log(error);
        }
    }
});

// Launch server
fastify.listen(config.port, config.host || '127.0.0.1', function (err, address) {
    if (err) {
        console.log(err);
        process.exit(1);
    }
    console.info(`Server listening on ${address}`);
});
