require('dotenv').config();
const connectDB = require('./config/db');
const createApp = require('./app');

const PORT = process.env.PORT || 4000;

async function start() {
  await connectDB();
  const app = createApp();

  app.listen(PORT, () => {
    console.log(`[server] Atlas Spaces API escuchando en el puerto ${PORT}`);
  });
}

start().catch((err) => {
  console.error('[server] Error fatal al iniciar el servidor:', err);
  process.exit(1);
});
