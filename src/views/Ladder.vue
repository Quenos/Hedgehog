<template>
  <div class="ladder">
    <OpenPositions v-if="openPositions" class="mx-1" />
    <v-container fluid>
      <v-form ref="form" v-model="valid" justify="center">
        <v-row justify="center">
          <v-col cols="12" sm="8" align="center">
            <v-text-field
              v-model="higher_price"
              :rules="[rules.required, rules.number]"
              label="Higher Price"
            ></v-text-field>
            <v-text-field
              v-model="lower_price"
              :rules="[rules.required, rules.number]"
              label="Lower Price"
            ></v-text-field>
            <v-text-field
              v-model="quantity"
              :rules="[rules.required, isDeribit]"
              label="Quantity"
            >
            </v-text-field>
            <v-text-field
              v-model="number_of_orders"
              :rules="[rules.required, rules.number_int]"
              label="Number of Orders"
            ></v-text-field>
            <v-text-field
              v-model="take_profit"
              label="Take Profit"
              :disabled="activateTakeProfit() ? false : true"
            ></v-text-field>
            <v-text-field
              v-model="stop_loss"
              :rules="[rules.number]"
              label="Stop Loss"
            ></v-text-field>
            <v-select
              v-model="scale"
              :items="scl_items"
              :rules="[rules.required]"
              label="Scale"
            ></v-select>
            <v-text-field
              v-model="scale_coefficient"
              :rules="[rules.required]"
              label="Scale Coefficient"
            ></v-text-field>
            <v-select
              v-model="time_in_force"
              :items="tif_items"
              :rules="[rules.required]"
              label="Time in Force"
            ></v-select>
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

      <v-row align="start" justify="center">
        <v-col align="right" sm="4">
          <v-btn @click="previewBuy" color="success" width="125"
            >Preview Buy<BR /> Entries</v-btn
          >
        </v-col>
        <v-col align="center" sm="4">
          <v-btn @click="resetForm" color="grey darken-2">reset</v-btn>
        </v-col>
        <v-col align="left" sm="4">
          <v-btn @click="previewSell" color="error" width="125"
            >Preview Sell<BR /> Entries</v-btn
          >
        </v-col>
      </v-row>
      <div v-show="showPreview">
        <v-row justify="space-between" class="mb-n6">
          <v-col sm="4" align="right">
            <span class="font-weight-light mb-n1">Preview Orders</span>
          </v-col>
          <v-col sm="3" align="left">
            <a @click="showPreview = !showPreview">Close</a>
          </v-col>
        </v-row>
        <v-row justify="center" class="mt-1">
          <v-col sm="8">
            <v-data-table
              dense
              :headers="headers"
              :items="orders"
              item-key="name"
              class="elevation-1"
              sm="4"
            ></v-data-table>
          </v-col>
        </v-row>
        <v-row align="start" justify="center">
          <v-col align="right" sm="4">
            <v-btn @click="submit_orders" color="success" width="125"
              >Buy / Long</v-btn
            >
          </v-col>
          <v-col sm="4"></v-col>
          <v-col align="left" sm="4">
            <v-btn @click="submit_orders" color="error" width="125"
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
import { generateOrders } from "@/utils/scaledOrderGenerator.js";
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
    async submit_orders() {
      this.showPreview = !this.showPreview;
      await this.$apiAbstraction.enterOrders(
        this.getAsset,
        "limit",
        this.post_only,
        this.reduce_only,
        this.orders
      );
    },
    previewSell() {
      if (this.$refs.form.validate()) {
        this.orders = [];
        this.showPreview = true;
        this.quantity = parseFloat(this.quantity);
        this.number_of_orders = parseFloat(this.number_of_orders);
        this.lower_price = parseFloat(this.lower_price);
        this.higher_price = parseFloat(this.higher_price);
        this.scale_coefficient = parseFloat(this.scale_coefficient);
        const tickSize = store.getters.getTickSizeBySymbol(store.getters.getAsset);
        const quotient = 100 / this.quantity 
        const orders = generateOrders({
          amount: 100,
          orderCount: this.number_of_orders,
          priceLower: this.lower_price,
          priceUpper: this.higher_price,
          distribution: this.scale,
          tickSize: tickSize.length ? tickSize[0]["tickSize"] : 0.5,
          coefficient: this.scale_coefficient,
          isDeribit: this.deribitExchange()
        });
        orders.forEach((order) => {
          this.orders.push({
            side: "Sell",
            quantity: (order["amount"] / quotient).toFixed(Math.abs(Math.log10(tickSize[0]["minStepSize"]))),
            price: order["price"],
            take_profit: this.take_profit,
            stop_loss: this.stop_loss,
            time_in_force: this.time_in_force,
          });
        });
      }
    },
    previewBuy() {
      if (this.$refs.form.validate()) {
        this.orders = [];
        this.showPreview = true;
        this.quantity = parseFloat(this.quantity);
        this.number_of_orders = parseFloat(this.number_of_orders);
        this.lower_price = parseFloat(this.lower_price);
        this.higher_price = parseFloat(this.higher_price);
        this.scale_coefficient = parseFloat(this.scale_coefficient);
        const tickSize = store.getters.getTickSizeBySymbol(store.getters.getAsset);
        const quotient = 100 / this.quantity 
        const orders = generateOrders({
          amount: 100,
          orderCount: this.number_of_orders,
          priceLower: this.lower_price,
          priceUpper: this.higher_price,
          distribution:
            this.scale === "Flat"
              ? "Flat"
              : this.scale === "Increasing"
              ? "Decreasing"
              : "Increasing",
          tickSize: tickSize.length ? tickSize[0]["tickSize"] : 0.5,
          coefficient: this.scale_coefficient,
        });
        orders.reverse().forEach((order) => {
          this.orders.push({
            side: "Buy",
            quantity: (order["amount"] / quotient).toFixed(Math.abs(Math.log10(tickSize[0]["minStepSize"]))),
            price: order["price"],
            take_profit: this.take_profit,
            stop_loss: this.stop_loss,
            time_in_force: this.time_in_force,
          });
        });
      }
    },
  },
  data: () => ({
    valid: true,
    showPreview: false,
    openBuyOrders: 0,
    openSellOrders: 0,
    higher_price: "",
    lower_price: "",
    quantity: "",
    number_of_orders: "",
    take_profit: "",
    stop_loss: "",
    scale: "Flat",
    scl_items: ["Flat", "Increasing", "Decreasing"],
    scale_coefficient: "10",
    time_in_force: "Good Till Cancelled",
    tif_items: ["Good Till Cancelled", "Immediate or Cancel", "Fill or Kill"],
    orders: [],
    reduce_only: false,
    post_only: true,
    headers: [
      {
        text: "Side",
        align: "start",
        sortable: false,
        value: "side",
      },
      { text: "Qty", sortable: false, value: "quantity" },
      { text: "Price", sortable: false, value: "price" },
      { text: "Take Profit", sortable: false, value: "take_profit" },
      { text: "Stop Loss", sortable: false, value: "stop_loss" },
      { text: "Time in Force", sortable: false, value: "time_in_force" },
    ],
    openOrdersHeaders: [
      {
        text: "Side",
        align: "start",
        sortable: false,
        value: "side",
      },
      { text: "Qty", sortable: false, value: "quantity" },
      { text: "Price", sortable: false, value: "orderPrice" },
      { text: "Type", sortable: false, value: "orderType" },
      { text: "Time in Force", sortable: false, value: "orderTimeInForce" },
      { text: "Updated", sortable: false, value: "orderUpdated" },
      { text: "Cancel", sortable: false, value: "orderCancel" },
    ],
    rules: {
      required: (value) => !!value || "Required.",
      number: (value) => {
        const pattern = /(^[1-9][0-9]*([.][0-9]*)?$)|^$/;
        return pattern.test(value) || "Input must be numeric.";
      },
      number_int: (value) => {
        const pattern = /^[1-9][0-9]*$/;
        return pattern.test(value) || "Input cannot have a fraction.";
      },
    },
  }),
  computed: {
    ...mapGetters(["getAsset", "getExchange"]),
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
    openOrders() {
      const open_orders = store.getters.getOpenOrdersByExchangeInstrument(
        store.getters.getExchange,
        store.getters.getAsset
      );
      this.openBuyOrders = 0
      this.openSellOrders = 0
      open_orders.forEach(openOrder => {
        if (openOrder.orderType === "LIMIT" && openOrder.side === "buy") {
          this.openBuyOrders += parseFloat(openOrder.quantity)
        } 
        if (openOrder.orderType === "LIMIT" && openOrder.side === "sell") {
          this.openSellOrders += parseFloat(openOrder.quantity)
        } 
      })
      this.openSellOrders = this.openSellOrders.toFixed(4)
      this.openBuyOrders = this.openBuyOrders.toFixed(4)
      return open_orders
    },
  },
  mounted: function() {},
  watch: {},
};
</script>
