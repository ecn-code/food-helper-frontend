# FoodHelper Front

Frontend estatico en SvelteKit para gestionar el catalogo y la planificacion de `FoodHelper`.

## Alcance actual

La lista siguiente describe lo que funciona en el frontend con el mock y las rutas actuales del proyecto. No debe interpretarse como validación final contra el backend real hasta que pasen los E2E en modo real.

- Login con JWT contra el backend
- Listar productos
- Crear productos
- Editar productos
- Eliminar productos
- Ver stock e inventario por caducidad
- Crear entradas de stock por producto
- Editar, incrementar, retirar y filtrar entradas de stock
- Listar y gestionar recetas
- Gestionar supermercados y asignarlos a productos
- Consultar la hucha y registrar movimientos
- Configurar reglas nutricionales diarias y semanales
- Crear planificaciones de hasta 16 dias y convertirlas en menus
- Filtrar listas de compra, cerrar menus y consultar sus estadisticas
- Consultar personas, historial y pesos
- Tests de integracion end-to-end con Playwright en navegador headless

## Backend

La aplicacion espera el backend en `PUBLIC_BACKEND_BASE_URL`.

Valor por defecto:

```sh
http://127.0.0.1:8080
```

El login usa `POST /api/v1/auth/login`. El frontend conserva la sesion en el navegador y envia el token como `Authorization: Bearer` en las operaciones autenticadas.

Puedes copiar `.env.example` a `.env` si quieres fijarlo para desarrollo local.

## Desarrollo

```sh
npm install
npm run dev
```

Si necesitas apuntar a otra URL del backend:

```sh
PUBLIC_BACKEND_BASE_URL=http://127.0.0.1:8080 npm run dev
```

## Tests

Tests con mock backend embebido:

```sh
npm run test:e2e
```

Tests contra backend real ya levantado:

```sh
PUBLIC_BACKEND_BASE_URL=http://127.0.0.1:8080 npm run test:e2e:real
```

## Build

```sh
npm run build
npm run preview
```

## Deploy

```sh
npm run deploy
```

Default deploy settings:

- `PI_HOST=pi-server`
- `REMOTE_ROOT=/var/www/foodhelperfront`
- `REMOTE_BUILD_DIR=/tmp/foodhelperfront-build`

If `PUBLIC_BACKEND_BASE_URL` is not set, the script infers `http://<pi-ip>:8080` from the Raspberry over SSH.
