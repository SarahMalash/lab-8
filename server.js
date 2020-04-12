'use strict';
require('dotenv').config();
const express = require('express');
const app = express();
const PORT = process.env.PORT || 4000;
const cors = require('cors');
const superagent = require('superagent')
const pg = require('pg');
console.log(process.env.DATABASE_URL);

const client = new pg.Client(process.env.DATABASE_URL);


app.use(cors());

app.get('/', (request, response) => {
    response.status(200).send('Home Page');
  });