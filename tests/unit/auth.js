import utils from './utils'

export default {
  isUnlocked:()=>{
    const wallet = {} // TODO
    return !!wallet
  },
  isInWhiteList:()=>{
    const whiteList = utils.getConfig('whiteList') // TODO
    const wallet = {} // TODO
    return whiteList && whiteList.indexOf(wallet.address)
  },
  isLrcConfiged:()=>{
    const config = utils.getConfig()
    const settingsLrcFee = utis.getConfig('settingsLrcFee')
    const settingsMarginSplit = utis.getConfig('settingsMarginSplit')
    return config && settingsLrcFee && settingsMarginSplit
  }
}
