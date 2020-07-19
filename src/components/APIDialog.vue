<template>
  <v-dialog max-width="1000px" v-model="dialog">
    <template v-slot:activator="{ on }">
      <v-list-item-title v-on="on">APIs</v-list-item-title>
    </template>
    <v-card>
      <v-card-title>
        <Span>
          Add a new API
        </Span>
        <v-spacer></v-spacer>
        <v-btn small color="primary" @click="add()">
          +
        </v-btn>
      </v-card-title>
      <v-card-text>
        <v-data-table :headers="headers" :items="theApiKeys">
          <template v-slot:item.label="{ item }">
            <v-text-field
              v-model="item.label"
              :rules="accountLabelRules"
              required
              small
            ></v-text-field>
          </template>
          <template v-slot:item.apiKey="{ item }">
            <v-text-field
              v-model="item.apiKey"
              :rules="apiKeyRules"
              counter="8"
              required
            ></v-text-field>
          </template>
          <template v-slot:item.apiSecret="{ item }">
            <v-text-field
              v-model="item.apiSecret"
              :rules="privateKeyRules"
              counter="43"
              required
            ></v-text-field>
          </template>
          <template v-slot:item.remove="{ item }">
            <v-btn small color="error" @click="remove(item)">
              X
            </v-btn>
          </template>
        </v-data-table>
      </v-card-text>
      <v-divider></v-divider>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" text @click="dialog =  false; storeKeys()">
          Close
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import store from "../store";

export default {
  store,
  data() {
    return {
      dialog: false,
      headers: [
        { text: "Label", value: "label" },
        { text: "Api Key", value: "apiKey" },
        { text: "Api Secret", value: "apiSecret" },
        { text: "Remove", value: "remove" },
      ],
      apiKeyRules: [
        (v) => !!v || "Api key is required",
        (v) => (v && v.length === 8) || "Api key must be 18 characters",
      ],
      privateKeyRules: [
        (v) => !!v || "Private Key is required",
        (v) => (v && v.length === 43) || "Private Key must be 36 characters",
      ],
      accountLabelRules: [(v) => !!v || "Account Label is required"],
      valid: true,
    };
  },
  methods: {
    add: () => {
      store.commit("addApiKey", {
        exchange: "deribit",
        keys: {
          label: "",
          apiKey: "",
          apiSecret: "",
        },
      });
    },
    remove: (item) => {
      store.commit("removeApiKey", {
        exchange: "deribit",
        keys: item,
      });
      store.dispatch("storeApiKeys");
    },
    storeKeys: () => {
      store.dispatch("storeApiKeys");
    },
  },
  computed: {
    theApiKeys() {
      return store.getters.getApiKeysByExchange("deribit");
    },
  },
};
</script>

<style></style>
