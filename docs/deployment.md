# Despliegue de producción

Cada push a `main` ejecuta el workflow de GitHub Actions. Primero valida el build y luego invoca `scripts/deploy-production.sh` por SSH.

## Secretos de GitHub

Configurar estos secretos en el entorno `production` de este repositorio:

- `FOODIE_DEPLOY_HOST`: host o IP del servidor.
- `FOODIE_DEPLOY_USER`: usuario SSH restringido, por ejemplo `deploy`.
- `FOODIE_DEPLOY_SSH_KEY`: clave privada del usuario de despliegue.
- `FOODIE_DEPLOY_PORT`: puerto SSH.
- `FOODIE_FRONTEND_PATH`: ruta absoluta del checkout, por ejemplo `/var/www/apps/foodie/foodie-frontend`.

Las variables `NEXT_PUBLIC_*` y demás configuración de producción se mantienen en el `.env` del servidor para que estén disponibles durante `npm run build`.

## Flujo protegido

PM2 solo se recarga después de que Git, la instalación y el build terminan correctamente. Tras la recarga, el script requiere una respuesta exitosa de `GET /api/health`. PM2 limita los reinicios consecutivos y usa backoff para evitar loops ilimitados.

Para ejecutar el mismo flujo manualmente:

```bash
cd /var/www/apps/foodie/foodie-frontend
bash scripts/deploy-production.sh
```
