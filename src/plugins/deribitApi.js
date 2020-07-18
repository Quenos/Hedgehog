/* eslint-disable */
/* forked from: https://github.com/askmike/deribit-v2-ws */

import Connection from "./connection.js";
import hmacSHA256 from "crypto-js/hmac-sha256";
import ReconnectingWebSocket from "reconnecting-websocket";

import store from "../store";
import { mapGetters } from "vuex";

export default {
  install(Vue, defaultOptions = {}) {
    Vue.prototype.$deribitApi = new Vue({
      store,
      data: {
        ws: null,
      },
      methods: {
        initWs() {
          const apiKeys = store.getters.getApiKeysByExchange("deribit");
          const key = apiKeys[0]["apiKey"];
          const secret = apiKeys[0]["apiSecret"];

          this.ws = new ReconnectingWebSocket(
            store.getters.getWsUrlByExchange("deribit")
          );
          this.ws.onopen = (e) => {
            const timestamp = Date.now();
            const stringToSign = timestamp + "\n" + "Nonce" + "\n" + "";
            const signature = hmacSHA256(stringToSign, secret).toString();

            this.ws.send(
              JSON.stringify({
                jsonrpc: "2.0",
                method: "public/auth",
                params: {
                  signature: signature,
                  grant_type: "client_signature",
                  client_id: key,
                  timestamp: timestamp,
                  nonce: "Nonce",
                  data: "",
                },
              })
            );
            setTimeout(() => {
              let msg = {
                jsonrpc: "2.0",
                method: "private/subscribe",
                id: 42,
                params: {
                  channels: [
                    "user.orders.BTC-PERPETUAL.100ms",
                    "user.orders.ETH-PERPETUAL.100ms",
                  ],
                },
              };
              this.ws.send(JSON.stringify(msg));
            }, 500);

            this.getOpenOrders(store.getters.getAsset.substring(0,3))

            this.ws.onmessage = (e) => {
              let data = JSON.parse(e.data);
              if ("params" in data) {
                switch (data.params.channel) {
                  case "user.orders.BTC-PERPETUAL.100ms":
                    store.commit("setOpenOrders", {
                      exchange: "deribit",
                      openOrders: data.params.data,
                    });
                    break;
                  case "user.orders.ETH-PERPETUAL.100ms":
                    break;
                }
              } else if ("id" in data) {
                switch (data.id) {
                  case 676:
                    store.commit("setOpenOrders", {
                      exchange: "deribit",
                      openOrders: data.result,
                    });
                    break;
                }
              }
            };
          };
        },
        async enterOrders(instrument, type, post_only, reduce_only, orders) {
          const apiKeys = store.getters.getApiKeysByExchange("deribit");
          const key = apiKeys[0]["apiKey"];
          const secret = apiKeys[0]["apiSecret"];

          const db = new Connection({ key, secret });
          await db.connect();

          var resp = null;
          var ret_val = [];
          orders.forEach(async (order) => {
            var side = null;
            var side_sl = null;
            if (order["side"].toLowerCase() === "buy") {
              side = "private/buy";
              side_sl = "private/sell";
            } else {
              side = "private/sell";
              side_sl = "private/buy";
            }
            resp = await db.request(side, {
              instrument_name: instrument,
              amount: order["quantity"],
              type: type,
              price: order["price"],
              time_in_force:
                order["time_in_force"] === "Good Till Cancelled"
                  ? "good_til_cancelled"
                  : order["time_in_force"] === "Immediate or Cancel"
                  ? "immediate_or_cancel"
                  : "fill_or_kill",
              post_only: post_only,
              reduce_only: reduce_only,
            });
            ret_val.push(resp);
            if (parseFloat(order["stop_loss"]) > 0.0) {
              resp = await db.request(side_sl, {
                instrument_name: instrument,
                amount: order["quantity"],
                type: "stop_market",
                price: order["stop_loss"],
                stop_price: order["stop_loss"],
                trigger: "mark_price",
                time_in_force:
                  order["time_in_force"] === "Good Till Cancelled"
                    ? "good_til_cancelled"
                    : order["time_in_force"] === "Immediate or Cancel"
                    ? "immediate_or_cancel"
                    : "fill_or_kill",
              });
              ret_val.push(resp);
            }
          });
          return ret_val;
        },

        async cancelOrder(order_id) {
          const apiKeys = store.getters.getApiKeysByExchange("deribit");
          const key = apiKeys[0]["apiKey"];
          const secret = apiKeys[0]["apiSecret"];

          const db = new Connection({ key, secret });
          await db.connect();

          const resp = await db.request("private/cancel", {
            order_id: order_id,
          });
          return resp;
        },

        async cancelAllOrders() {
          const apiKeys = store.getters.getApiKeysByExchange("deribit");
          const key = apiKeys[0]["apiKey"];
          const secret = apiKeys[0]["apiSecret"];

          const db = new Connection({ key, secret });
          await db.connect();

          const resp = await db.request("private/cancel_all", {});
          return resp;
        },

        async getOpenOrders(asset) {
          let msg = {
            jsonrpc: "2.0",
            method: "private/get_open_orders_by_currency",
            id: 676,
            params: {
              currency: asset,
            },
          };
          setTimeout(() => {
            this.ws.send(JSON.stringify(msg));
          }, 500);
        },

        async getPositions(asset) {
          const apiKeys = store.getters.getApiKeysByExchange("deribit");
          const key = apiKeys[0]["apiKey"];
          const secret = apiKeys[0]["apiSecret"];

          const db = new Connection({ key, secret });
          await db.connect();

          const resp = await db.request("private/get_position", {
            instrument_name: asset,
          });
          return resp;
        },
      },
      computed: {
        ...mapGetters(["getApiKeys"]),
      },
      created() {
        this.initWs();
      },
    });
  },
};
