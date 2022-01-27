// top_fatal: gets SRI by Fatal & Incapacitated Crashes
const sunglareHelper = require('../../helper_functions/sunglare_helper');

// *---------------*
// route query
// *---------------*
const sql = (queryArgs) => {
        var locationClause = sunglareHelper.createLocationClause(queryArgs);
        var filterClause = sunglareHelper.createFilterClause(queryArgs);

        var sql = `
    SELECT DISTINCT UPPER(public.srilookupname.name) "sri_name", accidents.* FROM
    (
        SELECT calc_sri, 
        ROUND(FLOOR(calc_milepost * 10) / 10, 1) AS milepost,
        CONCAT(CAST (ROUND(FLOOR(calc_milepost * 10) / 10, 1) AS DECIMAL(5,2)), ' - ', ROUND(FLOOR(calc_milepost * 10) / 10, 1) + .09) AS mp_range,
        SUM(CASE WHEN severity_rating5 = '05' THEN 1 ELSE 0 END) fatal,
        SUM(CASE WHEN severity_rating5 = '04' THEN 1 ELSE 0 END) incapacitated,
        SUBSTRING ( acc_time, 1, 2 ) crash_hr
        
        FROM 
        sunglare.ard_accidents_sunglare
        WHERE year BETWEEN ${queryArgs.startYear} AND ${queryArgs.endYear}  AND calc_milepost IS NOT NULL AND acc_time IS NOT NULL
        ${locationClause !== "" ? ` AND ${locationClause}` : '' }
        ${filterClause  !== "" ? ` AND ${filterClause}` : '' }    
        GROUP BY calc_sri, calc_milepost, crash_hr
    ) accidents
    LEFT JOIN public.srilookupname ON public.srilookupname.stndrd_rt_id = accidents.calc_sri
    WHERE fatal > 0 OR incapacitated > 0 
    ORDER BY fatal DESC, incapacitated DESC LIMIT 25;`;
    //console.log(sql);
    return sql;
  }

// *---------------*
// route schema
// *---------------*
const schema = {
    description: 'gets SRI by Fatal & Incapacitated Crashes .',
    tags: ['sunglare'],
    summary: 'gets SRI by Fatal & Incapacitated Crashes ',
    querystring: {
        user: {
            type: 'string',
            description: 'The user name.',
            default: ''
        },
        moduleType: {
            type: 'string',
            description: 'The type of predictive module.',
            default: 'sunglare'
        },
        startYear: {
            type: 'string',
            description: 'The start year for crashes.',
            default: '2015'
        },
        endYear: {
            type: 'string',
            description: 'The end year for crashes.',
            default: '2020'
        },
        travelDirectionCodes: {
            type: 'string',
            description: 'Comma seperated list of Travel Direction codes based on the NJTR-1 form.',
        },
        timeOfDayCodes: {
            type: 'string',
            description: 'Comma seperated list of Time of Day codes based on the NJTR-1 form.',
        },
        signalizedIntersectionCodes: {
            type: 'string',
            description: 'Comma seperated list of Signalized Intersection codes based on the NJTR-1 form.'
        },
        sri: {
            type: 'string',
            description: 'SRI code.',
        },
        countyCode: {
            type: 'string',
            description: 'County Code.',
        },
        muniCode: {
            type: 'string',
            description: 'Municipality code.'
        }
    }
}

// *---------------*
// create route
// *---------------*
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/sunglare/top-fatal',
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
                if (queryArgs.startYear == undefined) {
                    return reply.send({
                        "statusCode": 500,
                        "error": "Internal Server Error",
                        "message": "need startyear"
                    });
                } else if (queryArgs.endYear == undefined) {
                    return reply.send({
                        "statusCode": 500,
                        "error": "Internal Server Error",
                        "message": "need start year"
                    });
                }

                client.query(
                    sql(queryArgs),
                    function onResult(err, result) {
                        release()
                        reply.send(err || {FatalSriData: result.rows})
                    }
                );
            }
        }
    })
    next()
}

module.exports.autoPrefix = '/v1'