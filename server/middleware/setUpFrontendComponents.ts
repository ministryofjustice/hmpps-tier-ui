import pdsComponents from '@ministryofjustice/hmpps-probation-frontend-components'
import logger from '../../logger'
import config from '../config'

export default function setUpFrontendComponents() {
  return pdsComponents.getPageComponents({
    pdsUrl: config.apis.componentApi.url,
    timeoutOptions: config.apis.componentApi.timeout,
    logger,
  })
}
