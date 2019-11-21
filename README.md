# radiopluscast

Simple script that parses the [Radioplus](https://radioplus.be) "state" file and spits out a podcast RSS feed.

![Sample stream as a podcast in Apple Podcasts](https://camo.githubusercontent.com/bd959828e41ae49e6314ffb2efd46dafae2088ae/68747470733a2f2f692e696d6775722e636f6d2f6d76486d3963432e6a7067)

## Setup

```shell
$ node podcast.js
```
and that's it.

## Usage

The script requires the radio programme's UUID in order to decide which entries to generate the podcast of. This UUID is easily derivable from the Radioplus' URL scheme, which is `radioplus.be/#/[station]/herbeluister/[programme-uuid]/[episode-uuid]`. Append the programme's UUID to the address of your radiopluscast instance and you have a URL you can feed (pun intended) to your favorite podcast app, e.g. [https://radiopluscast.herokuapp.com/192587c1-8e98-11e3-b45a-00163edf75b7/](https://radiopluscast.herokuapp.com/192587c1-8e98-11e3-b45a-00163edf75b7/), which is shown in the screenshot above.

*Please fork and deploy to your own heroku instance rather than using my (free) dynos! Thanks!*

## Legal

Please don't take this down, VRT. I just want an easy way to listen to the shows I could not listen to while live, and your own apps are just not that great. Sorry and thanks! ❤️
