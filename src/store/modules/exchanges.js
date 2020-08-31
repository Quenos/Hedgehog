const state = {
  version: "0.1.1",
  asset: "",
  exchange: "",
  account: "",
  apiKeys: [],
  urls: {
    deribit: {
      rest: `https://www.deribit.com/api/v2/`,
      ws: `wss://www.deribit.com/ws/api/v2`,
    },
    binance: {
      rest: `https://fapi.binance.com/`,
      ws: `wss://fstream3.binance.com`,
    },
  },
  openOrders: {
    deribit: [],
    binance: [],
  },
  assets: [],
  tickSizes: [],
  lastAndMarkPrices: {
    deribit: [
      {
        instrument: "",
        markPrice: 0,
        lastPrice: 0,
      }],
      binance: [
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
  getAssets: (state) => state.assets,
  getTickSizeBySymbol: (state) => (symbol) =>
    state.tickSizes.filter(value => value.symbol === symbol),
  getTickSizes: (state) => state.tickSizes,
  getExchange: () => state.exchange,
  getAvaialableExchanges: () => {
    return state.availableExchanges;
  },
  getApiKeys: () => state.apiKeys.find((value) => value.label == state.account),
  getAllApiKeys: () => state.apiKeys,
  getAccounts: () => {
    if (state.apiKeys.length === 0) {
      return [];
    }
    return state.apiKeys.map((value) => value.label);
  },
  getApiKeysByExchange: (state) => (exchange) =>
    state.apiKeys.filter((value) => value.exchange === exchange),
  getRestUrlByExchange: (state) => (exchange) => {
    return state.urls[exchange]["rest"];
  },
  getWsUrlByExchange: (state) => (exchange) => {
    return state.urls[exchange]["ws"];
  },
  getOpenOrdersByExchange: (state) => (exchange) => {
    return state.openOrders[exchange];
  },
  getOpenOrdersByExchangeInstrument: (state) => (exchange, instrument) => {
    try {
      let result = state.openOrders[exchange].filter(
        (value) => value.instrument_name === instrument
      );
      if (result.length !== 0) {
        return result;
      } else {
        return [];
      }
    } catch {
      return []
    }
  },
  getLastAndMarkPriceByExchange: (state) => (exchange) => {
    return state.lastAndMarkPrices[exchange][2];
  },
  getLastAndMarkPriceByExchangeInstrument: (state) => (
    exchange,
    instrument
  ) => {
    try {
      let result = state.lastAndMarkPrices[exchange].filter(
        (value) => value.instrument === instrument
      );
      if (result.length !== 0) {
        return result[0];
      } else {
        return { instrument, lastPrice: 0, markPrice: 0 };
      }
    } catch {
      return { instrument, lastPrice: 0, markPrice: 0 };
    }
  },
  getOpenPositionsByExchange: (state) => (exchange) => {
    return state.openPositions[exchange];
  },
  getActiveAccount: (state) => state.account,
};

const actions = {
  loadApiKeys() {
    if (JSON.parse(localStorage.getItem("apiKeys"))) {
      let fromStore = JSON.parse(localStorage.getItem("apiKeys"));
      if (
        !("version" in fromStore) ||
        !(fromStore["version"] === state.version)
      ) {
        state.apiKeys = [];
      } else {
        state.apiKeys = fromStore["apiKeys"];
      }
    }
  },
  storeApiKeys() {
    let toStore = { version: state.version, apiKeys: state.apiKeys };
    localStorage.setItem("apiKeys", JSON.stringify(toStore));
  },
  changeAsset({ commit, state }, asset) {
    commit("setOpenPositions", { exchange: state.exchange, result: [] });
    commit("setAsset", asset);
  },
  changeExchange({ commit, state }, exchange) {
    commit("setAsset", "")
    commit("setAssets", [])
    commit("setTickSizes", [])
    let ex = state.apiKeys.filter(value => value.label == exchange)
    commit("setExchange", {label: exchange, exchange: ex[0].exchange})
  },
};

const mutations = {
  addApiKey(state, data) {
    let index = state.apiKeys.findIndex(value => value.label === data.label);
    if (index >= 0) {
      state.apiKeys[index] = data;
      // Because it is an API key mutation rather than adding, the empty key must be removed
      state.apiKeys = state.apiKeys.filter(value => value.label !== "");
    } else {
      state.apiKeys.push(data);
    }
  },
  removeApiKey(state, data) {
    state.apiKeys = state.apiKeys.filter(
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
        openOrder.order_state === "NEW" ||
        openOrder.order_state === "untriggered"
      ) {
        state.openOrders[data.exchange].push(openOrder);
      }
    });
  },
  setLastAndMarkPrice(state, data) {
    this.commit("setLastPrice", data)
    this.commit("setMarkPrice", data)
  },
  setLastPrice(state, data) {
    let updated = false;
    state.lastAndMarkPrices[data.exchange].forEach((item) => {
      if (item.instrument === data.instrument) {
        item.lastPrice = data.lastPrice;
        updated = true;
      }
    });
    if (!updated) {
      state.lastAndMarkPrices[data.exchange].push({
        instrument: data.instrument,
        lastPrice: data.lastPrice,
        markPrice: 0,
      });
    }
  },
  setMarkPrice(state, data) {
    let updated = false;
    state.lastAndMarkPrices[data.exchange].forEach((item) => {
      if (item.instrument === data.instrument) {
        item.markPrice = data.markPrice;
        updated = true;
      }
    });
    if (!updated) {
      state.lastAndMarkPrices[data.exchange].push({
        instrument: data.instrument,
        lastPrice: 0,
        markPrice: data.markPrice,
      });
    }
  },
  setAsset: (state, asset) => {
    state.asset = asset
  },
  setAssets: (state, assets) => {
    if (assets.length) {
      state.assets = [...state.assets, ...assets]
    } else {
      state.assets = []
    }
  },
  setTickSizes: (state, tickSizes) => {
    if (tickSizes.length) {
      state.tickSizes = [...state.tickSizes, ...tickSizes]
    } else {
      state.tickSizes = []
    }
  },
  setExchange: (state, exchange) => {
    state.exchange = exchange.exchange;
    state.account = exchange.label;
  },
  setOpenPositions: (state, data) => {
    state.openPositions[data.exchange] = [];
    if (data.result.length) {
      state.openPositions[data.exchange] = data.result;
    }
  },
};

export default {
  state,
  getters,
  actions,
  mutations,
};
