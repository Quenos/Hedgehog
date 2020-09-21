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
        trades: [],
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
        async checkSignals(){
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
          setTimeout(() => this.inTrade[pair] = false, 60000 * 15)
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
          let quantity = positionSize - positionSize % tickSize.minStepSize  // round down to decimal precision of pair
          // following code is to adhere to the ticksize and get rid of rounding errors like 0.00000000001
          quantity = parseFloat(quantity.toFixed(8))
          const tpsl = botStore.getters.getTakeProfitStoploss
          let stop_loss = direction === "long" ? lastPrice - lastPrice * tpsl.sl : lastPrice + lastPrice * tpsl.sl
          stop_loss = parseFloat((Math.floor(stop_loss / tickSize.tickSize)*tickSize.tickSize).toFixed(8))
          let tp1 = direction === "long" ? lastPrice + lastPrice * tpsl.tp1 : lastPrice - lastPrice * tpsl.tp1
          tp1 = parseFloat((Math.floor(tp1 / tickSize.tickSize) * tickSize.tickSize).toFixed(8))
          let tp2 = direction === "long" ? lastPrice + lastPrice * tpsl.tp2 : lastPrice - lastPrice * tpsl.tp2
          tp2 = parseFloat((Math.floor(tp2 / tickSize.tickSize) * tickSize.tickSize).toFixed(8))
          const side = direction === "long" ? "buy" : "sell"
          let order = {}
          order = {
            pair,
            side,
            quantity,
            price: entryPrice,
            stop_loss,
            tp1,
            tp2,
            tickSize,
            balance,
            pnl: 0,
            state: "INITIATED",
          }
          this.trades.push(order)
          botStore.commit("addLogEntry", `Initiating trade: ${pair}, side: ${direction}, size: ${quantity}, entry: ${entryPrice}, tp1: ${tp1}, tp2: ${tp2}, sl: ${stop_loss}`)
        },
        monitorTrades(){
          this.trades.forEach(trade => {
            const position = store.getters.getBotPositionBySymbol(trade.pair.toUpperCase())
            const openOrders = store.getters.getOpenOrdersByExchangeInstrument("binance", trade.pair)
            switch(trade.state){
              case "INITIATED":
                this.$apiAbstraction.enterOrders(trade.pair, "LIMIT", false, false, [trade])
                trade.state = "ENTERED"
                break
              case "ENTERED":
                if (position){
                  botStore.commit("addLogEntry", `Trade entered: ${position.symbol}, side: ${position.side}, size: ${position.size}, entry: ${position.entryPrice}`)
                  let quantity = trade.quantity / 2 - (trade.quantity / 2) % trade.tickSize.minStepSize  // round down to decimal precision of pair
                  quantity = parseFloat(quantity.toFixed(8))
                  const rest = position.size - 2 * quantity
                  this.$apiAbstraction.takeProfitOrder(trade.pair, trade.side, trade.tp1, quantity)
                  this.$apiAbstraction.takeProfitOrder(trade.pair, trade.side, trade.tp2, quantity + rest)
                  trade.state = "EXECUTED"
                }
                break
              case "EXECUTED":
                if (!openOrders.filter(order => order.orderType.toUpperCase() == "STOP").length){ // stop not in open orders => so hit
                  openOrders.forEach(order => this.$apiAbstraction.cancelOrder(order.order_id))
                  if (trade.pnl === 0){
                    trade.pnl = Math.abs(trade.entry - trade.sl) * trade.quantity * -1
                  }
                  botStore.commit("addLogEntry", `Stop hit: ${trade.pair}, side: ${trade.side}, size: ${trade.size}, stop loss: ${trade.stop_loss}`)                    
                  trade.state = "EXITED"
                } else if (openOrders.length === 2){ // 2 orders in open orders stop already handled => so TP1 hit
                  openOrders.forEach(order => this.$apiAbstraction.cancelOrder(order.order_id))
                  this.$apiAbstraction.stoplossOrder(trade.pair, trade.side, trade.price, trade.quantity)
                  trade.pnl = Math.abs(trade.entry - trade.tp1) * trade.quantity / 2 
                  botStore.commit("addLogEntry", `TP1 hit: ${trade.pair}, side: ${trade.side}, size: ${trade.size}, take profit 1: ${trade.tp1}`)                    
                } else if (openOrders.length === 1){ // 1 order in open orders => stop already handled so tp2 hit
                  openOrders.forEach(order => this.$apiAbstraction.cancelOrder(order.order_id))
                  trade.pnl += Math.abs(trade.entry - trade.tp2) * trade.quantity / 2 
                  botStore.commit("addLogEntry", `TP2 hit: ${trade.pair}, side: ${trade.side}, size: ${trade.size}, take profit 2: ${trade.tp2}`)                    
                  trade.state = "EXITED"
                } 
                break
              case "EXITED":
                botStore.commit("addLogEntry", `Trade closed: ${trade.pair}, side: ${trade.side}, size: ${trade.size}, absolute pnl: ${trade.pnl}USDT percentage PNL: ${trade.pnl/trade.balance*100}%`)                    
                trade.state = "CLOSED"
                break
            }
          })
        },
      },
      computed: {
      },
      created() {},
    });
  },
};
