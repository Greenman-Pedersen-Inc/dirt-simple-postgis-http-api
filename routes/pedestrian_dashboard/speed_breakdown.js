// speed_breakdown: Gets summation of crashes with ped or cyclist involved grouped by speed range

// *---------------*
// route query
// *---------------*
const sql = (queryArgs) => {
    var sql = `
    SELECT 
    SUM(CASE WHEN posted_speed < 10 THEN 1 ELSE 0 END) "<10",
    SUM(CASE WHEN posted_speed >= 10 AND posted_speed <= 19 THEN 1 ELSE 0 END) "10_19",
    SUM(CASE WHEN posted_speed >= 20 AND posted_speed <= 29 THEN 1 ELSE 0 END) "20_29",
    SUM(CASE WHEN posted_speed >= 30 AND posted_speed <= 39 THEN 1 ELSE 0 END) "30-39",
    SUM(CASE WHEN posted_speed >= 40 AND posted_speed <= 49 THEN 1 ELSE 0 END) "40-49",
    SUM(CASE WHEN posted_speed >= 50 AND posted_speed <= 59  THEN 1 ELSE 0 END) "50-59",
    SUM(CASE WHEN posted_speed >= 60  THEN 1 ELSE 0 END) ">60"
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
    description: "Gets summation of crashes with ped or cyclist involved grouped by speed range.",
    tags: ['ped-dashboard'],
    summary: "Gets summation of crashes with ped or cyclist involved grouped by speed range.",
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
        url: '/ped-dashboard/speed-breakdown',
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