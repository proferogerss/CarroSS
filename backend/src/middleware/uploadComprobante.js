const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Carpeta física donde se guardan las imágenes. Fuera del control de git
// (agrégala a .gitignore): backend/uploads/comprobantes/
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'comprobantes');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const nombre = `comprobante_${req.params.creditoId}_${Date.now()}${ext}`;
    cb(null, nombre);
  },
});

function filtroImagen(req, file, cb) {
  const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp'];
  if (!tiposPermitidos.includes(file.mimetype)) {
    return cb(new Error('Solo se permiten imágenes JPG, PNG o WEBP.'));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter: filtroImagen,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB, suficiente para una foto de comprobante
});

module.exports = { upload, UPLOAD_DIR };
