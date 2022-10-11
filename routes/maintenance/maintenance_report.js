// readMaintenanceData: queries accident data between a time frame for NJDOT Maintenance for insurance claims
const fs = require('fs');
const path = require('path');
const fastifyStatic = require('fastify-static');
const outputPath = path.join(__dirname, '../../output', 'maintenance');
const maintenanceHelper = require('../../helper_functions/maintenance_helper');
const codeTranslator = require('../../helper_functions/code_translator');
const customTimeout = 20000;
const sql = (query) => {
    // --- QUERY crash data based on time frame
    let accidentQuery = `
    SELECT  
        dln,
        year,
        acc_case,
        road_sys_code,
        mun_cty_co,
        mun_mu,
        cast(acc_date as char(11)),
        dept_name,
        dept_num,
        coalesce(station, '') AS "STATION",
        location,
        coalesce(cast(route_num as char(4)),'') AS "route_num",
        sri AS "SRI",
        coalesce(cast(milepost as char(7)),'') AS "MILEPOST",
        coalesce(xstreet_name, '') AS "CROSS STREET",
        coalesce(is_ramp, '') AS "IS RAMP?",
        coalesce(ramp_route, '') AS "RAMP ROUTE",
        coalesce(state, '') AS "STATE",
        coalesce(first_event_code, '') AS "first_event_code",
        coalesce(second_event_code, '') AS "second_event_code",
        coalesce(third_event_code, '') AS "third_event_code",
        coalesce(fourth_event_code, '') AS "fourth_event_code",
        coalesce(most_harm_event_code, '') AS "most_harm_event_code",
        coalesce(other_prop_damage, '') AS "OTHER PROPERTY DAMAGE"
        FROM maintenance.report_data
        WHERE acc_date between '${query.startDate}' and '${query.endDate}' ${query.limit ? `LIMIT ${query.limit}` : ''}
    ;`;
    return accidentQuery;
};
const schema = {
    description: 'queries accident data between a time frame for NJDOT Maintenance for insurance claims.',
    tags: ['maintenance'],
    summary: 'queries accident data between a time frame for NJDOT Maintenance for insurance claims.',
    query: {
        startDate: {
            type: 'string',
            description: 'unique start date mm-dd-yyyy',
            default: '01-01-2017'
        },
        endDate: {
            type: 'string',
            description: 'unique end date mm-dd-yyyy',
            default: '01-05-2017'
        },
        limit: {
            type: 'string',
            description: 'LIMIT [amount]'
        },
        fileFormat: {
            type: 'string',
            description: 'csv, xlsx, or pdf',
            default: 'pdf'
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
    // static documentation path
    fastify.register(fastifyStatic, {
        root: outputPath,
        prefix: '/maintenance/', // optional: default '/'
        decorateReply: true
    });

    fastify.route({
        method: 'GET',
        url: '/maintenance/report',
        schema: schema,
        preHandler: fastify.auth([fastify.verifyToken]),
        handler: function (request, reply) {
            const query = sql(request.query);

            request.tracker = new fastify.RequestTracker(
                request.headers.credentials,
                'maintenance',
                'report',
                JSON.stringify(request.query),
                reply
            );
            // remove all reports older than 10 minutes from output directory
            fs.readdir(outputPath, function (error, files) {
                if (error) {
                    reply.code(500).send(error);
                    request.tracker.error(error);
                }
                files.forEach(function (file) {
                    fs.stat(path.join(outputPath, file), function (error, stat) {
                        let now = new Date().getTime();
                        let endTime = new Date(stat.ctime).getTime() + 600000;

                        if (error) {
                            reply.code(500).send(error);
                            request.tracker.error(error);
                        } else {
                            if (now > endTime) {
                                fs.unlink(path.join(outputPath, file), function (response) {
                                    console.log(`${file} deleted!`);
                                });
                            }
                        }
                    });
                });
            });

            request.tracker.start();

            if (request.query.startDate == undefined) {
                reply.code(400).send('need start or end year');
                request.tracker.error('need start or end year');
            } else if (request.query.endDate == undefined) {
                reply.code(400).send('need start or end year');
                request.tracker.error('need start or end year');
            } else if (request.query.fileFormat == undefined) {
                reply.code(400).send('need file format');
                request.tracker.error('need file format');
            } else {
                fastify.pg
                    .connect()
                    .then((client) => {
                        client.connectionParameters.query_timeout = customTimeout;
                        client
                            .query(query)
                            .then((result) => {
                                if (result && result.rowCount > 0) {
                                    let data = [];

                                    result.rows.forEach((row) => {
                                        let dataRow = {};
                                        for (let key in row) {
                                            let code = row[key];
                                            const title = codeTranslator.resolveFieldAlias(key).toUpperCase();
                                            if (key === 'mun_mu') {
                                                code = row['mun_cty_co'] + code;
                                            }

                                            if (key === 'acc_date') {
                                                const date = new Date(row['acc_date'].trim());
                                                dataRow[title] = date.toLocaleDateString('en-US');
                                            } else {
                                                const value = codeTranslator.convertCodeDescription(key, code);
                                                dataRow[title] = value;
                                            }
                                        }
                                        data.push(dataRow);
                                    });

                                    const fileInfo = maintenanceHelper.fileExport(request.query, data);

                                    return fileInfo
                                        .then((createdFile) => {
                                            reply.code(200);
                                            reply.sendFile(createdFile.fileName, outputPath);
                                            request.tracker.complete();
                                            release();
                                        })
                                        .catch((error) => {
                                            reply.code(500).send(error);
                                            request.tracker.error(error);
                                            release();
                                        });
                                } else {
                                    reply.code(204).send();
                                    request.tracker.complete();
                                    release();
                                }
                            })
                            .catch((error) => {
                                reply.code(500).send(error);
                                request.tracker.error(error);
                                release();
                            });
                    })
                    .catch((error) => {
                        reply.code(500).send(error);
                        request.tracker.error(error);
                        release();
                    });
            }
        }
    });
    next();
};

module.exports.autoPrefix = '/v1';
