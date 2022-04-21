// annual_persons: gets fatal and SI persons grouped by year
const sunglareHelper = require('../../helper_functions/sunglare_helper');

// *---------------*
// route query
// *---------------*
const sql = (queryArgs) => {
        var locationClause = sunglareHelper.createLocationClause(queryArgs);
        var filterClause = sunglareHelper.createFilterClause(queryArgs);

        var sql = `
    SELECT 
    SUBSTRING ( acc_time, 1, 2 ) crash_hr,
    COUNT(ard_accidents_sunglare.crashid), 
    SUM(CASE WHEN severity_rating5 = '05' THEN 1 ELSE 0 END) fatal,
    SUM(CASE WHEN severity_rating5 = '04' THEN 1 ELSE 0 END) incapacitated,
    SUM(CASE WHEN severity_rating5 = '03' THEN 1 ELSE 0 END) mod_inj,
    SUM(CASE WHEN severity_rating5 = '02' THEN 1 ELSE 0 END) comp_pain,
    SUM(CASE WHEN severity_rating5 = '01' THEN 1 ELSE 0 END) prop_dmg

    FROM

    sunglare.ard_accidents_sunglare
    WHERE year BETWEEN ${queryArgs.startYear} AND ${queryArgs.endYear} 
    ${locationClause !== "" ? ` AND ${locationClause}` : '' }
    ${filterClause  !== "" ? ` AND ${filterClause}` : '' }     
    GROUP BY crash_hr
    ORDER BY crash_hr;`;
    //console.log(sql);
    return sql;
  }

// *---------------*
// route schema
// *---------------*
const schema = {
    description: 'gets stats grouped by time of day.',
    tags: ['emphasis-explorer'],
    summary: 'gets stats grouped by time of day.',
    querystring: {
        user: {
            type: 'string',
            description: 'The user name.',
            example: ''
        },
        category: {
            type: 'string',
            description: 'Emphasis Area category',
            example: 'lane_departure, ped_cyclist, intersections, driver_behavior, road_users'
        },
        subcategory: {
            type: 'string',
            description: 'Emphasis Area subcategory',
            example: 'aggressive, drowsy_distracted, impaired, unlicensed, unbelted, heavy_vehicle, mature, younger, motorcyclist, work_zone'
        },
        startYear: {
            type: 'string',
            description: 'The start year.',
            example: '2016'
        },
        endYear: {
            type: 'string',
            description: 'The end year.',
            example: '2020'
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
        url: '/emphasis-explorer/annual-persons',
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
                        reply.send(err || {TimeData: result.rows})
                    }
                );
            }
        }
    })
    next()
}

module.exports.autoPrefix = '/v1'