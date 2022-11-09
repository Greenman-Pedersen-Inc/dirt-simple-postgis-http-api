// custom_export_records: FOR INTERNAL USE ONLY
// Crashes are specified by a string array of crashIDs.

const fs = require('fs');
const path = require('path');
const fastifyStatic = require('fastify-static');

// use a converter to make CSV from data rows
const { convertArrayToCSV } = require('convert-array-to-csv');
const { transcribeKeysArray } = require('../../helper_functions/code_translations/translator_helper');
const { viewableAttributes } = require('../../helper_functions/code_translations/accidents');

const customTimeout = 30000;

// outputPath to store CSV
const folderName = 'custom-records';
const outputPath = path.join(__dirname, '../../output', folderName);
// *---------------*
// route query
// *---------------*
const sql = (queryArgs) => {

    // const query = `SELECT ${queryArgs.table.includes('accidents') ? viewableAttributes.join(', ') : '*'} FROM ${queryArgs.table} WHERE ${queryArgs.whereClause}`;
    const query = `
    SELECT *
    FROM ard_accidents_geom_partition, ard_vehicles_partition
    WHERE ard_accidents_geom_partition.year >= 2017 AND ard_accidents_geom_partition.year <= 2021 
    AND ard_vehicles_partition.type_code IN ('24', '25', '26')
    AND ard_accidents_geom_partition.road_sys_code::text <> '09'::text 
    AND ard_accidents_geom_partition.crashid = ard_vehicles_partition.crashid 
    AND (ard_vehicles_partition.contr_circum_code1::text <> '12'::text OR ard_vehicles_partition.contr_circum_code1 IS NULL) 
    AND (ard_vehicles_partition.contr_circum_code2::text <> '12'::text OR ard_vehicles_partition.contr_circum_code2 IS NULL) 
    AND (ard_accidents_geom_partition.tot_veh_involved = 1::numeric 
    AND ((ard_vehicles_partition.first_event_code::text = ANY (ARRAY['05'::character varying::text, '06'::character varying::text])) 
    OR (ard_vehicles_partition.second_event_code::text = ANY (ARRAY['05'::character varying::text, '06'::character varying::text])) 
    OR (ard_vehicles_partition.third_event_code::text = ANY (ARRAY['05'::character varying::text, '06'::character varying::text])) 
    OR (ard_vehicles_partition.fourth_event_code::text = ANY (ARRAY['05'::character varying::text, '06'::character varying::text])) 
    OR ard_accidents_geom_partition.crash_type::text = '11'::text)
    OR ard_accidents_geom_partition.tot_veh_involved > 1::numeric 
    AND ((ard_vehicles_partition.first_event_code::text = ANY (ARRAY['05'::character varying::text, '06'::character varying::text, '07'::character varying::text])) 
        OR (ard_vehicles_partition.second_event_code::text = ANY (ARRAY['05'::character varying::text, '06'::character varying::text, '07'::character varying::text])) 
        OR (ard_vehicles_partition.third_event_code::text = ANY (ARRAY['05'::character varying::text, '06'::character varying::text, '07'::character varying::text])) 
        OR (ard_vehicles_partition.fourth_event_code::text = ANY (ARRAY['05'::character varying::text, '06'::character varying::text, '07'::character varying::text])) 
        OR (ard_accidents_geom_partition.crash_type::text = ANY (ARRAY['04'::character varying::text, '05'::character varying::text, '06'::character varying::text]))
    ));
    `;

    //console.log(query)
    return query;
};

// *---------------*
// route schema
// *---------------*
const schema = {
    description: 'INTERNAL USE - exports CSV of human readable table data',
    tags: ['general'],
    summary: 'INTERNAL USE - exports CSV of human readable table data',
    querystring: {
        whereClause: {
            type: 'string',
            description: 'SQL where clause',
        },
        fileName : {
            type: 'string',
            description: 'name of the file to be exported',
        },
        table : {
            type: 'string',
            description: 'table to query on',
        }
    }
};

// *---------------*
// create route
// *---------------*
module.exports = function (fastify, opts, next) {
    if (!fs.existsSync(outputPath)) {
        try {
            fs.mkdirSync(outputPath, { recursive: true });
        } catch (error) {
            console.error(error);
        }
    }
    fastify.register(fastifyStatic, {
        root: outputPath,
        prefix: '/' + folderName + '/', // optional: default '/'
        decorateReply: true, // the reply decorator has been added by the first plugin registration
    });

    fastify.route({
        method: 'GET',
        url: '/general/custom-export-records',
        schema: schema,
        // preHandler: fastify.auth([fastify.verifyToken]),
        handler: function (request, reply) {
            const queryArgs = request.query;
            function onConnect(err, client, release) {
                client.connectionParameters.query_timeout = customTimeout;

                if (err) {
                    release();

                    reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'unable to connect to database server'
                    });
                }
                // else if (queryArgs.whereClause === undefined) {
                //     release();

                //     reply.send({
                //         statusCode: 400,
                //         error: 'Bad request',
                //         message: 'missing where clause'
                //     });
                // }
                else {
                    try {
                        client.query(sql(queryArgs), function onResult(err, result) {
                            release();
                            let returnRows = [];
                            if (result) {
                                const fileName = `Voyager_Crash_Record_Export_${Date.now()}_${Math.floor(
                                    1000 + Math.random() * 9000
                                ).toString()}`;
                                const csvFileName = fileName + '.csv';
                                const zipFileName = fileName + '.zip';

                                if (!fs.existsSync(outputPath)) {
                                    try {
                                        fs.mkdirSync(outputPath, { recursive: true });
                                    } catch (error) {
                                        console.log(error);
                                    }
                                }

                                if (result.hasOwnProperty('rows')) {
                                    returnRows = transcribeKeysArray(result.rows, true, false);
                                }

                                const csvFromArrayOfObjects = convertArrayToCSV(returnRows);

                                fs.writeFile(
                                    path.join(outputPath, queryArgs.fileName + '.csv'),
                                    csvFromArrayOfObjects,
                                    'utf8',
                                    function (err) {
                                        if (err) {
                                            console.log(
                                                'Some error occurred - file either not saved or corrupted file saved.'
                                            );
                                            reply.send({
                                                statusCode: 400,
                                                error: 'Unable to zip',
                                                message: err
                                            });
                                        } else {
                                            reply.code(200);
                                            reply.header('exportCount', result.rows.length);
                                            reply.sendFile(queryArgs.fileName, outputPath)
                                        }
                                    }
                                );
                            } else {
                                reply.code(204);
                                reply.send(result);
                            }
                        });
                    } catch (error) {
                        release();

                        reply.send({
                            statusCode: 500,
                            error: error,
                            message: request
                        });
                    }
                }
            }

            fastify.pg.connect(onConnect);
        }
    });
    next();
};

module.exports.autoPrefix = '/v1';
