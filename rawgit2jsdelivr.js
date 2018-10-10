'use strict'

const { request } = require('fs-request-cache')
const { getTTL } = require('./helpers')

// from https://www.jsdelivr.com/js/app.js

const buildJsDelivrLink = (user, repo, version, path) =>
  `https://cdn.jsdelivr.net/gh/${user}/${repo}@${version}/${path}`

const isBranch = async (user, repo, branch) => {
  try {
    const res = await request(
      `https://api.github.com/repos/${user}/${repo}/branches/${branch}`,
      { json: true, ttl: getTTL() }
    )

    return res.commit.sha
  } catch (e) {
    return false
  }
}

const isCommitPrefixOrTag = async (user, repo, sha) => {
  try {
    const res = await request(
      `https://api.github.com/repos/${user}/${repo}/commits/${sha}`,
      { json: true, ttl: getTTL() }
    ).catch(() => false)
    return res.sha.indexOf(sha) === 0 ? res.sha : sha
  } catch (e) {
    return false
  }
}

module.exports = async rawGit => {
  const pattern = /^https?:\/\/(?:cdn\.)?rawgit\.com\/([^/@]+)\/([^/@]+)\/([^/@]+)\/(.*)$/i
  const commitPattern = /^[0-9a-f]{40}$/
  const match = pattern.exec(rawGit)

  if (match) {
    const [, user, repo, version, file] = [...match]
    let sha = void 0

    // gist
    if (version === 'raw') {
      throw 'Sorry, Github Gists are not supported.'
    }

    // full commit hash
    if (commitPattern.test(version)) {
      return buildJsDelivrLink(user, repo, version, file)
    }

    // branch -> convert to commit sha
    if ((sha = await isBranch(user, repo, version))) {
      return buildJsDelivrLink(user, repo, sha, file)
    }

    // tag/commit prefix
    if ((sha = await isCommitPrefixOrTag(user, repo, version))) {
      return buildJsDelivrLink(user, repo, sha, file)
    }
  }

  throw `Sorry, this doesn't look like a valid RawGit link :(`
}
