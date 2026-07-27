const mongoose = require('mongoose');

/**
 * Establece la conexión con MongoDB usando la URI definida en variables de entorno.
 * Se detiene el proceso si la conexión falla, ya que la API no puede operar sin base de datos.
 */
async function connectDB() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error('MONGO_URI no está definida en las variables de entorno');
  }

  mongoose.set('strictQuery', true);

  await mongoose.connect(uri);

  console.log(`[db] Conectado a MongoDB: ${mongoose.connection.name}`);

  mongoose.connection.on('error', (err) => {
    console.error('[db] Error de conexión MongoDB:', err.message);
  });

  return mongoose.connection;
}

module.exports = connectDB;
