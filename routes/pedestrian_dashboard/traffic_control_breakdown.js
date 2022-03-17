// traffic_control_breakdown: Gets summation of traffic control categories for crashes with ped or cyclist involved

// *---------------*
// route query
// *---------------*
const sql = (queryArgs) => {
    var sql = `
    SELECT 
    SUM(CASE WHEN acc_dow = 'SU' THEN 1 ELSE 0 END) "SUN",
    SUM(CASE WHEN acc_dow = 'MO' THEN 1 ELSE 0 END) "MON",
    SUM(CASE WHEN acc_dow = 'TU' THEN 1 ELSE 0 END) "TUE",
    SUM(CASE WHEN acc_dow = 'WE' THEN 1 ELSE 0 END) "WED",
    SUM(CASE WHEN acc_dow = 'TH' THEN 1 ELSE 0 END) "THU",
    SUM(CASE WHEN acc_dow = 'FR' THEN 1 ELSE 0 END) "FRI",
    SUM(CASE WHEN acc_dow = 'SA' THEN 1 ELSE 0 END) "SAT"
	FROM public.ard_accidents_geom_partition

    ${queryArgs.sri ? `LEFT JOIN public.ard_accidents_geom_partition 
    ON public.ard_pedestrians_partition.crashid = public.ard_accidents_geom_partition.crashid
    ` : ''}   
	WHERE (cyclist_involved > 0 OR ped_involved > 0)
    AND year BETWEEN ${queryArgs.startYear} AND ${queryArgs.endYear}

    ${queryArgs.sri ? ` AND calc_sri = ${queryArgs.sri}'` : ''}  
    ${queryArgs.start_mp ? ` AND calc_milepost = ${queryArgs.start_mp}` : ''}   
    ${queryArgs.end_mp ? ` AND calc_milepost = ${queryArgs.end_mp}` : ''}  

    ${queryArgs.mun_cty_co ? ` AND mun_cty_co = '${queryArgs.mun_cty_co}'` : ''}   
    ${queryArgs.mun_mu ? ` AND mun_mu = '${queryArgs.mun_mu}'` : ''}   
    `;
    return sql;
  }

// *---------------*
// route schema
// *---------------*
const schema = {
    description: "Gets summation of traffic control categories for crashes with ped or cyclist involved.",
    tags: ['ped-dashboard'],
    summary: "Gets summation of traffic control categories for crashes with ped or cyclist involved.",
    querystring: {
        startYear: {
            type: 'string',
            description: 'starting year',
            example: '2016'
        },
        endYear: {
            type: 'string',
            description: 'ending year',
            example: '2020'
        },
        mun_cty_co: {
            type: 'string',
            description: 'county code',
            example: '01'
        },
        mun_mu: {
            type: 'string',
            description: 'municipality code',
            example: '02'
        },
        sri: {
            type: 'string',
            description: 'sri code',
            example: '00000056__'
        },
        start_mp: {
            type: 'string',
            description: 'start milepost',
            example: '0.1'
        },
        end_mp: {
            type: 'string',
            description: 'end milepost',
            example: '7.2'
        }
    }
}

// *---------------*
// create route
// *---------------*
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/ped-dashboard/traffic-control-breakdown',
        schema: schema,
        handler: function (request, reply) {
            fastify.pg.connect(onConnect)

            function onConnect(err, client, release) {
                if (err) return reply.send({
                    "statusCode": 500,
                    "error": "Internal Server Error",
                    "message": "unable to connect to database server"
                });

                var queryArgs = request.query;
                if (queryArgs.userName == undefined) {
                    return reply.send({
                        "statusCode": 500,
                        "error": "Internal Server Error",
                        "message": "need user name"
                    });
                }

                client.query(
                    sql(queryArgs),
                    function onResult(err, result) {
                        release();
                        reply.send(err || result.rows)
                    }
                )
            }
        }
    })
    next()
}

module.exports.autoPrefix = '/v1'