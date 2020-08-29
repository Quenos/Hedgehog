/* eslint-disable */

import hmacSHA256 from "crypto-js/hmac-sha256";
import ReconnectingWebSocket from "reconnecting-websocket";

import store from "../store";
import { mapGetters } from "vuex";
import axios from "axios";
import { times } from "lodash";

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
          this.apiKeys = store.getters.getApiKeys;
          const key = this.apiKeys["apiKey"];
          const secret = this.apiKeys["apiSecret"];
          const streamUrl =
            store.getters.getWsUrlByExchange("binance") +
            `/ws/!markPrice@arr@1s/!ticker@arr`;
          this.restApiUrl = store.getters.getRestUrlByExchange("binance");
          this.ws = new ReconnectingWebSocket(streamUrl);
          this.getAssets();
          this.ws.onerror = (err) => {
            console.log("in the error");
            console.log(err);
          };
          this.ws.onopen = () => {
            this.ws.onmessage = (e) => {
              let data = JSON.parse(e.data);
              this.handleOnMessage(data);
            };
          };
        },
        startApi() {
          // this.getOpenOrders(store.getters.getAsset.substring(0, 3));
          this.refreshListenKey = true;
          this.getListenKey();
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
          const recvWindow = 120000
          const stringToSign = `${queryString}&recvWindow=${recvWindow}&timestamp=${timestamp}`;
          const signature = hmacSHA256(
            stringToSign,
            this.apiKeys["apiSecret"]
          ).toString();
          console.log(signature)
          console.log(timestamp)
          return `${queryString}&recvWindow=${recvWindow}&signature=${signature}&timestamp=${timestamp}`;
        },
        handleOnMessage(data) {
          const markPrice = data
            .filter((value) => value.e === "markPriceUpdate")
            .forEach((item) => {
              store.commit("setMarkPrice", {
                exchange: "binance",
                instrument: item.s,
                markPrice: parseFloat(item.p),
              });
            });

          const lastPrice = data
            .filter((value) => value.e === "24hrTicker")
            .forEach((item) => {
              store.commit("setLastPrice", {
                exchange: "binance",
                instrument: item.s,
                lastPrice: parseFloat(item.c),
              });
            });
        },
        handleGetAssets(result) {
          let assets = [];
          let tickSizes = []
          result.symbols.forEach((value) => {
            assets.push(value["symbol"]);
            tickSizes.push({
              symbol: value["symbol"],
              tickSize: parseFloat(value.filters[0]["tickSize"])
            })
          });
          store.commit("setAssets", assets.sort());
          store.commit("setTickSizes", tickSizes)
        },
        handleUdsOnMessage(data) {
          console.log("handelUdsMsg");
          console.log(data);
          if (data.e === "ORDER_TRADE_UPDATE") {
            const item = data.o;
            let a = [];
            a.push({
              instrument_name: item["s"],
              side: item["S"].toLowerCase(),
              order_id: item["i"],
              order_state: item["x"],
              quantity: item["q"],
              orderPrice: item["p"],
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
          console.log(data);
          store.commit("setOpenOrders", {
            exchange: "binance",
            openOrders: data.map((item) => {
              return {
                instrument_name: item["symbol"],
                side: item["side"].toLowerCase(),
                order_id: item["orderId"],
                order_state: item["status"],
                quantity: item["origQty"],
                orderPrice: item["price"],
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
        handleCancelOrder(data) {},
        handleEnterOrder(data) {
          console.log(data);
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
            });
          });
          store.commit("setOpenPositions", {
            exchange: "binance",
            result: a,
          });
        },

        async enterOrders(instrument, type, reduce_only, orders) {
          orders.forEach(order => {
            const queryString=`symbol=${instrument}&side=${order.side.toUpperCase()}&type=${type.toUpperCase()}&quantity=${order.quantity}&price=${order.price}&reduceOnly=${reduce_only}&timeInForce=GTC`
            const signedQuery = this.createSignedQueryString(queryString)
            const url = `${this.restApiUrl}fapi/v1/order?${signedQuery}`
            /* fetch is used instead of axios because of bug in latter */
            const response = fetch(url, {
            method: "POST",
            headers: {"Content-Type": 'application/json;charset=UTF-8',
                      "Access-Control-Allow-Origin": "*",
                      "X-MBX-APIKEY": this.apiKeys["apiKey"]
                     }
            })

            /* handle stop loss orders */
            console.log(order.stop_loss)
            if (order.stop_loss !== ""){
              const side = order.side.toUpperCase() === "BUY" ? "SELL" : "BUY"
              const queryString=`symbol=${instrument}&side=${side}&type=STOP_MARKET&stopPrice=${order.stop_loss}&timeInForce=GTC&closePosition=true`
              const signedQuery = this.createSignedQueryString(queryString)
              const url = `${this.restApiUrl}fapi/v1/order?${signedQuery}`
              /* fetch is used instead of axios because of bug in latter */
              const response = fetch(url, {
              method: "POST",
              headers: {"Content-Type": 'application/json;charset=UTF-8',
                        "Access-Control-Allow-Origin": "*",
                        "X-MBX-APIKEY": this.apiKeys["apiKey"]
                       }
              })  
            }

            /* handle take profit orders */
            if (order.take_profit !== ""){
              const side = order.side.toUpperCase() === "BUY" ? "SELL" : "BUY"
              const queryString=`symbol=${instrument}&side=${side}&type=TAKE_PROFIT_MARKET&stopPrice=${order.take_profit}&timeInForce=GTC&closePosition=true`
              const signedQuery = this.createSignedQueryString(queryString)
              const url = `${this.restApiUrl}fapi/v1/order?${signedQuery}`
              /* fetch is used instead of axios because of bug in latter */
              const response = fetch(url, {
              method: "POST",
              headers: {"Content-Type": 'application/json;charset=UTF-8',
                        "Access-Control-Allow-Origin": "*",
                        "X-MBX-APIKEY": this.apiKeys["apiKey"]
                       }
              })  
            }
          })
        },

        async marketOrder(asset, side, size) {
          const queryString=`symbol=${asset}&side=${side.toUpperCase()}&type=MARKET&quantity=${size}`
          const signedQuery = this.createSignedQueryString(queryString)
          const url = `${this.restApiUrl}fapi/v1/order?${signedQuery}`
          /* fetch is used instead of axios because of bug in latter */
          const response = fetch(url, {
          method: "POST",
          headers: {"Content-Type": 'application/json;charset=UTF-8',
                    "Access-Control-Allow-Origin": "*",
                    "X-MBX-APIKEY": this.apiKeys["apiKey"]
                   }
                  })
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
        getPositions() {
          const queryString = `symbol=${store.getters.getAsset}`;
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
      },
      computed: {
        ...mapGetters(["getApiKeys"]),
      },
      created() {},
    });
  },
};
