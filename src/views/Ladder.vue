<template>
  <div class="ladder">
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
              :rules="[rules.required, rules.number, isDeribit]"
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
              disabled
            ></v-text-field>
            <v-text-field
              v-model="stop_loss"
              :rules="[rules.number]"
              label="Stop Loss"
            ></v-text-field>
            <v-combobox
              v-model="scale"
              :items="scl_items"
              :rules="[rules.required]"
              label="Scale"
            ></v-combobox>
            <v-text-field
              v-model="scale_coefficient"
              :rules="[rules.required]"
              label="Scale Coefficient"
            ></v-text-field>
            <v-combobox
              v-model="time_in_force"
              :items="tif_items"
              :rules="[rules.required]"
              label="Time in Force"
            ></v-combobox>
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
      <div v-show="showOpenOrders">
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
              :items="openOrderItems"
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
// @ is an alias to /src
import { mapGetters } from 'vuex'
import store from "../store";
import { generateOrders } from "@/components/scaledOrderGenerator.js";


export default {
  name: "Ladder",
  components: {},
  methods: {
    async cancelAllOrderItems() {
      await this.$deribitApi.cancelAllOrders();
      this.openOrders();
    },
    async cancelOrders(direction) {
      this.openOrderItems.forEach(async (openOrder) => {
        if (openOrder["orderSide"] === direction) {
          await this.$deribitApi.cancelOrder(openOrder["orderId"]);
        }
      });
      this.openOrders();
    },
    async cancelOrderId(item) {
      await this.$deribitApi.cancelOrder(item["orderId"]);
      this.openOrders();
    },
    async openOrders() {
      if (this.theOpenOrders.length === 0) {
        this.showOpenOrders = false;
        this.openOrderItems = [];
      } else {
        var longs = 0;
        var shorts = 0;
        this.openOrderItems = [];
        this.theOpenOrders.forEach((openOrder) => {
          const dateObject = new Date(openOrder["last_update_timestamp"]);
          var price;
          if (openOrder["price"] === "market_price") {
            price = openOrder["stop_price"];
          } else {
            price = openOrder["price"];
          }
          this.openOrderItems.push({
            orderId: openOrder["order_id"],
            orderSide: openOrder["direction"],
            orderQuantity: openOrder["amount"],
            orderPrice: price,
            orderType: openOrder["order_type"],
            orderTimeInForce:
              openOrder["time_in_force"] === "good_til_cancelled"
                ? "Good till Cancelled"
                : openOrder["time_in_force"] === "immediate_or_cancel"
                ? "Immediate or Cancel"
                : "Fill or Kill",
            orderUpdated: dateObject.toLocaleString(),
          });
          openOrder["direction"] === "buy"
            ? (longs += openOrder["amount"])
            : (shorts += openOrder["amount"]);
        });
        this.openBuyOrders = longs;
        this.openSellOrders = shorts;
        this.showOpenOrders = true;
      }
    },
    isDeribit(value) {
      if (this.deribitExchange) {
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
      await this.$deribitApi.enterOrders(
        this.getAsset,
        "limit",
        this.post_only,
        this.reduce_only,
        this.orders
      );
      this.openOrders();
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
        var orders = generateOrders({
          amount: this.quantity,
          orderCount: this.number_of_orders,
          priceLower: this.lower_price,
          priceUpper: this.higher_price,
          distribution: this.scale,
          tickSize: 0.5,
          coefficient: this.scale_coefficient,
        });
        orders.forEach((order) => {
          this.orders.push({
            side: "Sell",
            quantity: order["amount"],
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
        var orders = generateOrders({
          amount: this.quantity,
          orderCount: this.number_of_orders,
          priceLower: this.lower_price,
          priceUpper: this.higher_price,
          distribution:
            this.scale === "Flat"
              ? "Flat"
              : this.scale === "Increasing"
              ? "Decreasing"
              : "Increasing",
          tickSize: 0.5,
          coefficient: this.scale_coefficient,
        });
        orders.reverse().forEach((order) => {
          this.orders.push({
            side: "Buy",
            quantity: order["amount"],
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
    deribitExchange: true,
    valid: true,
    showPreview: false,
    showOpenOrders: false,
    openBuyOrders: 0,
    openSellOrders: 0,
    higher_price: "3800",
    lower_price: "3500",
    quantity: "500",
    number_of_orders: "5",
    take_profit: null,
    stop_loss: "1200",
    scale: "Increasing",
    scl_items: ["Flat", "Increasing", "Decreasing"],
    scale_coefficient: "10",
    time_in_force: "Good Till Cancelled",
    tif_items: ["Good Till Cancelled", "Immediate or Cancel", "Fill or Kill"],
    orders: [],
    openOrderItems: [],
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
        value: "orderSide",
      },
      { text: "Qty", sortable: false, value: "orderQuantity" },
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
    ...mapGetters(['getAsset']),
    theOpenOrders() {
      return store.getters.getOpenOrdersByExchange('deribit')
    }

  },
  mounted: function() {
    // setInterval(() => this.openOrders(), 15 * 1000);
  },
  watch: {
    theOpenOrders () {
      this.openOrders()
    }
  }
};
</script>
