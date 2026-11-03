# 🌴 Viajes La Nena - Sistema Integral de Gestión Turística

Plataforma integral para la gestión y administración de agencias de turismo y viajes. Desarrollada con arquitectura desacoplada, seguridad por roles (RBAC), control financiero multimoneda en tiempo real y soporte integral para la identificación de pasajeros venezolanos e internacionales.

---

## 🚀 Características Principales

1. **Gestión de Identificación Especial**:
   * Cédulas venezolanas (`V-`, `E-`), Pasaportes (`P-`) y menores de edad sin documento (`MENOR-<doc_representante>-<n>`).
   * Búsqueda inteligente lógica en tiempo real.
   * Expediente histórico del viajero.

2. **Control Multidivisa en Tiempo Real**:
   * Conversión en vivo entre **Dólares (USD)**, **Bolívares (BCV)** y **Pesos Colombianos (COP)**.
   * Barra superior con widget de tasas actualizable en caliente.
   * Métodos de pago: Efectivo, Pago Móvil, Transferencia, Zelle, Nequi y Bancolombia.

3. **Mapa y Croquis Interactivo de Asientos**:
   * **Bus Cama de 2 Pisos** (60 puestos en 4 filas 2x2 con pasillo).
   * **Avión Comercial** (150 puestos en filas 3x3).
   * Asignación visual de puestos, auto-asignación de puestos consecutivos y ficha de inspección de pasajeros.

4. **Seguridad y Control de Acceso por Roles (RBAC)**:
   * **👑 Administrador (`Admin`)**: Control total, estadísticas, finanzas (ganancias netas), gestión de usuarios y auditoría.
   * **🧭 Operador (`Operador`)**: Logística de viajes, catálogo, manifiestos de pasajeros, incidencias en ruta y costos operativos.
   * **💼 Vendedor (`Vendedor`)**: Atención al cliente, reservas, integrantes, pagos, abonos y cotizaciones en catálogo.
   * Simulador de rol en vivo en la barra superior para usuarios administradores.

5. **Cobranzas y WhatsApp**:
   * Semáforo de cuenta regresiva para salidas de viajes.
   * Modal de 1 solo clic para liquidar saldos pendientes.
   * Notificaciones y comprobantes automáticos formateados para WhatsApp.

---

## 🛠️ Tecnologías Utilizadas

* **Backend**: Python 3.11+, FastAPI, SQLModel / SQLAlchemy, PyJWT, Passlib (Bcrypt), Uvicorn.
* **Frontend**: React 18, Vite, Lucide React, Axios, CSS moderno responsivo.
* **Base de Datos**: PostgreSQL 16.

---

## ⚙️ Instalación y Puesta en Marcha

### 1. Clonar el repositorio
```bash
git clone <URL_DEL_REPOSITORIO>
cd proyecto
```

### 2. Backend (FastAPI + PostgreSQL)
```bash
# Crear y activar entorno virtual
python -m venv venv
.\venv\Scripts\activate   # En Windows

# Instalar dependencias
pip install fastapi uvicorn sqlmodel psycopg2-binary passlib bcrypt pyjwt python-multipart requests pydantic[email]

# Inicializar roles y usuarios por defecto
python crear_admin.py

# Iniciar servidor backend
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

### 3. Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```

---

## 👥 Cuentas de Prueba Pre-configuradas

| Rol | Correo Electrónico | Contraseña |
| :--- | :--- | :--- |
| **Administrador** | `admin@viajesnena.com` | `admin12345` |
| **Operador** | `operador@viajesnena.com` | `operador12345` |
| **Vendedor** | `vendedor@viajesnena.com` | `vendedor12345` |

---

## 📄 Licencia
Propiedad de **Viajes La Nena**. Todos los derechos reservados.
