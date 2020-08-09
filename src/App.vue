<template>
  <v-app id="inspire">
    <v-navigation-drawer v-model="drawer" app clipped>
      <v-list dense>
        <v-list-item link>
          <v-list-item-action>
            <v-icon>mdi-view-dashboard</v-icon>
          </v-list-item-action>
          <v-list-item-content>
            <v-list-item-title>Ladder</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <v-list-item link>
          <v-list-item-action>
            <v-icon>mdi-cog</v-icon>
          </v-list-item-action>
          <v-list-item-content>
            <APIDialog />
          </v-list-item-content>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>

    <v-app-bar app clipped-left height="100px">
      <v-app-bar-nav-icon @click.stop="drawer = !drawer"></v-app-bar-nav-icon>
      <v-toolbar-title>Hedgehog</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-select
        v-model="activeAccount"
        :items="accountList"
        label="Accounts"
        @change="handleExchangeChange"
      >
      </v-select>
      <v-spacer></v-spacer>
      <v-select
        v-model="asset"
        :items="assets"
        label="Assets"
        @change="setAsset"
      >
      </v-select>
      <v-spacer></v-spacer>
      <div>
        <span v-if="lastPriceUp" class="success--text"
          >Last: <strong>{{ lastAndMarkPrice.lastPrice.toFixed(2) }}</strong>
        </span>
        <span v-else-if="lastPriceDn" class="error--text"
          >Last: <strong>{{ lastAndMarkPrice.lastPrice.toFixed(2) }}</strong>
        </span>
        <span v-else
          >Last: <strong>{{ lastAndMarkPrice.lastPrice.toFixed(2) }}</strong>
        </span>
        {{ divider }}
        <span v-if="markPriceUp" class="success--text"
          >Mark:
          <strong>{{ lastAndMarkPrice.markPrice.toFixed(2) }}</strong></span
        >
        <span v-else-if="markPriceDn" class="error--text"
          >Mark:
          <strong>{{ lastAndMarkPrice.markPrice.toFixed(2) }}</strong></span
        >
        <span v-else
          >Mark:
          <strong>{{ lastAndMarkPrice.markPrice.toFixed(2) }}</strong></span
        >
      </div>
    </v-app-bar>

    <v-main>
      <Ladder v-if="asset" />
      <v-row v-else justify="center">
        <v-col align="center" sm="12">
          <h1>Select account and asset to get started</h1>
        </v-col>
      </v-row>
    </v-main>

    <v-footer app>
      <span
        >&copy; {{ new Date().getFullYear() }} Quenos Blockchain R&D KFT</span
      >
    </v-footer>
  </v-app>
</template>

<script>
import Ladder from "./views/Ladder";
import APIDialog from "@/components/APIDialog";
import store from "./store";

export default {
  store,
  props: {
    source: String,
  },
  components: {
    Ladder,
    APIDialog,
  },
  methods: {
    handleExchangeChange() {
      this.apiStarted = false;
      this.$apiAbstraction.closeApi();
      store.dispatch("changeExchange", this.activeAccount);
      this.$apiAbstraction.initExchange()
    },
    setAsset(asset) {
      store.dispatch("changeAsset", asset);
      if (!this.apiStarted) {
        this.$apiAbstraction.startApi();
        this.apiStarted = true;
      }
      if (store.getters.getExchange === 'binance') {
        this.$apiAbstraction.getPositions()
      }
      this.$apiAbstraction.getOpenOrders(asset)
    },
  },
  data: () => ({
    apiStarted: false,
    activeAccount: "",
    drawer: null,
    lastPriceUp: false,
    lastPriceDn: false,
    markPriceUp: false,
    markPriceDn: false,
    divider: `\xa0|\xa0`,
  }),
  created() {
    this.$vuetify.theme.dark = true;
    this.$vuetify.theme.themes.dark.primary = "#eba51d";
    this.$vuetify.theme.themes.dark.success = "#78b63f";
    this.$vuetify.theme.themes.dark.error = "#e44b8f";
    this.apiStarted = false;
  },
  mounted() {
    store.dispatch("loadApiKeys");
  },
  computed: {
    accountList: () => store.getters.getAccounts,
    assets: () => store.getters.getAssets,
    asset: {
      get: () => store.getters.getAsset,
      set: (asset) => store.commit("setAsset", asset)
    },
    lastAndMarkPrice() {
      const prices = store.getters.getLastAndMarkPriceByExchangeInstrument(
        store.getters.getExchange,
        store.getters.getAsset
      );
      return { ...prices };
    },
  },
  watch: {
    lastAndMarkPrice(newValue, oldValue) {
      this.lastPriceUp = newValue.lastPrice > oldValue.lastPrice;
      this.lastPriceDn = newValue.lastPrice < oldValue.lastPrice;
      this.markPriceUp = newValue.markPrice > oldValue.markPrice;
      this.markPriceDn = newValue.markPrice < oldValue.markPrice;
    },
  },
};
</script>

<style scoped></style>
