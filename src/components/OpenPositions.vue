<template>
  <v-row justify="center" align="end" class="mt-1">
    <v-col sm="12">
      <v-data-table
        dense
        align="center"
        :headers="headers"
        :items="openPositions"
        hide-default-footer
      >
        <template v-slot:item.symbol="{ item }">
          <span>{{ item.symbol }}</span>
        </template>
        <template v-slot:item.size="{ item }">
          <span v-if="item.side === 'sell'" class="error--text"
            >{{ item.size }}</span
          >
          <span v-if="item.side === 'buy'" class="success--text">{{
            item.size
          }}</span>
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
export default {
  store,
  name: "OpenPositions",
  components: {},
  props: [],
  data() {
    return {
      dialog: false,
      headers: [
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
    };
  },
  computed: {
    openPositions() {
      return store.getters.getOpenPositionsByExchange(
        store.getters.getExchange
      );
    },
  },
  mounted() {},
  methods: {},
};
</script>

<style scoped></style>
