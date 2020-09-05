/* eslint-disable */

import hmacSHA256 from "crypto-js/hmac-sha256";
import ReconnectingWebSocket from "reconnecting-websocket";

import store from "../store";
import { mapGetters } from "vuex";
import axios from "axios";
import { times } from "lodash";

export default {
  install(Vue) {
    Vue.prototype.$bybitApi = new Vue({
      store,
      data: {
        ws: null,
        apiKeys: null,
        restApiUrl: "",
        refreshListenKey: false,
      },
      methods: {
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
            store.getters.getWsUrlByExchange("bybit");
          this.restApiUrl = store.getters.getRestUrlByExchange("bybit");
          this.ws = new ReconnectingWebSocket(streamUrl);
          this.getAssets();
          this.ws.onerror = (err) => {
            console.log(err);
          };
          this.ws.onopen = () => {
            let expires = Date.now() + 1500;
            let signature = hmacSHA256(`GET/realtime${expires}`, this.apiKeys["apiSecret"]).toString();

            this.ws.send(
                JSON.stringify({
                  'op': 'auth',
                  'args': [this.apiKeys.apiKey, expires, signature],
                }));
            
            setTimeout(() => {
              this.ws.send('{"op":"subscribe","args":["order"]}');
            }, 500);
          };
          
          this.ws.onmessage = (e) => {
            let data = JSON.parse(e.data);
            this.handleOnMessage(data);
            };
        },
        startApi() {
          this.refreshListenKey = true;
          this.ws.send(`{"op":"subscribe","args":["instrument_info.100ms.${store.getters.getAsset}"]}`);
          this.getPositions();
          this.getOpenOrders(1);
        },
        closeApi() {
          this.ws.close();
        },
        signData(data) {
          data.api_key = this.apiKeys["apiKey"];
          data.timestamp = Date.now() - 2000;
          data.recv_window = 25000;
          let dataString = this.objToString(this.sortObject(data));
          data.sign = hmacSHA256(dataString, this.apiKeys["apiSecret"]).toString();
          return this.sortObject(data);
        },
        sortObject(o) {
          let sorted = {},
              key,
              a = [];
          for (key in o) {
            if (o.hasOwnProperty(key)) {
              a.push(key);
            }
          }
          a.sort();
          for (key = 0; key < a.length; key++) {
            sorted[a[key]] = o[a[key]];
          }
          return sorted;
        },
        objToString(data) {
          return Object.keys(data).map(function(k) {
            return encodeURIComponent(k) + '=' + encodeURIComponent(data[k]);
          }).join('&');
        },
        handleOnMessage(data) {
          switch (data.topic) {
            case `instrument_info.100ms.${store.getters.getAsset}`:
              let markPrice = 0.0
              let lastPrice = 0.0
              let instrument = ""
              if (data.type === 'snapshot') {
                lastPrice = parseFloat(Number(data.data.last_price_e4 + 'e-4').toFixed(5));
                markPrice = parseFloat(Number(data.data.mark_price_e4 + 'e-4').toFixed(5));
                instrument = data.data.symbol
              }
              if (data.type === 'delta') {
                if (data.data.update[0].last_price_e4) {
                  lastPrice = parseFloat(Number(data.data.update[0].last_price_e4 + 'e-4').toFixed(5));
                }
                if (data.data.update[0].mark_price_e4) {
                  markPrice = parseFloat(Number(data.data.update[0].mark_price_e4 + 'e-4').toFixed(5));
                }
                instrument = data.data.update[0].symbol
              }
              if (markPrice !== 0){
                store.commit("setMarkPrice", {
                  exchange: "bybit",
                  instrument,
                  markPrice,
                });
              }
              if (lastPrice !== 0){
                store.commit("setLastPrice", {
                  exchange: "bybit",
                  instrument,
                  lastPrice,
                });
              }
              this.getPositions()
              break;
            case 'order' :
              store.commit("setOpenOrders", {
                exchange: "bybit",
                openOrders: data.data.map((item) => {
                  return {
                    instrument_name: item["symbol"],
                    side: item["side"].toLowerCase(),
                    order_id: item["order_id"],
                    order_state: item["order_status"].toUpperCase(),
                    quantity: item["qty"],
                    orderPrice: item["price"],
                    orderType: item["order_type"],
                    orderTimeInForce:
                      item["time_in_force"] === "GoodTillCancel"
                        ? "Good till cancelled"
                        : item["time_in_force"] === "ImmediateOrCancel"
                        ? "Immediate or cancel" 
                        : item["time_in_force"] === "PostOnly" 
                        ? "Post Only" 
                        : "Fill or Kill",
                    orderUpdated: new Date(item["timestamp"]).toLocaleString(),
                  };
                }),
              });
              break;
            default :
              console.log(data);
              break;
          }
        },
        handleGetAssets(result) {
          let assets = [];
          let tickSizes = []
          result.forEach((value) => {
            assets.push(value["name"]);
            tickSizes.push({
              symbol: value["name"],
              tickSize: parseFloat(value.price_filter["tick_size"]),
              minStepSize: parseFloat(value.price_filter["tick_size"])
            })
          });
          store.commit("setAssets", assets.sort());
          store.commit("setTickSizes", tickSizes)
        },
        async handleOpenOrders(data, page) {
          store.commit("setOpenOrders", {
            exchange: "bybit",
            openOrders: data.data.map((item) => {
              return {
                instrument_name: item["symbol"],
                side: item["side"].toLowerCase(),
                order_id: item["order_id"],
                order_state: item["order_status"].toUpperCase(),
                quantity: item["qty"],
                orderPrice: item["price"],
                orderType: item["order_type"],
                orderTimeInForce:
                  item["time_in_force"] === "GoodTillCancel"
                    ? "Good till cancelled"
                    : item["time_in_force"] === "ImmediateOrCancel"
                    ? "Immediate or cancel" 
                    : item["time_in_force"] === "PostOnly" 
                    ? "Post Only" 
                    : "Fill or Kill",
                orderUpdated: new Date(item["created_at"]).toLocaleString(),
              };
            }),
          });
          if (data.last_page > page){
            this.getOpenOrders(page+1)
          }
        },
        async handleCancelOrder(data) {
          if (data === `OK`) {
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
          if (res.data.ret_msg === 'OK') {
            this.$notify({
              text: 'Order placed',
              type: 'success',
            });
          } else {
            this.$notify({
              text: res.data.ret_msg,
              type: 'error',
            });
          }
        },
        async handleTradingStops(res) {
          if (res.data.ret_msg === 'ok') {
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
          if (result.ret_msg.toLowerCase() === 'ok'){
            const data = result.result
            let a = []
            if (!parseFloat(data["size"])) {
              return;
            }
            a.push({
              symbol: data["symbol"],
              side: data["side"].toLowerCase(),
              size: Math.abs(parseFloat(data["size"])),
              position_value: parseFloat(data["position_value"]),
              take_profit: parseFloat(data["take_profit"]),
              stop_loss: parseFloat(data["stop_loss"]), 
              trailing_stop: parseFloat(data["trailing_stop"]), 
              entry_price: parseFloat(data["entry_price"]),
              liq_price: parseFloat(data["liq_price"]),
              position_margin: parseFloat(data["position_margin"]),
              leverage: data["leverage"],
              unrealised_pnl_last: parseFloat(data["unrealised_pnl"]),
              realised_pnl: parseFloat(data["cum_realised_pnl"]),
              daily_total: parseFloat(data["realised_pnl"]),
            });
            store.commit("setOpenPositions", {
              exchange: "bybit",
              result: a,
            })
          } else {
            this.$notify({
              text: result.data.ret_msg +
                    ((res.data.ret_code === 10002) ? '<br> server_time : ' +
                    res.data.time_now + '<br> request_time : ' +
                    data.timestamp : ''),
              type: 'error',
            })
          }
        },
        async enterOrders(instrument, type, reduce_only, orders) {
          orders.forEach(order => {
            const data = {
              side: order.side.toLowerCase() === "buy" ? "Buy" : "Sell",
              symbol: store.getters.getAsset,
              order_type: "Limit",
              qty: order.quantity,
              price: order.price,
              time_in_force: "PostOnly",
            }
            axios
              .post(`${this.restApiUrl}/v2/private/order/create`,
                    this.signData(data))
              .then(res => this.handleEnterOrder(res))
              .catch(err => this.handleError(err))
          })
        },
        async marketOrder(asset, side, size) {
          const data = {
            side: side.toUpperCase() === 'BUY' ? 'Buy' : 'Sell',
            symbol: store.getters.getAsset,
            order_type: 'Market',
            qty: size,
            time_in_force: 'GoodTillCancel',
          }
          axios.post(`${this.restApiUrl}/v2/private/order/create`, this.signData(data))
          .then(res => this.handleEnterOrder(res))
          .catch(err => this.handleError(err));
        },
        async takeProfitOrder(symbol, side, price, size){
          let data = {
            symbol,
            take_profit: price,
          };
          axios
          .post(
            `${this.restApiUrl}/open-api/position/trading-stop`,
            this.signData(data))
          .then(res => this.handleTradingStops(res)
          .catch(err => this.handleError(err)))
        },
        async stoplossOrder(symbol, side, price, size){
          let data = {
            symbol: symbol,
            stop_loss: price,
          };
          axios
            .post(
              `${this.restApiUrl}/open-api/position/trading-stop`,
              this.signData(data))
            .then(res => this.handleTradingStops(res)
            .catch(err => this.handleError(err)))
        },
        async trailingSLOrder(symbol, side, price, size){
          let data = {
            symbol: symbol,
            trailing_stop: price,
          };
          axios
            .post(
              `${this.restApiUrl}/open-api/position/trading-stop`,
              this.signData(data))
            .then(res => this.handleTradingStops(res)
            .catch(err => this.handleError(err)))
        },
        async cancelOrder(order_id) {
          let data = {
            order_id,
            symbol: store.getters.getAsset,
          };
          axios
          .post(`${this.restApiUrl}/v2/private/order/cancel`, this.signData(data))
          .then(res => this.handleCancelOrder(res.data.ret_msg))
          .catch(err => this.handleError(err))
        },
        async cancelAllOrders() {},
        async getOpenOrders(page = 1) {
          const data = {
            'order_status': 'New',
            'symbol': store.getters.getAsset,
            'page': page,
          };
          let options = {
            params: this.signData(data),
          };
          axios
            .get(`${this.restApiUrl}/open-api/order/list`, options)
            .then(res => this.handleOpenOrders(res.data.result, page))
            .catch(err => this.handleError(err))
      },
        keepAlive() {},
        getListenKey() {},
        getPositions() {
          const data = {
            symbol: store.getters.getAsset,
          }
          const options = {
            params: this.signData(data),
          }
          axios
            .get(`${this.restApiUrl}/v2/private/position/list`, options)
            .then(result => this.handlePositions(result.data))
            .catch(err => this.handleError(err))
        },
        async getAssets() {
          axios
            .get(`${this.restApiUrl}/v2/public/symbols`)
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
