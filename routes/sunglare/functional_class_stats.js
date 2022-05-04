// functional_class_stats : gets crashes grouped by functional class
const sunglareHelper = require('../../helper_functions/sunglare_helper');

// *---------------*
// route query
// *---------------*
const sql = (queryArgs) => {
    var locationClause = sunglareHelper.createLocationClause(queryArgs);
    var filterClause = sunglareHelper.createFilterClause(queryArgs);

    var sql = `
    SELECT * FROM (
        SELECT 
        CASE WHEN posted_speed < 10 THEN '< 10 mph'
        WHEN posted_speed >= 10 AND posted_speed < 20 THEN '10-19 mph'
        WHEN posted_speed >= 20 AND posted_speed < 30 THEN '20-29 mph'
        WHEN posted_speed >= 30 AND posted_speed < 40 THEN '30-39 mph'
        WHEN posted_speed >= 40 AND posted_speed < 50 THEN '40-49 mph'
        WHEN posted_speed >= 50 AND posted_speed < 60 THEN '50-59 mph'
        WHEN posted_speed <= 60 THEN '≥ 60 mph'
        END speed_range,
        CASE WHEN functional_class = 1 THEN 'Interstate'
        WHEN functional_class = 2 THEN 'Principal Arterial – Other Freeway/Expressway'
        WHEN functional_class = 3 THEN 'Principal Arterial – Other'
        WHEN functional_class = 4 THEN 'Minor Arterial'
        WHEN functional_class = 5 THEN 'Major Collector'
        WHEN functional_class = 6 THEN 'Minor Collector'
        WHEN functional_class = 7 THEN 'Local'
        END fc,
        COUNT(sunglare.ard_accidents_sunglare.crashid),
        SUM(CASE WHEN severity_rating5 = '05' THEN 1 ELSE 0 END) fatal,
        SUM(CASE WHEN severity_rating5 = '04' THEN 1 ELSE 0 END) incapacitated,
        SUM(CASE WHEN severity_rating5 = '03' THEN 1 ELSE 0 END) mod_inj,
        SUM(CASE WHEN severity_rating5 = '02' THEN 1 ELSE 0 END) comp_pain,
        SUM(CASE WHEN severity_rating5 = '01' THEN 1 ELSE 0 END) prop_dmg

        FROM

        sunglare.ard_accidents_sunglare
        WHERE year BETWEEN ${queryArgs.startYear} AND ${queryArgs.endYear}
        ${locationClause !== '' ? ` AND ${locationClause}` : ''}
        ${filterClause !== '' ? ` AND ${filterClause}` : ''}    
        GROUP BY speed_range, fc
        ORDER BY speed_range, fc

    ) data

    WHERE speed_range IS NOT NULL AND fc IS NOT NULL;`;
    console.log(sql);
    return sql;
};

// *---------------*
// route schema
// *---------------*
const schema = {
    description: 'gets crashes grouped by functional class.',
    tags: ['sunglare'],
    summary: 'gets crashes grouped by functional class',
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
            description: 'Comma seperated list of Travel Direction codes based on the NJTR-1 form.'
        },
        timeOfDayCodes: {
            type: 'string',
            description: 'Comma seperated list of Time of Day codes based on the NJTR-1 form.'
        },
        signalizedIntersectionCodes: {
            type: 'string',
            description: 'Comma seperated list of Signalized Intersection codes based on the NJTR-1 form.'
        },
        sri: {
            type: 'string',
            description: 'SRI code.'
        },
        countyCode: {
            type: 'string',
            description: 'County Code.'
        },
        muniCode: {
            type: 'string',
            description: 'Municipality code.'
        }
    }
};

// *---------------*
// create route
// *---------------*
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/sunglare/functional-class-stats',
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
                if (queryArgs.startYear == undefined) {
                    return reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'need startyear'
                    });
                } else if (queryArgs.endYear == undefined) {
                    return reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'need start year'
                    });
                }
                client.query(sql(queryArgs), function onResult(err, result) {
                    release();
                    reply.send(err || { FunctionalClassData: result.rows });
                });
            }
        }
    });
    next();
};

module.exports.autoPrefix = '/v1';
