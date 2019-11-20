#!/usr/bin/env node

const express = require('express')
const request = require('sync-request')
const format = require('dateformat')
const Podcast = require('podcast')

const app = express()
const port = process.env.PORT || 3000

format.i18n = {
  dayNames: [
    'zo', 'ma', 'di', 'wo', 'do', 'vr', 'za',
    'zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'
  ],
  monthNames: [
    'jan', 'feb', 'mar', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec',
    'januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'
  ],
  timeNames: [
    'a', 'p', 'am', 'pm', 'A', 'P', 'AM', 'PM'
  ]
}

function fetch (showId) {
  const state = JSON.parse(request('GET', 'https://state.radioplus.be').body.toString())
  const match = state.find(station => station.data.ondemandnew.find(show => show.collectionID === showId))

  if (!match) {
    return null
  }

  return {
    station: match.channel.info,
    show: match.data.ondemandnew.find(show => show.collectionID === showId)
  }
}

app.use(express.urlencoded({ extended: true }))

app.get('/:showId', function (req, res) {
  console.log(`${format(new Date())}: Fetching details.`)

  const data = fetch(req.params.showId)
  const feed = new Podcast({
    title: `${data.show.name}`,
    description: `${data.show.description} | ${data.station.name} - ${data.station.description}`,
    generator: 'radiopluscast',
    feedUrl: req.protocol + '://' + req.get('host') + req.originalUrl,
    siteUrl: data.station.website,
    imageUrl: data.show.image,
    docs: 'https://github.com/Qrivi/radiopluscast/blob/master/README.md',
    author: 'VRT',
    managingEditor: data.station.name,
    copyright: `VRT © ${format(new Date(), 'yyyy')}`,
    language: 'nl',
    categories: ['Music', 'Entertainment'],
    ttl: 60
  })

  data.show.items.forEach(episode => {
    feed.addItem({
      title: `${episode.title} - ${format(episode.startTime, 'dddd d mmmm')}`,
      description: `Aflevering van ${format(episode.startTime, 'dddd d mmmm yyyy')}. ${episode.description}`,
      url: episode.stream,
      author: `${data.station.name}, ${episode.name}, VRT`,
      date: episode.startTime
    })
  })

  res.set('Content-Type', 'application/rss+xml; charset=UTF-8')
    .status(200)
    .send(feed.buildXml())
})

app.listen(port, function () {
  console.log(`Started on port ${port}`)
})
