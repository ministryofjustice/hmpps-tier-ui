import { dataAccess } from '../data'
import UserService from './userService'

export const services = () => {
  const { applicationInfo, hmppsAuthClient, oasysAuthClient, manageUsersApiClient } = dataAccess()

  const userService = new UserService(manageUsersApiClient)

  return {
    applicationInfo,
    hmppsAuthClient,
    oasysAuthClient,
    userService,
  }
}

export type Services = ReturnType<typeof services>

export { UserService }
