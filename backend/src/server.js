const createApp = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 4000;

async function startServer() {
  try {
    await connectDB();

    const app = createApp();

    app.listen(PORT, () => {
      console.log(`Servidor escuchando en el puerto ${PORT}`);
    });
  } catch (error) {
    console.error('No fue posible iniciar el servidor:', error);
    process.exit(1);
  }
}

startServer();