// readMaintenanceData: queries accident data between a time frame for NJDOT Maintenance for insurance claims

const burgerHelper = require('../../helper_functions/maintenance_helperFunctions');

// *---------------*
// route query
// *---------------*
const sql = (query) => {
    // --- QUERY crash data based on time frame
    let accidentQuery =
        `
        SELECT  
        dln AS "DLN",
        year AS "YEAR",
        acc_case AS "CASE #",
        road_sys_code AS "ROAD SYSTEM CODE",
        mun_cty_co AS "COUNTY",
        mun_mu AS "MUNICIPALITY",
        cast(acc_date as char(11)) AS "CRASH DATE",
        dept_name AS "DEPARTMENT NAME",
        dept_num AS "DEPARTMENT #",
        coalesce(station, '') AS "STATION",
        location AS "LOCATION",
        coalesce(cast(route_num as char(4)),'') AS "ROUTE",
        sri AS "SRI",
        coalesce(cast(milepost as char(7)),'') AS "MILEPOST",
        coalesce(xstreet_name, '') AS "CROSS STREET",
        coalesce(is_ramp, '') AS "IS RAMP?",
        coalesce(ramp_route, '') AS "RAMP ROUTE",
        coalesce(state, '') AS "STATE",
        coalesce(first_event_code, '') AS "FIRST EVENT CODE",
        coalesce(second_event_code, '') AS "SECOND EVENT CODE",
        coalesce(third_event_code, '') AS "THIRD EVENT CODE",
        coalesce(fourth_event_code, '') AS "FOURTH EVENT CODE",
        coalesce(most_harm_event_code, '') AS "MOST HARMFUL EVENT CODE",
        coalesce(other_prop_damage, '') AS "OTHER PROPERTY DAMAGE",
        severity_rating5 AS "SEVERITY RATING"
        FROM maintenance.report_data
        WHERE acc_date between '${query.startDate}' and '${query.endDate}' ${query.limit ? `LIMIT ${query.limit}` : '' }
      ;`;
    return accidentQuery;
}

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
            default: '02-01-2017'
        },
        limit: {
            type: 'string',
            description: 'LIMIT [amount]'
        },
        fileFormat: {
            type: 'string',
            description: 'csv, xlsx, or pdf',
            default: "pdf"
        }
    },
}

// *---------------*
// create route
// *---------------*
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/maintenance/report',
        schema: schema,
        handler: function (request, reply) {
            fastify.pg.connect(onConnect)

            function onConnect(err, client, release, queryString) {
                var queryString = request.query
                if (queryString.startDate == undefined || queryString.endDate == undefined) return reply.send({
                    "statusCode": 500,
                    "error": "Internal Server Error",
                    "message": "need start or end date"
                });
                if (queryString.fileFormat == undefined) return reply.send({
                    "statusCode": 500,
                    "error": "Internal Server Error",
                    "message": "need file format"
                });

                client.query(
                    sql(request.query),
                    function onResult(err, result) {
                        release();
                        var queryStrings = request.query;    // queryStrings.startDate, queryStrings.endDate
                        console.log(queryStrings);
                        var savePath = burgerHelper.FileExport(queryStrings, result);
                        reply.send(savePath);
                    }
                );
            }
        }
    })
    next();
}

module.exports.autoPrefix = '/v1'
