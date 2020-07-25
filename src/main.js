import Vue from "vue";
import App from "./App.vue";
import router from "./router";
import store from "./store";
import vuetify from "./plugins/vuetify";

Vue.config.productionTip = false;

import deribitApi from "./plugins/deribitApi";
import binanceApi from "./plugins/binanceApi";
import apiAbstraction from "./plugins/apiAbstraction";

Vue.use(deribitApi);
Vue.use(binanceApi);
Vue.use(apiAbstraction)

new Vue({
  router,
  store,
  vuetify,
  render: h => h(App)
}).$mount("#app");
