/* eslint-disable */

import store from "../store";
import botStore from "../store"

export default {
  install(Vue) {
    Vue.prototype.$trdrBot = new Vue({
      store,
      botStore,
      data: {
        bidCounts: {},
        askCounts: {},
        botStarted: false,
        threshold: 200,
        inTrade: {},
      },
      methods: {
        delay(period){
          return new Promise(resolve => setTimeout(resolve, period))
        },
        startBot(){
          this.botStarted = true
          this.bidCounts = {}
          this.askCounts = {}
          const coinsToTrade = botStore.getters.getCoinsToTrade
          Object.keys(coinsToTrade).forEach( key => {
            if (coinsToTrade[key]){
              this.bidCounts[key] = 0
              this.askCounts[key] = 0
              this.inTrade[key] = false
            }
          })
          setTimeout(() => this.checkSignals(), 100)
        },
        stopBot(){
          this.botStarted = false
        },
        checkSignals(){
          const coinsToTrade = botStore.getters.getCoinsToTrade
          Object.keys(coinsToTrade).forEach( key => {
            if (coinsToTrade[key]){
              const currentPercentage = botStore.getters.getCurrentPercentage(key)*100
              const signalSetting = botStore.getters.getSignalSetting(key)[0]
              if (currentPercentage >= signalSetting.bid){
                this.bidCounts[key]++
                if (this.bidCounts[key] > this.threshold){
                  this.enterTrade(key, "long")
                }
              } else {
                this.bidCounts[key] > 0 ? this.bidCounts[key]-- : true
              }
              if (currentPercentage <= signalSetting.ask){
                this.askCounts[key]++
                if (this.askCounts[key] > this.threshold){
                  this.enterTrade(key, "short")
                }
              } else {
                this.askCounts[key] > 0 ? this.askCounts[key]-- : true
              }
            }
          })
          if (this.botStarted){
            setTimeout(() => this.checkSignals(), 1000)
          }
        },
        async enterTrade(pair, direction){
          if (this.inTrade[pair]){
            return
          }
          this.inTrade[pair] = true
          const risk = botStore.getters.getRisk
          this.$apiAbstraction.setLeverage(risk.leverage, pair)
          this.$apiAbstraction.getWalletBalance()
          this.$apiAbstraction.getBBA(pair)
          await this.delay(3000)
          const balance = store.getters.getBalance.balance
          const bba = store.getters.getBBA
          if (bba.symbol !== pair){
            botStore.commit("addLogEntry", "pair error")
          }
          const entryPrice = direction === "long" ? store.getters.getBBA.bestAsk : store.getters.getBBA.bestBid
          const tickSize = store.getters.getTickSizeBySymbol(pair.toUpperCase())[0]
          const lastPrice = botStore.getters.getLastPriceFuture(pair)
          const positionSize = parseFloat(balance) * risk.risk * risk.leverage / parseFloat(lastPrice)
          const quantity = positionSize - positionSize % tickSize.minStepSize  // round down to decimal precision of pair
          const tpsl = botStore.getters.getTakeProfitStoploss
          // following code is to adhere to the ticksize and get rid of rounding errors like 0.00000000001
          let stop_loss = direction === "long" ? lastPrice - lastPrice * tpsl.sl : lastPrice + lastPrice * tpsl.sl
          stop_loss = parseFloat((Math.floor(stop_loss / tickSize.tickSize)*tickSize.tickSize).toFixed(8))
          let tp1 = direction === "long" ? lastPrice + lastPrice * tpsl.tp1 : lastPrice - lastPrice * tpsl.tp1
          tp1 = parseFloat((Math.floor(tp1 / tickSize.tickSize) * tickSize.tickSize).toFixed(8))
          let tp2 = direction === "long" ? lastPrice + lastPrice * tpsl.tp2 : lastPrice - lastPrice * tpsl.tp2
          tp2 = parseFloat((Math.floor(tp2 / tickSize.tickSize) * tickSize.tickSize).toFixed(8))
          const side = direction === "long" ? "buy" : "sell"
          let order = []
          order.push({
            side,
            quantity,
            price: entryPrice,
            stop_loss,
          })
          botStore.commit("addLogEntry", `Initiating trade: ${pair}, side: ${direction}, size: ${quantity}, entry: ${entryPrice}, tp1: ${tp1}, tp2: ${tp2}, sl: ${stop_loss}`)
        },
        monitorTrades(){

        },
      },
      computed: {
      },
      created() {},
    });
  },
};
