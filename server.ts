// Require app insights before anything else to allow for instrumentation of bunyan and express
import 'applicationinsights'

import logger from './logger'
import createApp from './server/app'
import { services } from './server/services'

async function start() {
  const app = await createApp(services())
  app.listen(app.get('port'), () => {
    logger.info(`Server listening on http://localhost:${app.get('port')}`)
  })
}

start().catch(err => {
  logger.error('Server failed to start.', err)
  process.exit(1)
})
