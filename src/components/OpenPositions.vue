<template>
  <v-row justify="center" align="end" class="mt-1">
    <v-col sm="12">
      <v-data-table
        dense
        align="center"
        :headers="full ? headers_full : headers_reduced"
        :items="openPositions"
        hide-default-footer>
        <template v-slot:item.symbol="cell">
          <cell-value v-bind="cell" />
        </template>
        <template v-slot:item.size="cell">
          <cell-value
           v-bind="cell"
           :has-error="() => cell.item.side === 'sell'"
           :has-success="() => cell.item.side === 'buy'" />
        </template>
        <template v-slot:item.position_value="cell">
          <cell-value v-bind="cell" to-fixed="6" />
        </template>
        <template v-slot:item.entry_price="cell">
          <cell-value v-bind="cell" />
        </template>
        <template v-slot:item.liq_price="cell">
          <cell-value v-bind="cell" />
        </template>
        <template v-slot:item.position_margin="cell">
          <cell-value v-bind="cell" to-fixed="6"/>
        </template>
        <template v-slot:item.unrealised_pnl_last="cell">
          <cell-value 
            v-bind="cell"
            :has-error="cell => cell < 0"
            :has-success="cell => cell > 0"
            :to-fixed="6" />
        </template>
        <template v-slot:item.realised_pnl="cell">
          <cell-value 
            v-bind="cell"
            :has-error="cell => cell < 0"
            :has-success="cell => cell > 0"
            :to-fixed="6" />
        </template>
        <template v-slot:item.daily_total="cell">
          <cell-value
            v-bind="cell"
            :has-error="cell => cell < 0"
            :has-success="cell => cell> 0"
            :to-fixed="6" />
        </template>
        <template v-slot:item.market_close="{ item }">
          <v-btn x-small color="primary" @click="marketClose(item)">
            Close
          </v-btn>
        </template>
      </v-data-table>
    </v-col>
  </v-row>
</template>

<script>
import store from "../store";
import CellValue from "./CellValue.vue";
export default {
  store,
  name: "OpenPositions",
  components: {
    CellValue
  },
  props: [],
  data() {
    return {
      dialog: false,
      headers_full: [
        { text: "Open Position", value: "symbol" },
        { text: "Qty", value: "size" },
        { text: "Value", value: "position_value" },
        { text: "Price", value: "entry_price" },
        { text: "Liq. Price", value: "liq_price" },
        { text: "Margin", value: "position_margin" },
        { text: "Leverage", value: "leverage" },
        {
          text: "Unrealized P&L",
          value: "unrealised_pnl_last",
        },
        { text: "Daily Realized P&L", value: "realised_pnl" },
        { text: "Daily Total (% of Account)", value: "daily_total" },
        { text: "SL", value: "stop_loss" },
        { text: "TP", value: "take_profit" },
        { text: "TS", value: "trailing_stop" },
        { text: "Stops", value: "trading_stops" },
        { text: "Market close", value: "market_close" },
      ],
      headers_reduced: [
        { text: "Open Position", value: "symbol" },
        { text: "Qty", value: "size" },
        { text: "Value", value: "position_value" },
        { text: "Price", value: "entry_price" },
        { text: "Liq. Price", value: "liq_price" },
        { text: "Margin", value: "position_margin" },
        { text: "Leverage", value: "leverage" },
        {
          text: "Unrealized P&L",
          value: "unrealised_pnl_last",
        },
        { text: "Daily Realized P&L", value: "realised_pnl" },
        { text: "Daily Total (% of Account)", value: "daily_total" },
        { text: "Market close", value: "market_close" },
      ],
    };
  },
  methods: {
    async marketClose(item) {
      await this.$apiAbstraction.marketOrder(
        item.symbol,
        item.side === "buy" ? "sell" : "buy",
        Math.abs(item.size)
      );
    },
  },
  computed: {
    openPositions() {
      return store.getters.getOpenPositionsByExchange(
        store.getters.getExchange
      );
    },
    full() {
      return store.getters.getExchange !== "deribit";
    },
  },
  mounted() {},
};
</script>

<style scoped></style>
