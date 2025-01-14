// time_summary: gets stats grouped by time of day
const sunglareHelper = require('../../helper_functions/sunglare_helper');

// *---------------*
// route query
// *---------------*
const sql = (queryArgs) => {
    var locationClause = sunglareHelper.createLocationClause(queryArgs);
    var filterClause = sunglareHelper.createFilterClause(queryArgs);

    var sql = `
    SELECT 
    SUBSTRING ( acc_time, 1, 2 )::INT crash_hr,
    COUNT(ard_accidents_sunglare.crashid)::INT, 
    SUM(CASE WHEN severity_rating5 = '05' THEN 1 ELSE 0 END)::INT fatal,
    SUM(CASE WHEN severity_rating5 = '04' THEN 1 ELSE 0 END)::INT incapacitated,
    SUM(CASE WHEN severity_rating5 = '03' THEN 1 ELSE 0 END)::INT mod_inj,
    SUM(CASE WHEN severity_rating5 = '02' THEN 1 ELSE 0 END)::INT comp_pain,
    SUM(CASE WHEN severity_rating5 = '01' THEN 1 ELSE 0 END)::INT prop_dmg

    FROM

    sunglare.ard_accidents_sunglare
    WHERE year BETWEEN ${queryArgs.startYear} AND ${queryArgs.endYear} 
    ${locationClause !== '' ? ` AND ${locationClause}` : ''}
    ${filterClause !== '' ? ` AND ${filterClause}` : ''}     
    GROUP BY crash_hr
    ORDER BY crash_hr;`;
    //console.log(sql);
    return sql;
};

// *---------------*
// route schema
// *---------------*
const schema = {
    description: 'gets stats grouped by time of day.',
    tags: ['sunglare'],
    summary: 'gets stats grouped by time of day.',
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
        url: '/sunglare/time-summary',
        schema: schema,
        preHandler: fastify.auth([fastify.verifyToken]),
        handler: function (request, reply) {
            request.tracker = new fastify.RequestTracker(
                request.headers.credentials,
                'sunglare',
                'time_summary',
                JSON.stringify(request.query),
                reply
            );
            fastify.pg.connect(onConnect);

            function onConnect(err, client, release) {

                if (err) {
                    request.tracker.error(err);
                    return reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'unable to connect to database server'
                    });
                }

                request.tracker.start();

                var queryArgs = request.query;
                if (queryArgs.startYear == undefined) {
                    reply.code(400).send('need start year');
                    request.tracker.error('need start year');
                } else if (queryArgs.endYear == undefined) {
                    reply.code(400).send('need end year');
                    request.tracker.error('need end year');
                }

                client.query(sql(queryArgs), function onResult(err, result) {
                    if (err) {
                        request.tracker.complete();
                        release();
                        return reply.code(500).send(err);
                    }

                    request.tracker.complete();
                    release();
                    reply.send(err || { TimeData: result.rows });
                });

            }
        }
    });
    next();
};

module.exports.autoPrefix = '/v1';
