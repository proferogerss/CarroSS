require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
require('express-async-errors');

const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const creditoRoutes = require('./routes/creditoRoutes');
const pagoRoutes = require('./routes/pagoRoutes');
const prestamoRoutes = require('./routes/prestamoRoutes');
const servicioRoutes = require('./routes/servicioRoutes');
const eventoRoutes = require('./routes/eventoRoutes');
const semanaRoutes = require('./routes/semanaRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true, servicio: 'carross-backend' }));

app.use('/api/auth', authRoutes);
app.use('/api/creditos', creditoRoutes);
app.use('/api/pagos', pagoRoutes);
app.use('/api/prestamos', prestamoRoutes);
app.use('/api/servicios', servicioRoutes);
app.use('/api/eventos', eventoRoutes);
app.use('/api/semanas', semanaRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`CarroSS backend escuchando en el puerto ${PORT}`);
});
