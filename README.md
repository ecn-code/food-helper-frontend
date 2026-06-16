# FoodHelper Front

Frontend en SvelteKit para gestionar productos del backend `FoodHelper`.

## Alcance actual

- Login con JWT contra el backend
- Listar productos
- Crear productos
- Editar productos
- Eliminar productos
- Ver stock e inventario por caducidad
- Crear entradas de stock por producto
- Listar y gestionar recetas
- Tests de integracion end-to-end con Playwright en navegador headless

## Backend

La aplicacion espera el backend en `BACKEND_BASE_URL`.

Valor por defecto:

```sh
http://127.0.0.1:8080
```

El login usa `POST /api/v1/auth/login`. El frontend guarda la sesion en una cookie httpOnly y envia el token como `Authorization: Bearer` en las operaciones de productos.

Puedes copiar `.env.example` a `.env` si quieres fijarlo para desarrollo local.

## Desarrollo

```sh
npm install
npm run dev
```

Si necesitas apuntar a otra URL del backend:

```sh
BACKEND_BASE_URL=http://127.0.0.1:8080 npm run dev
```

## Tests

Tests con mock backend embebido:

```sh
npm run test:e2e
```

Tests contra backend real ya levantado:

```sh
BACKEND_BASE_URL=http://127.0.0.1:8080 npm run test:e2e:real
```

## Build

```sh
npm run build
npm run preview
```
