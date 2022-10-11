// get_signals: gets signal data based on internal ID

// *---------------*
// route query
// *---------------*
const sql = (params, query) => {
    var sql = `
    SELECT 
    cs,
    sri,
    rt,
    mp,
    mun_cty_co,
    mun_mu,
    sig,
    type,
    intersection,
    tr_reg,
    el_reg,
    signal_offset,
    notes,
    row_1,
    row_2,
    row_3,
    row_4,
    via,
    internal_id,
    agreement,
    ad_12_1,
    ad_12_2,
    ad_12_3,
    ad_12_4,
    ad_12_5,
    ad_12_6,
    ad_12_7,
    ad_12_8,
    ad_12_9,
    ad_12_10,
    plan_1,
    plan_date,
    directive,
    lat,
    long,
    acc,
    draw,
    tm,
    cd,
    mn,
    prefix,
    search,
    plan_2,
    plan_3,
    plan_4,
    plan_5,
    plan_6,
    plan_7,
    plan_8,
    plan_9,
    plan_10,
    signal_timer,
    child_record,
    internal_id
    FROM signals.signals_data WHERE internal_id = ${query.signalId}
    `;
    return sql;
};

// *---------------*
// route schema
// *---------------*
const schema = {
    description: "gets signal data based on internal ID",
    tags: ['signals'],
    summary: "gets signal data based on internal ID",
    querystring: {
        signalId: {
            type: 'string',
            description: 'Internal ID of a signal',
            example: '763'
        }
    }
};

// *---------------*
// create route
// *---------------*
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/signals/get-signal-data',
        schema: schema,
        preHandler: fastify.auth([fastify.verifyToken]),
        handler: function (request, reply) {
            request.tracker = new fastify.RequestTracker(
                request.headers.credentials,
                'signals',
                'get_signal_data',
                JSON.stringify(request.query),
                reply
            );

            function onConnect(err, client, release) {
                request.tracker.start();

                if (err) {
                    request.tracker.error(err);
                    release();
                    reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'unable to connect to database server'
                    });
                }
                else if (request.query.signalId == undefined) {
                    reply.code(400).send('need signal ID');
                    release();
                    request.tracker.error('need signal ID');
                } 
                else {
                    try {
                        client.query(sql(request.params, request.query), function onResult(err, result) {
                            if (err) {
                                reply.code(500).send(err);
                                request.tracker.error(err);
                                release();
                            }
                            else if (result && result.rows) {
                                request.tracker.complete();
                                reply.send(result.rows);
                                release();
                            }
                            else {
                                reply.code(204);
                                release();
                            }
                        });
                    } 
                    catch (error) {
                        request.tracker.error(error);
                        reply.send({
                            statusCode: 500,
                            error: error,
                            message: request
                        });
                        release();
                    }
                }

            }

            fastify.pg.connect(onConnect);
        }
    });
    next();
};

module.exports.autoPrefix = '/v1';
