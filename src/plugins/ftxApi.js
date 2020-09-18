/* eslint-disable */

import hmacSHA256 from "crypto-js/hmac-sha256";
import ReconnectingWebSocket from "reconnecting-websocket";

import store from "../store";
import { mapGetters } from "vuex";
import axios from "axios";
import { times } from "lodash";

export default {
  install(Vue) {
    Vue.prototype.$ftxApi = new Vue({
      store,
      data: {
        ws: null,
        apiKeys: null,
        restApiUrl: "",
        refreshListenKey: false,
        leverage: 0,
      },
      methods: {
        delay(period){
          return new Promise(resolve => setTimeout(resolve, period))
        },
        handleError(err){
          this.$notify({
            text: err,
            type: `error`,
          })
        },
        initWs() {
          this.apiKeys = store.getters.getApiKeys;
          const key = this.apiKeys["apiKey"];
          const secret = this.apiKeys["apiSecret"];
          const streamUrl =
            store.getters.getWsUrlByExchange("ftx");
          this.restApiUrl = store.getters.getRestUrlByExchange("ftx");
          this.ws = new ReconnectingWebSocket(streamUrl);
          this.getAssets();
          this.getLeverage();
          this.ws.onerror = (err) => {
            console.log(err);
          };
          this.ws.onopen = () => {
            let timestamp = Date.now();
            let signature = hmacSHA256(`${timestamp}websocket_login`, this.apiKeys["apiSecret"]).toString();

            this.ws.send(
                JSON.stringify({
                  "args": {
                    "key": this.apiKeys.apiKey, 
                    "sign": signature,
                    "time": timestamp,
                  },
                  "op": 'login',
                }));
            
            setTimeout(() => {
              this.ws.send(
                JSON.stringify({
                  op: "subscribe",
                  channel: "orders",
                })
              );
            }, 500);
          };
          
          this.ws.onmessage = (e) => {
            let data = JSON.parse(e.data);
            this.handleOnMessage(data);
            };
        },
        startApi() {
          this.getOpenOrders()
          this.ws.send(`{"op":"subscribe","channel":"ticker","market":"${store.getters.getAsset}"}`);
        },
        closeApi() {
          this.ws.close();
        },
        getSignedHeader(method, url, data="") {
          const timestamp = Date.now();
          let dataString = `${timestamp}${method}${url}`;
          if (method === "POST"){
            dataString += JSON.stringify(data)
          }
          return {
            "FTX-KEY": this.apiKeys["apiKey"],
            "FTX-SIGN": hmacSHA256(dataString, this.apiKeys["apiSecret"]).toString(),
            "FTX-TS":  timestamp,
          }
        },
        handleOnMessage(data) {
          if (data.channel === `ticker` && store.getters.getAsset !== ""){
            axios
            .get(`${this.restApiUrl}/futures/${store.getters.getAsset}`)
            .then(res => this.handleFutures(res.data.result))
            .catch(err => this.handleError(err))
            this.getPositions()
          }
          if (data.channel === 'orders' && "data" in data){
            const item = data.data
            store.commit("setOpenOrders", {
              exchange: "ftx",
              openOrders: [{
                instrument_name: item["market"],
                side: item["side"].toLowerCase(),
                order_id: item["id"],
                order_state: item["status"].toUpperCase(),
                quantity: item["size"],
                orderPrice: item["price"],
                orderType: item["type"],
                orderTimeInForce:
                item["ioc"]
                  ? "Immediate or Cancel"
                  : item["postOnly"]
                  ? "Post Only" 
                  : "Good Till Cancelled",
                  orderUpdated: new Date(Date.now()).toLocaleString(),
              }]
            })
          }
        },
        handleFutures(result){
          let markPrice = 0.0
          let lastPrice = 0.0
          let instrument = ""
          lastPrice = parseFloat(Number(result.last).toFixed(5));
          markPrice = parseFloat(Number(result.mark).toFixed(5));
          instrument = result.name
          if (markPrice !== 0){
            store.commit("setMarkPrice", {
              exchange: "ftx",
              instrument,
              markPrice,
            });
          }
          if (lastPrice !== 0){
            store.commit("setLastPrice", {
              exchange: "ftx",
              instrument,
              lastPrice,
            });
          }
        },
        handleGetAssets(result) {
          let assets = [];
          let tickSizes = []
          result.filter(value => value.name.substr(value.name.length -4) === "PERP")
            .forEach((value) => {
              assets.push(value["name"]);
              tickSizes.push({
                symbol: value["name"],
                tickSize: parseFloat(value["priceIncrement"]),
                minStepSize: parseFloat(value["sizeIncrement"])
              })
            });
          store.commit("setAssets", assets.sort());
          store.commit("setTickSizes", tickSizes)
        },
        async handleOpenOrders(data) {
          store.commit("setOpenOrders", {
            exchange: "ftx",
            openOrders: data.result
                        .map((item) => {
              return {
                instrument_name: item["future"],
                side: item["side"].toLowerCase(),
                order_id: item["id"],
                order_state: item["status"].toUpperCase(),
                quantity: item["size"],
                orderPrice: item["price"],
                orderType: item["type"],
                orderTimeInForce:
                  item["ioc"]
                    ? "Immediate or Cancel"
                    : item["postOnly"]
                    ? "Post Only" 
                    : "Good Till Cancelled",
                orderUpdated: new Date(item["createdAt"]).toLocaleString(),
              };
            }),
          });
        },
        async handleCancelOrder(res) {
          if (res.data.success) {
            this.$notify({
              text: `Order cancelled`,
              type: `success`,
            }) 
          } else { 
            this.$notify({
              text: data,
              type: `error`,
            })
          }
        },
        async handleEnterOrder(res) {
          if (res.data.success){
            this.$notify({
              text: 'Order placed',
              type: 'success',
            });
          } else {
            this.$notify({
              text: res,
              type: 'error',
            });
          }
        },
        async handleTradingStops(res) {
          if (res.data.succes) {
            this.$notify({
              text: 'Trading stops changed',
              type: 'success',
            });
          } else {
            this.$notify({
              text: res.data.ret_msg,
              type: 'error',
            });
          }
        },
        async handleListenKey(result) {},
        async handlePositions(result) {
          const positions = result.result
          positions.forEach(position => {
            if (position.size === 0 || position.future.substr(position.future.length - 4) !== "PERP") {
              return
            }
            let a = []
            const lastPrice = store
                    .getters.getLastAndMarkPriceByExchangeInstrument("ftx", store.getters.getAsset)
                    .lastPrice
            a.push({
              symbol: position["future"],
              side: position["side"].toLowerCase(),
              size: Math.abs(parseFloat(position["size"])),
              position_value: parseFloat(position["netSize"]) * parseFloat(lastPrice),
              entry_price: parseFloat(position["entryPrice"]),
              leverage: this.leverage,
              liq_price: parseFloat(position["estimatedLiquidationPrice"]),
              position_margin: parseFloat(position["initialMarginRequirement"]),
              unrealised_pnl_last: parseFloat(position["realizedPnl"]),
            })
            store.commit("setOpenPositions", {
              exchange: "ftx",
              result: a,
            })
          })
        },
        async enterOrders(instrument, type, reduce_only, orders) {
          orders.forEach(async (order) => {
            const data = {
              market: store.getters.getAsset,
              side: order.side.toLowerCase(),
              price: order.price,
              type: "limit",
              size: order.quantity,
              reduceOnly: reduce_only,
              postOnly: true,
            }
            const header = this.getSignedHeader("POST", "/api/orders", data)
            axios
              .post(`${this.restApiUrl}/orders`, data, {headers: header })
              .then(res => this.handleEnterOrder(res))
              .catch(err => this.handleError(err))
            await this.delay(500)
          })
        },
        async marketOrder(asset, side, size) {
          const data = {
            market: store.getters.getAsset,
            side: side.toLowerCase(),
            price: 0,
            type: "market",
            size,
          }
          const header = this.getSignedHeader("POST", "/api/orders", data)
          axios
            .post(`${this.restApiUrl}/orders`, data, {headers: header })
            .then(res => this.handleEnterOrder(res))
            .catch(err => this.handleError(err))
          await this.delay(500)
      },
        async takeProfitOrder(symbol, side, price, size){
          // this.cancelConditionalOrder("takeProfit")
          if (price && price !== 0){
            const data = {
              market: store.getters.getAsset,
              side: side.toLowerCase(),
              triggerPrice: price,
              type: "takeProfit",
              size,
            }
            const header = this.getSignedHeader("POST", "/api/conditional_orders", data)
            fetch(`${this.restApiUrl}/conditional_orders`, {
              method: "POST",
              headers: header,
              body: data,
            })
            this.delay(500)
          }
        },
        async stoplossOrder(symbol, side, price, size){
          return
          this.cancelConditionalOrder("stop")
          if (price && price !== 0){
            const data = {
              market: store.getters.getAsset,
              side: side.toLowerCase(),
              triggerPrice: price,
              type: "stop",
              size,
            }
            const header = this.getSignedHeader("POST", "/api/conditional_orders", data)
            axios
              .post(`${this.restApiUrl}/conditional_orders`, data, {headers: header })
              .then(res => this.handleTradingStops(res))
              .catch(err => this.handleError(err))
            await this.delay(500)
          }
        },
        async trailingSLOrder(symbol, side, price, size){
          return
          this.cancelConditionalOrder("trailingStop")
          if (price && price !== 0){
            const data = {
              market: store.getters.getAsset,
              side: side.toLowerCase(),
              trailValue: price,
              type: "trailingStop",
              size,
            }
            const header = this.getSignedHeader("POST", "/api/conditional_orders", data)
            axios
              .post(`${this.restApiUrl}/conditional_orders`, data, {headers: header })
              .then(res => this.handleTradingStops(res))
              .catch(err => this.handleError(err))
            this.delay(500)
          }
        },
        async cancelConditionalOrder(orderType){
          return
          const asset = store.getters.getAsset
          const headers = this.getSignedHeader("GET", 
                       `/api/conditional_orders?market=${asset}&type=${orderType}`)
          axios
            .get(`${this.restApiUrl}/conditional_orders?market=${asset}&type=${orderType}`
                  , { headers: headers })
            .then(async (res) => {
              if (res.data.result.length){
              const order_id = res.data.result[0].id
              const headers = this.getSignedHeader("DELETE", `/api/conditional_orders/${order_id}`)
              axios
                .delete(`${this.restApiUrl}/conditional_orders/${order_id}`, { headers: headers })
                .then(res => this.handleCancelOrder(res))
                .catch(err => this.handleError(err))
              await this.delay(500)  
            }})
            .catch(err => this.handleError(err))
        },
        async cancelOrder(order_id) {
          const asset = store.getters.getAsset
          const headers = this.getSignedHeader("DELETE", `/api/orders/${order_id}`)
          axios
            .delete(`${this.restApiUrl}/orders/${order_id}`, { headers: headers })
            .then(res => this.handleCancelOrder(res))
            .catch(err => this.handleError(err))
          await this.delay(500)
        },
        async cancelAllOrders() {},
        async getOpenOrders() {
          const asset = store.getters.getAsset
          const headers = this.getSignedHeader("GET", `/api/orders?market=${asset}`)
          axios
            .get(`${this.restApiUrl}/orders?market=${asset}`, { headers: headers })
            .then(res => this.handleOpenOrders(res.data))
            .catch(err => this.handleError(err))
      },
        keepAlive() {},
        getListenKey() {},
        getPositions() {
          const headers = this.getSignedHeader("GET", "/api/positions")
          axios
            .get(`${this.restApiUrl}/positions`, { headers: headers })
            .then(res => this.handlePositions(res.data))
            .catch(err => this.handleError(err))
        },
        getLeverage() {
          const headers = this.getSignedHeader("GET", "/api/account")
          axios
            .get(`${this.restApiUrl}/account`, { headers: headers })
            .then(res => { this.leverage = res.data.result.leverage})
            .catch(err => this.handleError(err))
        },
        async getAssets() {
          axios
            .get(`${this.restApiUrl}/markets`)
            .then(result => this.handleGetAssets(result.data.result))
            .catch(err => this.handleError(err))
        },
      },
      computed: {
        ...mapGetters(["getApiKeys"]),
      },
      created() {},
    });
  },
};
