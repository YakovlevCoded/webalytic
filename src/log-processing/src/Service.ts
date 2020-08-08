/* eslint-disable no-await-in-loop */

import AddHitInput, { addHitInputValidate } from './inputs/AddHitInput'
import { Dependencies } from './container'
import Parser from './utils/Parser'
import SessionRepository from './infra/SessionRepository'
import Session from './entities/Session/Session'

export default class Service {
  private parser: Parser

  private sessionRepository: SessionRepository

  constructor(deps: Dependencies) {
    this.parser = deps.parser
    this.sessionRepository = deps.sessionRepository
  }

  async addHitToSession(data: AddHitInput):Promise<void> {
    addHitInputValidate(data)

    // Парсим traffic source
    const trafficSource = this.parser.getTrafficSource(
      {
        campaignSource: data.campaignSource,
        campaignName: data.campaignName,
        campaignContent: data.campaignContent,
        campaignKeyword: data.campaignKeyword,
        campaignMedium: data.campaignMedium,
        campaignId: data.campaignId
      },
      data.documentLocation,
      data.documentReferrer
    )

    // Ищем активную сессию
    let session = await this.sessionRepository.get(data.resourceId, data.clientId)

    if (session && !session.shouldBeEnd(trafficSource, data.sessionControl, data.hit.type)) {
      // Проверяем, что рестарт сессии не нужен, добавляем Hit в сессию
      session.addHit(data.hit)
    } else {
      // Или создаем новую сессию
      session = Session.create({
        resourceId: data.resourceId,
        clientId: data.clientId,
        userId: data.userId,
        device: this.parser.getDevice(data.userAgent),
        geoNetwork: await this.parser.getGeoNetwork(data.ip),
        trafficSource
      }, data.hit)
    }

    await this.sessionRepository.save(session)
  }
}