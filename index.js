console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
const TeleBot = require('telebot');
const tokens = require('./tokens.json')


const axios = require('axios');
var vega = require('vega')
var sharp = require('sharp')

const cheerio = require('cheerio');


async function idToImg(id) {
  const url = `https://www.imdb.com/title/${id}/episodes/_ajax`
  const htmlFirst = await axios.get(url);
  const $f = await cheerio.load(htmlFirst.data);
  const count = $f('#bySeason option').length
  let data = []
  for (let i = 1; i <= count; i++) {
    const html = await axios.get(url + '?season=' + i);
    const $ = await cheerio.load(html.data);
    $(".list_item").each((i, elem) => {
      data.push({
        name: $(elem).find(".info strong a").text(),
        airdate: $(elem).find(".airdate").text().replace('\n', '').replace('\n', '').replace('            ', '').replace('    ', ''),
        rating: 10 * $(elem).find(".ipl-rating-star__rating").first().text(),
        se: $(elem).find(".image a div").first().text().replace('\n', '').replace('\n', '').replace('\n', '').replace('\n', '').replace('\n', ''),
      })
    })
  }
  var stackedBarChartSpec = {
    $schema: 'https://vega.github.io/schema/vega/v5.json',
    description: 'A basic bar chart example, with value labels shown upon mouse hover.',
    width: 1000,
    height: 300,
    padding: 0,

    data: [
      {
        name: 'table',
        values: data
      }
    ],

    signals: [
      {
        name: 'tooltip',
        value: {},
      }
    ],

    scales: [
      {
        name: 'xscale',
        type: 'band',
        domain: { data: 'table', field: 'se' },
        range: 'width',
        padding: 0,
        round: true
      },
      {
        name: 'yscale',
        domain: { data: 'table', field: 'rating' },
        nice: true,
        range: 'height'
      }
    ],

    axes: [
      { orient: 'bottom', scale: 'xscale' },
      { orient: 'left', scale: 'yscale' }
    ],

    marks: [
      {
        type: 'rect',
        from: { data: 'table' },
        encode: {
          enter: {
            x: { scale: 'xscale', field: 'se' },
            width: { scale: 'xscale', band: 1 },
            y: { scale: 'yscale', field: 'rating' },
            y2: { scale: 'yscale', value: 0 }
          },
          update: {
            fill: { value: 'steelblue' }
          },
        }
      },
      {
        type: 'text',
        encode: {
          enter: {
            align: { value: 'center' },
            baseline: { value: 'bottom' },
            fill: { value: '#333' }
          },
          update: {
            x: { scale: 'xscale', signal: '', band: 0.5 },
            y: { scale: 'yscale', signal: 'tooltip.rating', offset: -2 },
            text: { signal: 'tooltip.rating' },
            fillOpacity: [
              { test: 'datum === tooltip', value: 0 },
              { value: 1 }
            ]
          }
        }
      }
    ]
  }

  var view = new vega
    .View(vega.parse(stackedBarChartSpec))
    .renderer('none')
    .initialize();

  // generating static PNG file from chart
  const svg = await view.toSVG()
  const img = await sharp(Buffer.from(svg))
    .toFormat('png')
    .toBuffer()
  return img

}



const bot = new TeleBot(tokens.telegramBot);


async function getSeriesId(txt) {
  const urlSearch = `https://www.imdb.com/find?q=${txt.replace(new RegExp(' ', 'g'), '+')}`
  const htmlFirst = await axios.get(urlSearch);
  const $f = await cheerio.load(htmlFirst.data);
  const links = $f('.findResult .result_text')
  if (!links.length) return ''
  const filterLinks = links
    .toArray()
    .filter(link => link.children.find(child => child.data && ['TV Series', 'TV Mini Series'].every(key => child.data.includes(key))))
  if (filterLinks.length) {

    const href = filterLinks[0].children.find(child => child.name === 'a').attribs.href.replace('/title/', '')
    return href.substr(0, href.indexOf('/'))

  }
  return links.length
}


bot.on('text', async (msg) => {
  if (['/start'].includes(msg.text)) {
    msg.reply.text(`שלום תרשום שם של סדרה באנגלית ותקבל את הדירוג של כל הפרקים שלה בגרף`)

    return
  }
  try {

    const id = await getSeriesId(msg.text)
    if (!id) {
      msg.reply.text(`לא נמצאה כל תוצאה`)
      return
    }
    const img = await idToImg(id)
    msg.reply.photo(img)
  } catch {
    msg.reply.text(`תקלה`)
  }

});

bot.start()
