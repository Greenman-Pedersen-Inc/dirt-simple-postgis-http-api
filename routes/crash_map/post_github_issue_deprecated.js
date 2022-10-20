// Deprecated - DO NOT USE

// post_github_issue: submits a user feedback form to the github repository: https://github.com/Greenman-Pedersen-Inc/voyager-bug-tracker/issues
const { Octokit } = require('octokit');
const githubName = 'snopachinda-gpi';
const githubRepoOwner = 'Greenman-Pedersen-Inc';
const repoName = 'voyager-bug-tracker';
const imgRepoName = 'voyager-images';
const token = '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';

// *---------------*
// route schema
// *---------------*
const schema = {
    description: 'Create a github issue that is added to the feedback repository.',
    tags: ['crash-map'],
    summary: 'Create a github issue that is added to the feedback repository.',
    params: {
        imageUri: {
            type: 'string',
            description: 'screenshot URI',
            default: ''
        }
    },
    querystring: {
        userName: {
            type: 'string',
            description: 'User email to log into SV'
            // example: 'snopachinda@gpinet.com'
        },
        label: {
            type: 'string',
            description: 'Github category tag: bug, wrong location, help wanted, question, enchancement, other'
            // example: 'bug'
        },
        title: {
            type: 'string',
            description: 'Title of the feedback form'
            // example: 'Incorrect location in NJTR-1 form data'
        },
        openLocation: {
            type: 'string',
            description: 'Location where the user opened the feedback form'
            // example: 'Crash Map'
        },
        description: {
            type: 'string',
            description: 'Detailed description of the feedback or bug'
            // example: 'The county should be Atlantic, not burlington.'
        },
        crashDescription: {
            type: 'string',
            description: 'list of crash IDs'
            // example: '13-19-2021-21-39253-AC, ...'
        },
        filterDescription: {
            type: 'string',
            description: 'human readable string of applied filters'
            // example: 'Date: (2017,2018,2019,2020,2021)'
        },
        crashFilter: {
            type: 'string',
            description:
                'stringified JSON of crash filter object. ex: {"mp_start": "0", "mp_end": "11.6", "year": "2017,2018,2019", "contr_circum_code_vehicles": "01"}'
            // example: '{"mp_start": "0", "mp_end": "11.6", "year": "2017,2018,2019", "contr_circum_code_vehicles": "01"}'
        },
        hasImage: {
            type: 'boolean',
            description: 'a screenshot is attached',
            default: false
        }
        // imageUri: {
        //     type: 'string',
        //     description: 'screenshot URI'
        // }
    }
};

async function authenticateGithub() {
    const octokit = new Octokit({ auth: token });
    const {
        data: { login }
    } = await octokit.rest.users.getAuthenticated();
    return login;
}

async function postImg(message, imageUri) {
    // TODO: updating file requires providing the SHA of existing blob
    //       this is not currently supported
    const octokit = new Octokit({ auth: token });

    const imgName = 'img_' + Date.now() + '.png';
    const content = decodeURI(imageUri);
    const result = await octokit.rest.repos.createOrUpdateFile({
        githubRepoOwner,
        imgRepoName,
        message: message,
        path: imgName,
        content
    });
}

