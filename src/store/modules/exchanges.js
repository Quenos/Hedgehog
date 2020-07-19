const state = {
  apiKeys: {
    deribit: [],
  },
  urls: {
    deribit: {
      rest: `https://www.deribit.com/api/v2/`,
      ws: `wss://www.deribit.com/ws/api/v2`,
    },
  },
  openOrders: {
    deribit: [],
  },
  lastAndMarkPrices: {
    deribit: {
      markPrice: 0,
      lastPrice: 0,
    },
  },
};

/*
{
    deribit: [
      {
        label: "main",
        apiKey: "-D5YHdyP",
        apiSecret: "abdFm3PY38AvLGtukEk8BZfvx2zxQGOWn8v6R7cL4e4"
      }
    ]
  }
  */

const getters = {
  getApiKeys: () => state.apiKeys,
  getApiKeysByExchange: (state) => (exchange) => {
    return state.apiKeys[exchange];
  },
  getRestUrlByExchange: (state) => (exchange) => {
    return state.apiKeys[exchange]["rest"];
  },
  getWsUrlByExchange: (state) => (exchange) => {
    return state.urls[exchange]["ws"];
  },
  getOpenOrdersByExchange: (state) => (exchange) => {
    return state.openOrders[exchange];
  },
  getLastAndMarkPriceByExchange: (state) => (exchange) => {
    return state.lastAndMarkPrices[exchange];
  },
  apiLoaded: (state) => (exchange) => {
    try {
      return "label" in state.apiKeys[exchange][0] &&
        state.apiKeys[exchange][0].label.length > 0
        ? true
        : false;
    } catch (err) {
      return false;
    }
  },
};

const actions = {
  loadApiKeys() {
    state.apiKeys = JSON.parse(localStorage.getItem("apiKeys"));
  },
  storeApiKeys() {
    localStorage.setItem("apiKeys", JSON.stringify(state.apiKeys));
  },
};

const mutations = {
  addApiKey(state, data) {
    state.apiKeys[data.exchange].push(data.keys);
  },
  removeApiKey(state, data) {
    state.apiKeys[data.exchange] = state.apiKeys[data.exchange].filter(
      (value) => {
        return value.label !== data.keys.label;
      }
    );
  },
  setOpenOrders(state, data) {
    data.openOrders.forEach((openOrder) => {
      state.openOrders[data.exchange] = state.openOrders[data.exchange].filter(
        (value) => {
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
      markPrice: data.markPrice,
    };
  },
};

export default {
  state,
  getters,
  actions,
  mutations,
};
