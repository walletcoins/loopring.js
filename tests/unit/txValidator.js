import * as apis from '../../2.0/common/apis'
import * as abis from '../../2.0/common/abis'
import Transaction from '../../2.0/transactioni'
import utils from './utils'

export default class txValidator {
  constructor(txs) {
    this.txs=txs
    this.uiTxs=[]
    this.setUI()
  }
  setUI(){
    this.txs.forEach(tx=>{
      const token = tx.token
      const type = tx.type
      const gasLimit = tx.raw.gasLimit
      const gasPrice = tx.raw.gasPrice
      const amount = tx.input.amount // TODO

      let uiTx = {}
      uiTx.raw = tx.raw
      if(type == 'transfer'){
        const address = tx.input.address
        uiTx.title = `Transfer ${token.name},`
        uiTx.description = `Transfer ${amount} ${token.name} to ${address} with gas is ${gasLimit} and gasPrice is ${gasPrice/1e9} Gwei`
      }
      if(type == 'approve'){
        uiTx.title = `New Authorization Of ${token.name},`
        uiTx.description = `Improve ${token.name} Allowance to ${amount}  to pay the order fee with gas is ${gasLimit} and gasPrice is ${gasPrice/1e9} Gwei`
        if(tx.cancelTx){
          let cancelUiTx = tx.cancelTx
          tx.cancelUiTx.title = `Cancel Authorization Of ${token.name},`
          tx.cancelUiTx.description = `Improve ${token.name} Allowance to ${amount}  to pay the order fee with gas is ${gasLimit} and gasPrice is ${gasPrice/1e9} Gwei`
          this.uiTxs.push(tx.cancelUiTx)
        }
      }
      // more todo
      this.uiTxs.push(uiTx)
    })
  }
  async isEThGasEnough(){
    const address = '' // TODO
    // const EthBalance = balances['ETH'] ? balances['ETH'].balance : 0;
    const EthBalance = await apis.getEthBalance(address,tag) // TODO how to getBalance
    const gasTotal = 0 
    this.txs.forEach(tx=>{ // txs format
       gasTotal += Number(tx.raw.gasLimit) * Number(tx.raw.gasPrice) // TODO gasLimit format
    })
    return gasTotal <= EthBalance
  }
  async sign(){
    this.txs = this.txs.map(tx=>{
      const result = await tx.sign()
      tx.signed = result // TODO
      return tx
    })
  }
  async sign2(){
    const promises = this.txs.map(tx=>{
      return tx.sign()
    })
    return Promise.all(promises).then(results=>{
      // TODO
    }).catch(error=>{
      // TODO
    })
  }
  async send(){
    this.txs.map(tx=>{
      const result = await tx.send()
    })
  }
}


