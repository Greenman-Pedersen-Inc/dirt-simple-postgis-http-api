// readMaintenanceData: queries accident data between a time frame for NJDOT Maintenance for insurance claims

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
        handler: function (request, reply) {
            fastify.pg.connect(onConnect);

            function onConnect(err, client, release) {
                var queryString = request.query;
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
                    client.query(sql(request.query), function onResult(err, result) {
                        release();

                        if (err) {
                            reply.send(err);
                        } else if (result && result.rowCount > 0) {
                            const queryStrings = request.query;
                            ////console.log(result.rows);
                            var data = [];

                            result.rows.forEach((row) => {
                                var dataRow = {};
                                for (const key in row) {
                                    var code = row[key];
                                    const title = codeTranslator.resolveFieldAlias(key).toUpperCase();
                                    if (key === 'mun_mu') code = row['mun_cty_co'] + code;

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

                            ////console.log(data[0]);
                            const fileInfo = maintenanceHelper.fileExport(queryStrings, data);

                            // fileInfo.then((createdFile) => {
                            //     //console.log(createdFile)
                            //     reply.send({ url: createdFile.fileName });

                            // }).catch((error) => {
                            //     //console.log(error);
                            // })

                            fileInfo
                                .then((createdFile) => {
                                    const stream = fs.createReadStream(createdFile.savePath, 'binary');

                                    reply.header('Content-Type', 'application/pdf');
                                    reply.send(stream).type('application/pdf').code(200);
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
            }
        }
    });
    next();
};

module.exports.autoPrefix = '/v1';
