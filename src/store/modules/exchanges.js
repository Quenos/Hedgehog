const state = {
  version: "0.1.1", // version of the api save format
  asset: "",
  exchange: "",
  account: "",
  botExchange: "",
  botAccount: "",
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
    bybit: {
      rest: `https://api.bybit.com`,
      ws: `wss://stream.bybit.com/realtime`,
    },
    ftx: {
      rest: `https://ftx.com/api`,
      ws: `wss://ftx.com/ws/`,
    },
  },
  openOrders: {
    deribit: [],
    binance: [],
    bybit: [],
    ftx: [],
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
    bybit: [
      {
        instrument: "",
        markPrice: 0,
        lastPrice: 0,
      },
    ],
    ftx: [
      {
        instrument: "",
        markPrice: 0,
        lastPrice: 0,
      },
    ],
  },
  availableExchanges: ["deribit", "binance", "bybit", "ftx"],
  openPositions: {
    deribit: [],
    binance: [],
    bybit: [],
    ftx: [],
  },
  botPositions: {
    binance: [],
  },
  balances: {binance: {}},
  bba: {binance: {}},  // best bid and ask
};

const getters = {
  getAsset: () => state.asset,
  getAssets: (state) => state.assets,
  getTickSizeBySymbol: (state) => (symbol) =>
    state.tickSizes.filter(value => value.symbol === symbol),
  getTickSizes: (state) => state.tickSizes,
  getExchange: () => state.exchange,
  getAvaialableExchanges: () => {
    console.log(state.availableExchanges)
    return state.availableExchanges;
  },
  getApiKeys: () => state.apiKeys.find((value) => value.label == state.account),
  getAllApiKeys: () => state.apiKeys,
  getAccounts: (state) => (exchange = "") => {
    if (state.apiKeys.length === 0) {
      return [];
    }
    if (exchange === ""){
      return state.apiKeys.map((value) => value.label);
    } else {
      return state.apiKeys.filter(key => key.exchange.toLowerCase() === exchange.toLowerCase()).map((value) => value.label);
    }
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
  getOpenPositionBySymbol: (state) => (symbol) => {
    const openPositions = state.openPositions[state.exchange]
    return openPositions.filter(position => position.symbol === symbol)[0]
  },
  getBotPositionBySymbol: (state) => (symbol) => {
    const botPositions = state.botPositions[state.exchange]
    return botPositions.filter(position => position.symbol === symbol)[0]
  },
  getActiveAccount: (state) => state.account,
  getBalance: (state) => state.balances[state.exchange],
  getBBA: (state) => {
    return state.bba[state.exchange]
  },
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
  changeBotExchange({ commit, state }, exchange) {
    let ex = state.apiKeys.filter(value => value.label == exchange)
    commit("setBotExchange", {label: exchange, exchange: ex[0].exchange})
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
        openOrder.order_state.toLowerCase() === "open" ||
        openOrder.order_state.toLowerCase() === "new" ||
        openOrder.order_state.toLowerCase() === "untriggered"
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
  setBotExchange: (state, exchange) => {
    state.botExchange = exchange.exchange;
    state.botAccount = exchange.label;
  },
  setOpenPositions: (state, data) => {
    state.openPositions[data.exchange] = [];
    if (data.result.length) {
      state.openPositions[data.exchange] = data.result;
    }
  },
  setBotPositions: (state, data) => {
    state.botPositions[data.exchange] = [];
    if (data.result.length) {
      state.botPositions[data.exchange] = data.result;
    }
  },
  setBalance: (state, balance) => {
    state.balances[state.exchange] = balance
  },
  setBBA: (state, bba) => {
    state.bba[state.exchange] = bba
  },
};

export default {
  state,
  getters,
  actions,
  mutations,
};
