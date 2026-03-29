import router from '@adonisjs/core/services/router'
import HealthController from '#controllers/health_controller'
import MenuItemsController from '#controllers/menu_items_controller'
import TicketsController from '#controllers/tickets_controller'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'

router.get('/health', [HealthController, 'handle'])
router.get('/api/health', [HealthController, 'handle'])

router.get('/uploads/*', ({ request, response }) => {
  const rawUrl = request.url()
  const filePath = rawUrl.replace(/^\/uploads\//, '')
  const absPath = join(process.cwd(), 'public/uploads', filePath)
  if (!existsSync(absPath)) {
    return response.status(404).send('Not found')
  }
  const stat = statSync(absPath)
  const ext = filePath.split('.').pop()?.toLowerCase() ?? ''
  const mime: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp' }
  response.header('Content-Type', mime[ext] ?? 'application/octet-stream')
  response.header('Content-Length', String(stat.size))
  response.header('Cache-Control', 'public, max-age=86400')
  return response.stream(createReadStream(absPath))
})

router.group(() => {
  router.get('/', [MenuItemsController, 'index'])
  router.post('/', [MenuItemsController, 'store'])
  router.patch('/:id', [MenuItemsController, 'update'])
  router.delete('/:id', [MenuItemsController, 'destroy'])
  router.post('/:id/image', [MenuItemsController, 'uploadImage'])
  router.delete('/:id/image', [MenuItemsController, 'deleteImage'])
}).prefix('/api/menu').use([])

router.group(() => {
  router.get('/', [TicketsController, 'index'])
  router.post('/', [TicketsController, 'store'])
  router.post('/:id/start', [TicketsController, 'start'])
  router.post('/:id/complete', [TicketsController, 'complete'])
  router.post('/:id/reset', [TicketsController, 'reset'])
  router.post('/:id/extend', [TicketsController, 'extend'])
  router.post('/:id/priority', [TicketsController, 'markPriority'])
  router.delete('/:id', [TicketsController, 'destroy'])
}).prefix('/api/tickets').use([])
