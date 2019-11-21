#!/usr/bin/env node

const express = require('express')
const request = require('sync-request')
const format = require('dateformat')
const Podcast = require('podcast')

const app = express()
const port = process.env.PORT || 3000

format.i18n = {
  dayNames: [
    'zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag',
    'Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'
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

function msToHMS (ms) {
  let seconds = ms / 1000

  const hours = parseInt(seconds / 3600)
  seconds = seconds % 3600
  const minutes = parseInt(seconds / 60)
  seconds = seconds % 60

  return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

app.use(express.urlencoded({ extended: true }))

app.get('/:showId', function (req, res) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(req.params.showId)) {
    return res.status(400)
      .json({
        status: 400,
        error: 'Bad Request',
        message: 'The show UUID is malformatted'
      })
  }

  const data = fetch(req.params.showId)

  if (!data || !data.show) {
    return res.status(404)
      .json({
        status: 404,
        error: 'Not Found',
        message: 'The show UUID does not exist'
      })
  }

  const feed = new Podcast({
    title: `${data.show.name}`,
    siteUrl: data.station.website,
    imageUrl: data.show.image,
    description: `Herbeluister de meest recente afleveringen van ${data.show.name} op ${data.station.name} - ${data.station.description}. ${data.show.description} `,
    itunesSummary: `Herbeluister de meest recente afleveringen van ${data.show.name} op ${data.station.name} - ${data.station.description}. ${data.show.description} `,
    itunesSubtitle: data.show.description,
    author: data.station.name,
    itunesAuthor: data.station.name,
    itunesOwner: 'VRT',
    generator: 'radiopluscast',
    feedUrl: req.protocol + '://' + req.get('host') + req.originalUrl,
    docs: 'https://github.com/Qrivi/radiopluscast/blob/master/README.md',
    copyright: `VRT © ${format(new Date(), 'yyyy')}`,
    language: 'nl-be',
    categories: ['Music'],
    ttl: 60
  })

  data.show.items.forEach(episode => {
    episode.endTime = new Date(episode.startTime)
    episode.endTime.setMilliseconds(episode.endTime.getMilliseconds() + episode.duration)
    episode.startTime = new Date(episode.startTime)
    episode.startTime.setMilliseconds(episode.startTime.getMilliseconds() + 1000)

    feed.addItem({
      title: `${format(episode.startTime, 'dddd d mmmm, H:MM')} - ${format(episode.endTime, 'H:MM')}`,
      url: episode.stream,
      date: episode.startTime,
      description: `Herbeluister ${data.show.name} van ${format(episode.startTime, 'ddd d mmmm yyyy')}. ${episode.description}`,
      itunesSummary: `Herbeluister ${data.show.name} van ${format(episode.startTime, 'ddd d mmmm yyyy')}. ${episode.description}`,
      itunesDuration: msToHMS(episode.duration),
      author: data.station.name,
      enclosure: {
        url: episode.stream,
        type: 'audio/mpeg',
        length: episode.duration
      }
    })
  })

  // res.set('Content-Type', 'text/xml; charset=UTF-8')
  res.set('Content-Type', 'application/rss+xml; charset=UTF-8')
    .status(200)
    .send(feed.buildXml())
})

app.listen(port, function () {
  console.log(`Started on port ${port}`)
})
