// get_cluster_detail: Gets all cases within a crash cluster
const { transcribeKeysArray } = require('../../helper_functions/code_translations/translator_helper');
const { makeCrashFilterQuery } = require('../../helper_functions/crash_filter_helper');

// *---------------*
// route query
// *---------------*
const sql = (query) => {
        const accidentsTableName = 'ard_accidents_geom_partition';
        let whereClause = `${query.filter ? ` ${query.filter}` : ''}`;
        
        if (query.selectedfilters) {
            const parsed_filter = JSON.parse(query.selectedfilters);
            const filter = makeCrashFilterQuery(parsed_filter, accidentsTableName);
            whereClause = filter.whereClause;
        }

        const njtr1Root = 'https://voyagernjtr1.s3.amazonaws.com/';
        const sql = `
            with crash_data as (
                SELECT *
                FROM ard_accidents_geom_partition
                WHERE ST_Intersects(geom, ST_Transform(ST_TileEnvelope(${query.z}, ${query.x}, ${query.y}), 4326)) -- z,x,y
                -- Optional filter for the query input (selectedFilters)
                ${whereClause ? ` AND ${whereClause}` : ''}
            ), crash_count as (
                select count(*)
                from crash_data
                union all
                select ${query.numclusters} -- num_clusters
            ), cluster_crash_ids as(
                SELECT
                    crashid
                FROM
                (
                    SELECT 
                        crashid,
                        ST_ClusterKMeans(geom, (select min(count) from crash_count)::INTEGER) OVER() AS kmean,
                        ST_Centroid(geom) as geom_center
                    FROM crash_data
                ) tsub
                where kmean = ${query.clusternumber} -- cluster_number
            )

            select 
                crashid, 
                acc_case,
                sri,
                milepost,
                mun_cty_co,
                mun_mu,
                acc_dow,
                crash_type,
                -- dln,
                environ_cond_code,
                light_cond_code,
                no_injured,
                no_killed,
                ped_injured,
                ped_killed,
                ramp_direction,
                road_char_code,
                road_median_code,
                road_surf_code,
                route_sx,
                surf_cond_code,
                tot_veh_involved,
                year
                -- CASE 
                --     WHEN crash_data.directory IS NOT NULL OR directory <> '' THEN CONCAT('${njtr1Root}', directory, '/', dln, '.PDF') 
                --     ELSE NULL
                -- END AS URL
            from cluster_crash_ids
            inner join crash_data
            using (crashid)
        `;

        // console.log(sql);
        return sql;
}

// *---------------*
// route schema
// *---------------*
const schema = {
    description: "Gets all cases within a crash cluster.",
    tags: ['crash-map'],
    summary: "Gets all crashes enumerated within a crash cluster.",
    querystring: {
        z: {
            type: 'integer',
            description: 'Z value of ZXY tile.'
        },
        x: {
            type: 'integer',
            description: 'X value of ZXY tile.'
        },
        y: {
            type: 'integer',
            description: 'Y value of ZXY tile.'
        },
        numclusters: {
            type: 'integer',
            description: 'the number of clusters calculated to create for the zoom level'
        },
        clusternumber: {
            type: 'integer',
            description: 'the cluster number the crash is part of'
        },
        selectedfilters: {
            type: 'string',
            description: 'currently selected filters being used by the map',
        }
    }
}

// *---------------*
// create route
// *---------------*
module.exports = function(fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/crash/cluster',
        schema: schema,
        handler: function(request, reply) {
            function onConnect(err, client, release) {
                if (err) {
                    return reply.send({
                        "statusCode": 500,
                        "error": "Internal Server Error",
                        "message": "unable to connect to database server"
                    });
                } else {
                    if (request.query.z == undefined) {
                        return reply.send({
                            "statusCode": 500,
                            "error": "Internal Server Error",
                            "message": "need a z value"
                        });
                    } else if (request.query.x == undefined) {
                        return reply.send({
                            "statusCode": 500,
                            "error": "Internal Server Error",
                            "message": "need a x value"
                        });
                    } else if (request.query.y == undefined) {
                        return reply.send({
                            "statusCode": 500,
                            "error": "Internal Server Error",
                            "message": "need a y value"
                        });
                    } else if (request.query.numclusters == undefined) {
                        return reply.send({
                            "statusCode": 500,
                            "error": "Internal Server Error",
                            "message": "need a number of clusters value"
                        });
                    } else if (request.query.clusternumber == undefined) {
                        return reply.send({
                            "statusCode": 500,
                            "error": "Internal Server Error",
                            "message": "need the cluter identifier"
                        });
                    } else if (request.query.selectedfilters == undefined) {
                        return reply.send({
                            "statusCode": 500,
                            "error": "Internal Server Error",
                            "message": "need the pertinent filters to apply"
                        });
                    } else {
                        client.query(
                            sql(request.query),
                            function onResult(err, result) {
                                release();

                                if (err){
                                    reply.send(err)
                                } else if (result && result.rows) {
                                    const transcribedObject = transcribeKeysArray(result.rows);

                                    reply.send( { crashes: transcribedObject });
                                } else {
                                    reply.code(204);
                                }
                            }
                        )
                    }
                }
            }

            fastify.pg.connect(onConnect);
        }
    })
    next()
}

module.exports.autoPrefix = '/v1'