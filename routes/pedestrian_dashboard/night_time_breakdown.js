// night_time_breakdown: Gets summation of crashes between 12PM and 23:59AM groupbed by Alcohol Inv/Hit Run and Compl.Pain/Total Crashes

// *---------------*
// route query
// *---------------*
const sql = (queryArgs) => {
    var sql = `
    SELECT 
    DATE_TRUNC('hour',(TO_TIMESTAMP(acc_time, 'HH24MI')::TIME)) AS time,
    SUM(CASE WHEN alcohol_involved = 'Y' THEN 1 ELSE 0 END) alcohol_involved,
    SUM(CASE WHEN hit_run IS NOT NULL THEN 1 ELSE 0 END) hit_run,
    SUM(coalesce(pedestrian_phys_cond_complaint_pain, 0) + coalesce(cyclist_complaint_of_pain , 0)) possible_injury,
    COUNT(crashid) total_crashes
    FROM public.ard_accidents_geom_partition 

    ${
        queryArgs.sri
            ? `LEFT JOIN public.ard_accidents_geom_partition 
    ON public.ard_pedestrians_partition.crashid = public.ard_accidents_geom_partition.crashid
    `
            : ''
    }   
	WHERE (cyclist_involved > 0 OR ped_involved > 0)
    AND (TO_TIMESTAMP(acc_time, 'HH24MI')::TIME) BETWEEN '12:00'::TIME AND '23:59'::TIME
    AND year BETWEEN ${queryArgs.startYear} AND ${queryArgs.endYear}

    ${queryArgs.sri ? ` AND calc_sri = ${queryArgs.sri}'` : ''}  
    ${queryArgs.start_mp ? ` AND calc_milepost = ${queryArgs.start_mp}` : ''}   
    ${queryArgs.end_mp ? ` AND calc_milepost = ${queryArgs.end_mp}` : ''}  

    ${queryArgs.mun_cty_co ? ` AND mun_cty_co = '${queryArgs.mun_cty_co}'` : ''}   
    ${queryArgs.mun_mu ? ` AND mun_mu = '${queryArgs.mun_mu}'` : ''}   

    GROUP BY time
    ORDER BY time
    `;
    return sql;
};

// *---------------*
// route schema
// *---------------*
const schema = {
    description:
        'Gets summation of crashes between 12PM and 23:59AM groupbed by Alcohol Inv/Hit Run and Compl.Pain/Total Crashes.',
    tags: ['ped-dashboard'],
    summary:
        'Gets summation of crashes between 12PM and 23:59AM groupbed by Alcohol Inv/Hit Run and Compl.Pain/Total Crashes.',
    querystring: {
        startYear: {
            type: 'string',
            description: 'starting year'
            // example'2016'
        },
        endYear: {
            type: 'string',
            description: 'ending year'
            // example'2020'
        },
        mun_cty_co: {
            type: 'string',
            description: 'county code'
            // example'01'
        },
        mun_mu: {
            type: 'string',
            description: 'municipality code'
            // example'02'
        },
        sri: {
            type: 'string',
            description: 'sri code'
            // example'00000056__'
        },
        start_mp: {
            type: 'string',
            description: 'start milepost'
            // example'0.1'
        },
        end_mp: {
            type: 'string',
            description: 'end milepost'
            // example'7.2'
        }
    }
};

// *---------------*
// create route
// *---------------*
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/ped-dashboard/night-time-breakdown',
        schema: schema,
        preHandler: fastify.auth([fastify.verifyToken]),
        handler: function (request, reply) {
            fastify.pg.connect(onConnect);

            function onConnect(err, client, release) {
                if (err)
                    return reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'unable to connect to database server'
                    });

                var queryArgs = request.query;
                if (queryArgs.userName == undefined) {
                    return reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'need user name'
                    });
                }

                client.query(sql(queryArgs), function onResult(err, result) {
                    release();
                    reply.send(err || result.rows);
                });
            }
        }
    });
    next();
};

module.exports.autoPrefix = '/v1';
