// readMaintenanceData: queries accident data between a time frame for NJDOT Maintenance for insurance claims
const fs = require('fs');
const path = require('path');
const outputPath = path.join(__dirname, '../../output', 'maintenance');
const maintenanceHelper = require('../../helper_functions/maintenance_helper');
const codeTranslator = require('../../helper_functions/code_translator');

// *---------------*
// route query
// *---------------*
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

// *---------------*
// route schema
// *---------------*
const schema = {
    description: 'queries accident data between a time frame for NJDOT Maintenance for insurance claims.',
    tags: ['maintenance'],
    summary: 'queries accident data between a time frame for NJDOT Maintenance for insurance claims.',
    querystring: {
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
    fastify.route({
        method: 'GET',
        url: '/maintenance/report',
        schema: schema,
        preHandler: fastify.auth([fastify.verifyToken]),
        handler: function (request, reply) {
            fastify.pg.connect(onConnect);

            function onConnect(err, client, release) {
                try {
                    const queryString = request.query;
                    if (queryString.startDate == undefined) {
                        return reply.send({
                            statusCode: 500,
                            error: 'Internal Server Error',
                            message: 'need start or end date'
                        });
                    } else if (queryString.endDate == undefined) {
                        return reply.send({
                            statusCode: 500,
                            error: 'Internal Server Error',
                            message: 'need start or end date'
                        });
                    } else if (queryString.fileFormat == undefined) {
                        return reply.send({
                            statusCode: 500,
                            error: 'Internal Server Error',
                            message: 'need file format'
                        });
                    } else {
                        if (!fs.existsSync(outputPath)) {
                            try {
                                fs.mkdirSync(outputPath, { recursive: true });
                            } catch (error) {
                                console.log(error);
                            }
                        }

                        fs.readdir(outputPath, function (err, files) {
                            //handling error
                            if (err) {
                                console.log('Unable to scan directory: ' + err);
                            }
                            //listing all files using forEach
                            files.forEach(function (file) {
                                fs.stat(path.join(outputPath, file), function (err, stat) {
                                    let now = new Date().getTime();
                                    let endTime = new Date(stat.ctime).getTime() + 600000;

                                    if (err) {
                                        return console.error(err);
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

                        client.query(sql(request.query), function onResult(err, result) {
                            release();

                            if (err) {
                                reply.send(err);
                            } else if (result && result.rowCount > 0) {
                                let data = [];

                                result.rows.forEach((row) => {
                                    let dataRow = {};
                                    for (const key in row) {
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

                                const fileInfo = maintenanceHelper.fileExport(queryString, data);

                                fileInfo
                                    .then((createdFile) => {
                                        reply.code(200);
                                        reply.sendFile(createdFile.fileName, outputPath);
                                    })
                                    .catch((error) => {
                                        console.log('report error');
                                        console.log(error);
                                    });
                            } else {
                                reply.code(204).send();
                            }
                        });
                    }
                } catch (error) {
                    console.error(error);
                }
            }
        }
    });
    next();
};

module.exports.autoPrefix = '/v1';