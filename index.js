require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser')
const dns = require('dns')
const url = require('url')
const mongoose = require('mongoose')
const app = express();

mongoose.connect(process.env.DATABASE_URL, {useNewUrlParser: true, useUnifiedTopology: true})

const { Schema, model } = mongoose

const shortUrlSchema = {
  original_url: String,
  short_url: Number,
}

const URLs = model('URLs', shortUrlSchema)

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.use(bodyParser.urlencoded({extended: !1}))

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

const getAllUrls = () => {
  URLs

  const savedUrls = URLs.find().select({original_url: 1, short_url: 1}).exec()

  return savedUrls.then((data) => (data))
}

const generateUniqueRandomNumber = async () => {
  const randomNumber = Math.floor(Math.random() * 10000)

  const savedUrls = await getAllUrls()

  for(let url of savedUrls) {
    if (url.short_url === randomNumber) {
      return generateUniqueRandomNumber()
    }
  }

  return randomNumber
}

app.post('/api/shorturl', async (req, res) => {
  const original_url = req.body?.url

  const savedUrls = await getAllUrls()

  for(let url of savedUrls) {
    if (url.original_url === original_url) {
      return res.json({ original_url: url.original_url, short_url: url.short_url})
    }
  }

  const isNotValid = !original_url.includes('http')

  if(isNotValid) {
    return res.json({error: 'invalid url'})
  }

  const urlObject = new url.URL(original_url)

  dns.lookup(urlObject.hostname, async (err, address, family) => {
    if(err) {
      return res.json({error: 'invalid url'})
    }
    const short_url = await generateUniqueRandomNumber()
   
    savedUrls.push({original_url, short_url})

    await URLs.create(savedUrls)

    return res.json({original_url, short_url})
  })
})

app.get('/api/shorturl/:shortUrl', async (req, res) => {
  const short_url = req.params.shortUrl

  const savedUrls = await getAllUrls()

  for(let url of savedUrls){
    if(url.short_url === parseInt(short_url)) {
      return res.redirect(url.original_url)
    }
  }

  return res.json({error: 'short url not found'})
})

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
