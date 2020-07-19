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
            <APIDialog/>
          </v-list-item-content>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>

    <v-app-bar app clipped-left>
      <v-app-bar-nav-icon @click.stop="drawer = !drawer"></v-app-bar-nav-icon>
      <v-toolbar-title>Hedgehog</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn-toggle mandatory color="primary">
        <v-btn @click="setAsset('BTC-PERPETUAL')" small>
          BTC/USD
        </v-btn>
        <v-btn @click="setAsset('ETH-PERPETUAL')" small>
          ETH/USD
        </v-btn>
      </v-btn-toggle>
      <v-spacer></v-spacer>
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
    </v-app-bar>

    <v-main>
      <Ladder v-if="apiLoaded" />
      <v-row v-else justify="center">
        <v-col align="center" sm="12">
        <h1>Enter API keys to get started</h1>
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
import APIDialog from "@/components/APIDialog"
import store from "./store";
import { mapMutations } from "vuex";

export default {
  store,
  props: {
    source: String
  },
  components: {
    Ladder,
    APIDialog,
  },
  methods: {
    sendAssetChangeMsg(asset) {
      this.$root.$emit("asset_change", asset);
    },
    ...mapMutations(["setAsset"])
  },
  data: () => ({
    drawer: null,
    lastPriceUp: false,
    markPriceUp: false,
    lastPriceDn: false,
    markPriceDn: false,
    divider: `\xa0|\xa0`
  }),
  created() {
    this.$vuetify.theme.dark = true;
    this.$vuetify.theme.themes.dark.primary = "#eba51d";
    this.$vuetify.theme.themes.dark.success = "#78b63f";
    this.$vuetify.theme.themes.dark.error = "#e44b8f";
  },
  mounted() {
    this.sendAssetChangeMsg("asset_change", "BTC-PERPETUAL");
  },
  computed: {
    lastAndMarkPrice() {
      return store.getters.getLastAndMarkPriceByExchange("deribit");
    },
    apiLoaded() {
      return store.getters.apiLoaded("deribit")
    }
  },
  watch: {
    lastAndMarkPrice(newValue, oldValue) {
      this.lastPriceUp = newValue.lastPrice > oldValue.lastPrice;
      this.lastPriceDn = newValue.lastPrice < oldValue.lastPrice;
      this.markPriceUp = newValue.markPrice > oldValue.markPrice;
      this.markPriceDn = newValue.markPrice < oldValue.markPrice;
    }
  }
};
</script>

<style scoped></style>
