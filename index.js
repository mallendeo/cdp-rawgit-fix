#!/usr/bin/env node

'use strict'

const { request, dom } = require('fs-request-cache')
const cheerio = require('cheerio')
const Parallel = require('async-parallel')
const getUrls = require('get-urls')

const rawGit2jsDelivr = require('./rawgit2jsdelivr')
const { getTTL } = require('./helpers')

const [, , USER] = process.argv
if (!USER) throw 'username is required! try `cdp-rawgit-fix username`'

const HOST = 'rawgit.com'

const getAllPens = async (page = 1, list = []) => {
  console.log('Getting pens list: page', page)

  const data = await request(
    `https://codepen.io/${USER}/pens/popular/grid/${page}/?grid_type=list`,
    { json: true, ttl: getTTL() }
  )

  const $ = cheerio.load(data.page.html)
  const items = $('.item-in-list-view')
  const pens = items
    .map((index, item) => {
      const link = $(item).find('.title a')
      const likes = $(item)
        .find('.stat-value:last-of-type')
        .text()
        .trim()
        .replace(/[\.\,]/g, '')

      return {
        href: link.attr('href'),
        title: link.text().trim(),
        likes: Number(likes)
      }
    })
    .get()

  const all = [...list, ...(pens || [])]

  if (items.length) {
    return getAllPens(page + 1, all)
  }

  return all
}

// run
;(async () => {
  const allPens = await getAllPens()
  let curr = 0

  try {
    const filtered = (await Parallel.map(
      allPens,
      async pen => {
        const $ = await dom(pen.href, { ttl: getTTL() })
        console.log(`📝 Got pen (${++curr} of ${allPens.length}):`, pen.title)

        const enc = $('#init-data').val()
        const json = JSON.parse(enc)
        const { html, css, js, head, resources } = JSON.parse(json.__item)

        const allUrls = [
          ...resources.map(r => r.url.toLowerCase()),
          ...getUrls(html || ''),
          ...getUrls(css || ''),
          ...getUrls(js || ''),
          ...getUrls(head || '')
        ]

        return { ...pen, allUrls }
      },
      5
    )).filter(pen => pen.allUrls.some(url => url.toLowerCase().includes(HOST)))

    console.log('✅ Got all pens!')

    console.log(filtered.length, 'pens found with rawgit links')
    console.log(filtered.map(pen => pen.href).join('\n'))
    console.log('==')
    console.log('getting working links from jsdelivr...')

    await Parallel.map(
      filtered,
      async pen => {
        let newUrls = []
        const rawgitUrls = pen.allUrls.filter(url =>
          url.toLowerCase().includes(HOST)
        )

        for (const url of rawgitUrls) {
          const newUrl = await rawGit2jsDelivr(url)
          console.log('✅ URL fix found for', pen.title)
          console.log('\tPen url: ', pen.href)
          console.log('\tOld lib url: ', url)
          console.log('\tNew lib url: ', newUrl)
          newUrls.push(newUrl)
        }

        return { ...pen, newUrls }
      },
      1
    )
  } catch (err) {
    console.log(err.message)
    for (const item of err.list) {
      console.log(item.message)
    }
  }
})()
