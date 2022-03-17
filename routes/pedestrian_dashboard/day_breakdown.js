// day_breakdown: Gets summation of crashes with ped or cyclist involved grouped by day of the week

// *---------------*
// route query
// *---------------*
const sql = (queryArgs) => {
    var sql = `
    SELECT 
    SUM(coalesce(trf_ctrl_police_officer, 0)) "Police Officer", 
    SUM(coalesce(trf_ctrl_rr_watchman, 0)) "RR Watchman",
    SUM(coalesce(trf_ctrl_traffic_signal, 0)) "Traffic Signal",
    SUM(coalesce(trf_ctrl_lane_markings, 0)) "Lane Markings",
    SUM(coalesce(trf_ctrl_channelization_painted, 0)) "Channelization Painted",
    SUM(coalesce(trf_ctrl_warning_signal, 0)) "Warning Signal",
    SUM(coalesce(trf_ctrl_stop_sign, 0)) "Stop Sign",
    SUM(coalesce(trf_ctrl_yield_sign, 0)) "Yield Sign",
    SUM(coalesce(trf_ctrl_flagman, 0)) "Flagman",
    SUM(coalesce(trf_ctrl_no_control_present, 0)) "None Present",
    SUM(coalesce(trf_ctrl_flashing_traffic_control, 0)) "Flashing",
    SUM(coalesce(trf_ctrl_school_zone_signs_controls, 0)) "School Zone Signs",
    SUM(coalesce(trf_ctrl_school_zone_signs_controls, 0)) "Crossing Guard",
    SUM(coalesce(trf_ctrl_other, 0)) "Other",
    SUM(coalesce(trf_ctrl_unknown, 0)) "Unknown",
    SUM(coalesce(trf_ctrl_not_recorded, 0)) "Not Recorded"
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
    description: "Gets summation of crashes with ped or cyclist involved grouped by day of the week.",
    tags: ['ped-dashboard'],
    summary: "Gets summation of crashes with ped or cyclist involved grouped by day of the week.",
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
        url: '/ped-dashboard/day-breakdown',
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