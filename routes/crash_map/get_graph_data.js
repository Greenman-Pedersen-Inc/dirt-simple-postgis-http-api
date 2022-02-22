/*
JAN 18 2022 IN PROGRESS 
get_graph_data: Gets a JSON containing data for crashes by month and crashes groupped by attribute
*/

const { transcribeKeysArray } = require('../../helper_functions/code_translations/translator_helper');
const { makeCrashFilterQuery } = require('../../helper_functions/crash_filter_helper');
const dataTypes = ['Temporal', 'Speed'];

// *---------------*
// route query
// *---------------*
const sql = (queryArgs) => {
    const accidentsTableName = "ard_accidents_geom_partition";
    const parsed_filter = JSON.parse(queryArgs.selected_filters);
    const filter = makeCrashFilterQuery(parsed_filter, accidentsTableName);
    const whereClause = filter.whereClause;
    const fromClause = filter.fromClause;

    const groupByClause = `${queryArgs.dataType === 'Speed' ? 
    'GROUP BY speed_range ORDER BY speed_range' : `GROUP BY ${accidentsTableName}.year, acc_month ORDER BY ${accidentsTableName}.year, acc_month` }`;

    var selectStatement = `COUNT(${accidentsTableName}.crashid) "Crash Count", ${accidentsTableName}.year "Year", acc_month`;
    if (queryArgs.dataType === 'Speed') selectStatement = `        
        CASE WHEN posted_speed < 10 THEN '< 10 mph'
        WHEN posted_speed >= 10 AND posted_speed < 20 THEN '10-19 mph'
        WHEN posted_speed >= 20 AND posted_speed < 30 THEN '20-29 mph'
        WHEN posted_speed >= 30 AND posted_speed < 40 THEN '30-39 mph'
        WHEN posted_speed >= 40 AND posted_speed < 50 THEN '40-49 mph'
        WHEN posted_speed >= 50 AND posted_speed < 60 THEN '50-59 mph'
        WHEN posted_speed <= 60 THEN '≥ 60 mph'
        ELSE 'Unknown'
        END speed_range,
        COUNT(ard_accidents_geom_partition.crashid)
    `;

    const query = `
        SELECT 
        ${selectStatement}
        FROM ${accidentsTableName}
        ${fromClause ? ` ${fromClause}` : ''}
        WHERE geom && ST_MakeEnvelope (${queryArgs.boundingBoxMinX}, ${queryArgs.boundingBoxMinY}, ${queryArgs.boundingBoxMaxX}, ${queryArgs.boundingBoxMaxY}, 4326)
        ${whereClause ? ` AND ${whereClause}` : ''}
        ${groupByClause ? ` ${groupByClause}` : ''}
    `;

    console.log(query)
    return query;
  }

// *---------------*
// route schema
// *---------------*
const schema = {
    description: "Gets a list of all crash cases within a specified milepost and crash filter.",
    tags: ['crash-map'],
    summary: "Gets a list of all crash cases within a specified milepost and crash filter. The crash filter should have the SRI if the milepost attribute is specified.",
    querystring: {
        selected_filters: {
            type: 'string',
            description: 'stringified JSON of crash filter object',
            example: '{"year": "2017,2018,2019", "contr_circum_code_vehicles": "01"}'
        },
        dataType: {
            type: 'string',
            description: 'type of data results that should be exported: Temporal, Speed',
            example: 'Temporal'
        },
        boundingBoxMinX: {
            type: 'number',
            description: 'left point of the map extent',
            example: -75.18347186057379
        },
        boundingBoxMinY: {
            type: 'number',
            description: 'bottom point of the map extent',
            example: 39.89214724158961
        },
        boundingBoxMaxX: {
            type: 'number',
            description: 'right point of the map extent',
            example: -74.99457847510519
        },
        boundingBoxMaxY: {
            type: 'number',
            description: 'top point of the map extent',
            example: -39.93906091093021
        }
    }
}

// *---------------*
// create route
// *---------------*
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/crash-map/get-graph-data',
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
                if (queryArgs.selected_filters == undefined) {
                    return reply.send({
                        "statusCode": 500,
                        "error": "Internal Server Error",
                        "message": "crash filter not submitted"
                    });
                }
                if (queryArgs.dataType == undefined) {
                    return reply.send({
                        "statusCode": 500,
                        "error": "Internal Server Error",
                        "message": "data type not submitted"
                    });
                }
                if (!dataTypes.includes(queryArgs.dataType)) {
                    return reply.send({
                        "statusCode": 500,
                        "error": "Internal Server Error",
                        "message": "data type invalid"
                    });
                }

                client.query(
                    sql(queryArgs),
                    function onResult(err, result) {
                        release();
                        let returnRows = [];
                        if (result) {
                            if (result.hasOwnProperty('rows')) {
                                returnRows = transcribeKeysArray(result.rows);
                            }  
                        }

                        reply.send(err || {GraphData: returnRows})
                    }
                )
            }
        }
    })
    next()
}

module.exports.autoPrefix = '/v1'