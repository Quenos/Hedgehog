import store from "../store";

export default {
  install(Vue) {
    Vue.prototype.$apiAbstraction = new Vue({
      store,
      data: {},
      methods: {
        startApi() {
          if (store.getters.getExchange == "deribit") {
            this.$deribitApi.startApi()
          }
        },
        closeApi() {
          if (store.getters.getExchange == "deribit") {
            this.$deribitApi.closeApi()
          }
        },
        async enterOrders(instrument, type, post_only, reduce_only, orders) {
          if (store.getters.getExchange == "deribit") {
            this.$deribitApi.enterOrders(
              instrument,
              type,
              post_only,
              reduce_only,
              orders
            );
          }
        },
        
        async marketOrder(symbol, side, size) {
          if (store.getters.getExchange === "deribit") {
            this.$deribitApi.marketOrder(symbol, side, size)
          }
        },

        cancelOrder(order_id) {
          if (store.getters.getExchange === "deribit") {
            this.$deribitApi.cancelOrder(order_id);
          }
        },

        async cancelAllOrders() {
          if (store.getters.getExchange === "deribit") {
            this.$deribitApi.cancelAllOrders()
        }},

        async getOpenOrders(asset) {
          if (store.getters.getExchange === "deribit") {
            this.$deribitApi.getOpenOrders(asset)
          }
        },

        async getPositions(asset) {
          if (store.getters.getExchange === "deribit") {
            this.$deribitApi.getPositions(asset)
          }
        },

        initExchange () {
          if (store.getters.getExchange === 'deribit') {
            this.$deribitApi.initWs()
          } else if (store.getters.getExchange === 'binance') {
            this.$binanceApi.initWs()
          }
        }
      },
      created() {
        store.dispatch("loadApiKeys")
      },
      computed: {}
    });
  },
};