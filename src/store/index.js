import Vue from "vue";
import Vuex from "vuex";
import header from "./modules/header";
import deribit from "./modules/exchanges";

Vue.use(Vuex);

export default new Vuex.Store({
  state: {},
  mutations: {},
  actions: {},
  modules: {
    header,
    deribit
  }
});
