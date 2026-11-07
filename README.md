# 🌴 Viajes La Nena - Sistema Integral de Gestión Turística

Plataforma empresarial para la gestión, logística y administración de agencias de viajes y turismo. Desarrollada con arquitectura desacoplada, seguridad por roles (**RBAC**), control financiero multimoneda en tiempo real, auditoría inmutable y soporte integral para la identificación y abordaje de pasajeros venezolanos e internacionales.

---

## 🏗️ Arquitectura del Sistema

* **Lógica del Negocio & Backend:** **Python** (FastAPI, SQLModel, SQLAlchemy, PyJWT, Passlib con Bcrypt).
* **Base de Datos Relacional:** **PostgreSQL** con integridad referencial, transacciones ACID y trazabilidad.
* **Interfaz de Usuario (Frontend):** **React** (Vite, Lucide React, Recharts, Axios, diseño moderno responsivo y modular).

---

## 📋 Requisitos Previos y Versiones Exactas

Para instalar y ejecutar este proyecto en otra computadora sin ningún error, asegúrate de contar con los siguientes programas instalados y configurados en las variables de entorno (`PATH`):

| Componente | Versión Exacta Utilizada | Versión Mínima Requerida | Enlace Oficial de Descarga |
| :--- | :--- | :--- | :--- |
| **Python** | `3.11.9` | `3.10.x` o superior | [python.org/downloads](https://www.python.org/downloads/) |
| **Node.js** | `v22.14.0` | `v18.0.0` o superior (LTS) | [nodejs.org](https://nodejs.org/) |
| **npm** | `10.9.2` | `9.0.0` o superior | Incluido con Node.js |
| **PostgreSQL** | `16.4` | `15.x` o `16.x` | [postgresql.org/download](https://www.postgresql.org/download/) |
| **Git** | `2.40+` | `2.x` | [git-scm.com](https://git-scm.com/) |

> [!IMPORTANT]
> **En Windows:** Al instalar Python, marca obligatoriamente la casilla **"Add python.exe to PATH"**. Al instalar PostgreSQL, recuerda la contraseña que le asignes al superusuario `postgres` (por defecto el sistema viene configurado con `12348765`, pero puedes cambiarla en el archivo `.env`).

---

## 🚀 Guía Paso a Paso para Desplegar en Otra Computadora

### Paso 1: Clonar el Repositorio

Abre una terminal (PowerShell, Símbolo del Sistema o Bash) y ejecuta:

```bash
git clone https://github.com/Settqlon/viajes-nena.git
cd viajes-nena
```

---

### Paso 2: Configurar la Base de Datos en PostgreSQL

1. Abre la herramienta interactiva de PostgreSQL (`psql`) o tu cliente gráfico preferido (como **pgAdmin** o **DBeaver**):
   ```bash
   psql -U postgres
   ```
2. Crea la base de datos para el sistema:
   ```sql
   CREATE DATABASE viajes_lanena;
   \q
   ```

3. **Restaurar datos y estructura completa (Recomendado):**
   El proyecto incluye una copia de respaldo lista en `database/backup_inicial.sql` con todas las tablas, relaciones, usuarios y datos de prueba:
   
   * **En Windows (PowerShell / CMD):**
     ```bash
     psql -U postgres -d viajes_lanena -f database\backup_inicial.sql
     ```
   * **En Linux / macOS:**
     ```bash
     psql -U postgres -d viajes_lanena -f database/backup_inicial.sql
     ```

*(Si prefieres iniciar con una base de datos vacía, sáltate la restauración: FastAPI creará todas las tablas automáticamente al iniciarse).*

---

### Paso 3: Configurar el Entorno del Backend (Python)

1. En la raíz del proyecto, crea un entorno virtual de Python:
   ```bash
   python -m venv venv
   ```

2. Activa el entorno virtual:
   * **En Windows (PowerShell):**
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
     *(Si PowerShell bloquea la activación, ejecuta una vez como Administrador: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`)*
   * **En Windows (CMD):**
     ```cmd
     .\venv\Scripts\activate.bat
     ```
   * **En Linux / macOS:**
     ```bash
     source venv/bin/activate
     ```

3. Actualiza el gestor de paquetes e instala todas las dependencias exactas:
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

4. Configura las variables de entorno:
   Copia el archivo `.env.example` y nómbralo `.env`:
   * **En Windows:**
     ```cmd
     copy .env.example .env
     ```
   * **En Linux / macOS:**
     ```bash
     cp .env.example .env
     ```
   Abre el archivo `.env` y ajusta la contraseña de tu PostgreSQL si es diferente de `12348765`:
   ```ini
   DATABASE_URL=postgresql+psycopg2://postgres:TU_PASSWORD@localhost:5432/viajes_lanena
   SECRET_KEY=clave_secreta_super_segura_viajes_la_nena_2026
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=480
   ```

5. *(Solo si no restauraste el archivo `backup_inicial.sql`)*: Genera el usuario administrador y datos iniciales:
   ```bash
   python crear_admin.py
   python datos_prueba.py
   ```

---

### Paso 4: Configurar el Frontend (React + Vite)

1. Abre una nueva pestaña o ventana de la terminal y entra a la carpeta `frontend`:
   ```bash
   cd frontend
   ```

2. Instala todos los paquetes de Node:
   ```bash
   npm install
   ```

---

### Paso 5: Iniciar los Servicios

Debes mantener dos terminales abiertas:

#### Terminal 1: Servidor Backend (FastAPI)
Desde la raíz del proyecto con el entorno virtual activo (`venv`):
```bash
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
* Backend activo en: [http://127.0.0.1:8000](http://127.0.0.1:8000)
* Documentación interactiva Swagger: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

#### Terminal 2: Servidor Frontend (Vite)
Desde la carpeta `frontend`:
```bash
npm run dev
```
* Frontend activo en: [http://localhost:5173](http://localhost:5173)

---

## 👥 Cuentas de Acceso Preconfiguradas

El sistema cuenta con control de acceso basado en roles (**RBAC**):

| Rol | Correo Electrónico | Contraseña | Permisos y Alcance |
| :--- | :--- | :--- | :--- |
| **👑 Administrador** | `admin@viajesnena.com` | `admin12345` | Control total: Estadísticas, Finanzas, Catálogo, Ventas, Usuarios, Procesos y Auditoría. |
| **🧭 Operador** | `operador@viajesnena.com` | `operador12345` | Logística en Ruta: Catálogo, Viajes, Manifiesto de Abordaje, Costos Operativos e Incidencias. |
| **💼 Vendedor** | `vendedor@viajesnena.com` | `vendedor12345` | Ventas y Atención: Clientes, Catálogo, Reservas, Manifiesto, Abonos y Pagos Multidivisa. |

---

## 🗺️ Mapa de Módulos del Sistema

1. **General**:
   * `Estadísticas`: Indicadores clave (KPIs), ingresos brutos, reservas activas y balance general.
2. **Catálogo & Rutas**:
   * `Catálogo Turístico`: Módulo unificado de Destinos y Paquetes con vista de pestañas para crear y gestionar la oferta turística.
   * `Viajes Programados`: Planificación de salidas, asignación de unidades de transporte (autobús o avión), cupos y fechas.
3. **Ventas & Pasajeros**:
   * `Clientes`: Registro de viajeros con cédula venezolana (`V-`, `E-`), pasaporte o menores sin documento (`MENOR-V...`).
   * `Reservas`: Consola de monitoreo de reservas, filtros rápidos por cobranza, liquidación de saldo en 1 clic y comprobante para WhatsApp.
   * `Manifiesto de Abordaje`: Manifiesto oficial de pasajeros por viaje ordenado por número de asiento (`💺 #01, #02...`), con control de asistencia en ruta e impresión.
   * `Pagos & Cobranzas`: Registro de pagos multidivisa (USD, Bs BCV, COP) con soporte para Efectivo, Pago Móvil, Zelle, Transferencia, Bancolombia y Nequi.
4. **Finanzas & Rentabilidad**:
   * `Control Financiero`: Consolidado gerencial que calcula en tiempo real:
     $$\text{Ganancia Neta} = \text{Ingresos Brutos} - \text{Costos Operativos} - \text{Inconvenientes en Ruta}$$
     Permite registrar gastos del viaje, incidencias mecánicas o de peaje y consultar el margen de rentabilidad (%).
5. **Administración & Sistema**:
   * `Usuarios y Roles`: Alta, baja lógica y asignación de roles.
   * `Procesos`: Control de flujos operativos y seguimiento de procesos internos.
   * `Auditoría`: Trazabilidad inmutable de todas las acciones realizadas en la base de datos.

---

## ❓ Solución de Problemas Frecuentes

### 1. Error de PowerShell: *"La ejecución de scripts está deshabilitada en este sistema"*
Si al ejecutar `activate` o `npm` recibes un error de `PSSecurityException`:
1. Abre PowerShell como Administrador.
2. Ejecuta:
   ```powershell
   Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
   ```
3. Presiona `S` y vuelve a tu terminal normal.

### 2. Error de conexión con PostgreSQL: *"password authentication failed for user 'postgres'"*
Verifica que la contraseña en tu archivo `.env` coincida exactamente con la que configuraste al instalar PostgreSQL en esa máquina.

### 3. Puerto 8000 o 5173 ocupado
Si otro programa está usando el puerto:
* Para cambiar el puerto del backend: `uvicorn main:app --port 8080 --reload` (y actualiza la URL en `frontend/src/servicios/api.js`).
* Para el frontend, Vite ofrecerá automáticamente el siguiente puerto libre (ejemplo: `http://localhost:5174`).

### 4. Error al instalar `psycopg2-binary` en Linux
En distribuciones basadas en Debian/Ubuntu, instala las librerías de desarrollo de PostgreSQL antes del `pip install`:
```bash
sudo apt-get update
sudo apt-get install python3-dev libpq-dev
```

---

## 📄 Licencia
Propiedad de **Viajes La Nena**. Todos los derechos reservados.
