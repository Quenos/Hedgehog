const state = {
  asset: "BTC-PERPETUAL",
  exchange: "deribit"
};

const getters = {
  getAsset: () => state.asset,
  getExchange: () => state.exchange
};

const actions = {};

const mutations = {
  setAsset: (state, asset) => (state.asset = asset),
  setExchange: (state, exchange) => (state.exchange = exchange)
};

export default {
  state,
  getters,
  actions,
  mutations
};
