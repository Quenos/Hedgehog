/* eslint-disable */
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
    deribit: [
      {
        instrument: "",
        markPrice: 0,
        lastPrice: 0,
      },
    ],
  },
};

const getters = {
  getApiKeys: () => state.apiKeys,
  getApiKeysByExchange: (state) => (exchange) => {
    try {
      return state.apiKeys[exchange];
    } catch (err) {
      return [];
    }
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
  getOpenOrdersByExchangeInstrument: (state) => (exchange, instrument) => {
    let result = state.openOrders[exchange].filter((value) => {
      return value.instrument_name === instrument;
    });
    if (result.length !== 0) {
      return result;
    } else {
      return [];
    }
  },
  getLastAndMarkPriceByExchange: (state) => (exchange) => {
    return state.lastAndMarkPrices[exchange][2]
  },
  getLastAndMarkPriceByExchangeInstrument: (state) => (exchange, instrument) => {
    let result = state.lastAndMarkPrices[exchange].filter((value) => {
      return value.instrument === instrument;
    });

    if (result.length !== 0) {
      return result[0];
    } else {
      return { instrument, lastPrice: 0, markPrice: 0 };
    }
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
    if (JSON.parse(localStorage.getItem("apiKeys"))) {
      state.apiKeys = JSON.parse(localStorage.getItem("apiKeys"));
    }
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
    let updated = false;
    state.lastAndMarkPrices[data.exchange].forEach((item) => {
      if (item.instrument === data.instrument) {
        item.lastPrice = data.lastPrice;
        item.markPrice = data.markPrice;
        updated = true;
      }
    });
    if (!updated) {
      state.lastAndMarkPrices[data.exchange].push({
        instrument: data.instrument,
        lastPrice: data.lastPrice,
        markPrice: data.markPrice,
      });
    }
  },
};

export default {
  state,
  getters,
  actions,
  mutations,
};
