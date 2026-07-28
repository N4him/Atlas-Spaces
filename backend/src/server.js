require('dotenv').config();
const connectDB = require('./config/db');
const createApp = require('./app');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 4000;

async function start() {
  await connectDB();
  const app = createApp();

  app.listen(PORT, () => {
    logger.info({ port: PORT }, 'Atlas Spaces API escuchando');
  });
}

start().catch((err) => {
  logger.error({ err }, 'Error fatal al iniciar el servidor');
  process.exit(1);
});
