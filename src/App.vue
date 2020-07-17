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
            <v-list-item-title>Settings</v-list-item-title>
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
      <span class="error--text">last</span>
      &nbsp;|&nbsp;
      <span class="success--text">mark</span>
    </v-app-bar>

    <v-main>
      <Ladder />
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
import { mapMutations } from 'vuex'

export default {
  props: {
    source: String,
  },
  components: {
    Ladder,
  },
  methods: {
      sendAssetChangeMsg(asset) {
        this.$root.$emit('asset_change', asset)
      },
      ...mapMutations(['setAsset'])
  },
  data: () => ({
    drawer: null,
  }),
  created() {
    this.$vuetify.theme.dark = true;
    this.$vuetify.theme.themes.dark.primary = "#eba51d";
    this.$vuetify.theme.themes.dark.success = "#78b63f";
    this.$vuetify.theme.themes.dark.error = "#e44b8f";
  },
  mounted() {
    this.sendAssetChangeMsg('asset_change', 'BTC-PERPETUAL')
  }
};
</script>

<style scoped></style>
