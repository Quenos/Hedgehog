import Vue from "vue";
import App from "./App.vue";
import router from "./router";
import store from "./store";
import vuetify from "./plugins/vuetify";

Vue.config.productionTip = false;

import deribitApi from "./plugins/deribitApi";
import binanceApi from "./plugins/binanceApi";
import bybitApi from "./plugins/bybitApi";
import ftxApi from "./plugins/ftxApi";
import apiAbstraction from "./plugins/apiAbstraction";
import Notifications from 'vue-notification';

Vue.use(deribitApi);
Vue.use(binanceApi);
Vue.use(bybitApi);
Vue.use(ftxApi);
Vue.use(apiAbstraction)
Vue.use(Notifications)

new Vue({
  router,
  store,
  vuetify,
  render: h => h(App)
}).$mount("#app");
