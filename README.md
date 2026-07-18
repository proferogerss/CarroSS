# CarroSS

Aplicación web para el registro de pagos, préstamos y la amortización del crédito de un carro.
Construida con la misma arquitectura que Bitácora SS: **Node.js + Express + PostgreSQL** en el
backend y **React + Vite + TailwindCSS** en el frontend, con autenticación JWT.

## Funcionalidades

1. **Dashboard** — saldo actual, próxima mensualidad, meses pagados/restantes, total de
   intereses proyectados, total aportado (pagos + préstamos + mensualidades) y estado de
   mantenimiento del carro.
2. **Pagos y préstamos** — registro de pagos iniciales (enganche, licencia, etc.) y de
   préstamos/adelantos relacionados al carro, igual que las hojas "Inicio" y "Agregar" del Excel.
3. **Amortización** — tabla de amortización completa (sistema francés, igual que la hoja
   "Amortizacion" del Excel), con:
   - Marcado de mensualidades como pagadas.
   - Registro de eventos reales: **pago extra a capital** (acorta el plazo) y
     **seguro financiado** (lo alarga), igual que las hojas de simulación del Excel.
   - **Simulador** de escenarios hipotéticos sin afectar el crédito real.
   - Exportar la tabla a Excel (con ExcelJS, no con `xlsx`).
4. **Servicios** — bitácora de mantenimiento (kilometraje, costo, próximo servicio).

## Estructura

```
CarroSS/
  backend/    Node.js + Express + PostgreSQL + JWT
  frontend/   React + Vite + TailwindCSS
```

---

## 1. Instalación en Windows (desarrollo)

```powershell
cd E:\sistemassimples\proyectosclaude\  # o la ruta que prefieras
# copia la carpeta CarroSS aquí

cd CarroSS\backend
copy .env.example .env
# edita .env con tus datos reales de PostgreSQL y un JWT_SECRET largo
npm install

cd ..\frontend
copy .env.example .env
npm install
```

### Crear la base de datos (local o en el servidor)

```sql
CREATE DATABASE carro_ss OWNER appuser;
```

```powershell
psql -h 127.0.0.1 -U appuser -d carro_ss -f backend\src\migrations\001_init.sql
```

### Crear el usuario administrador

Edita `ADMIN_NOMBRE`, `ADMIN_EMAIL` y `ADMIN_PASSWORD` en `backend/.env`, luego:

```powershell
cd backend
npm run seed
```

### Correr en desarrollo

```powershell
# Terminal 1
cd backend
npm run dev

# Terminal 2
cd frontend
npm run dev
```

Frontend en `http://localhost:5174`, backend en `http://localhost:3001`.

### Subir a GitHub

```powershell
cd E:\sistemassimples\proyectosclaude\CarroSS
git init
git add .
git commit -m "CarroSS: version inicial"
git branch -M main
git remote add origin https://github.com/proferogerss/CarroSS.git
git push -u origin main
```

(En cambios futuros: `git add .` → `git commit -m "descripción"` → `git push origin main`)

---

## 2. Despliegue en el servidor Hetzner (178.104.243.176)

### Primera vez

```bash
cd /var/www
git clone https://github.com/proferogerss/CarroSS.git
cd CarroSS

# Base de datos
sudo -u postgres createdb carro_ss -O appuser
psql -h 127.0.0.1 -U appuser -d carro_ss -f backend/src/migrations/001_init.sql

# Backend
cd backend
cp .env.example .env
nano .env   # datos reales de PostgreSQL, JWT_SECRET, y credenciales del admin
npm install --omit=dev
npm run seed

pm2 start src/server.js --name carross-backend --cwd /var/www/CarroSS/backend
pm2 save

# Frontend
cd ../frontend
cp .env.example .env
nano .env    # normalmente déjalo vacío si usas el mismo dominio con Nginx
npm install
npm run build
```

### Nginx (nuevo dominio o subdominio, ej. carro.sistemsimples.com)

```nginx
server {
    listen 80;
    server_name carro.sistemsimples.com;

    location / {
        root /var/www/CarroSS/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        client_max_body_size 10M;
        proxy_request_buffering off;
        proxy_read_timeout 120s;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/carross /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Recuerda apuntar el subdominio en Cloudflare al túnel/IP correspondiente, igual que
`app.sistemsimples.com`.

### Actualizaciones (flujo estándar)

**Windows → push:**
```powershell
cd E:\sistemassimples\proyectosclaude\CarroSS
git add .
git commit -m "descripción del cambio"
git push origin main
```

**Servidor — full (backend + frontend):**
```bash
cd /var/www/CarroSS && git pull origin main && \
cd backend && npm install --omit=dev && cd .. && \
cd frontend && npm install && npm run build && cd .. && \
pm2 restart carross-backend
```

**Servidor — solo backend:**
```bash
cd /var/www/CarroSS && git pull origin main && pm2 restart carross-backend
```

**Servidor — con migración SQL nueva:**
```bash
cd /var/www/CarroSS && git pull origin main && \
psql -h 127.0.0.1 -U appuser -d carro_ss -f backend/src/migrations/NNN_nombre.sql && \
cd frontend && npm run build && cd .. && pm2 restart carross-backend
```

### PM2 útil

```bash
pm2 status
pm2 logs carross-backend --lines 30
pm2 restart carross-backend --update-env   # recargar .env
```

---

## 3. Cómo funciona el motor de amortización

`backend/src/utils/amortizacion.js` replica exactamente las fórmulas del Excel original
(sistema francés, tasa mensual = tasa anual / 12). Fue validado contra los valores reales
del archivo `CarroSS.xlsx` (pago base, tabla mes a mes, totales, y ambos escenarios de
simulación) antes de integrarse a la API.

- **Pago extra a capital**: se suma al capital de ese mes; la mensualidad base no cambia,
  así que el plazo se acorta.
- **Seguro financiado**: se suma al saldo insoluto antes de calcular el interés de ese mes;
  la mensualidad base no cambia, así que el plazo se alarga.

Estos eventos se pueden **simular** (`POST /api/creditos/:id/simular`, no se guarda nada) o
**aplicar de verdad** al crédito (`POST /api/creditos/:id/eventos`), y la tabla de
amortización se recalcula siempre a partir de los eventos reales guardados en la base de
datos — nunca se guardan montos fijos, todo se recalcula.

## 4. Datos de ejemplo

El Excel `CarroSS.xlsx` que compartiste (Renault Kwid 2023, financiado 134,116 a 30% anual
en 72 meses) puedes darlo de alta directamente desde la pantalla "Datos del crédito" al
entrar por primera vez a la aplicación.
