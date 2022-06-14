// route query
const functionsToExclude = ['CanExport', 'Search', 'CanAcessSafetyCalendar', 'CanAcessActionLog'];
const sql = (params) => {
    Date.prototype.addDays = function (days) {
        var date = new Date(this.valueOf());
        date.setDate(date.getDate() + days);
        return date;
    };

    // if (query.excludeDevelopers) {
    //     SQL =
    //         'select execution_date, count(*) as frequency from (' +
    //         "SELECT date_trunc('day', execution_date)::date::varchar as execution_date " +
    //         'FROM public.action_logs ' +
    //         'WHERE execution_date > @start_date ' +
    //         'AND execution_date < @end_date ' +
    //         "AND function_called NOT LIKE 'ActionLog%' " +
    //         'AND function_called not in(' +
    //         functionsToExclude.join(',') +
    //         ') ' +
    //         "AND user_name NOT LIKE '%gpi%' " +
    //         "AND user_name NOT LIKE '%gpinet%' " +
    //         ') as ExecutionDates ' +
    //         'group by execution_date ' +
    //         'order by execution_date';
    // } else {
    const today = new Date();
    const beginningDate = today.addDays(-30);
    const SQL = `
        select execution_date, count(*) as frequency 
        from (
            SELECT date_trunc('day', to_timestamp(request_time/1000))::date::varchar as execution_date
            FROM traffic.crash_map
            WHERE request_time > ${beginningDate.getTime()}
            AND request_time <  ${today.getTime()}
            -- AND end_point NOT LIKE 'ActionLog%'
            -- AND end_point not in('${functionsToExclude.join("','")}')
        ) as bins
        group by execution_date
        order by execution_date
    `;

    return SQL;
};

// route schema
const schema = {
    description: 'Query a table or view.',
    tags: ['api'],
    summary: 'table query',
    params: {
        module: {
            type: 'string',
            description: 'The name of the module to get stats for.'
        }
    }
};

// create route
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/daily_frequency/:module',
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
