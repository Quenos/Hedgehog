const state = {
  version: "0.1.0",   // version of bot settings format
  coinsToTrade: {
    adausdt: false,
    btcusdt: false,
    eosusdt: false,
    ethusdt: false,
    linkusdt: false,
    xrpusdt: false,
  },
  currentPercentages: {
    adausdt: 0,
    btcusdt: 0,
    eosusdt: 0,
    ethusdt: 0,
    linkusdt: 0,
    xrpusdt: 0,
  },
  lastPrices: {
    adausdt: 0.0,
    btcusdt: 0.0,
    eosusdt: 0.0,
    ethusdt: 0.0,
    linkusdt: 0.0,
    xrpusdt: 0.0,
  },
  lastPricesFuture: {
    adausdt: 0.0,
    btcusdt: 0.0,
    eosusdt: 0.0,
    ethusdt: 0.0,
    linkusdt: 0.0,
    xrpusdt: 0.0,
  },
  takeProfitStoploss: {
    tp1: "",
    tp2: "",
    sl: "",
  },
  risk: {
    risk: "",
    leverage: "",
  },
  signalSettings: [{
      pair: "linkusdt",
      ask: -70,
      bid: 70,
    },
    {
      pair: "eosusdt",
      ask: -62,
      bid: 60,
    },
    {
      pair: "ethusdt",
      ask: -72,
      bid: 72,
    },
    {
      pair: "btcusdt",
      ask: -70,
      bid: 70,
    },
    {
      pair: "xrpusdt",
      ask: -80,
      bid: 80,
    },
    {
      pair: "adausdt",
      ask: -61,
      bid: 83,
    }
  ],
  logger: [],
};

const getters = {
  getCoinsToTrade: () => state.coinsToTrade,
  getTakeProfitStoploss: () => state.takeProfitStoploss,
  getRisk: () => state.risk,
  getCurrentPercentages: () => state.currentPercentages,
  getCurrentPercentage: (state) => (symbol) => state.currentPercentages[symbol],
  getLastPrice: (state) => (symbol) => state.lastPrices[symbol],
  getLastPriceFuture: (state) => (symbol) => state.lastPricesFuture[symbol],
  getSignalSetting: (state) => (symbol) => state.signalSettings.filter(value => value.pair === symbol),
  getLogger: (state) => state.logger,
};

const actions = {
  loadBotSettings() {
    if (JSON.parse(localStorage.getItem("botSettings"))) {
      let fromStore = JSON.parse(localStorage.getItem("botSettings"));
      if (("version" in fromStore) && (fromStore["version"] === state.version)){
        state.coinsToTrade = fromStore["coinsToTrade"];
        state.takeProfitStoploss = fromStore["takeProfitStoploss"];
        state.risk = fromStore["risk"];
      }
    }
  },
  storeBotSettings() {
    console.log("store")
    let toStore = { 
      version: state.version, 
      coinsToTrade: state.coinsToTrade,
      takeProfitStoploss: state.takeProfitStoploss,
      risk: state.risk,
     };
    localStorage.setItem("botSettings", JSON.stringify(toStore));
  },
};

const mutations = {
  setCoinsToTrade(state, data) {
    state.coinsToTrade = data
  },
  setTakeProfitStoploss(state, data) {
    state.takeProfitStoploss = data
  },
  setRisk(state, data) {
    state.risk = data
  },
  setCurrentPercentages(state, data) {
    state.currentPercentages = data
  },
  setLastPriceBot(state, data){
    state.lastPrices[data.symbol] = data.lastPrice
  },
  setLastPriceFuture(state, data){
    state.lastPricesFuture[data.symbol] = data.lastPrice
  },
  addLogEntry(state, entry){
    state.logger.unshift(`${new Date(Date.now()).toLocaleString()}: ${entry}`)
  }
};

export default {
  state,
  getters,
  actions,
  mutations,
};
