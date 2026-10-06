# Tickets de Stock - Mecano Tools

Sistema web para la gestión de reportes de stock, control de ingresos, productos encontrados y movimientos de inventario. Totalmente compatible con **GitHub Pages**.

---

## 🚀 Despliegue en GitHub Pages

Este proyecto ya está 100% configurado para funcionar en **GitHub Pages** sin configuraciones complejas:

### Método 1: GitHub Actions (Automático - Recomendado)
1. Sube este repositorio a GitHub (rama `main` o `master`).
2. En tu repositorio en GitHub, ve a **Settings** > **Pages** (en el menú lateral izquierdo).
3. En la sección **Build and deployment** > **Source**, selecciona:
   👉 **GitHub Actions**
4. Cada vez que hagas un `git push`, el archivo `.github/workflows/deploy.yml` compilará y publicará la aplicación automáticamente en tu URL de GitHub Pages (`https://<tu-usuario>.github.io/<tu-repo>/`).

---

### Método 2: Despliegue Manual con el comando `npm run deploy`
Si prefieres compilar y publicar desde tu terminal:
```bash
# 1. Instalar dependencias si aún no lo hiciste
npm install

# 2. Desplegar directamente a la rama gh-pages
npm run deploy
```
Luego en **Settings** > **Pages** de GitHub, selecciona la rama `gh-pages` como origen.

---

## 💻 Desarrollo Local

Para correr el proyecto en tu computadora:

```bash
# Instalar paquetes
npm install

# Iniciar servidor de desarrollo
npm run dev
```

El servidor iniciará en `http://localhost:3000`.

---

## 🔐 Credenciales de Acceso
- **Usuario:** `Franco`
- **Contraseña:** `Mecano1234`

---

## 💾 Persistencia de Datos y Respaldos

- Al estar alojado como sitio estático en GitHub Pages, los datos se guardan de forma instantánea y persistente en el navegador (`localStorage`).
- **Copia de seguridad:** Puedes descargar en cualquier momento un archivo `database.json` con todos los reportes y movimientos desde la pestaña **Base de Datos** > **Descargar JSON**.
- **Restaurar / Migrar:** Puedes subir un archivo `database.json` en cualquier computadora para sincronizar los datos.
- **Actualizar stock base del repositorio:** Si descargas el `database.json` y reemplazas el archivo en `src/data/database.json`, al subir los cambios a GitHub la nueva versión incluirá ese inventario por defecto.
