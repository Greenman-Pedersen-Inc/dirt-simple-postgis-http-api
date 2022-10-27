// get_users: gets a list of all Safety Voyager users

// route register
const getQuery = () => {
    const sql = `SELECT user_name, 
    first_name,
    last_name,
    to_char(beg_access_date, 'YYYY-MM-DD') beg_access_date, 
    to_char(end_access_date, 'YYYY-MM-DD') end_access_date,
    organization_name, 
    project_name, 
    project_manager, 
    user_type, 
    user_group, 
    notes,
    CASE WHEN is_admin = true THEN 'Yes'
    ELSE 'No'
    END is_admin,
    CASE WHEN has_access = true THEN 'Yes'
    ELSE 'No'
    END has_access,
    to_char(update_date, 'YYYY-MM-DD') update_date,
    to_char(email_date, 'YYYY-MM-DD') email_date
	FROM admin.user_info;`;
    return sql;
};

const schema = {
    description: 'gets a list of all Safety Voyager users .',
    tags: ['admin'],
    summary: 'gets a list of all Safety Voyager users .'
};

// create route
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/get-users',
        schema: schema,
        preHandler: fastify.auth([fastify.verifyToken]),
        handler: function (request, reply) {
            request.tracker = new fastify.RequestTracker(
                request.headers.credentials,
                'admin',
                'get_users',
                JSON.stringify(request.params)
            );

            fastify.pg.connect(onConnect);

            function onConnect(err, client, release) {
                request.tracker.start();
                if (err) {
                    request.tracker.error(err);
                    release();
                    reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'unable to connect to database server: ' + err
                    });
                }
                else {
                    const query = getQuery();
    
                    client.query(query, function onResult(err, result) {
                        if (err) {
                            request.tracker.error(err);
                            release();
                            reply.send({
                                statusCode: 500,
                                error: 'Internal Server Error',
                                message: 'unable to perform database operation: ' + err
                            });                        
                        }
                        else {
                            request.tracker.complete();
                            reply.send(result.rows);
                            release();
                        }
                    });

                }

            }

        }
    });

    next();
};

module.exports.autoPrefix = '/admin';
