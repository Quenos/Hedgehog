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
import Ladder from "./views/Ladder"
export default {
  props: {
    source: String,
  },
  components: {
    Ladder,
  },
  data: () => ({
    drawer: null,
  }),
  created() {
    this.$vuetify.theme.dark = true;
  },
};
</script>

<style scoped></style>
