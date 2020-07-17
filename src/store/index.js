import Vue from "vue";
import Vuex from "vuex";
import ladder from './modules/ladder'
import header from './modules/header'

Vue.use(Vuex);

export default new Vuex.Store({
  state: {},
  mutations: {},
  actions: {},
  modules: {
    ladder,
    header
  }
});
