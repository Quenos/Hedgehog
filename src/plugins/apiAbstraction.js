import store from "../store";

export default {
  install(Vue) {
    Vue.prototype.$apiAbstraction = new Vue({
      store,
      data: {},
      methods: {
        startApi() {
          switch (store.getters.getExchange) {
            case "deribit":
              this.$deribitApi.startApi();
              break;
            case "binance":
              this.$binanceApi.startApi();
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
          }
        },

        initExchange() {
          switch (store.getters.getExchange) {
            case "deribit":
              this.$deribitApi.initWs();
              break;
            case "binance":
              this.$binanceApi.initWs();
              break;
          }
        },
      },
      created() {},
      computed: {},
    });
  },
};
