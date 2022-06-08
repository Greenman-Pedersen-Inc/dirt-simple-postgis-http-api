// route query
const sql = (params) => {
    Date.prototype.addMonths = function (months) {
        var date = new Date(this.valueOf());
        date.setDate(date.getMonth() + months);
        return date;
    };

    const today = new Date();
    const beginningDate = today.addMonths(-2);

    // List<KeyValuePair<string, int>> FilterFrequency = new List<KeyValuePair<string, int>>();

    // string SQL;
    if (excludeDevelopers) {
        SQL =
            'SELECT count(*) as frequency, arguments ' +
            'FROM action_logs ' +
            "where function_called NOT LIKE 'Action_Log%' " +
            'and function_called not in(' +
            string.Join(',', FunctionsToExclude) +
            ') ' +
            "AND user_name NOT LIKE '%gpi%' " +
            "AND user_name NOT LIKE '%gpinet%' " +
            "AND execution_date >= '" +
            dateTime.ToString('yyyy-MM-dd') +
            "' " +
            'group by arguments';
    } else {
        SQL = `SELECT count(*) as frequency, arguments
              FROM action_logs
              where function_called NOT LIKE 'Action_Log%'
              and function_called not in(" + string.Join(",", FunctionsToExclude) + ")
              group by arguments`;
    }

    return `
        select * from traffic.aggregate_counts;
    `;
};

// route schema
const schema = {
    description: 'Return the frequency of service calls made to each module in the platform.',
    tags: ['api'],
    summary: 'table query'
};

// create route
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/filter_frequency',
        schema: schema,
        // preHandler: fastify.auth([fastify.verifyToken]),
        handler: function (request, reply) {
            fastify.pg.connect(onConnect);

            function onConnect(error, client, release) {
                if (error) {
                    reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: error
                    });
                } else {
                    client.query(sql(request.params, request.query), function onResult(err, result) {
                        release();
                        reply.send(err || result.rows);
                    });
                }
            }
        }
    });
    next();
};

module.exports.autoPrefix = '/admin/statistics';
