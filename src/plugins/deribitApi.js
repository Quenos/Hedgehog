import hmacSHA256 from "crypto-js/hmac-sha256";
import ReconnectingWebSocket from "reconnecting-websocket";

import store from "../store";
import { mapGetters } from "vuex";

export default {
  install(Vue) {
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
          this.ws.onopen = () => {
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
                    "ticker.BTC-PERPETUAL.100ms",
                    "ticker.ETH-PERPETUAL.100ms",
                  ],
                },
              };
              this.ws.send(JSON.stringify(msg));
            }, 500);

            let msg = {
              jsonrpc: "2.0",
              method: "public/set_heartbeat",
              id: 58,
              params: {
                interval: 60,
              },
            };
            this.ws.send(JSON.stringify(msg));

            this.getOpenOrders(store.getters.getAsset.substring(0, 3));

            this.ws.onmessage = (e) => {
              let data = JSON.parse(e.data);
              this.handleOnMessage(data);
            };
            setInterval(() => this.getPositions(), 5 * 1000);
          };
        },
        sendHeartbeat() {
          let msg = {
            jsonrpc: "2.0",
            method: "public/test",
            id: 4152,
            params: {},
          };
          try {
            this.ws.send(JSON.stringify(msg));
          } catch (err) {
            this.initWs();
            this.ws.send(JSON.stringify(msg));
          }
        },
        handleOnMessage(data) {
          if ("method" in data && data.method === "heartbeat") {
            this.sendHeartbeat();
          } else if ("params" in data) {
            switch (data.params.channel) {
              case "user.orders.BTC-PERPETUAL.100ms":
                store.commit("setOpenOrders", {
                  exchange: "deribit",
                  openOrders: data.params.data,
                });
                break;
              case "user.orders.ETH-PERPETUAL.100ms":
                store.commit("setOpenOrders", {
                  exchange: "deribit",
                  openOrders: data.params.data,
                });
                break;
              case "ticker.BTC-PERPETUAL.100ms":
                store.commit("setLastAndMarkPrice", {
                  exchange: "deribit",
                  instrument: "BTC-PERPETUAL",
                  lastPrice: data.params.data.last_price,
                  markPrice: data.params.data.mark_price,
                });
                break;
              case "ticker.ETH-PERPETUAL.100ms":
                store.commit("setLastAndMarkPrice", {
                  exchange: "deribit",
                  instrument: "ETH-PERPETUAL",
                  lastPrice: data.params.data.last_price,
                  markPrice: data.params.data.mark_price,
                });
                break;
            }
          } else if ("id" in data) {
            let a = []
            switch (data.id) {
              case 676:
                store.commit("setOpenOrders", {
                  exchange: "deribit",
                  openOrders: data.result,
                });
                break;
              case 983:
                if (data.result.length === 0) {
                   a.push({
                      symbol: "",
                      side: "",
                      size: "",
                      position_value: "",
                      entry_price: "",
                      liq_price: "",
                      position_margin: "",
                      leverage: "",
                      unrealised_pnl_last: "",
                      realised_pnl: "",
                      daily_total: "",
                    })
                    store.commit("setOpenPositions", {
                      exchange: "deribit",
                      result: a})
                  } else {
                  data.result.forEach((value) => {
                  a.push({
                      symbol: value["instrument_name"],
                      side: value["direction"],
                      size: value["size"],
                      position_value: value["size_currency"].toFixed(
                        5
                      ),
                      entry_price: value["average_price"],
                      liq_price: value["estimated_liquidation_price"],
                      position_margin: value[
                        "maintenance_margin"
                      ].toFixed(4),
                      leverage: value["leverage"],
                      unrealised_pnl_last: value["floating_profit_loss"],
                      realised_pnl: value[
                        "realized_profit_loss"
                      ].toFixed(4),
                      daily_total: value["total_profit_loss"].toFixed(
                        4
                      ),
                    },
                  );})
                  store.commit("setOpenPositions", {exchange: 'deribit', result: a})
                }
                break;
            }
          }
        },
        async enterOrders(instrument, type, post_only, reduce_only, orders) {
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
            let msg = {
              jsonrpc: "2.0",
              method: side,
              id: 201,
              params: {
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
              },
            };
            try {
              this.ws.send(JSON.stringify(msg));
            } catch (err) {
              this.initWs();
              this.ws.send(JSON.stringify(msg));
            }

            if (parseFloat(order["stop_loss"]) > 0.0) {
              let msg = {
                jsonrpc: "2.0",
                method: side_sl,
                id: 1291,
                params: {
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
                },
              };
              try {
                this.ws.send(JSON.stringify(msg));
              } catch (err) {
                this.initWs();
                this.ws.send(JSON.stringify(msg));
              }
            }
          });
          return ret_val;
        },

        async cancelOrder(order_id) {
          let msg = {
            jsonrpc: "2.0",
            method: "private/cancel",
            id: 1291,
            params: {
              order_id,
            },
          };
          try {
            this.ws.send(JSON.stringify(msg));
          } catch (err) {
            this.initWs();
            this.ws.send(JSON.stringify(msg));
          }
        },

        async cancelAllOrders() {
          let msg = {
            jsonrpc: "2.0",
            method: "private/cancel_all",
            id: 1290,
            params: {},
          };

          try {
            this.ws.send(JSON.stringify(msg));
          } catch (err) {
            this.initWs();
            this.ws.send(JSON.stringify(msg));
          }
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
          try {
            this.ws.send(JSON.stringify(msg));
          } catch (err) {
            this.initWs();
            this.ws.send(JSON.stringify(msg));
          }
        },

        async getPositions() {
          let msg = {
            jsonrpc: "2.0",
            method: "private/get_positions",
            id: 983,
            params: {
              currency: store.getters.getAsset.substring(0, 3),
              kind: "future",
            },
          };
          try {
            this.ws.send(JSON.stringify(msg));
          } catch (err) {
            this.initWs();
            this.ws.send(JSON.stringify(msg));
          }
        },
      },
      computed: {
        ...mapGetters(["getApiKeys"]),
        apiKeysLoaded: () => {
          let x = store.getters.apiLoaded("deribit");
          if (x) {
            this.initWs();
          }
          return x;
        },
      },
      created() {
        store.dispatch("loadApiKeys");
        if (store.getters.apiLoaded("deribit")) {
          this.initWs();
        }
      },
    });
  },
};