async function postImage(message, imageUri) {
    const headMasterRef = 'heads/master';
    const imgName = 'img_' + Date.now() + '.png';
    const octokit = new Octokit({ auth: token });
    const base64String = decodeURI(imageUri);

    const masterReference = await octokit.rest.git.getRef({
        owner: githubRepoOwner,
        repo: imgRepoName,
        ref: headMasterRef
    });

    const latestCommit = await octokit.rest.git.getCommit({
        owner: githubRepoOwner,
        repo: imgRepoName,
        commit_sha: masterReference.data.object.sha
    });

    const imgBlobRef = await octokit.rest.git.createBlob({
        owner: githubRepoOwner,
        repo: imgRepoName,
        content: base64String,
        encoding: 'base64'
    });

    const newTree = await octokit.request('POST /repos/{owner}/{repo}/git/trees', {
        owner: githubRepoOwner,
        repo: imgRepoName,
        base_tree: latestCommit.sha,
        tree: [
            {
                path: imgName,
                mode: '100644',
                type: 'blob',
                sha: imgBlobRef.sha,
                content: 'content'
            }
        ]
    });

    const newCommit = await octokit.rest.git.createCommit({
        owner: githubRepoOwner,
        repo: imgRepoName,
        tree: newTree.data.sha,
        message: message
    });

    // 5. Update the reference of master branch with the SHA of the commit
    var test = await octokit.rest.git.updateRef({
        owner: githubRepoOwner,
        repo: imgRepoName,
        ref: headMasterRef,
        sha: newCommit.data.sha,
        force: true
    });

    const uploadedImgPath = `https://github.com/${githubRepoOwner}/${imgRepoName}/raw/master/${imgName}`;
    return uploadedImgPath;
}

async function postIssue(
    title,
    label,
    userEmail,
    openedLocation,
    description,
    filterJsonString,
    crashDescription,
    filterDesc,
    img
) {
    const octokit = new Octokit({ auth: token });
    var issueBody = `**User**: ${userEmail} \n **Opened In**: ${openedLocation} \n  **Crash with Error**: ${decodeURI(
        crashDescription
    )} \n **Description**: ${decodeURI(
        description
    )} \n **Filter Description**: ${filterDesc} \n **Filters**: ${filterJsonString} \n \n`;
    if (img) issueBody += `![screenshot](${img})`;
    const posted = await octokit.rest.issues.create({
        owner: githubName,
        repo: repoName,
        title: decodeURI(title),
        body: issueBody,
        labels: [label]
    });
    return posted;
}

// *---------------*
// create route
// *---------------*
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'POST',
        url: '/crash-map/feedback-form',
        schema: schema,
        preHandler: fastify.auth([fastify.verifyToken]),
        handler: function (request, reply) {
            fastify.pg.connect(onConnect);

            function onConnect(err, client, release) {
                if (err)
                    return reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'unable to connect to database server'
                    });

                var queryArgs = request.query;
                var paramArgs = request.params;
                if (queryArgs.hasImage) {
                    var body = JSON.parse(request.body);
                    //console.log(body);
                    request.params['imageUri'] = body['uriImage'];
                }
                if (queryArgs.userName == undefined) {
                    return reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'need user name'
                    });
                }

                authenticateGithub().then((login) => {
                    if (login) {
                        if (paramArgs.imageUri !== '') {
                            postImage(queryArgs.title, paramArgs.imageUri).then((imgResponse) => {
                                console.log(`Created commit at ${imgResponse.data.commit.html_url}`);

                                postIssue(
                                    queryArgs.title,
                                    queryArgs.label,
                                    queryArgs.userName,
                                    queryArgs.openLocation,
                                    queryArgs.description,
                                    queryArgs.crashFilter,
                                    queryArgs.crashDescription,
                                    queryArgs.filterDescription,
                                    imgResponse
                                ).then((response) => {
                                    if (response.status === 201) {
                                        reply.send({ postedIssue: true });
                                    } else reply.send({ postedIssue: false, error: err });
                                });
                            });
                        } else {
                            postIssue(
                                queryArgs.title,
                                queryArgs.label,
                                queryArgs.userName,
                                queryArgs.openLocation,
                                queryArgs.description,
                                queryArgs.crashFilter,
                                queryArgs.crashDescription,
                                queryArgs.filterDescription,
                                undefined
                            ).then((response) => {
                                if (response.status === 201) reply.send({ postedIssue: true });
                                else reply.send({ postedIssue: false, error: err });
                            });
                        }
                    } else {
                        reply.send({ postedIssue: false, error: err });
                    }
                });
            }
        }
    });
    next();
};

module.exports.autoPrefix = '/v1';
