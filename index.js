const assert = require('assert');
const parseUserAgent = require('ua-parser-js');
const truncate = require('truncate');
const table = require('markdown-table');
const axios = require('axios');
const mustache = require('mustache');
const { createError } = require('micro');
const microfeedback = require('microfeedback-core');
const pkg = require('./package.json');

const { GH_TOKEN, REPO } = process.env;
assert(GH_TOKEN, 'GH_TOKEN not set');

const HEADER_WHITELIST = ['user-agent', 'origin', 'referer'];

const makeTable = (headers, entries, sort = true) => {
    if (entries.length === 0) {
        return '';
    }
    const ret = [headers];
    const orderedEntries = sort ? entries.sort((a, b) => a[0] > b[0]) : entries;
    orderedEntries.forEach(each => {
        ret.push(each);
    });
    return table(ret);
};

const issueTemplate = `
:bulb: New feedback was posted{{suffix}}

## Feedback

{{body}}

{{#screenshotURL}}
## Screenshot

![Screenshot]({{&screenshotURL}})
{{/screenshotURL}}

<details><summary>Client Details</summary><p>

{{#headerTable}}
### Headers

{{&headerTable}}
{{/headerTable}}

{{#browserTable}}
### Browser

{{&browserTable}}
{{/browserTable}}

{{#osTable}}
### Operating System

{{&osTable}}
{{/osTable}}

{{#perspectiveTable}}
### Perspective API

{{&perspectiveTable}}
{{/perspectiveTable}}

{{#extraTable}}
### Extra information

{{&extraTable}}
{{/extraTable}}

</p></details>
`;
mustache.parse(issueTemplate);

const makeIssue = ({ body, title, extra, perspective, screenshotURL }, req) => {
    let suffix = '';
    if (req && req.headers.referer) {
        suffix = ` on ${req.headers.referer}`;
    }
    const view = {
        suffix,
        body,
        extra,
        screenshotURL,
        pkg,
    };
    title = title || `${truncate(
        body,
        25
    )}`;
    // Format headers as table
    if (req && req.headers) {
        const entries = Object.entries(req.headers).filter(
            e => HEADER_WHITELIST.indexOf(e[0]) >= 0
        );
        view.headerTable = makeTable(['Header', 'Value'], entries);
    }
    // Format user agent info as table
    if (req && req.headers && req.headers['user-agent']) {
        const userAgent = parseUserAgent(req.headers['user-agent']);
        const browserEntries = Object.entries(userAgent.browser).filter(e => e[1]);
        view.browserTable = makeTable(['Key', 'Value'], browserEntries, false);
        const osEntries = Object.entries(userAgent.os).filter(e => e[1]);
        view.osTable = makeTable(['Key', 'Value'], osEntries, false);
    }
    // Format perspective information as table
    if (perspective) {
        view.perspectiveTable = makeTable(['Key', 'Value'], Object.entries(perspective));
    }
    // Format extra information as table
    if (extra) {
        view.extraTable = makeTable(['Key', 'Value'], Object.entries(extra));
    }
    // TODO: Add spam label if akismet.spam is true
    return { title, body: mustache.render(issueTemplate, view) };
};

function getAllowedRepos() {
    if (!process.env.ALLOWED_REPOS || process.env.ALLOWED_REPOS === '*') {
        return '*';
    }
    return process.env.ALLOWED_REPOS.split(',').map(each => each.trim());
}

async function checkIfTitleExists({ repo, body, token }) {
    const title = body.title
    const githubUrl = 'https://api.github.com/graphql'
    // Your personal access token
    // The Authorization in the header of the request
    const oauth = { Authorization: 'bearer ' + token }
    // The GraphQL query, a string
    const query = `
{
  search(query: "repo:${repo} sort:author-date-desc in:title ${title}", type: ISSUE, first: 100) {
    nodes {
      ... on Issue {
        number
        title
        body
        number
      }
    }
  }
}
`

    // Post request, axios.post() return a Promise
    try {
        return (await axios.post(githubUrl, { query: query }, { headers: oauth })).data.data.search.nodes
    } catch (error) {
    }
    return []
}

const GitHubBackend = async ({ input, perspective, akismet }, req) => {    
    // Match /<username>/<repo>/ in the URL
    // TODO: Allow base64-encoded repo URL
    // const { pathname } = url.parse(req.url);
    // Trim trailing slashes to get GitHub repo
    const repo = REPO//trim(pathname, '/');
    
    const allowedRepos = getAllowedRepos();
    if (allowedRepos !== '*' && allowedRepos.indexOf(repo) === -1) {
        throw createError(400, `Repo "${repo}" not allowed.`);
    }
    const issueURL = `https://api.github.com/repos/${repo}/issues`;
    const { body, title, extra, screenshotURL } = input;    
    const issuesThatAlreadyExist = await checkIfTitleExists({ repo, body, token: GH_TOKEN })
    // if (issuesThatAlreadyExist.length === 0) {
    try {
        const { data } = await axios({
            headers: { "Authorization": `token ${GH_TOKEN}` },
            method: 'POST',
            url: issueURL,
            data: makeIssue({
                body,
                title,
                extra,
                screenshotURL,
                perspective,
                akismet,
            }, req),
        });
        return data;
    } catch (err) {
        
        const { status, data } = err.response;
        console.log({repo,data});
        throw createError(status, data.message, err);
    }
    // }else {
    // todo: add comment
    //     const issueNumber = issuesThatAlreadyExist[0].number

    // }
};

module.exports = microfeedback(GitHubBackend, {
    name: 'github',
    version: pkg.version,
    allowedRepos: getAllowedRepos(),
});
Object.assign(module.exports, { GitHubBackend, makeIssue });
