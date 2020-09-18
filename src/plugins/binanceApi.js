/* eslint-disable */

import hmacSHA256 from "crypto-js/hmac-sha256";
import ReconnectingWebSocket from "reconnecting-websocket";

import store from "../store";
import { mapGetters } from "vuex";
import axios from "axios";


export default {
  install(Vue) {
    Vue.prototype.$binanceApi = new Vue({
      store,
      data: {
        ws: null,
        uds: null,
        apiKeys: null,
        restApiUrl: "",
        refreshListenKey: false,
      },
      methods: {
        initWs() {
          console.log("init")

          this.apiKeys = store.getters.getApiKeys;
          const key = this.apiKeys["apiKey"];
          const secret = this.apiKeys["apiSecret"];
          const streamUrl =
            store.getters.getWsUrlByExchange("binance") +
            `/stream?streams=!markPrice@arr@1s/!ticker@arr`;
          this.restApiUrl = store.getters.getRestUrlByExchange("binance");
          this.ws = new ReconnectingWebSocket(streamUrl);
          this.getAssets();
          this.ws.onerror = (err) => {
            console.log(err);
          };
          this.ws.onopen = () => {
            this.ws.onmessage = (e) => {
              let data = JSON.parse(e.data);
              this.handleOnMessage(data);
            };
          };
          this.getListenKey();
        },
        startApi() {
          // this.getOpenOrders(store.getters.getAsset.substring(0, 3));
          this.refreshListenKey = true;
          this.getPositions();
          this.getOpenOrders();
        },
        closeApi() {
          this.refreshListenKey = false;
          this.ws.close();
          this.uds.close();
        },
        createSignedQueryString(queryString) {
          const timestamp = Date.now();
          const recvWindow = 5000
          const stringToSign = `${queryString}&recvWindow=${recvWindow}&timestamp=${timestamp}`;
          const signature = hmacSHA256(
            stringToSign,
            this.apiKeys["apiSecret"]
          ).toString();
          return `${queryString}&recvWindow=${recvWindow}&signature=${signature}&timestamp=${timestamp}`;
        },
        handleOnMessage(data) {
          try{
            const markPrice = data.data
              .filter((value) => value.e === "markPriceUpdate")
              .forEach((item) => {
                store.commit("setMarkPrice", {
                  exchange: "binance",
                  instrument: item.s,
                  markPrice: parseFloat(item.p),
                });
              });

            const lastPrice = data.data
              .filter((value) => value.e === "24hrTicker")
              .forEach((item) => {
                store.commit("setLastPrice", {
                  exchange: "binance",
                  instrument: item.s,
                  lastPrice: parseFloat(item.c),
                });
                if (item.s === store.getters.getAsset){
                  this.getPositions()
                }
              });
            } catch {
              console.log(data)
            }
        },
        handleGetAssets(result) {
          let assets = [];
          let tickSizes = []
          result.symbols.forEach((value) => {
            assets.push(value["symbol"]);
            tickSizes.push({
              symbol: value["symbol"],
              tickSize: parseFloat(value.filters[0]["tickSize"]),
              minStepSize: parseFloat(value.filters[1]["stepSize"])
            })
          });
          store.commit("setAssets", assets.sort());
          store.commit("setTickSizes", tickSizes)
        },
        handleUdsOnMessage(data) {
          if (data.e === "ORDER_TRADE_UPDATE") {
            const item = data.o;
            let a = [];
            a.push({
              instrument_name: item["s"],
              side: item["S"].toLowerCase(),
              order_id: item["i"],
              order_state: item["x"],
              quantity: item["q"],
              orderPrice: item["ot"] === "TAKE_PROFIT_MARKET" 
                          || item["ot"] === "STOP_MARKET" 
                          ? item["sp"] 
                          : item["ot"] === "TRAILING_STOP_MARKET"
                            ? item["AP"]
                            : item['p'],
              orderType: item["ot"],
              orderTimeInForce:
                item["f"] === "GTC"
                  ? "Good till cancelled"
                  : item["timeInForce"] === "IOC"
                  ? "Immediate or cancel"
                  : "Fill or Kill",
              orderUpdated: new Date(item["T"]).toLocaleString(),
            });
            store.commit("setOpenOrders", {
              exchange: "binance",
              openOrders: a,
            });
            return;
          }
          if (data.a.m !== "ORDER") {
            return;
          }
          // since the user data stream doesn't contain all the info needed we make a call to getPositions
          this.getPositions();
        },
        handleOpenOrders(data) {
          store.commit("setOpenOrders", {
            exchange: "binance",
            openOrders: data.map((item) => {
              return {
                instrument_name: item["symbol"],
                side: item["side"].toLowerCase(),
                order_id: item["orderId"],
                order_state: item["status"],
                quantity: item["origQty"],
                orderPrice: item["type"] === "TAKE_PROFIT_MARKET" 
                            || item["type"] === "STOP_MARKET" 
                            ? item["stopPrice"] 
                            : item["type"] === "TRAILING_STOP_MARKET"
                              ? item["activatePrice"]
                              : item["price"],
                orderType: item["type"],
                orderTimeInForce:
                  item["timeInForce"] === "GTC"
                    ? "Good till cancelled"
                    : item["timeInForce"] === "IOC"
                    ? "Immediate or cancel"
                    : "Fill or Kill",
                orderUpdated: new Date(item["time"]).toLocaleString(),
              };
            }),
          });
        },
        handleCancelOrder(data) {
          if (data.status === "CANCELED") {
            this.$notify({
              text: 'Order cancelled',
              type: 'success',
            });
          } else {
            this.$notify({
              text: Date.statusText,
              type: 'error',
            });
          }
        },
        handleEnterOrder(data) {
          if (data.ok) {
            this.$notify({
              text: 'Order placed',
              type: 'success',
            });
          } else {
            this.$notify({
              text: Date.statusText,
              type: 'error',
            });
          }
        },
        handleTradingStops(data) {
          if (data.ok) {
            this.$notify({
              text: 'Trading stops set',
              type: 'success',
            });
          } else {
            this.$notify({
              text: Date.statusText,
              type: 'error',
            });
          }
        },
        handleListenKey(result) {
          this.uds = new ReconnectingWebSocket(
            `${store.getters.getWsUrlByExchange("binance")}/ws/${
              result.listenKey
            }`
          );
          this.uds.onopen = () => {
            this.uds.onmessage = (e) => {
              let data = JSON.parse(e.data);
              this.handleUdsOnMessage(data);
            };
          };
        },
        handlePositions(data) {
          let a = [];
          data.forEach((value) => {
            if (!parseFloat(value["positionAmt"])) {
              return;
            }
            const tradingStops = this.getTradingStops()
            // console.log(tradingStops)
            a.push({
              symbol: value["symbol"],
              side: parseFloat(value["positionAmt"]) > 0 ? "buy" : "sell",
              size: Math.abs(parseFloat(value["positionAmt"])),
              position_value:
                parseFloat(value["positionAmt"]) *
                parseFloat(value["markPrice"]),
              entry_price: parseFloat(value["entryPrice"]),
              liq_price: parseFloat(value["liquidationPrice"]),
              position_margin: parseFloat(value["isolatedMargin"]),
              leverage: value["leverage"],
              unrealised_pnl_last: parseFloat(value["unRealizedProfit"]),
              realised_pnl: 0.0,
              daily_total: parseFloat(value["unRealizedProfit"]),
              take_profit: tradingStops.take_profit,
              stop_loss: tradingStops.stop_loss,
              trailing_stop: tradingStops.trailing_stop,
            });
          });
          store.commit("setOpenPositions", {
            exchange: "binance",
            result: a,
          })
          store.commit("setBotPositions", {
            exchange: "binance",
            result: a.map(pos => {
              return {
                symbol: pos.symbol,
                side: pos.side,
                size: pos.size,
                entry_price: pos.entry_price,
                unrealised_pnl_last: pos.unrealised_pnl_last,
              }
            })
          })
        },
        handleGetBalance(data){
          const balances = data.filter(balance => balance.asset === "USDT")
          store.commit("setBalance", {
            balance: balances[0].balance,
            avalaibleBalance: balances[0].availableBalance 
          })
        },
        getTradingStops() {
          const openOrders = store.getters.getOpenOrdersByExchangeInstrument("binance", store.getters.getAsset)
          if (openOrders === void(0) && !openOrders.length){
            return {
              take_profit: 0,
              stop_loss: 0,
              trailing_stop: 0,
            }
          } else {
            var stop_loss = 0
            var take_profit = 0
            var trailing_stop = 0
            openOrders.forEach(order => {
              switch (order["orderType"]){
                case "STOP_MARKET" :
                  stop_loss = order["orderPrice"]
                  break;
                case "TAKE_PROFIT_MARKET":
                  take_profit = order["orderPrice"] 
                  break;
                case "TRAILING_STOP_MARKET":
                  trailing_stop = order["orderPrice"]
                  break;
              }
            })
            return {
              stop_loss,
              take_profit,
              trailing_stop,
            }
          }
        },
        async enterOrders(instrument, type, reduce_only, orders) {
          orders.forEach(order => {
            if (parseFloat(order.quantity) === 0) {
              return
            }
            const queryString=`symbol=${instrument}&side=${order.side.toUpperCase()}&type=${type.toUpperCase()}&quantity=${order.quantity}&price=${order.price}&reduceOnly=${reduce_only}&timeInForce=GTC`
            const signedQuery = this.createSignedQueryString(queryString)
            const url = `${this.restApiUrl}fapi/v1/order?${signedQuery}`
            /* fetch is used instead of axios because of bug in latter */
            fetch(url, {
            method: "POST",
            headers: {"Content-Type": 'application/json;charset=UTF-8',
                      "Access-Control-Allow-Origin": "*",
                      "X-MBX-APIKEY": this.apiKeys["apiKey"]
                     }
            }).then(res => this.handleEnterOrder(res))

            /* handle stop loss orders */
            /* void(0) is used for undefined */
            if (order.stop_loss !== "" && order.stop_loss !== void(0)){
              const side = order.side.toUpperCase() === "BUY" ? "SELL" : "BUY"
              const queryString=`symbol=${instrument}&side=${side}&type=STOP_MARKET&stopPrice=${order.stop_loss}&timeInForce=GTC&closePosition=false&quantity=${order.quantity}`
              const signedQuery = this.createSignedQueryString(queryString)
              const url = `${this.restApiUrl}fapi/v1/order?${signedQuery}`
              /* fetch is used instead of axios because of bug in latter */
              fetch(url, {
              method: "POST",
              headers: {"Content-Type": 'application/json;charset=UTF-8',
                        "Access-Control-Allow-Origin": "*",
                        "X-MBX-APIKEY": this.apiKeys["apiKey"]
                       }
              }).then(res => this.handleEnterOrder(res))
            }

            /* handle take profit orders */
            /* void(0) is used for undefined */
            if (order.take_profit !== "" && order.take_profit !== void(0)){
              const side = order.side.toUpperCase() === "BUY" ? "SELL" : "BUY"
              const queryString=`symbol=${instrument}&side=${side}&type=TAKE_PROFIT_MARKET&stopPrice=${order.take_profit}&timeInForce=GTC&closePosition=false&quantity=${order.quantity}`
              const signedQuery = this.createSignedQueryString(queryString)
              const url = `${this.restApiUrl}fapi/v1/order?${signedQuery}`
              /* fetch is used instead of axios because of bug in latter */
              fetch(url, {
              method: "POST",
              headers: {"Content-Type": 'application/json;charset=UTF-8',
                        "Access-Control-Allow-Origin": "*",
                        "X-MBX-APIKEY": this.apiKeys["apiKey"]
                       }
              }).then(res => this.handleEnterOrder(res))
            }
          })
        },
        async marketOrder(asset, side, size) {
          const queryString=`symbol=${asset}&side=${side.toUpperCase()}&type=MARKET&quantity=${size}`
          const signedQuery = this.createSignedQueryString(queryString)
          const url = `${this.restApiUrl}fapi/v1/order?${signedQuery}`
          /* fetch is used instead of axios because of bug in latter */
          fetch(url, {
          method: "POST",
          headers: {"Content-Type": 'application/json;charset=UTF-8',
                    "Access-Control-Allow-Origin": "*",
                    "X-MBX-APIKEY": this.apiKeys["apiKey"]
                   }
          }).then(res => this.handleEnterOrder(res))
        },
        async takeProfitOrder(symbol, side, price, size){
          this.cancelTradingStopOrders("TAKE_PROFIT_MARKET")
          if (price !== 0){
            const queryString=`symbol=${symbol}&side=${side.toUpperCase()}&type=TAKE_PROFIT_MARKET&stopPrice=${price}&timeInForce=GTC&closePosition=false&quantity=${size}`
            const signedQuery = this.createSignedQueryString(queryString)
            const url = `${this.restApiUrl}fapi/v1/order?${signedQuery}`
            /* fetch is used instead of axios because of bug in latter */
            fetch(url, {
            method: "POST",
            headers: {"Content-Type": 'application/json;charset=UTF-8',
                      "Access-Control-Allow-Origin": "*",
                      "X-MBX-APIKEY": this.apiKeys["apiKey"]
                    }
            }).then(res => this.handleTradingStops(res))
          }
        },
        async stoplossOrder(symbol, side, price, size){
          this.cancelTradingStopOrders("STOP_MARKET")
          if (price !== 0){
            const queryString=`symbol=${symbol}&side=${side.toUpperCase()}&type=STOP_MARKET&stopPrice=${price}&timeInForce=GTC&closePosition=false&quantity=${size}`
            const signedQuery = this.createSignedQueryString(queryString)
            const url = `${this.restApiUrl}fapi/v1/order?${signedQuery}`
            /* fetch is used instead of axios because of bug in latter */
            fetch(url, {
            method: "POST",
            headers: {"Content-Type": 'application/json;charset=UTF-8',
                      "Access-Control-Allow-Origin": "*",
                      "X-MBX-APIKEY": this.apiKeys["apiKey"]
                    }
            }).then(res => this.handleTradingStops(res))
          }
        },
        async trailingSLOrder(symbol, side, price, size){
          this.cancelTradingStopOrders("TRAILING_STOP")
          if (price !== 0){
            const queryString=`symbol=${symbol}&side=${side.toUpperCase()}&type=TRAILING_STOP_MARKET&activatePrice=${price}&closePosition=false&quantity=${size}&callbackRate=1`
            const signedQuery = this.createSignedQueryString(queryString)
            const url = `${this.restApiUrl}fapi/v1/order?${signedQuery}`
            /* fetch is used instead of axios because of bug in latter */
            fetch(url, {
            method: "POST",
            headers: {"Content-Type": 'application/json;charset=UTF-8',
                      "Access-Control-Allow-Origin": "*",
                      "X-MBX-APIKEY": this.apiKeys["apiKey"]
                    }
            }).then(res => this.handleTradingStops(res))
          }
        },
        cancelTradingStopOrders(orderType){
          const openOrders = store.getters.getOpenOrdersByExchangeInstrument("binance", store.getters.getAsset)
          if (openOrders === void(0) && !openOrders.length){
            return
          } else {
            openOrders.forEach(order => {
              if (order["orderType"] === orderType){
                  this.cancelOrder(order["order_id"])
              }
            })
          }
        },
        cancelOrder(order_id) {
          const queryString = `symbol=${store.getters.getAsset}&orderId=${order_id}`;
          axios
            .delete(
              `${this.restApiUrl}fapi/v1/order?${this.createSignedQueryString(
                queryString
              )}`,
              {
                headers: { "X-MBX-APIKEY": this.apiKeys["apiKey"] },
              }
            )
            .then((res) => this.handleCancelOrder(res.data))
            .catch((err) => console.error(err));
        },

        async cancelAllOrders() {},

        async getOpenOrders(asset) {
          const queryString = `symbol=${store.getters.getAsset}`;
          axios
            .get(
              `${
                this.restApiUrl
              }/fapi/v1/openOrders?${this.createSignedQueryString(
                queryString
              )}`,
              {
                headers: { "X-MBX-APIKEY": this.apiKeys["apiKey"] },
              }
            )
            .then((res) => this.handleOpenOrders(res.data))
            .catch((err) => console.error(err));
        },

        keepAlive() {
          if (!this.refreshListenKey) {
            return;
          }
          axios
            .put(
              `${this.restApiUrl}fapi/v1/listenKey`,
              {},
              {
                headers: { "X-MBX-APIKEY": this.apiKeys["apiKey"] },
              }
            )
            .then((res) => this.handleListenKey(res.data))
            .catch((err) => console.error(err));
          // refresh listen key every 50 minutes
          setTimeout(() => this.getListenKey(), 50 * 60 * 1000);
        },
        getListenKey() {
          axios
            .post(
              `${this.restApiUrl}fapi/v1/listenKey`,
              {},
              {
                headers: { "X-MBX-APIKEY": this.apiKeys["apiKey"] },
              }
            )
            .then((res) => this.handleListenKey(res.data))
            .catch((err) => console.error(err));
          // refresh listen key every 50 minutes
          setTimeout(() => this.keepAlive(), 50 * 60 * 1000);
        },
        getPositions(symbol = "") {
          if (symbol === ""){
            const queryString = `symbol=${store.getters.getAsset}`;
          } else {
            const queryString = `symbol=symbol`;
          }
          axios
            .get(
              `${
                this.restApiUrl
              }/fapi/v2/positionRisk?${this.createSignedQueryString(
                queryString
              )}`,
              {
                headers: { "X-MBX-APIKEY": this.apiKeys["apiKey"] },
              }
            )
            .then((res) => this.handlePositions(res.data))
            .catch((err) => console.error(err));
        },
        getAssets() {
          axios
            .get(`${this.restApiUrl}fapi/v1/exchangeInfo`)
            .then((res) => this.handleGetAssets(res.data))
            .catch((err) => console.error(err));
        },
        getWalletBalance(){
          const queryString = ``;
          const data = axios
            .get(
              `${this.restApiUrl}/fapi/v2/balance?${this.createSignedQueryString(queryString)}`,
              {
                headers: { "X-MBX-APIKEY": this.apiKeys["apiKey"] },
              })
            .then(res => this.handleGetBalance(res.data))
            .catch(err => this.handleError(err))
        },
        getBBA(symbol){
          // get best bid and ask
          const queryString = `symbol=${symbol}`;
          const data = axios
            .get(`${this.restApiUrl}/fapi/v1/ticker/bookTicker?${queryString}`)
            .then(res => {
              store.commit("setBBA", {
                  symbol: res.data.symbol.toLowerCase(),
                  bestBid: res.data.bidPrice,
                  bestAsk: res.data.askPrice,
                })
            })
            .catch(err => this.handleError(err))
        },
        setLeverage(leverage, coin){
          let queryString = `symbol=${coin}&marginType=ISOLATED`
          let signedQuery = this.createSignedQueryString(queryString)
          let url = `${this.restApiUrl}fapi/v1/marginType?${signedQuery}`
          /* fetch is used instead of axios because of bug in latter */
          fetch(url, {
          method: "POST",
          headers: {"Content-Type": 'application/json;charset=UTF-8',
                    "Access-Control-Allow-Origin": "*",
                    "X-MBX-APIKEY": this.apiKeys["apiKey"]
                  }
          })
          queryString = `symbol=${coin}&leverage=${leverage}`
          signedQuery = this.createSignedQueryString(queryString)
          url = `${this.restApiUrl}fapi/v1/leverage?${signedQuery}`
          /* fetch is used instead of axios because of bug in latter */
          fetch(url, {
          method: "POST",
          headers: {"Content-Type": 'application/json;charset=UTF-8',
                    "Access-Control-Allow-Origin": "*",
                    "X-MBX-APIKEY": this.apiKeys["apiKey"]
                  }
          })
        },
      },
      computed: {
        ...mapGetters(["getApiKeys"]),
      },
      created() {},
    });
  },
};
