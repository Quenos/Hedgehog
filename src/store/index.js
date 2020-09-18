import Vue from "vue";
import Vuex from "vuex";
import exchanges from "./modules/exchanges";
import bot from "./modules/botStore"

Vue.use(Vuex);

export default new Vuex.Store({
  state: {},
  mutations: {},
  actions: {},
  modules: {
    exchanges,
    bot,
  }
});
