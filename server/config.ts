const production = process.env.NODE_ENV === 'production'

function get<T>(name: string, fallback: T, options = { requireInProduction: false }): T | string {
  if (process.env[name]) {
    return process.env[name]
  }
  if (fallback !== undefined && (!production || !options.requireInProduction)) {
    return fallback
  }
  throw new Error(`Missing env var ${name}`)
}

const requiredInProduction = { requireInProduction: true }

export class AgentConfig {
  timeout: number

  constructor(timeout = 8000) {
    this.timeout = timeout
  }
}

export interface ApiConfig {
  url: string
  timeout: {
    response: number
    deadline: number
  }
  agent: AgentConfig
}

export default {
  buildNumber: get('BUILD_NUMBER', '1_0_0', requiredInProduction),
  productId: get('PRODUCT_ID', 'UNASSIGNED', requiredInProduction),
  gitRef: get('GIT_REF', 'xxxxxxxxxxxxxxxxxxx', requiredInProduction),
  branchName: get('GIT_BRANCH', 'xxxxxxxxxxxxxxxxxxx', requiredInProduction),
  production,
  https: production,
  env: get('ENVIRONMENT', 'local', requiredInProduction) as 'local' | 'dev' | 'preprod' | 'prod',
  staticResourceCacheDuration: '1h',
  redis: {
    enabled: get('REDIS_ENABLED', 'false', requiredInProduction) === 'true',
    host: get('REDIS_HOST', 'localhost', requiredInProduction),
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_AUTH_TOKEN,
    tls_enabled: get('REDIS_TLS_ENABLED', 'false'),
  },
  session: {
    secret: get('SESSION_SECRET', 'app-insecure-default-session', requiredInProduction),
    expiryMinutes: Number(get('WEB_SESSION_TIMEOUT_IN_MINUTES', 120)),
  },
  audit: {
    enabled: get('AUDIT_ENABLED', 'false') === 'true',
  },
  apis: {
    hmppsAuth: {
      enabled: get('HMPPS_AUTH_ENABLED', 'false', requiredInProduction) === 'true',
      url: get('HMPPS_AUTH_URL', 'http://localhost:9091/auth', requiredInProduction),
      healthPath: '/health/ping',
      externalUrl: get('HMPPS_AUTH_EXTERNAL_URL', get('HMPPS_AUTH_URL', 'http://localhost:9091/auth')),
      timeout: {
        response: Number(get('HMPPS_AUTH_TIMEOUT_RESPONSE', 10000)),
        deadline: Number(get('HMPPS_AUTH_TIMEOUT_DEADLINE', 10000)),
      },
      agent: new AgentConfig(Number(get('HMPPS_AUTH_TIMEOUT_RESPONSE', 10000))),
      authClientId: get('AUTH_CODE_CLIENT_ID', 'clientid', requiredInProduction),
      authClientSecret: get('AUTH_CODE_CLIENT_SECRET', 'clientsecret', requiredInProduction),
      systemClientId: get('CLIENT_CREDS_CLIENT_ID', 'clientid', requiredInProduction),
      systemClientSecret: get('CLIENT_CREDS_CLIENT_SECRET', 'clientsecret', requiredInProduction),
    },
    tokenVerification: {
      url: get('TOKEN_VERIFICATION_API_URL', 'http://localhost:9091/token-verification-api', requiredInProduction),
      healthPath: '/health/ping',
      timeout: {
        response: Number(get('TOKEN_VERIFICATION_API_TIMEOUT_RESPONSE', 5000)),
        deadline: Number(get('TOKEN_VERIFICATION_API_TIMEOUT_DEADLINE', 5000)),
      },
      agent: new AgentConfig(Number(get('TOKEN_VERIFICATION_API_TIMEOUT_RESPONSE', 5000))),
      enabled: get('TOKEN_VERIFICATION_ENABLED', 'false') === 'true',
    },
    deliusIntegration: {
      url: get('DELIUS_INTEGRATION_URL', 'http://localhost:9091/delius', requiredInProduction),
      healthPath: '/health/ping',
      timeout: {
        response: Number(get('DELIUS_INTEGRATION_TIMEOUT_RESPONSE', 5000)),
        deadline: Number(get('DELIUS_INTEGRATION_TIMEOUT_DEADLINE', 5000)),
      },
      agent: new AgentConfig(Number(get('DELIUS_INTEGRATION_TIMEOUT_RESPONSE', 5000))),
    },
    tierApi: {
      url: get('TIER_API_URL', 'http://localhost:9091/tier', requiredInProduction),
      healthPath: '/health/ping',
      timeout: {
        response: Number(get('TIER_API_TIMEOUT_RESPONSE', 5000)),
        deadline: Number(get('TIER_API_TIMEOUT_DEADLINE', 5000)),
      },
      agent: new AgentConfig(Number(get('TIER_API_TIMEOUT_RESPONSE', 5000))),
    },
    arnsApi: {
      url: get('ARNS_API_URL', 'http://localhost:9091/arns', requiredInProduction),
      healthPath: '/health/ping',
      timeout: {
        response: Number(get('ARNS_API_TIMEOUT_RESPONSE', 10000)),
        deadline: Number(get('ARNS_API_TIMEOUT_DEADLINE', 10000)),
      },
      agent: new AgentConfig(Number(get('ARNS_API_TIMEOUT_RESPONSE', 10000))),
    },
  },
  domain: get('INGRESS_URL', 'http://localhost:3000', requiredInProduction),
  ingressUrl: get('INGRESS_URL', 'http://localhost:3000', requiredInProduction),
}
