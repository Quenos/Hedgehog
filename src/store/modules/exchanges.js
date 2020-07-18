const state = {
  apiKeys: {
    deribit: [
      {
        apiKey: "-D5YHdyP",
        apiSecret: "abdFm3PY38AvLGtukEk8BZfvx2zxQGOWn8v6R7cL4e4"
      }
    ]
  },
  urls: {
    deribit: {
      rest: `https://www.deribit.com/api/v2/`,
      ws: `wss://www.deribit.com/ws/api/v2`
    }
  },
  openOrders: {
    deribit: []
  },
  lastAndMarkPrices: {
    deribit: {
      markPrice: 0,
      lastPrice: 0
    }
  }
};

const getters = {
  getApiKeys: () => state.apiKeys,
  getApiKeysByExchange: state => exchange => {
    return state.apiKeys[exchange];
  },
  getRestUrlByExchange: state => exchange => {
    return state.apiKeys[exchange]["rest"];
  },
  getWsUrlByExchange: state => exchange => {
    return state.urls[exchange]["ws"];
  },
  getOpenOrdersByExchange: state => exchange => {
    return state.openOrders[exchange];
  },
  getLastAndMarkPriceByExchange: state => exchange => {
    return state.lastAndMarkPrices[exchange];
  }
};

const actions = {};

const mutations = {
  // setApiKeys: (state, exchange, keys) => TODO,
  setOpenOrders(state, data) {
    data.openOrders.forEach(openOrder => {
      state.openOrders["deribit"] = state.openOrders[data.exchange].filter(
        value => {
          return value.order_id !== openOrder.order_id;
        }
      );
      if (
        openOrder.order_state === "open" ||
        openOrder.order_state === "untriggered"
      ) {
        state.openOrders[data.exchange].push(openOrder);
      }
    });
  },
  setLastAndMarkPrice(state, data) {
    state.lastAndMarkPrices[data.exchange] = {
      lastPrice: data.lastPrice,
      markPrice: data.markPrice
    };
  }
};

export default {
  state,
  getters,
  actions,
  mutations
};
