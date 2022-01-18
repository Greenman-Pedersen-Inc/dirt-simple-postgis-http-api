

/*
JAN 18 2022 IN PROGRESS 
get_graph_data: Gets a JSON containing data for crashes by month and crashes groupped by attribute
*/

const { transcribeKeysArray } = require('../../helper_functions/code_translations/translator_helper');
const {makeCrashFilterQuery} = require('../../helper_functions/crash_filter_helper');

// *---------------*
// route query
// *---------------*
const sql = (queryArgs) => {
    // if target_milepost is defined, set start_mp and end_mp in the crashFilter object
    const accidentsTableName = "ard_accidents_geom_partition";
    let filterJson = JSON.parse(queryArgs.crashFilter);

    if (queryArgs.target_sri) {
        filterJson.sri = queryArgs.target_sri;

        if (queryArgs.target_milepost) {
            filterJson.mp_start = queryArgs.target_milepost;
            filterJson.mp_end = parseFloat(queryArgs.target_milepost) + 0.1;
        }
    }

    const crashFilterClauses = makeCrashFilterQuery(filterJson, accidentsTableName);
    const njtr1Root = 'https://voyagernjtr1.s3.amazonaws.com/';

    var sql = `
    SELECT *, directory as report_directory,
    CASE 
        WHEN directory IS NOT NULL OR directory <> '' THEN CONCAT('${njtr1Root}', directory, '/', dln, '.PDF') 
        ELSE NULL
    END AS "URL"
    FROM ${accidentsTableName} ${crashFilterClauses.fromClause} 
    ${crashFilterClauses.whereClause ? ` WHERE ${crashFilterClauses.whereClause}` : ''}
    ORDER BY milepost
    `;
    console.log(sql);
    return sql;
  }

// *---------------*
// route schema
// *---------------*
const schema = {
    description: "Gets a list of all crash cases within a specified milepost and crash filter.",
    tags: ['crash-map'],
    summary: "Gets a list of all crash cases within a specified milepost and crash filter. The crash filter should have the SRI if the milepost attribute is specified.",
    querystring: {
        crashFilter: {
            type: 'string',
            description: 'stringified JSON of crash filter object. ex: {"mp_start": "0", "mp_end": "11.6", "year": "2017,2018,2019", "contr_circum_code_vehicles": "01"}',
        }, 
        min_x: {
            type: 'string',
            description: 'min x of map extent'
        },
        min_y: {
            type: 'string',
            description: 'min y of map extent',
        },
        max_x: {
            type: 'string',
            description: 'max x of map extent',
        },
        max_y: {
            type: 'string',
            description: 'max y of map extent',
        }
    }
}

// *---------------*
// create route
// *---------------*
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/crash-map/get-crash-list',
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
                if (queryArgs.crashFilter == undefined) {
                    return reply.send({
                        "statusCode": 500,
                        "error": "Internal Server Error",
                        "message": "crash filter not submitted"
                    });
                }

                if (queryArgs.target_milepost && queryArgs.target_sri == undefined) {
                    return reply.send({
                        "statusCode": 500,
                        "error": "Internal Server Error",
                        "message": "target sri is not defined."
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

                        reply.send(err || {CrashList: returnRows})
                    }
                )
            }
        }
    })
    next()
}

module.exports.autoPrefix = '/v1'