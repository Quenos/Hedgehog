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
        },
        closeApi() {
          this.refreshListenKey = false;
          this.ws.close();
          this.uds.close();
        },
        createSignedQueryString(queryString) {
          const timestamp = Date.now();
          const stringToSign = `${queryString}&recvWindow=5000&timestamp=${timestamp}`;
          const signature = hmacSHA256(
            stringToSign,
            this.apiKeys["apiSecret"]
          ).toString();
          return `${stringToSign}&signature=${signature}`;
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
          let a = [];
          result.symbols.forEach((value) => {
            a.push(value["symbol"]);
          });
          store.commit("setAssets", a);
        },
        handleUdsOnMessage(data) {
          console.log(data);
          if (data.e === "ORDER_TRADE_UPDATE" || data.a.m !== "ORDER") {
            return
          } 
          // since the user data string doesn't contain all the info needed we make a call to getPositions
          this.getPositions()
        },
        handleOpenOrders(data) {
          
        },
        handleListenKey(result) {
          console.log(result);
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
          console.log(data);
          let a = [];
          data.forEach((value) => {
            if (!parseFloat(value["positionAmt"])) {
              return
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

        async enterOrders(instrument, type, post_only, reduce_only, orders) {},

        async marketOrder(asset, side, size) {},

        async cancelOrder(order_id) {},

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
