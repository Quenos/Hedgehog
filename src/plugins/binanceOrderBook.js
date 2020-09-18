/* eslint-disable */

import ReconnectingWebSocket from "reconnecting-websocket";

import store from "../store";
import botStore from "../store"
import { mapGetters } from "vuex";
import axios from "axios";

export default {
  install(Vue) {
    Vue.prototype.$binanceOrderBook = new Vue({
      store,
      botStore,
      data: {
        ws: null,
        wsFuture: null,
        obBuffer: null,
        orderBook:{},
        stopUpdates: true,
        lastUpdateId: {},
        lastPrice: {},
        buySignalCount: {},
        sellSignalCount: {},
        signalSettings: {}
      },
      methods: {
        delay(period){
          return new Promise(resolve => setTimeout(resolve, period))
        },
        async initWs(symbols=["linkusdt", "eosusdt", "ethusdt", "btcusdt", "xrpusdt", "adausdt"]) {
          let symbolString = ""
          let symbolStringFuture = ""
          this.obBuffer = {}
          this.orderBook = {}
          symbols.forEach(symbol => {
            symbolString += `/${symbol}@depth/${symbol}@ticker`
            symbolStringFuture += `${symbol}@ticker/`
          })
          this.ws = new ReconnectingWebSocket(`wss://stream.binance.com:9443/ws${symbolString}`);
          this.wsFuture = new ReconnectingWebSocket(`wss://fstream3.binance.com/stream?streams=${symbolStringFuture}`)
          await this.delay(500)
          this.ws.onerror = (err) => {
            console.log(err);
          };
          this.wsFuture.onerror = (err) => {
            console.log(err);
          };
          this.ws.onopen = () => {
            this.ws.onmessage = (e) => {
              let data = JSON.parse(e.data);
              this.handleOnMessage(data);
            };
          };
          this.wsFuture.onopen = () => {
            this.wsFuture.onmessage = (e) => {
              let data = JSON.parse(e.data);
              this.handleOnFutureMessage(data);
            };
          };
          this.stopUpdates = false
          await this.delay(2000)
          symbols.forEach(async (symbol) => {
            axios
              .get(`https://www.binance.com/api/v3/depth?symbol=${symbol.toUpperCase()}&limit=1000`)
              .then(res => this.handleInitialOrderBook(res, symbol.toLowerCase()))
              .catch(err => this.handleError(err))
            await this.delay(1000)
          })
          setTimeout(() => this.findSignal(), 1000)
        },
        closeApi() {
          this.stopUpdates = true
          this.ws.close();
          this.wsFuture.close();
        },
        handleOnMessage(data) {
          if (data.e === "depthUpdate"){
            if (!(data.s.toLowerCase() in this.obBuffer)){
              this.obBuffer[data.s.toLowerCase()] = []
            }
            this.obBuffer[data.s.toLowerCase()].push(data)
          } else if (data.e === "24hrTicker") {
            if (!(data.s.toLowerCase() in this.lastPrice)){
              this.lastPrice[data.s.toLowerCase()] = ""
            }
            this.lastPrice[data.s.toLowerCase()] = data.c
            const lastPrice = {
              symbol: data.s.toLowerCase(),
              lastPrice: parseFloat(data.c),
            }
            botStore.commit("setLastPriceBot", lastPrice)
          }
        },
        handleOnFutureMessage(result){
          const data = result.data
          if (data.e === "24hrTicker") {
            const lastPriceFuture = {
              symbol: data.s.toLowerCase(),
              lastPrice: parseFloat(data.c),
            }
            botStore.commit("setLastPriceFuture", lastPriceFuture)
          }
        },
        handleInitialOrderBook(data, symbol){
          if (symbol in this.obBuffer){
            this.obBuffer[symbol] = this.obBuffer[symbol].filter(order => order.u > data.data.lastUpdateId)
          }
          this.lastUpdateId[symbol] = data.data.lastUpdateId
          if (!(symbol in this.orderBook)){
            this.orderBook[symbol] = {}
          }
          this.orderBook[symbol]["asks"] = {}
          this.orderBook[symbol]["bids"] = {}
          data.data.asks.forEach(ask => this.orderBook[symbol]["asks"][ask[0]] = ask[1])
          data.data.bids.forEach(bid => this.orderBook[symbol]["bids"][bid[0]] = bid[1])
          this.updateOrderBook()
        },
        updateOrderBook(){
          const allSymbols = Object.keys(this.orderBook)
          allSymbols.forEach(symbol => {
            if (!this.obBuffer[symbol]){
              return
            }
            this.obBuffer[symbol].forEach(ob => {
              if (ob.U === this.lastUpdateId[symbol] + 1){
                ob.a.forEach(ask => parseFloat(ask[1]) !== 0 ? this.orderBook[symbol]["asks"][ask[0]] = ask[1] : delete this.orderBook[symbol]["asks"][ask[0]])
                ob.b.forEach(bid => parseFloat(bid[1]) !== 0 ? this.orderBook[symbol]["bids"][bid[0]] = bid[1] : delete this.orderBook[symbol]["bids"][bid[0]])
                // console.log("accepted")
              } else {
                console.log("rejected")
              }
              this.lastUpdateId[symbol] = ob.u
            })
            this.obBuffer[symbol] = []
          })
          if (!this.stopUpdates) {
            setTimeout(() => this.updateOrderBook(), 500)
          }
        },
        findSignal(){
          const allSymbols = Object.keys(this.orderBook)
          let currentPercentages = {}
          allSymbols.forEach(symbol => {
            if (!(symbol in this.buySignalCount)){
              this.buySignalCount[symbol] = 0
            }
            if (!(symbol in this.sellSignalCount)){
              this.sellSignalCount[symbol] = 0
            }
            const bid_1Percent = parseFloat(this.lastPrice[symbol]) - parseFloat(this.lastPrice[symbol]) * 0.01
            const bid_2_5Percent = parseFloat(this.lastPrice[symbol]) - parseFloat(this.lastPrice[symbol]) * 0.025
            const ask_1Percent = parseFloat(this.lastPrice[symbol]) * 1.01
            const ask_2_5Percent = parseFloat(this.lastPrice[symbol]) * 1.025
            const allBids = Object.keys(this.orderBook[symbol].bids)
            const allAsks = Object.keys(this.orderBook[symbol].asks)
            let quantityBids = 0
            let quantityAsks = 0
            allBids.forEach(bid => {
              parseFloat(bid) <= bid_1Percent && parseFloat(bid) > bid_2_5Percent ? quantityBids += parseFloat(this.orderBook[symbol].bids[bid]) : true
            })
            allAsks.forEach(ask => {
              parseFloat(ask) >= ask_1Percent && parseFloat(ask) < ask_2_5Percent ? quantityAsks += parseFloat(this.orderBook[symbol].asks[ask]) : true
            })
            const bidAskPerc = (quantityBids - quantityAsks) / (quantityBids + quantityAsks)
            currentPercentages[symbol] = bidAskPerc
          })
          botStore.commit("setCurrentPercentages", currentPercentages)
          if (!this.stopUpdates) {
            setTimeout(() => this.findSignal(), 1000) // check for signals every minute
          }
        },
        handleError(err){
          this.$notify({
            text: "initial order book error",
            type: 'error',
          })
          console.log(err)
        }, 
      },
      computed: {
        ...mapGetters(["getApiKeys"]),
      },
      created() {},
    });
  },
};
