<template>
  <v-app id="inspire">
    <v-navigation-drawer v-model="drawer" app clipped>
      <v-list dense>
        <v-list-item v-if="activate" @click="handleShowLadder">
          <v-list-item-action>
            <v-icon>mdi-stairs</v-icon>
          </v-list-item-action>
          <v-list-item-content>
            <v-list-item-title>Ladder</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <v-list-item  v-if="activate" @click="handleShowMarket">
          <v-list-item-action>
            <v-icon>mdi-storefront</v-icon>
          </v-list-item-action>
          <v-list-item-content>
            <v-list-item-title>Market Order</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <v-list-item  v-if="activate" @click="handleShowLimit">
          <v-list-item-action>
            <v-icon>mdi-arrow-expand-vertical</v-icon>
          </v-list-item-action>
          <v-list-item-content>
            <v-list-item-title>Limit Order</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <v-list-item v-if="botAvailable && activate" @click="handleShowBot">
          <v-list-item-action>
            <v-icon>mdi-robot</v-icon>
          </v-list-item-action>
          <v-list-item-content>
            <v-list-item-title>TRDR Bot</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <v-list-item v-if="activate" link>
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
        :items="trdrBot ? botAccountList : accountList"
        label="Accounts"
        @change="handleExchangeChange"
      >
      </v-select>
      <v-spacer></v-spacer>
      <v-select v-if="!trdrBot"
        v-model="asset"
        :items="assets"
        label="Assets"
        @change="setAsset"
      >
      </v-select>
      <v-spacer></v-spacer>
      <div v-if="!trdrBot">
        <span v-if="lastPriceUp" class="success--text"
          >Last: <strong>{{ lastAndMarkPrice.lastPrice.toFixed(precision) }}</strong>
        </span>
        <span v-else-if="lastPriceDn" class="error--text"
          >Last: <strong>{{ lastAndMarkPrice.lastPrice.toFixed(precision) }}</strong>
        </span>
        <span v-else
          >Last: <strong>{{ lastAndMarkPrice.lastPrice.toFixed(precision) }}</strong>
        </span>
        {{ divider }}
        <span v-if="markPriceUp" class="success--text"
          >Mark:
          <strong>{{ lastAndMarkPrice.markPrice.toFixed(precision) }}</strong></span
        >
        <span v-else-if="markPriceDn" class="error--text"
          >Mark:
          <strong>{{ lastAndMarkPrice.markPrice.toFixed(precision) }}</strong></span
        >
        <span v-else
          >Mark:
          <strong>{{ lastAndMarkPrice.markPrice.toFixed(precision) }}</strong></span
        >
      </div>
    </v-app-bar>

    <v-main>
      <Ladder v-if="ladder && asset" activate/>
      <Market v-else-if="market && asset" />
      <Limit v-else-if="limit && asset" />
      <TRDRBot v-else-if="trdrBot" />
      <v-row v-else-if="!activate" justify="center">
        <v-col align="center" sm="12">
          <h1>License expired</h1>
        </v-col>
      </v-row>
      <v-row v-else justify="center">
        <v-col align="center" sm="12">
          <h1>Select account and asset to get started</h1>
        </v-col>
      </v-row>
      <notifications position="bottom left" :duration="4000"/>
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
import Market from "./views/Market";
import Limit from "./views/Limit";
import TRDRBot from "./views/TRDRBot"
import APIDialog from "@/components/APIDialog";
import store from "./store";
import botStore from "./store"

export default {
  store,
  botStore,
  props: {
    source: String,
  },
  components: {
    Ladder,
    Market,
    Limit,
    TRDRBot,
    APIDialog,
  },
    data: () => ({
    botAvailable: false,
    activate: false,
    ladder: true,
    market: false,
    limit: false,
    trdrBot: false,
    apiStarted: false,
    activeAccount: "",
    botActiveAccount: "",
    drawer: null,
    lastPriceUp: false,
    lastPriceDn: false,
    markPriceUp: false,
    markPriceDn: false,
    divider: `\xa0|\xa0`,
  }),
  methods: {
    handleShowLadder() {
      if (this.asset !== ""){
        this.market = false
        this.limit = false
        this.ladder = true
      }
      this.trdrBot = false
    },
    handleShowMarket() {
      if (this.asset !== ""){
        this.market = true
        this.limit = false
        this.ladder = false
      }
      this.trdrBot = false
    },
    handleShowBot() {
        this.market = false
        this.limit = false
        this.trdrBot = true
        this.ladder = false
    },
    handleShowLimit() {
      if (this.asset !== ""){
        this.market = false
        this.limit = true
        this.ladder = false
      }
      this.trdrBot = false
    },
    handleExchangeChange() {
      if (this.trdrBot){
        this.handleBotExchChange()
      }
      this.apiStarted = false;
      this.$apiAbstraction.closeApi();
      store.dispatch("changeExchange", this.activeAccount);
      this.$apiAbstraction.initExchange()
    },
    handleBotExchChange() {
      store.dispatch("changeBotExchange", this.activeAccount);
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
  created() {
    this.$vuetify.theme.dark = true;
    this.$vuetify.theme.themes.dark.primary = "#eba51d";
    this.$vuetify.theme.themes.dark.success = "#78b63f";
    this.$vuetify.theme.themes.dark.error = "#e44b8f";
    this.apiStarted = false;
  },
  mounted() {
    store.dispatch("loadApiKeys");
    const date = new Date()
    const endDate = new Date('2020-09-25')
    if (date <= endDate){
      if(process.env.NODE_ENV === "development"){
        this.botAvailable = true
      }
      this.activate = true
      this.$binanceOrderBook.initWs()
      console.log(`${new Date(Date.now()).toLocaleString()} bot started`)
    }
  },
  computed: {
    precision: () => {
      const tickSize = store.getters.getTickSizeBySymbol(store.getters.getAsset);
      return tickSize.length ? Math.ceil(Math.abs(Math.log10(tickSize[0]["tickSize"]))) : 2
    },
    accountList: () => store.getters.getAccounts(),
    botAccountList: () => store.getters.getAccounts("binance"),
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
