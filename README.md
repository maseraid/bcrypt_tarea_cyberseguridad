# Login con bcrypt (Node.js + PostgreSQL)

Aplicación web sencilla de **registro e inicio de sesión**. Está hecha solo con Node.js (módulo `http` nativo, sin frameworks), usa PostgreSQL como base de datos y **bcrypt** para hashear las claves.

En la base de datos solo se guarda la clave hasheada, nunca la clave en texto plano. Así se ve un registro:

| id | usuario | clave |
|----|---------|-------|
| 1  | prueba  | `$2b$10$02vbW87i/WjRD0LNIiJJP.D1RVrdmqONVY3I0eE3HgOIN7Ov/PFE2` |

---

## Índice

1. [Requisitos](#1-requisitos)
2. [Descargar el proyecto](#2-descargar-el-proyecto)
3. [Instalar las dependencias](#3-instalar-las-dependencias)
4. [Crear la base de datos](#4-crear-la-base-de-datos)
5. [Crear las tablas (ejecutar el script SQL)](#5-crear-las-tablas-ejecutar-el-script-sql)
6. [Configurar el archivo .env](#6-configurar-el-archivo-env)
7. [Ejecutar el proyecto](#7-ejecutar-el-proyecto)
8. [Probar el proyecto](#8-probar-el-proyecto)
9. [Solución de problemas](#9-solución-de-problemas)
10. [Estructura del proyecto](#10-estructura-del-proyecto)

---

## 1. Requisitos

| Programa | Versión | Para qué | Descarga |
|----------|---------|----------|----------|
| **Node.js** | 20.6 o superior (se recomienda la LTS) | Ejecutar el servidor | https://nodejs.org |
| **PostgreSQL** | 12 o superior | Base de datos | https://www.postgresql.org/download/ |
| **pgAdmin 4** | Cualquiera | Administrar la base de datos de forma visual (opcional pero recomendado) | https://www.pgadmin.org/download/ |
| **Git** | Cualquiera | Descargar el proyecto (opcional) | https://git-scm.com |

> El instalador de PostgreSQL para Windows ya incluye pgAdmin 4. Durante la instalación te pedirá una **clave para el usuario `postgres`**. Apúntala, porque la necesitarás en el archivo `.env`.

Para comprobar que Node.js está instalado, abre una terminal y ejecuta:

```bash
node -v
```

```bash
npm -v
```

Si `node -v` muestra `v20.6.0` o un número mayor, todo está bien.

---

## 2. Descargar el proyecto

**Opción A: con Git**

```bash
git clone <URL-DEL-REPOSITORIO>
```

```bash
cd bcryp_project
```

**Opción B: como ZIP**

1. Descarga el `.zip` del proyecto (desde el repositorio o desde donde se haya compartido).
2. Descomprímelo.
3. Abre una terminal **dentro de la carpeta del proyecto**, la que contiene `package.json`.

---

## 3. Instalar las dependencias

Dentro de la carpeta del proyecto, ejecuta:

```bash
npm install
```

Este comando lee `package.json` y `package-lock.json`, y descarga en la carpeta `node_modules` las mismas versiones con las que se desarrolló el proyecto:

| Paquete | Para qué sirve |
|---------|----------------|
| `bcrypt` | Hashear las claves al registrarse y compararlas al iniciar sesión |
| `pg` | Conectarse a PostgreSQL desde Node.js |

> No hace falta instalar nada más. El servidor web usa el módulo `http` que ya trae Node, y el archivo `.env` se lee con la opción `--env-file` de Node, sin paquetes extra.

---

## 4. Crear la base de datos

Elige **una** de estas opciones.

### Opción A: con pgAdmin (recomendada)

1. Abre **pgAdmin 4**.
2. En el panel izquierdo (*Object Explorer*), despliega **Servers** y entra en tu servidor (por ejemplo, *PostgreSQL 17*). Te pedirá la clave del usuario `postgres`.

   > **Si tu servidor es remoto** (otra máquina, un VPS o la nube) y aún no aparece en pgAdmin, añádelo primero:
   > 1. Clic derecho en **Servers** → **Register** → **Server...**
   > 2. Pestaña **General** → *Name*: el nombre que quieras (por ejemplo, `Mi servidor`).
   > 3. Pestaña **Connection**:
   >    - *Host name/address*: la IP o el dominio del servidor
   >    - *Port*: `5432` (o el que use tu servidor)
   >    - *Maintenance database*: `postgres`
   >    - *Username*: tu usuario (por ejemplo, `postgres`)
   >    - *Password*: tu clave
   > 4. Pulsa **Save**.

3. Clic derecho en **Databases** → **Create** → **Database...**
4. En la pestaña **General**:
   - **Database:** `login_db`
   - **Owner:** `postgres` (o tu usuario)
5. Pulsa **Save**.

`login_db` aparecerá en la lista de bases de datos.

### Opción B: con la consola `psql`

```bash
psql -U postgres -h localhost
```

Dentro de `psql`:

```sql
CREATE DATABASE login_db;
\q
```

### Opción C: con Docker (si no quieres instalar PostgreSQL)

```bash
docker run --name login-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=login_db -p 5432:5432 -d postgres:17
```

Este comando arranca PostgreSQL con la base `login_db` ya creada (usuario `postgres`, clave `postgres`).

> Puedes ponerle a la base el nombre que quieras. Lo único importante es que sea **el mismo** que escribas en `PGDATABASE` dentro del `.env` (paso 6).

---

## 5. Crear las tablas (ejecutar el script SQL)

El script está en **[`db/database.sql`](db/database.sql)** y crea la tabla `usuarios`:

```sql
CREATE TABLE IF NOT EXISTS usuarios (
    id       INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario  VARCHAR(50)  NOT NULL UNIQUE,
    clave    VARCHAR(60)  NOT NULL   -- hash bcrypt: siempre 60 caracteres
);
```

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | `INTEGER IDENTITY` | Identificador que PostgreSQL genera solo (1, 2, 3...) |
| `usuario` | `VARCHAR(50) UNIQUE` | Nombre de usuario. No se puede repetir |
| `clave` | `VARCHAR(60)` | **Hash bcrypt** de la clave. Un hash bcrypt siempre mide 60 caracteres |

> ⚠️ **Importante:** el script debe ejecutarse **dentro de la base `login_db`**, no en la base `postgres`. Es el error más común.

### Opción A: con pgAdmin

1. En el panel izquierdo, haz **clic en la base `login_db`** para seleccionarla.
2. En el menú superior, abre **Tools** → **Query Tool**. Se abrirá un editor de SQL.
3. Comprueba que en la parte de arriba del Query Tool aparece **`login_db/postgres@...`**. Si sale otra base, cierra la pestaña y vuelve al paso 1.
4. Carga el script de una de estas dos formas:
   - Pulsa el icono de **carpeta (Open File)** y elige `db/database.sql`, o
   - Abre `db/database.sql` en un editor de texto, copia su contenido y pégalo en el Query Tool.
5. Pulsa **Execute** (el botón ▶) o la tecla **F5**.
6. Abajo debería aparecer: `CREATE TABLE ... Query returned successfully`.
7. Para verlo: en el panel izquierdo, despliega `login_db` → **Schemas** → **public** → **Tables**. Si no aparece `usuarios`, haz clic derecho en **Tables** → **Refresh**.

### Opción B: con `psql`

Desde la carpeta del proyecto:

```bash
psql -U postgres -h localhost -d login_db -f db/database.sql
```

Si ya estás dentro de `psql`:

```sql
\c login_db
\i db/database.sql
```

### Opción C: con Docker

Si usaste el contenedor del paso 4, ejecuta desde la carpeta del proyecto:

```bash
docker exec -i login-postgres psql -U postgres -d login_db < db/database.sql
```

### Comprobar que la tabla existe

En pgAdmin (Query Tool sobre `login_db`) o en `psql`:

```sql
SELECT * FROM usuarios;
```

Debe devolver una tabla vacía con las columnas `id`, `usuario` y `clave`.

> El script usa `CREATE TABLE IF NOT EXISTS`, así que puedes ejecutarlo varias veces sin riesgo: si la tabla ya existe, no hace nada.

### (Opcional) Usar un usuario con permisos limitados

Por seguridad, conviene que la aplicación **no** se conecte como `postgres` (el superusuario), sino con un usuario que solo pueda leer e insertar en `usuarios`. Ejecuta esto en el Query Tool de `login_db`:

```sql
CREATE USER login_app WITH PASSWORD 'una_clave_segura';
GRANT CONNECT ON DATABASE login_db TO login_app;
GRANT USAGE ON SCHEMA public TO login_app;
GRANT SELECT, INSERT ON usuarios TO login_app;
```

Después, en el `.env`, usa `PGUSER=login_app` y `PGPASSWORD=una_clave_segura`.

---

## 6. Configurar el archivo .env

El archivo `.env` guarda los datos de conexión a PostgreSQL. **No se sube al repositorio** (está en `.gitignore`) porque contiene tu clave.

1. Copia la plantilla `.env.example` con el nombre `.env`:

   **Windows (PowerShell):**
   ```powershell
   Copy-Item .env.example .env
   ```

   **Linux / macOS / Git Bash:**
   ```bash
   cp .env.example .env
   ```

   (También puedes copiar y renombrar el archivo desde el explorador de archivos.)

2. Abre `.env` con cualquier editor y escribe los datos de tu servidor:

   ```env
   PGHOST=localhost
   PGPORT=5432
   PGDATABASE=login_db
   PGUSER=postgres
   PGPASSWORD=tu_clave_aqui
   PORT=3000
   ```

| Variable | Qué poner | Ejemplo |
|----------|-----------|---------|
| `PGHOST` | Dirección del servidor PostgreSQL. `localhost` si está en tu PC; la IP o el dominio si es remoto | `localhost`, `192.168.1.50`, `db.miservidor.com` |
| `PGPORT` | Puerto de PostgreSQL | `5432` |
| `PGDATABASE` | Nombre de la base que creaste en el paso 4 | `login_db` |
| `PGUSER` | Usuario de PostgreSQL | `postgres` o `login_app` |
| `PGPASSWORD` | Clave de ese usuario | La que pusiste al instalar PostgreSQL |
| `PORT` | Puerto donde se abrirá la aplicación web | `3000` |

> **¿Dónde veo estos datos en pgAdmin?** Clic derecho en tu servidor → **Properties** → pestaña **Connection**. Ahí aparecen el host, el puerto y el usuario.

> No pongas comillas ni espacios alrededor del `=`. Si tu clave tiene caracteres especiales como `#`, enciérrala entre comillas: `PGPASSWORD="mi#clave"`.

---

## 7. Ejecutar el proyecto

Desde la carpeta del proyecto:

```bash
npm start
```

Si todo está bien configurado, verás:

```
Conectado a PostgreSQL (login_db@localhost)
Servidor listo en http://localhost:3000
```

Abre en el navegador: **http://localhost:3000**

Para detener el servidor, pulsa `Ctrl + C` en la terminal.

> `npm start` ejecuta internamente `node --env-file=.env server.js`. Al arrancar, el servidor comprueba la conexión con PostgreSQL. Si falla, muestra el motivo y se detiene (ver [Solución de problemas](#9-solución-de-problemas)).

---

## 8. Probar el proyecto

### Prueba desde el navegador

1. **Registrar un usuario**
   - Abre la pestaña **Registrarse**.
   - Escribe un usuario (mínimo 3 caracteres) y una clave (mínimo 6 caracteres) dos veces.
   - Pulsa **Registrar**. Debe aparecer *"Usuario registrado correctamente"* en verde.

2. **Iniciar sesión**
   - Abre la pestaña **Iniciar sesión**.
   - Escribe el mismo usuario y la misma clave, y pulsa **Entrar**.
   - Debe aparecer la pantalla *"Bienvenido, \<usuario\>"*.

3. **Casos de error que conviene comprobar**

| Prueba | Resultado esperado |
|--------|--------------------|
| Registrar un usuario que ya existe | *"El usuario ya existe"* |
| Registrarse con claves que no coinciden | *"Las claves no coinciden"* |
| Registrarse con una clave de menos de 6 caracteres | El formulario no deja enviar |
| Iniciar sesión con la clave incorrecta | *"Usuario o clave incorrectos"* |
| Iniciar sesión con un usuario que no existe | *"Usuario o clave incorrectos"* (el mismo mensaje, para no revelar qué usuarios existen) |

### Comprobar que la clave se guarda hasheada

En pgAdmin (Query Tool sobre `login_db`):

```sql
SELECT id, usuario, clave FROM usuarios;
```

En la columna `clave` debe aparecer algo como:

```
$2b$10$02vbW87i/WjRD0LNIiJJP.D1RVrdmqONVY3I0eE3HgOIN7Ov/PFE2
```

Cómo se lee ese hash:

| Parte | Significado |
|-------|-------------|
| `$2b$` | Versión del algoritmo bcrypt |
| `10$` | Coste (2¹⁰ = 1024 rondas de cálculo) |
| Los 22 caracteres siguientes | La **sal** aleatoria |
| El resto (31 caracteres) | El hash de la clave |

> Si registras **dos usuarios con la misma clave**, sus hashes serán **distintos**, porque cada uno tiene su propia sal aleatoria. Es una buena prueba para demostrar cómo funciona bcrypt.

### Prueba desde la terminal (opcional)

Con el servidor encendido, en otra terminal:

**Registrar:**
```bash
curl -X POST http://localhost:3000/api/registro -H "Content-Type: application/json" -d "{\"usuario\":\"prueba\",\"clave\":\"secreta123\"}"
```

**Iniciar sesión:**
```bash
curl -X POST http://localhost:3000/api/login -H "Content-Type: application/json" -d "{\"usuario\":\"prueba\",\"clave\":\"secreta123\"}"
```

Respuestas esperadas:

```json
{"ok":true,"mensaje":"Usuario registrado correctamente"}
{"ok":true,"mensaje":"Bienvenido, prueba","usuario":"prueba"}
```

---

## 9. Solución de problemas

| Mensaje / síntoma | Causa | Solución |
|-------------------|-------|----------|
| `No se pudo conectar a PostgreSQL: ECONNREFUSED` | PostgreSQL no está encendido, o el host o el puerto están mal | Comprueba que el servicio de PostgreSQL está activo y revisa `PGHOST` y `PGPORT` |
| `password authentication failed for user "..."` | Usuario o clave incorrectos | Revisa `PGUSER` y `PGPASSWORD` en `.env` |
| `database "login_db" does not exist` | No se creó la base, o el nombre no coincide | Repite el paso 4, o corrige `PGDATABASE` |
| La página muestra *"Error interno del servidor"* y en la terminal sale `relation "usuarios" does not exist` | No se ejecutó el script SQL, o se ejecutó en otra base | Repite el paso 5 **sobre `login_db`** |
| `no pg_hba.conf entry for host ...` | El servidor remoto no acepta conexiones desde tu IP | En el servidor, añade tu IP en `pg_hba.conf` y revisa `listen_addresses` en `postgresql.conf` |
| Error que menciona **SSL** | El servidor remoto exige conexión cifrada | Hay que activar la opción `ssl` en el `Pool` de `server.js` |
| `node: bad option: --env-file=.env` | Versión de Node.js antigua | Actualiza Node.js a la 20.6 o superior |
| `.env: not found` | No existe el archivo `.env` | Haz el paso 6 |
| `Cannot find module 'bcrypt'` o `'pg'` | No se instalaron las dependencias | Ejecuta `npm install` |
| `EADDRINUSE: address already in use :::3000` | El puerto 3000 ya está ocupado | Cierra el otro proceso o cambia `PORT` en `.env` |

---

## 10. Estructura del proyecto

```
bcryp_project/
├── db/
│   └── database.sql      # Script que crea la tabla usuarios
├── public/
│   └── index.html        # Interfaz gráfica (login y registro)
├── server.js             # Servidor Node: rutas, bcrypt y conexión a PostgreSQL
├── .env.example          # Plantilla de configuración (sí se sube)
├── .env                  # Tu configuración real (NO se sube)
├── .gitignore            # Excluye node_modules y .env
├── package.json          # Dependencias y comando "npm start"
├── package-lock.json     # Versiones exactas de las dependencias
└── README.md             # Este archivo
```

### Rutas del servidor

| Método | Ruta | Qué hace |
|--------|------|----------|
| `GET` | `/` | Muestra la interfaz gráfica |
| `POST` | `/api/registro` | Valida los datos, hashea la clave con `bcrypt.hash()` y guarda el usuario |
| `POST` | `/api/login` | Busca el usuario y compara la clave con `bcrypt.compare()` |

### Cómo funciona bcrypt en el proyecto

- **Registro:** `bcrypt.hash(clave, 10)` genera una sal aleatoria y calcula el hash. Lo que se guarda en la base es ese hash de 60 caracteres, que ya lleva la sal dentro.
- **Login:** `bcrypt.compare(claveEscrita, hashGuardado)` saca la sal del hash guardado, vuelve a calcular el hash de la clave escrita y compara los dos. La clave original nunca se puede recuperar a partir del hash.
- **Límite:** bcrypt solo usa los primeros 72 bytes de la clave, por eso el servidor rechaza claves más largas.
