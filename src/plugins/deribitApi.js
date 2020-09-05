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
        getPositionsInterval: null,
      },
      methods: {
        initWs() {
          let apiKeys = store.getters.getApiKeys;
          const key = apiKeys["apiKey"];
          const secret = apiKeys["apiSecret"];

          this.ws = new ReconnectingWebSocket(
            store.getters.getWsUrlByExchange("deribit")
          );
          this.ws.onerror = (err) => {
            console.log(err);
          };
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
            let msg = {
              jsonrpc: "2.0",
              method: "public/set_heartbeat",
              id: 58,
              params: {
                interval: 60,
              },
            };
            setTimeout(() => this.ws.send(JSON.stringify(msg)), 500);
            this.getAssets();

            this.ws.onmessage = (e) => {
              let data = JSON.parse(e.data);
              this.handleOnMessage(data);
            };
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
        startApi() {
          this.getOpenOrders(store.getters.getAsset.substring(0, 3));
          this.getPositionsInterval = setInterval(
            () => this.getPositions(),
            5 * 1000
          );
        },
        closeApi() {
          clearInterval(this.getPositionsInterval);
          this.ws.close();
        },
        handleOnMessage(data) {
          if ("method" in data && data.method === "heartbeat") {
            this.sendHeartbeat();
          } else if ("params" in data) {
            if (data.params.channel.substring(0, 11) === "user.orders") {
              store.commit("setOpenOrders", {
                exchange: "deribit",
                openOrders: data.params.data.map((item) => {
                  return {
                    instrument_name: item["instrument_name"],
                    side: item["direction"],
                    order_id: item["order_id"],
                    order_state: item["order_state"],
                    quantity: item["amount"],
                    orderPrice: item["price"],
                    orderType: item["order_type"],
                    orderTimeInForce:
                      item["time_in_force"] === "good_til_cancelled"
                        ? "Good till cancelled"
                        : item["time_in_force"] === "immediate_or_cancel"
                        ? "Immediate or cancel"
                        : "Fill or Kill",
                    orderUpdated: new Date(
                      item["last_update_timestamp"]
                    ).toLocaleString(),
                  };
                }),
              });
            }

            if (data.params.channel.substring(0, 6) === "ticker") {
              store.commit("setLastAndMarkPrice", {
                exchange: "deribit",
                instrument: data.params.data.instrument_name,
                lastPrice: data.params.data.last_price,
                markPrice: data.params.data.mark_price,
              });
            }
          } else if ("id" in data) {
            let a = [];
            let tickSizes = []
            switch (data.id) {
              case 676: // private/get_open_orders_by_currency
                if (!data.result.length) {
                  return;
                }
                data.result.forEach((item) => {
                  if (item["instrument_name"] === store.getters.getAsset) {
                    a.push(item);
                  }
                });
                store.commit("setOpenOrders", {
                  exchange: "deribit",
                  openOrders: a.map((item) => {
                    return {
                      instrument_name: item["instrument_name"],
                      side: item["direction"],
                      order_id: item["order_id"],
                      order_state: item["order_state"],
                      quantity: item["amount"],
                      orderPrice: item["price"],
                      orderType: item["order_type"],
                      orderTimeInForce:
                        item["time_in_force"] === "good_til_cancelled"
                          ? "Good till cancelled"
                          : item["time_in_force"] === "immediate_or_cancel"
                          ? "Immediate or cancel"
                          : "Fill or Kill",
                      orderUpdated: new Date(
                        item["last_update_timestamp"]
                      ).toLocaleString(),
                      };
                  }),
                });
                break;
              case 983: // private/get_positions
                if (data.result.length) {
                  data.result.forEach((value) => {
                    if (value["direction"] !== "zero") {
                      a.push({
                        symbol: value["instrument_name"],
                        side: value["direction"],
                        size: value["size"],
                        position_value: value["size_currency"],
                        entry_price: value["average_price"],
                        liq_price: value["estimated_liquidation_price"],
                        position_margin: value["maintenance_margin"],
                        leverage: value["leverage"],
                        unrealised_pnl_last: value["floating_profit_loss"],
                        realised_pnl: value["realized_profit_loss"],
                        daily_total: value["total_profit_loss"],
                      });
                    }
                  });
                  store.commit("setOpenPositions", {
                    exchange: "deribit",
                    result: a,
                  });
                }
                break;
              case 207: // private/buy and private/sell
                break;
              case 1012: // public/get_instruments
                a = [];
                tickSizes = [];
                data.result.forEach((value) => {
                  a.push(value["instrument_name"]);
                  tickSizes.push({
                    symbol: value["instrument_name"],
                    tickSize: 0.5,
                    minStepSize: 10
                  })
                });
                store.commit("setAssets", a.reverse());
                store.commit("setTickSizes", tickSizes)

                // subscribe to the orders to display open positions
                // eslint-disable-next-line
                let userOrders = a.map((value) => `user.orders.${value}.100ms`);
                this.ws.send(
                  JSON.stringify({
                    jsonrpc: "2.0",
                    method: "private/subscribe",
                    id: 42,
                    params: {
                      channels: userOrders,
                    },
                  })
                );
                // subscribe to the ticker to update last and mark status line
                // eslint-disable-next-line
                let ticker = a.map((value) => `ticker.${value}.100ms`);
                this.ws.send(
                  JSON.stringify({
                    jsonrpc: "2.0",
                    method: "private/subscribe",
                    id: 42,
                    params: {
                      channels: ticker,
                    },
                  })
                );
                break;
              case 1293: // stoplossOrder
                console.log(data)
                break;
            }
          } else {
            console.log(data);
          }
        },
        getAssets() {
          let msg = {
            jsonrpc: "2.0",
            method: "public/get_instruments",
            id: 1012,
            params: {
              currency: "BTC",
              kind: "future",
            },
          };
          try {
            this.ws.send(JSON.stringify(msg));
          } catch (err) {
            this.initWs();
            this.ws.send(JSON.stringify(msg));
          }
          msg = {
            jsonrpc: "2.0",
            method: "public/get_instruments",
            id: 1012,
            params: {
              currency: "ETH",
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

        async marketOrder(asset, side, size) {
          let msg = {
            jsonrpc: "2.0",
            method: `private/${side.toLowerCase()}`,
            id: 207,
            params: {
              instrument_name: asset,
              amount: size,
              type: "market",
            },
          };
          try {
            this.ws.send(JSON.stringify(msg));
          } catch (err) {
            this.initWs();
            this.ws.send(JSON.stringify(msg));
          }
        },

        async takeProfitOrder(asset, side, price, size) {
          let msg = {
            jsonrpc: "2.0",
            method: side.toLowerCase(),
            id: 201,
            params: {
              instrument_name: asset,
              amount: size,
              type: "limit",
              price: price,
              time_in_force: "Good Till Cancelled",
              post_only: true,
              reduce_only: true,
            },
          };
          try {
            this.ws.send(JSON.stringify(msg));
          } catch (err) {
            this.initWs();
            this.ws.send(JSON.stringify(msg));
          }
        },

        async stoplossOrder(asset, side, price, size) {
          let msg = {
            jsonrpc: "2.0",
            method: `private/${side.toLowerCase()}`,
            id: 1293,
            params: {
              instrument_name: asset,
              amount: size,
              type: "stop_market",
              price: price,
              stop_price: price,
              trigger: "mark_price",
              time_in_force: "good_til_cancelled"
            }
          }      
          try {
            this.ws.send(JSON.stringify(msg));
          } catch (err) {
            this.initWs();
            this.ws.send(JSON.stringify(msg));
          }
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
      },
      created() {},
    });
  },
};
