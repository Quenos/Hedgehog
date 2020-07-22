const state = {
  asset: "BTC-PERPETUAL",
  exchange: "deribit",
  apiKeys: {
    deribit: [],
    binance: [],
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
  availableExchanges: ["deribit", "binance"],
  openPositions: {
    deribit: [],
    binance: [],
  },
};

const getters = {
  getAsset: () => state.asset,
  getExchange: () => state.exchange,
  getAvaialableExchanges: () => {
    return state.availableExchanges;
  },
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
    let result = state.openOrders[exchange].filter(
      (value) => value.instrument_name === instrument
    );
    if (result.length !== 0) {
      return result;
    } else {
      return [];
    }
  },
  getLastAndMarkPriceByExchange: (state) => (exchange) => {
    return state.lastAndMarkPrices[exchange][2];
  },
  getLastAndMarkPriceByExchangeInstrument: (state) => (
    exchange,
    instrument
  ) => {
    let result = state.lastAndMarkPrices[exchange].filter(
      (value) => value.instrument === instrument
    );

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
  cancelOrder: () => state.cancelOrder,
  getOpenPositionsByExchange: (state) => (exchange) => {
    return state.openPositions[exchange];
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
    data.exchange = data.exchange.toLowerCase();
    if (!(data.exchange in state.apiKeys)) {
      state.apiKeys[data.exchange] = [];
    }

    state.apiKeys[data.exchange].push(data.keys);
  },
  removeApiKey(state, data) {
    state.apiKeys[data.exchange] = state.apiKeys[data.exchange].filter(
      (value) => value.label !== data.keys.label
    );
  },
  setOpenOrders(state, data) {
    data.openOrders.forEach((openOrder) => {
      state.openOrders[data.exchange] = state.openOrders[data.exchange].filter(
        (value) => value.order_id !== openOrder.order_id
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
  setAsset: (state, asset) => (state.asset = asset),
  setExchange: (state, exchange) => (state.exchange = exchange),
  setOpenPositions: (state, data) => {
    state.openPositions[data.exchange] = [];
    state.openPositions[data.exchange] = data.result;
  },
};

export default {
  state,
  getters,
  actions,
  mutations,
};
