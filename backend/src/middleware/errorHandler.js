// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error(err);
  const status = err.status || 500;
  const mensaje = err.expose ? err.message : 'Error interno del servidor.';
  res.status(status).json({ error: mensaje });
}

function notFound(req, res) {
  res.status(404).json({ error: 'Ruta no encontrada.' });
}

module.exports = { errorHandler, notFound };
