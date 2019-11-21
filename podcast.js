#!/usr/bin/env node

const express = require('express')
const request = require('sync-request')
const format = require('dateformat')
const Podcast = require('podcast')

const app = express()
const port = process.env.PORT || 3000

// Configure date-format
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

// Fetches Radioplus data for a certain programme
function fetch (programmeId) {
  const state = JSON.parse(request('GET', 'https://state.radioplus.be').body.toString())
  const match = state.find(station => station.data.ondemandnew.find(programme => programme.collectionID === programmeId))

  if (!match) {
    return null
  }

  return {
    station: match.channel.info,
    programme: match.data.ondemandnew.find(programme => programme.collectionID === programmeId)
  }
}

// Converts a time period in ms to H:MM:SS format
function msToHMS (ms) {
  let seconds = ms / 1000

  const hours = parseInt(seconds / 3600)
  seconds = seconds % 3600
  const minutes = parseInt(seconds / 60)
  seconds = seconds % 60

  return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

// Set up Express
app.use(express.urlencoded({ extended: true }))

app.get('/:programmeId', function (req, res) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(req.params.programmeId)) {
    return res.status(400)
      .json({
        status: 400,
        error: 'Bad Request',
        message: 'The programme UUID is malformatted'
      })
  }

  const data = fetch(req.params.programmeId)

  if (!data || !data.programme) {
    return res.status(404)
      .json({
        status: 404,
        error: 'Not Found',
        message: 'The programme UUID does not exist'
      })
  }

  const feed = new Podcast({
    title: `${data.programme.name}`,
    siteUrl: data.station.website,
    imageUrl: data.programme.image,
    description: `Herbeluister de meest recente afleveringen van ${data.programme.name} op ${data.station.name} - ${data.station.description}. ${data.programme.description} `,
    itunesSummary: `Herbeluister de meest recente afleveringen van ${data.programme.name} op ${data.station.name} - ${data.station.description}. ${data.programme.description} `,
    itunesSubtitle: data.programme.description,
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

  data.programme.items.forEach(episode => {
    episode.endTime = new Date(episode.startTime)
    episode.endTime.setMilliseconds(episode.endTime.getMilliseconds() + episode.duration)
    episode.startTime = new Date(episode.startTime)
    episode.startTime.setMilliseconds(episode.startTime.getMilliseconds() + 1000)

    feed.addItem({
      title: `${format(episode.startTime, 'dddd d mmmm, HH:MM')} - ${format(episode.endTime, 'HH:MM')}`,
      url: episode.stream,
      date: episode.startTime,
      description: `Herbeluister ${data.programme.name} van ${format(episode.startTime, 'ddd d mmmm yyyy')}. ${episode.description}`,
      itunesSummary: `Herbeluister ${data.programme.name} van ${format(episode.startTime, 'ddd d mmmm yyyy')}. ${episode.description}`,
      itunesDuration: msToHMS(episode.duration),
      author: data.station.name,
      enclosure: {
        url: episode.stream,
        type: 'audio/mpeg',
        length: episode.duration
      }
    })
  })

  if (req.query.format && req.query.format.toLowerCase() === 'json') {
    return res.status(200)
      .json({
        status: 200,
        error: 'OK',
        data
      })
  }

  // res.set('Content-Type', 'text/xml; charset=UTF-8')
  res.set('Content-Type', 'application/rss+xml; charset=UTF-8')
    .status(200)
    .send(feed.buildXml())
})

app.listen(port, function () {
  console.log(`Started on port ${port}`)
})
