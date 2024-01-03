import superagent from 'superagent'
import { URLSearchParams } from 'url'
import config from '../config'
import type TokenStore from './tokenStore/tokenStore'
import generateOauthClientToken from '../authentication/clientCredentials'

export default class OasysAuthClient {
  constructor(private readonly tokenStore: TokenStore) {}

  async getToken(): Promise<string> {
    const key = 'OASYS_TOKEN'

    const token = await this.tokenStore.getToken(key)
    if (token) {
      return token
    }

    const newToken = await this.getTokenFromAuth()

    await this.tokenStore.setToken(key, newToken.body.access_token, newToken.body.expires_in - 60)

    return newToken.body.access_token
  }

  async getTokenFromAuth(): Promise<superagent.Response> {
    const clientToken = generateOauthClientToken(config.apis.oasysAuth.clientId, config.apis.oasysAuth.clientSecret)

    const grantRequest = new URLSearchParams({ grant_type: 'client_credentials' }).toString()

    return superagent
      .post(config.apis.oasysAuth.url)
      .set('Authorization', clientToken)
      .set('content-type', 'application/x-www-form-urlencoded')
      .send(grantRequest)
      .timeout(config.apis.oasysAuth.timeout)
  }
}
