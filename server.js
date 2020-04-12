'use strict';
require('dotenv').config();
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
const cors = require('cors');
const superagent = require('superagent');
const pg = require('pg');
console.log(process.env.DATABASE_URL);

const client = new pg.Client(process.env.DATABASE_URL);//add DB



app.use(cors());

app.get('/', (request, response) => {
  response.status(200).send('Home Page');
});
app.get('/location', (request, response) => {
  const city = request.query.city;
  const SQL = 'SELECT * FROM locations WHERE search_query =$1';//select statement to show data in locations table
  const values = [city];
  client
    .query(SQL, values)
    .then((result) => {
      if (result.rows.length > 0) {
        response.status(200).json(result.rows[0]);
      } else {
        superagent(`https://eu1.locationiq.com/v1/search.php?key=${process.env.GEOCODE_API_KEY}&q=${city}&format=json`
        )
          .then((apiResult) => {
            const geoData = apiResult.body;
            const locationData = new Location(city, geoData);
            const SQL = 'INSERT INTO locations (search_query,formatted_query,latitude,longitude)VALUES($1,$2,$3,$4) RETURNING *';//adding data from api to DB
            const values = [
              locationData.search_query,
              locationData.formatted_query,
              locationData.latitude,
              locationData.longitude,
            ];
            client.query(SQL, values).then((rowResult) => {
              console.log(rowResult.rows);
              response.status(200).json(rowResult.rows[0]);
            });
          }).catch((err) => errorHandler(err, request, response));
      }
    }) ;
});
app.get('/weather', weathHandler);
app.get('/trails', trailhandler);

function weathHandler(request, response) {
  superagent(
    `https://api.weatherbit.io/v2.0/forecast/daily?city=${request.query.search_query}&key=${process.env.WEATHER_API_KEY}`
  )
    .then((weatherResponce) => {
      console.log(weatherResponce);
      const weatherSummaries = weatherResponce.body.data.map((day) => {
        return new Weather(day);
      });
      response.status(200).json(weatherSummaries);
    })
    .catch((error1)=> errorHandler(error1, request, response));
}

function trailhandler(request, response) {
  superagent(`https://www.hikingproject.com/data/get-trails?lat=${request.query.latitude}&lon=${request.query.longitude}&maxDistance=400&key=${process.env.TRAIL_API_KEY}`)

    .then((trailResponce) => {
      console.log(trailResponce.body);
      const obj1 = trailResponce.body.trails.map((trailsData)=> {
        return new Trail(trailsData);
      });

      response.status(200).json(obj1);
    })
    .catch((error1)=> errorHandler(error1, request, response));

}




function error1Handler(request, response) {
  response.status(404).send('Page Not Found');
}

function Location(city, geoData) {
  this.search_query = city;
  this.formatted_query = geoData[0].display_name;
  this.latitude = geoData[0].lat;
  this.longitude = geoData[0].lon;
}

function Weather(day) {
  this.forecast = day.weather.description;
  this.time = new Date(day.valid_date).toString().slice(0, 15);
}

function Trail(val) {
  this.name = val.name;
  this.location = val.location;
  this.length = val.length;
  this.stars = val.stars;
  this.star_votes = val.starVotes;
  this.summary = val.summary;
  this.trail_url = val.url;
  this.conditions = val.conditionDetails;
  this.condition_date = val.conditionDate.substring(0, 11);
  this.condition_time = val.conditionDate.substring(11);

}

function errorHandler( error ,request, response) {
  response.status(500).send(error);
}
app.use('*', error1Handler);
client
  .connect()
  .then(() => {
    app.listen(PORT, () =>
      console.log(`port runing ${PORT}`)

    );
  })
  .catch((err) => {
    throw new Error(err);
  });
