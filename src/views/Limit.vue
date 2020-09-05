<template>
  <div class="limit">
    <OpenPositions v-if="openPositions" class="mx-1" />
    <v-container fluid>
      <H3 align="center">Enter Limit Order</h3>
      <v-form ref="form" v-model="valid" justify="center">
        <v-row justify="center">
          <v-col cols="12" sm="8" align="center">
            <v-text-field
              v-model="quantity"
              :rules="[rules.required, rules.number, isDeribit]"
              label="Quantity"
            ></v-text-field>
            <v-text-field
              v-model="price"
              :rules="[rules.required, rules.number]"
              label="Price"
            ></v-text-field>
          </v-col>
        </v-row>
      </v-form>
      <v-row justify="center">
        <v-col sm="3" align="left" class="ml-12">
          <v-switch v-model="reduce_only" label="Reduce only"></v-switch>
        </v-col>
        <v-col sm="3" align="left" class="ml-12">
          <v-switch v-model="post_only" label="Post only"></v-switch>
        </v-col>
      </v-row>
      <div>
        <v-row align="start" justify="center">
          <v-col align="right" sm="4">
            <v-btn @click="submit_buy_order" color="success" width="125"
              >Buy / Long</v-btn
            >
          </v-col>
          <v-col sm="4"></v-col>
          <v-col align="left" sm="4">
            <v-btn @click="submit_sell_order" color="error" width="125"
              >Sell / Short</v-btn
            >
          </v-col>
        </v-row>
      </div>
      <div v-show="openOrders.length">
        <v-row class="mb-n6 mt-4">
          <v-col sm="8" align="left">
            <span class="font-weight-light mb-n1"
              >Open Orders ({{ openBuyOrders }} Long /
              {{ openSellOrders }} Short)</span
            >
          </v-col>
          <v-col sm="1" align="center" class="mr-6">
            <v-btn @click="cancelOrders('buy')" x-small color="success"
              >CANCEL BUYS</v-btn
            >
          </v-col>
          <v-col sm="1" align="center" class="mr-7">
            <v-btn @click="cancelOrders('sell')" x-small color="error"
              >CANCEL SELLS</v-btn
            >
          </v-col>
          <v-col sm="1" align="center">
            <v-btn @click="cancelAllOrderItems" x-small color="primary"
              >CANCEL ALL</v-btn
            >
          </v-col>
        </v-row>
        <v-row justify="center" align="end" class="mt-1">
          <v-col sm="12">
            <v-data-table
              dense
              :headers="openOrdersHeaders"
              :items="openOrders"
              item-key="name"
              class="elevation-1"
              sm="4"
            >
              <template v-slot:item.orderCancel="{ item }">
                <v-btn x-small color="primary" @click="cancelOrderId(item)">
                  Cancel
                </v-btn>
              </template>
            </v-data-table>
          </v-col>
        </v-row>
      </div>
    </v-container>
  </div>
</template>

<script>
/* eslint-disable */
// @ is an alias to /src
import { mapGetters } from "vuex";
import store from "../store";
import OpenPositions from "@/components/OpenPositions";

export default {
  name: "Ladder",
  components: { OpenPositions },
  methods: {
    deribitExchange() {
     return store.getters.getExchange === 'deribit' ? true : false 
    },
    activateTakeProfit(){
      return !this.deribitExchange()
    },
    async cancelAllOrderItems() {
      this.openOrders.forEach(async (openOrder) => {
        await this.$apiAbstraction.cancelOrder(openOrder["order_id"]);
      });
    },
    async cancelOrders(direction) {
      this.openOrders.forEach(async (openOrder) => {
        if (openOrder["side"] === direction) {
          await this.$apiAbstraction.cancelOrder(openOrder["order_id"]);
        }
      });
    },
    async cancelOrderId(item) {
      await this.$apiAbstraction.cancelOrder(item["order_id"]);
    },
    isDeribit(value) {
      if (this.deribitExchange()) {
        return !(value % 10) || "Quantity must be a multiple of 10.";
      } else {
        return true;
      }
    },
    resetForm() {
      this.$refs.form.reset();
    },
    async submit_orders(side) {
      this.$apiAbstraction.enterOrders(
        this.getAsset,
        "limit",
        this.post_only,
        this.reduce_only,
        [{
          side,
          quantity: this.quantity,
          price: this.price,
          time_in_force: "Good Till Cancelled",
          take_profit: this.take_profit,
          stop_loss: this.stop_loss,
        }]
      );
    },

    async submit_buy_order() {
      this.submit_orders("buy")
    },
    async submit_sell_order() {
      this.submit_orders("sell")
    },
  },
  data: () => ({
    openBuyOrders: 0,
    openSellOrders: 0,
    valid: true,
    quantity: "",
    price: "",
    take_profit: "",
    stop_loss: "",
    reduce_only: false,
    post_only: true,
    orders: [],
    openOrdersHeaders: [
      {
        text: "Side",
        align: "start",
        sortable: false,
        value: "side",
      },
      { text: "Qty", sortable: false, value: "quantity" },
      { text: "Price", sortable: true, value: "orderPrice" },
      { text: "Type", sortable: false, value: "orderType" },
      { text: "Time in Force", sortable: false, value: "orderTimeInForce" },
      { text: "Updated", sortable: false, value: "orderUpdated" },
      { text: "Cancel", sortable: false, value: "orderCancel" },
    ],
    rules: {
      required: (value) => !!value || "Required.",
      number: (value) => {
        const pattern = /(^[0-9]*([.][0-9]*)?$)|^$/;
        return pattern.test(value) || "Input must be numeric.";
      },
    },
  }),
  computed: {
    ...mapGetters(["getAsset", "getExchange"]),
    openOrders() {
      const open_orders = store.getters.getOpenOrdersByExchangeInstrument(
        store.getters.getExchange,
        store.getters.getAsset
      );
      this.openBuyOrders = 0
      this.openSellOrders = 0
      open_orders.forEach(openOrder => {
        if (openOrder.orderType.toUpperCase() === "LIMIT" && openOrder.side.toUpperCase() === "BUY") {
          this.openBuyOrders += parseFloat(openOrder.quantity)
        } 
        if (openOrder.orderType.toUpperCase() === "LIMIT" && openOrder.side.toUpperCase() === "SELL") {
          this.openSellOrders += parseFloat(openOrder.quantity)
        } 
      })
      this.openSellOrders = this.openSellOrders.toFixed(4)
      this.openBuyOrders = this.openBuyOrders.toFixed(4)
      return open_orders
    },
    openPositions() {
      try {
        const op = store.getters.getOpenPositionsByExchange(
          store.getters.getExchange
        );
        return op.length;
      } catch {
        return 0;
      }
    },
  },
};
</script>
