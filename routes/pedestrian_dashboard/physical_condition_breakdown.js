// physical_condition_breakdown: Gets summation of pedestrian and cyclist physical condition persons counts

// *---------------*
// route query
// *---------------*
const sql = (queryArgs) => {
    var sql = `
    SELECT 
    SUM(coalesce(pedestrian_phys_cond_killed, 0) + coalesce(cyclist_killed , 0)) fatal_injury,
    SUM(coalesce(pedestrian_phys_cond_incapacitated, 0) + coalesce(cyclist_incapacitated , 0)) serious_injury,
    SUM(coalesce(pedestrian_phys_cond_moderate_injury, 0) + coalesce(cyclist_moderate_pain , 0)) minor_injury,
    SUM(coalesce(pedestrian_phys_cond_complaint_pain, 0) + coalesce(cyclist_complaint_of_pain , 0)) possible_injury,
	FROM public.ard_accidents_geom_partition

    ${
        queryArgs.sri
            ? `LEFT JOIN public.ard_accidents_geom_partition 
    ON public.ard_pedestrians_partition.crashid = public.ard_accidents_geom_partition.crashid
    `
            : ''
    }   
	WHERE (cyclist_involved > 0 OR ped_involved > 0)
    AND year BETWEEN ${queryArgs.startYear} AND ${queryArgs.endYear}

    ${queryArgs.sri ? ` AND calc_sri = ${queryArgs.sri}'` : ''}  
    ${queryArgs.start_mp ? ` AND calc_milepost = ${queryArgs.start_mp}` : ''}   
    ${queryArgs.end_mp ? ` AND calc_milepost = ${queryArgs.end_mp}` : ''}  

    ${queryArgs.mun_cty_co ? ` AND mun_cty_co = '${queryArgs.mun_cty_co}'` : ''}   
    ${queryArgs.mun_mu ? ` AND mun_mu = '${queryArgs.mun_mu}'` : ''}   
    `;
    return sql;
};

// *---------------*
// route schema
// *---------------*
const schema = {
    description: 'Gets summation of pedestrian and cyclist physical condition persons counts.',
    tags: ['ped-dashboard'],
    summary: 'Gets summation of pedestrian and cyclist physical condition persons counts.',
    querystring: {
        startYear: {
            type: 'string',
            description: 'starting year'
            // example: '2016'
        },
        endYear: {
            type: 'string',
            description: 'ending year'
            // example: '2020'
        },
        mun_cty_co: {
            type: 'string',
            description: 'county code'
            // example: '01'
        },
        mun_mu: {
            type: 'string',
            description: 'municipality code'
            // example: '02'
        },
        sri: {
            type: 'string',
            description: 'sri code'
            // example: '00000056__'
        },
        start_mp: {
            type: 'string',
            description: 'start milepost'
            // example: '0.1'
        },
        end_mp: {
            type: 'string',
            description: 'end milepost'
            // example: '7.2'
        }
    }
};

// *---------------*
// create route
// *---------------*
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/ped-dashboard/physical-condition-breakdown',
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
