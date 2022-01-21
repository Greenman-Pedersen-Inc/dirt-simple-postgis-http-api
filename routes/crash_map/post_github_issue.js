// post_github_issue: submits a user feedback form to the github repository: https://github.com/Greenman-Pedersen-Inc/voyager-bug-tracker/issues
const { Octokit } = require ("octokit");
const githubName = "snopachinda-gpi";
const repoName = "voyager-bug-tracker";
const imgRepoName = "voyager-images";
const token = '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';


// *---------------*
// route schema
// *---------------*
const schema = {
    description: "Create a github issue that is added to the feedback repository.",
    tags: ['crash-map'],
    summary: "Create a github issue that is added to the feedback repository.",
    querystring: {
        userName: {
            type: 'string',
            description: 'User email to log into SV',
            default: 'snopachinda@gpinet.com'
        },
        category: {
            type: 'string',
            description: 'Github category tag',
            default: 'bug'
        },
        title: {
            type: 'string',
            description: 'Title of the feedback form',
            default: 'test'
        },
        openLocation: {
            type: 'string',
            description: 'Location where the user opened the feedback form',
            default: 'Crash Map'
        },
        description: {
            type: 'string',
            description: 'Detailed description of the feedback or bug',
            default: 'this is a test'
        },
        crashDescription: {
            type: 'string',
            description: 'list of crash IDs',
            default: '**Crash with Error**: 13-19-2021-21-39253-AC'
        },
        filterDescription: {
            type: 'string',
            description: 'human readable string of applied filters',
            default: 'Date: (2017,2018,2019,2020,2021)'
        },
        crashFilter: {
            type: 'string',
            description: 'stringified JSON of crash filter object. ex: {"mp_start": "0", "mp_end": "11.6", "year": "2017,2018,2019", "contr_circum_code_vehicles": "01"}',
            default: '{"mp_start": "0", "mp_end": "11.6", "year": "2017,2018,2019", "contr_circum_code_vehicles": "01"}'
        },
        imageUri: {
            type: 'string',
            description: 'screenshot URI'
        }
    }
}

async function authenticateGithub() {
    const octokit = new Octokit({ auth: token });
    const { data: { login }, } = await octokit.rest.users.getAuthenticated();
    return login;
}

async function postImage(title, imageUri) {
    const headMasterRef = "heads/master";
    const imgName = String.Format("img_{0:yyyy-MM-dd_hh-mm-ss-tt}.png", DateTime.Now);
    const octokit = new Octokit({ auth: token });
    const base64String = decodeURI(imageUri)

    const masterReference = await octokit.rest.git.getRef({
        owner: githubName, 
        repo: imgRepoName, 
        ref: headMasterRef
    });

    const latestCommit = await octokit.rest.git.getCommit({
        owner: githubName,
        repo: imgRepoName,
        commit_sha: masterReference.object.sha
    });

    const imgBlobRef = await octokit.rest.git.createBlob({
        owner: githubName,
        repo: imgRepoName,
        content: base64String,
        encoding: "base64"
    });

    const newTree = await octokit.request('POST /repos/{owner}/{repo}/git/trees', {
        owner: githubName,
        repo: imgRepoName,
        base_tree: latestCommit.sha,
        tree: [
            {
                path: imgName,
                mode: "100644",
                type: 'blob',
                sha: imgBlobRef.sha,
                content: 'content'
            }
        ]
    })

    const newCommit = await octokit.rest.git.createCommit({
        owner: githubName,
        repo: imgRepoName,
        title: title,
        tree: newTree.sha
    })

    await octokit.rest.git.updateRef({
        owner: githubName,
        repo: imgRepoName,
        ref: headMasterRef,
        sha: newCommit.sha,
      });

    const uploadedImgPath = `https://github.com/${githubName}/${imgRepoName}/raw/master/${imgName}`;
    return uploadedImgPath;
}

async function postIssue(title, label, userEmail, openedLocation, description, filterJsonString, crashDescription, filterDesc, img) {
    const octokit = new Octokit({ auth: token });
    const issueBody = `**User**: ${userEmail} \n **Opened In**: ${openedLocation} \n  ${crashDescription} \n **Description**: ${description} \n **Filter Description**: ${filterDesc} \n **Filters**: ${filterJsonString} \n \n`;
    if (img) issueBody += `![screenshot](${img})`;
    const posted = await octokit.rest.issues.create({
        owner: githubName,
        repo: repoName,
        title: title,
        body: issueBody,
        labels: label
    });
    return posted;
}

// *---------------*
// create route
// *---------------*
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'POST',
        url: '/crash-map/post-github-issue',
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
                if (queryArgs.userName == undefined) {
                    return reply.send({
                        "statusCode": 500,
                        "error": "Internal Server Error",
                        "message": "need user name"
                    });
                }

                var img;

                authenticateGithub()
                .then( (login) => {
                    if (login) {
                        if (queryArgs.imageUri) {
                            postImage(queryArgs.title, queryArgs.imageUri)
                            .then((imgResponse) => img = imgResponse);
                        }
                        postIssue(queryArgs.title, queryArgs.label, queryArgs.userName, queryArgs.openLocation, queryArgs.description, queryArgs.crashFilter, queryArgs.crashDescription, queryArgs.filterDescription, img)
                        .then((response) => {
                            if (response.status === 201) reply.send({ postedIssue: true });
                            else reply.send({ postedIssue: false });
                        });
                    }
                    else {
                        reply.send({ postedIssue: false });
                    }
                });
            }
        }
    })
    next()
}

module.exports.autoPrefix = '/v1'