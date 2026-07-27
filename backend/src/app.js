const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  return app;
}

module.exports = createApp;