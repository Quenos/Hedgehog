import store from "../store";

export default {
  install(Vue) {
    Vue.prototype.$apiAbstraction = new Vue({
      store,
      data: {},
      methods: {
        initExchange() {
          switch (store.getters.getExchange) {
            case "deribit":
              this.$deribitApi.initWs();
              break;
            case "binance":
              this.$binanceApi.initWs();
              break;
            case "bybit":
              this.$bybitApi.initWs();
              break;
          }
        },
        startApi() {
          switch (store.getters.getExchange) {
            case "deribit":
              this.$deribitApi.startApi();
              break;
            case "binance":
              this.$binanceApi.startApi();
              break;
            case "bybit":
              this.$bybitApi.startApi();
              break;
          }
        },
        closeApi() {
          switch (store.getters.getExchange) {
            case "deribit":
              this.$deribitApi.closeApi();
              break;
            case "binance":
              this.$binanceApi.closeApi();
              break;
            case "bybit":
              this.$bybitApi.closeApi();
              break;
          }
        },
        async enterOrders(instrument, type, post_only, reduce_only, orders) {
          switch (store.getters.getExchange) {
            case "deribit":
              this.$deribitApi.enterOrders(
                instrument,
                type,
                post_only,
                reduce_only,
                orders
              );
              break;
            case "binance":
              this.$binanceApi.enterOrders(
                instrument,
                type,
                reduce_only,
                orders
              );
              break;
            case "bybit":
              this.$bybitApi.enterOrders(instrument, type, reduce_only, orders);
              break;
          }
        },

        async marketOrder(symbol, side, size) {
          switch (store.getters.getExchange) {
            case "deribit":
              this.$deribitApi.marketOrder(symbol, side, size);
              break;
            case "binance":
              this.$binanceApi.marketOrder(symbol, side, size);
              break;
            case "bybit":
              this.$bybitApi.marketOrder(symbol, side, size);
              break;
          }
        },

        async takeProfitOrder(symbol, side, price, size) {
          switch (store.getters.getExchange) {
            case "deribit":
              this.$deribitApi.takeProfitOrder(symbol, side, price, size);
              break;
            case "binance":
              this.$binanceApi.takeProfitOrder(symbol, side, price, size);
              break;
            case "bybit":
              this.$bybitApi.takeProfitOrder(symbol, side, price, size);
              break;
          }
        },

        async stoplossOrder(symbol, side, price, size) {
          switch (store.getters.getExchange) {
            case "deribit":
              this.$deribitApi.stoplossOrder(symbol, side, price, size);
              break;
            case "binance":
              this.$binanceApi.stoplossOrder(symbol, side, price, size);
              break;
            case "bybit":
              this.$bybitApi.stoplossOrder(symbol, side, price, size);
              break;
          }
        },

        async trailingSLOrder(symbol, side, price, size) {
          switch (store.getters.getExchange) {
            case "deribit":
              this.$notify({
                text: "Deribit has no trailing stop orders",
                type: "error", 
              })
              break;
            case "binance":
              this.$binanceApi.trailingSLOrder(symbol, side, price, size);
              break;
            case "bybit":
              this.$bybitApi.trailingSLOrder(symbol, side, price, size);
              break;
          }
        },

        cancelOrder(order_id) {
          switch (store.getters.getExchange) {
            case "deribit":
              this.$deribitApi.cancelOrder(order_id);
              break;
            case "binance":
              this.$binanceApi.cancelOrder(order_id);
              break;
            case "bybit":
              this.$bybitApi.cancelOrder(order_id);
              break;
          }
        },

        async cancelAllOrders() {
          if (store.getters.getExchange === "deribit") {
            this.$deribitApi.cancelAllOrders();
          }
        },

        async getOpenOrders(asset) {
          if (store.getters.getExchange === "deribit") {
            this.$deribitApi.getOpenOrders(asset.substring(0, 3));
          }
        },

        async getPositions(asset) {
          switch (store.getters.getExchange) {
            case "deribit":
              this.$deribitApi.getPositions(asset);
              break;
            case "binance":
              this.$binanceApi.getPositions(asset);
              break;
            case "bybit":
              this.$bybitApi.getPositions(asset);
          }
        },
      },
      created() {},
      computed: {},
    });
  },
};
