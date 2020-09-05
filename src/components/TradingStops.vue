<template>
  <section class="accounts">
    <v-card>
      <v-card-title class="title">
        <span>Trading Stops</span>
      </v-card-title>

      <v-card-text>
        0 means cancel
        <br /><br />
        <v-form
          ref="form"
          v-model="valid"
          :lazy-validation="false"
          autocomplete="off"
          @submit="submit"
        >
          <v-text-field
            class="ma-0"
            height="25"
            :hint="tpProfit"
            persistent-hint
            v-model="takeProfit"
            :rules="formValidation.takeProfitRules"
            label="Take Profit"
          ></v-text-field>
          <br />
          <v-text-field
            class="ma-0"
            height="25"
            :hint="slLoss"
            persistent-hint
            v-model="stopLoss"
            :rules="formValidation.stopLossRules"
            label="Stop Loss"
          ></v-text-field>
          <br />
          <v-text-field
            class="ma-0"
            height="25"
            persistent-hint
            v-model="trailingStop"
            :rules="formValidation.trailingStopRules"
            label="Trailing Stop"
          ></v-text-field>
          <v-layout class="row justify-center align-center" center>
            <v-btn
              :disabled="!valid"
              color="success"
              class="ma-2"
              @click="submit"
            >
              Submit
            </v-btn>
          </v-layout>
        </v-form>
      </v-card-text>

      <v-divider></v-divider>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" text @click="$emit('close')">
          Close
        </v-btn>
      </v-card-actions>
    </v-card>
  </section>
</template>

<script>
import store from "../store";

export default {
  name: "TradingStops",
  components: {},
  props: [],
  data() {
    return {
      valid: true,
      stopLoss: store.getters.getOpenPositionsByExchange(store.getters.getExchange)[0]["stop_loss"],
      takeProfit: store.getters.getOpenPositionsByExchange(store.getters.getExchange)[0]["take_profit"],
      trailingStop: store.getters.getOpenPositionsByExchange(store.getters.getExchange)[0]["trailing_stop"],
    };
  },
  computed: {
    formValidation: function() {
      return {
        takeProfitRules: [
          (v) => !v || (v && !isNaN(v)) || "Take Profit must be an number",
          (v) =>
            !v ||
            (v && Number(v + "e5") % Number(this.tickSize() + "e5") === 0) ||
            "Take Profit must be a multiple of " + this.tickSize(),
        ],
        stopLossRules: [
          (v) => !v || (v && !isNaN(v)) || "Stop Loss must be an number",
          (v) =>
            !v ||
            (v && Number(v + "e5") % Number(this.tickSize() + "e5") === 0) ||
            "Stop Loss must be a multiple of " + this.tickSize(),
        ],
        trailingStopRules: [
          (v) => !v || (v && !isNaN(v)) || "Trailing Stop must be an number",
          (v) =>
            !v ||
            (v && Number(v + "e5") % Number(this.tickSize() + "e5") === 0) ||
            "Trailing Stop must be a multiple of " + this.tickSize(),
        ],
      };
    },
    tpProfit: function() {
      const entry_price = store.getters.getOpenPositionBySymbol(store.getters.getAsset)["entry_price"]
      const size = store.getters.getOpenPositionBySymbol(store.getters.getAsset)["size"]
      if (this.takeProfit && this.takeProfit != 0 && size) {
        const profit = Math.abs(1 / entry_price - 1 / parseFloat(this.takeProfit)) * size;
        return (`${profit.toFixed(4)} ≈ ${(profit * entry_price).toFixed(2)} USD`);
      } else {
        return "0";
      }
    },
    slLoss: function() {
      const entry_price = store.getters.getOpenPositionBySymbol(store.getters.getAsset)["entry_price"]
      const size = store.getters.getOpenPositionBySymbol(store.getters.getAsset)["size"]
      if (this.stopLoss && this.stopLoss != 0 && size) {
        const loss =
          Math.abs(
            1 / entry_price - 1 / parseFloat(this.stopLoss)) * size + (size * 0.075) / 100 / this.stopLoss;
        return (`${loss.toFixed(4)} ≈ ${(loss * entry_price).toFixed(2)} USD (including fees)`);
      } else {
        return "0";
      }
    },
  },
  mounted() {},
  methods: {
    tickSize: () =>
      store.getters.getTickSizeBySymbol(store.getters.getAsset)[0]["tickSize"],
    submit() {
      /* eslint-disable */
      const symbol = store.getters.getAsset;
      const side =
        store.getters.getOpenPositionBySymbol(symbol)["side"].toLowerCase() ===
        "buy"
          ? "sell"
          : "buy";
      const size = store.getters.getOpenPositionBySymbol(symbol)["size"]
      this.$apiAbstraction.takeProfitOrder(symbol, side, this.takeProfit, size);
      this.$apiAbstraction.stoplossOrder(symbol, side, this.stopLoss, size);
      this.$apiAbstraction.trailingSLOrder(symbol, side, this.trailingStop, size)
      this.$emit("close");
    },
  },
};
</script>
