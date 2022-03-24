const path = require('path');
const config = require('./config');
const fastify = require('fastify')({
    connectionTimeout: 5000
});

/**
 * Log requests made to the server in an administrative database for further analysis.
 *
 * @param {*} request
 * @param {*} reply
 * @param {*} done
 */
function logRequest(user_name, request_time, end_point, user_query, execution_time, error) {
    // console.log(request.headers)
    const queryInfo = {
        bounds: request.query.bounds,
        filter: request.query.filter
    };
    const endpoint = request.raw.url.split('=')[0];
    const username = request.headers.username;
    const currentTime = new Date().getTime();
    const sql = (query, url, user, time) => {
        //console.log(query, url, user, time);
        var queryString = `
            INSERT INTO admin.traffic(
                user_name, request_time, end_point, user_query, execution_time, error)
                VALUES ('${user}', ${time}, '${url}', '${JSON.stringify(query).replace(/'/g, "''")}');
        `;

        return queryString;
    };

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
                client.query(sql(queryInfo, endpoint, username, currentTime), function onResult(err, result) {
                    release();

                    if (err) {
                        return reply.send({
                            statusCode: 500,
                            error: 'Internal Server Error: Inner Query Error',
                            message: 'unable to perform database operation: ' + err
                        });
                    } else {
                        done();
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

    // this will not log get requests that include the keywork 'lookup'
    if (endpoint.indexOf('lookup') < 0) {
        fastify.pg.connect(onConnect);
    } else {
        done();
    }
}

/**
 * Verifies a pre-existing token.
 *
 * @param {*} request
 * @param {*} reply
 * @param {*} done
 */
function verifyToken(request, reply, done) {
    // console.log(request.headers)
    const sql = (headers) => {
        const currentTime = new Date().getTime();
        const query = `SELECT Cast(COUNT(*) as int) FROM admin.lease where token = '${headers.requesttoken}' and expiration >= ${currentTime}`;

        return query;
    };

    /**
     *
     *
     * @param {*} err
     * @param {*} client
     * @param {*} release
     * @return {*}
     */
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
                client.query(sql(request.headers), function onResult(err, result) {
                    release();

                    if (err) {
                        return reply.send({
                            statusCode: 500,
                            error: 'Internal Server Error: Inner Query Error',
                            message: 'unable to perform database operation: ' + err
                        });
                    } else {
                        if (result.rows.map((row) => row.count).reduce((acc, count) => acc + count, 0) > 0) {
                            done();
                        } else {
                            reply.send({ description: 'token validation unsuccesful!', tokenError: -999 });
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

fastify.decorate('logRequest', logRequest);
fastify.decorate('verifyToken', verifyToken);

fastify.register(require('fastify-auth'));

// postgres connection
fastify.register(require('fastify-postgres'), {
    connectionString: config.db
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
fastify.register(require('fastify-cors'));

// swagger
fastify.register(require('fastify-swagger'), {
    exposeRoute: true,
    swagger: config.swagger
});

// static documentation path
fastify.register(require('fastify-static'), {
    // root: path.join(__dirname, 'documentation')
    // root: path.join(__dirname, "public"),
    root: [path.join(__dirname, 'documentation'), path.join(__dirname, 'tiles')],
    // Do not append a trailing slash to prefixes
    prefixAvoidTrailingSlash: true
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
        //console.log(err)
        process.exit(1);
    }
    console.info(`Server listening on ${address}`);
});
