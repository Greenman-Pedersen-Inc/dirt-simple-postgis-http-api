/* 
get_sri_breakdown: Gets a list of number of crashes grouped by crash attribute code
*/

const { transcribeKeysArray } = require('../../helper_functions/code_translations/translator_helper');
const {makeCrashFilterQuery} = require('../../helper_functions/crash_filter_helper');
const allowedFields = ["crash_type","surf_cond_code","road_median_code","year","acc_dow","environ_cond_code","road_char_code","surf_cond_code","dept_num","ramp_direction","light_cond_code"];

// *---------------*
// route query
// *---------------*
const sql = (queryArgs) => {
    // if target_milepost is defined, set start_mp and end_mp in the crashFilter object
    const accidentsTableName = "ard_accidents_geom_partition";
    let filterJson = JSON.parse(queryArgs.crashFilter);

    if (queryArgs.target_sri) {
        if (queryArgs.target_sri.toUpperCase() === "STATE") {
            delete filterJson.sri;
            delete filterJson.mp_start;
            delete filterJson.mp_end;
            delete filterJson.milepost;
        }
        else {
            filterJson.sri = queryArgs.target_sri;
        }

        if (queryArgs.target_milepost) {
            filterJson.mp_start = queryArgs.target_milepost;
            filterJson.mp_end = parseFloat(queryArgs.target_milepost) + 0.1;
        }
    }

    const crashFilterClauses = makeCrashFilterQuery(filterJson, accidentsTableName);

    var sql = `
    SELECT ${queryArgs.breakdown_field}, COALESCE(COUNT(*), 0)
    FROM ${accidentsTableName} ${crashFilterClauses.fromClause} 
    WHERE ${queryArgs.breakdown_field} IS NOT NULL
    ${crashFilterClauses.whereClause ? ` AND ${crashFilterClauses.whereClause}` : ''}
    GROUP BY ${queryArgs.breakdown_field}
    ORDER BY ${queryArgs.breakdown_field}
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
            description: 'stringified JSON of crash filter object. ex: {"mp_start": "0", "mp_end": "11.6", "year": "2017,2018,2019", "contr_circum_code_vehicles": "01"}'        }, 
        target_milepost: {
            type: 'string',
            description: 'specific milepost to be query. ex: 11.4'
        },
        target_sri: {
            type: 'string',
            description: 'specific SRI to be query. ex: 00000012__ or STATE'
        },
        breakdown_field: {
            type: 'string',
            description: `"crash_type","surf_cond_code","road_median_code","year","acc_dow","environ_cond_code","road_char_code","surf_cond_code","dept_num","ramp_direction","light_cond_code"`,
            default: "crash_type"
        },
    }
}

// *---------------*
// create route
// *---------------*
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/crash-map/get-sri-breakdown',
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
                if(queryArgs.crashFilter == undefined) {
                    return reply.send({
                        "statusCode": 500,
                        "error": "Internal Server Error",
                        "message": "crash filter not submitted"
                    });
                }

                if(queryArgs.breakdown_field == undefined) {
                    return reply.send({
                        "statusCode": 500,
                        "error": "Internal Server Error",
                        "message": "breadkdown_field not submitted."
                    });
                }

                if(!allowedFields.includes(queryArgs.breakdown_field)) {
                    return reply.send({
                        "statusCode": 500,
                        "error": "Internal Server Error",
                        "message": `breadkdown_field not avaliable: ${queryArgs.breakdown_field}`
                    });
                }

                if(queryArgs.target_milepost && queryArgs.target_sri == undefined) {
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
                        // if (result) {
                        //     if (result.hasOwnProperty('rows')) {
                        //         returnRows = transcribeKeysArray(result.rows);
                        //     }  
                        // }

                        reply.send(err || {CrashList: result.rows})
                    }
                )
            }
        }
    })
    next()
}

module.exports.autoPrefix = '/v1'