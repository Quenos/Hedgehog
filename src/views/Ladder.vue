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
              :rules="[rules.required, rules.number]"
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
              :rules="[rules.number]"
              label="Take Profit"
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

      <v-row align="start" justify="center">
        <v-col align="right" sm="4">
          <v-btn @click="previewBuy" color="#78b63f" width="125"
            >Preview Buy<BR /> Entries</v-btn
          >
        </v-col>
        <v-col align="center" sm="4">
          <v-btn @click="resetForm" color="grey darken-2">reset</v-btn>
        </v-col>
        <v-col align="left" sm="4">
          <v-btn @click="previewSell" color="#ba4967" width="125"
            >Preview Sell<BR /> Entries</v-btn
          >
        </v-col>
      </v-row>
      <v-row justify="center" class="mt-4">
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
          <v-btn color="#78b63f" width="125">Buy / Long</v-btn>
        </v-col>
        <v-col sm="4"></v-col>
        <v-col align="left" sm="4">
          <v-btn color="#ba4967" width="125">Sell / Short</v-btn>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script>
// @ is an alias to /src
import { generateOrders } from "@/components/scaledOrderGenerator.js";

export default {
  name: "Ladder",
  components: {},
  methods: {
    resetForm() {
      this.$refs.form.reset();
    },
    Testje() {
      this.previewSell();
    },
    previewSell() {
      if (this.$refs.form.validate()) {
        this.orders = [];
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
    valid: true,
    higher_price: "3800",
    lower_price: "3500",
    quantity: "500",
    number_of_orders: "5",
    take_profit: "1200",
    stop_loss: "1200",
    scale: "Increasing",
    scl_items: ["Flat", "Increasing", "Decreasing"],
    scale_coefficient: "10",
    time_in_force: "Good Till Cancelled",
    tif_items: [
      "Good Till Cancelled",
      "Immediate or Cancel",
      "Fill or Kill",
      "Post Only",
    ],
    orders: [],
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
    rules: {
      required: (value) => !!value || "Required.",
      number: (value) => {
        const pattern = /^[1-9][0-9]*([.][0-9]*)?$/;
        return pattern.test(value) || "Input must be numeric.";
      },
      number_int: (value) => {
        const pattern = /^[1-9][0-9]*$/;
        return pattern.test(value) || "Input cannot have a fraction.";
      },
    },
  }),
};
</script>
