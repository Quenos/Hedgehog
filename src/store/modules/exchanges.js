const state = {
  version: "0.1.1",
  asset: "BTC-PERPETUAL",
  exchange: "deribit",
  account: "",
  apiKeys: [],
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
  getApiKeys: () => state.apiKeys.find(value => value.label == state.account),
  getAccounts: () => {
    if (state.apiKeys.length === 0) {
      return []
    }
    return state.apiKeys.map(value => value.label)
  },
  getApiKeysByExchange: (state) => (exchange) => state.apiKeys.filter(value => value.exchange === exchange),
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
  getOpenPositionsByExchange: (state) => (exchange) => {
    return state.openPositions[exchange];
  },
};

const actions = {
  loadApiKeys() {
    if (JSON.parse(localStorage.getItem("apiKeys"))) {
      let fromStore = JSON.parse(localStorage.getItem("apiKeys"));
      if (!('version' in fromStore) || !(fromStore["version"] === state.version)) {
        state.apiKeys = []
      } else {
        state.apiKeys = fromStore["apiKeys"]
      }
    }
  },
  storeApiKeys() {
    let toStore = {version: state.version, apiKeys: state.apiKeys}
    localStorage.setItem("apiKeys", JSON.stringify(toStore));
  },
};

const mutations = {
  addApiKey(state, data) {
    let index = state.apiKeys.findIndex(value => value.label === data.label)
    if (index >= 0) {
      state.apiKeys[index] = data
      // Because it is an API key mutation rather than adding, the empty key must be removed
      state.apiKeys = state.apiKeys.filter((value) => value.label !== "");
    } else {
      state.apiKeys.push(data);
    }
  },
  removeApiKey(state, data) {
    state.apiKeys = state.apiKeys.filter((value) => value.label !== data.keys.label);
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
  setExchange: (state, exchange) => {
    let exch = state.apiKeys.filter(value => value.label === exchange)
    state.exchange = exch[0].exchange
    state.account = exch[0].label
  },
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
