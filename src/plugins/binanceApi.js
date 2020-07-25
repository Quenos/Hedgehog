/* eslint-disable */

import hmacSHA256 from "crypto-js/hmac-sha256";
import ReconnectingWebSocket from "reconnecting-websocket";

import store from "../store";
import { mapGetters } from "vuex";

export default {
  install(Vue) {
    Vue.prototype.$binanceApi = new Vue({
      store,
      data: {
        ws: null,
      },
      methods: {
        initWs() {
          let apiKeys = store.getters.getApiKeys
          console.log(apiKeys)
          const key = apiKeys["apiKey"];
          const secret = apiKeys["apiSecret"];
          let streamUrl = store.getters.getWsUrlByExchange("binance") + `/ws/${"!markPrice@arr@1s"}`
          this.ws = new ReconnectingWebSocket(
            streamUrl
          );

          this.ws.onerror = (err) => {
            console.log('in the error')
            console.log(err)
          }
          this.ws.onopen = () => {
            const timestamp = Date.now();
            const stringToSign = timestamp + "\n" + "Nonce" + "\n" + "";
            const signature = hmacSHA256(stringToSign, secret).toString();

            this.ws.onmessage = (e) => {
              let data = JSON.parse(e.data);
              this.handleOnMessage(data);
            };
          };
        },
        handleOnMessage(data) {
          // console.log(data)
        },
        async enterOrders(instrument, type, post_only, reduce_only, orders) {
        },

        async marketOrder(asset, side, size) {
        },

        async cancelOrder(order_id) {
        },

        async cancelAllOrders() {
        },

        async getOpenOrders(asset) {
        },

        async getPositions() {
        },
      },
      computed: {
        ...mapGetters(["getApiKeys"]),
      },
      created() {},
    });
  },
};
