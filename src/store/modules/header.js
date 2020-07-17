const state = {
    asset: 'BTC-PERPETUAL'
}

const getters = {
    getAsset: () => state.asset
}

const actions = {
}

const mutations = {
    setAsset: (state, asset) => (state.asset = asset)
}

export default {
    state,
    getters,
    actions,
    mutations
}