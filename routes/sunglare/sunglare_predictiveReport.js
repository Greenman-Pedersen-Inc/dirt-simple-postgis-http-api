// sunglare_predictiveReport: Generates a report for the sunglare module

const burgerHelper = require('../../helper_functions/sunglare_helperFunctions');

// *---------------*
// route query
// *---------------*
const sql = (params, query) => {
    var locationClause = burgerHelper.CreateLocationClause(query);
    var filterClause = burgerHelper.CreateFilterClause(query);

    var sqlQuery = `
    SELECT DISTINCT UPPER(public.srilookupname.name), accidents.* FROM
    (
        SELECT calc_sri, 
        ROUND(FLOOR(calc_milepost * 10) / 10, 1) AS milepost,
        CONCAT(CAST (ROUND(FLOOR(calc_milepost * 10) / 10, 1) AS DECIMAL(5,2)), ' - ', ROUND(FLOOR(calc_milepost * 10) / 10, 1) + .09) AS mp_range,
        SUM(CASE WHEN severity_rating5 = '05' THEN 1 ELSE 0 END) fatal,
        SUM(CASE WHEN severity_rating5 = '04' THEN 1 ELSE 0 END) incapacitated,
        SUBSTRING ( acc_time, 1, 2 ) crash_hr
        FROM 
        sunglare.ard_accidents_sunglare
        WHERE year BETWEEN ${query.startYear} AND ${query.endYear}  
        ${locationClause !== "" ? ` AND ${locationClause}` : ''}
        ${filterClause !== "" ? ` AND ${filterClause}` : ''}        
        GROUP BY calc_sri, calc_milepost, crash_hr
    ) accidents
    LEFT JOIN public.srilookupname ON public.srilookupname.stndrd_rt_id = accidents.calc_sri
    WHERE fatal > 0 OR incapacitated > 0 
    ORDER BY fatal DESC, incapacitated DESC LIMIT 25;
    `

    console.log(sqlQuery);
    return sqlQuery;
}

// *---------------*
// route schema
// *---------------*

const schema = {
    description: 'Generates a report based on the module type: Weather or Sunglare.',
    tags: ['sunglare'],
    summary: 'Generates a report based on the module type: Weather or Sunglare.',
    querystring: burgerHelper.GetQueryStrings()
}

// *---------------*
// create route
// *---------------*

const text = `
SELECT DISTINCT UPPER(public.srilookupname.name), accidents.* FROM
(
    SELECT calc_sri,
    ROUND(FLOOR(calc_milepost * 10) / 10, 1) AS milepost,
    CONCAT(CAST (ROUND(FLOOR(calc_milepost * 10) / 10, 1) AS DECIMAL(5,2)), ' - ', ROUND(FLOOR(calc_milepost * 10) / 10, 1) + .09) AS mp_range,
    COUNT(ard_accidents_sunglare.crashid)
    ,SUM(CASE WHEN road_horiz_align_code = '01' THEN 1 ELSE 0 END) STRAIGHT,
    SUM(CASE WHEN road_horiz_align_code = '02' THEN 1 ELSE 0 END) CURVED_LEFT,
    SUM(CASE WHEN road_horiz_align_code = '03' THEN 1 ELSE 0 END) CURVED_RIGHT,
    SUM(CASE WHEN road_horiz_align_code NOT IN ('01', '02', '03') OR road_horiz_align_code IS NULL THEN 1 ELSE 0 END) NA, SUM(CASE WHEN severity_rating5 = '05' THEN 1 ELSE 0 END) fatal,
    SUM(CASE WHEN severity_rating5 = '04' THEN 1 ELSE 0 END) incapacitated,
    SUM(CASE WHEN severity_rating5 = '03' THEN 1 ELSE 0 END) mod_inj
    FROM
    sunglare.ard_accidents_sunglare
    WHERE year BETWEEN 2015 AND 2020
    AND calc_milepost IS NOT NULL


    GROUP BY calc_sri, calc_milepost
) accidents
LEFT JOIN public.srilookupname ON public.srilookupname.stndrd_rt_id = accidents.calc_sri


 ORDER BY count DESC  LIMIT 25
;

SELECT DISTINCT UPPER(public.srilookupname.name), accidents.* FROM
(
    SELECT calc_sri,
    ROUND(FLOOR(calc_milepost * 10) / 10, 1) AS milepost,
    CONCAT(CAST (ROUND(FLOOR(calc_milepost * 10) / 10, 1) AS DECIMAL(5,2)), ' - ', ROUND(FLOOR(calc_milepost * 10) / 10, 1) + .09) AS mp_range,
    COUNT(ard_accidents_sunglare.crashid)
    ,SUM(CASE WHEN road_grade_code = '04' THEN 1 ELSE 0 END) LVL,
    SUM(CASE WHEN road_grade_code = '05' THEN 1 ELSE 0 END) DOWN_HILL,
    SUM(CASE WHEN road_grade_code = '06' THEN 1 ELSE 0 END) UP_HILL,
    SUM(CASE WHEN road_grade_code = '07' THEN 1 ELSE 0 END) HILL_CREST,
    SUM(CASE WHEN road_grade_code = '08' THEN 1 ELSE 0 END) SAG,
    SUM(CASE WHEN road_grade_code NOT IN ('08', '07', '06', '05', '04') OR road_grade_code IS NULL THEN 1 ELSE 0 END) NA, SUM(CASE WHEN severity_rating5 = '05' THEN 1 ELSE 0 END) fatal,
    SUM(CASE WHEN severity_rating5 = '04' THEN 1 ELSE 0 END) incapacitated,
    SUM(CASE WHEN severity_rating5 = '03' THEN 1 ELSE 0 END) mod_inj
    FROM
    sunglare.ard_accidents_sunglare
    WHERE year BETWEEN 2015 AND 2020
    AND calc_milepost IS NOT NULL


    GROUP BY calc_sri, calc_milepost
) accidents
LEFT JOIN public.srilookupname ON public.srilookupname.stndrd_rt_id = accidents.calc_sri


 ORDER BY count DESC  LIMIT 25
;
`

module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/sunglare/predictive-report',
        schema: schema,
        handler: function (request, reply) {
            fastify.pg.connect(onConnect);

            function onConnect(err, client, release) {
                var reportData = {};

                if (err) return reply.send({
                    "statusCode": 500,
                    "error": "Internal Server Error",
                    "message": "unable to connect to database server"
                })

                var reportQueries = burgerHelper.GetReportQueries(request.query);
                for (let index = 0; index < reportQueries.length; index++) {
                    const queryObj = reportQueries[index];
                    console.log(queryObj);
                    client.query(queryObj, (err, res) => {
                        if (err) {
                            console.log(err.stack)
                        } else {
                            console.log(res.rows[0]);
                            console.log(queryObj.name + " finito! \n");
                            reportData[queryObj.name] = res.rows;

                            if (index === reportQueries.length - 1) {
                                release();
                                reply.send(err || reportData);

                                // console.log("Resulting report data: ");
                                // console.log(reportData);
                            }
                        }
                    });
                } 

                client.on("error", function (err) {
                    callBack("DB selection failed. Error Message: " + err, null);
                    return;
                });




                //   client.query(
                //     sql(request.params, request.query),
                //     function onResult(err, result) {
                //       release()
                //       reply.send(err || {"TimeData": result.rows})
                //     }
                //   )


            }
        }
    })
    next()
}

module.exports.autoPrefix = '/v1'