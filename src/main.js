import Vue from "vue";
import App from "./App.vue";
import router from "./router";
import store from "./store";
import BotStore from "./store"
import vuetify from "./plugins/vuetify";

Vue.config.productionTip = false;

import deribitApi from "./plugins/deribitApi";
import binanceApi from "./plugins/binanceApi";
import bybitApi from "./plugins/bybitApi";
import ftxApi from "./plugins/ftxApi";
import binanceOrderBook from "./plugins/binanceOrderBook"
import apiAbstraction from "./plugins/apiAbstraction";
import trdrBot from "./plugins/TRDRBot"
import Notifications from 'vue-notification';

Vue.use(deribitApi);
Vue.use(binanceApi);
Vue.use(bybitApi);
Vue.use(ftxApi);
Vue.use(binanceOrderBook);
Vue.use(apiAbstraction);
Vue.use(trdrBot);
Vue.use(Notifications);

new Vue({
  router,
  store,
  BotStore,
  vuetify,
  render: h => h(App)
}).$mount("#app");
