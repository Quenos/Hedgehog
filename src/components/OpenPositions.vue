<template>
  <v-row justify="center" align="end" class="mt-1">
    <v-col sm="12">
      <v-data-table
        v-if="this.full"
        dense
        align="center"
        :headers="headers_full"
        :items="openPositions"
        hide-default-footer
      >
        <template v-slot:item.symbol="{ item }">
          <span>{{ item.symbol }}</span>
        </template>
        <template v-slot:item.size="{ item }">
          <span v-if="item.side === 'sell'" class="error--text">{{
            item.size
          }}</span>

          <span v-if="item.side === 'buy'" class="success--text">{{
            item.size
          }}</span>
        </template>

        <template v-slot:item.position_value="{ item }">
          <span>
            {{ Number(item.position_value).toFixed(6) }}
          </span>
        </template>

        <template v-slot:item.entry_price="{ item }">
          <span>
            {{ Number(item.entry_price).toFixed(2) }}
          </span>
        </template>

        <template v-slot:item.liq_price="{ item }">
          <span>
            {{ Number(item.liq_price).toFixed(2) }}
          </span>
        </template>

        <template v-slot:item.position_margin="{ item }">
          <span>
            {{ Number(item.position_margin).toFixed(6) }}
          </span>
        </template>

        <template v-slot:item.unrealised_pnl_last="{ item }">
          <span v-if="Number(item.unrealised_pnl_last || 0) < 0" class="error--text">
            {{ Number(item.unrealised_pnl_last || 0).toFixed(6) }}
          </span>
          <span v-else-if="Number(item.unrealised_pnl_last || 0) > 0" class="success--text">
            {{ Number(item.unrealised_pnl_last || 0).toFixed(6) }}
          </span>
          <span v-else>
            {{ Number(item.unrealised_pnl_last || 0).toFixed(6) }}
          </span>
        </template>

        <template v-slot:item.realised_pnl="{ item }">
          <span v-if="Number(item.realised_pnl) < 0" class="error--text">
            {{ Number(item.realised_pnl).toFixed(6) }}
          </span>
          <span v-else-if="Number(item.realised_pnl) > 0" class="success--text">
            {{ Number(item.realised_pnl).toFixed(6) }}
          </span>
          <span v-else>
            {{ Number(item.realised_pnl).toFixed(6) }}
          </span>
        </template>

        <template v-slot:item.daily_total="{ item }">
          <span v-if="Number(item.daily_total) < 0" class="error--text">
            {{ Number(item.daily_total).toFixed(6) }}
          </span>
          <span v-else-if="Number(item.daily_total) > 0" class="success--text">
            {{ Number(item.daily_total).toFixed(6) }}
          </span>
          <span v-else>
            {{ Number(item.daily_total).toFixed(6) }}
          </span>
        </template>

        <template v-slot:item.market_close="{ item }">
          <v-btn x-small color="primary" @click="marketClose(item)">
            Close
          </v-btn>
        </template>
      </v-data-table>
      <v-data-table
        v-else
        dense
        align="center"
        :headers="headers_reduced"
        :items="openPositions"
        hide-default-footer
      >
        <template v-slot:item.symbol="{ item }">
          <span>{{ item.symbol }}</span>
        </template>
        <template v-slot:item.size="{ item }">
          <span v-if="item.side === 'sell'" class="error--text">{{
            item.size
          }}</span>

          <span v-if="item.side === 'buy'" class="success--text">{{
            item.size
          }}</span>
        </template>

        <template v-slot:item.position_value="{ item }">
          <span>
            {{ Number(item.position_value).toFixed(6) }}
          </span>
        </template>

        <template v-slot:item.entry_price="{ item }">
          <span>
            {{ Number(item.entry_price).toFixed(2) }}
          </span>
        </template>

        <template v-slot:item.liq_price="{ item }">
          <span>
            {{ Number(item.liq_price).toFixed(2) }}
          </span>
        </template>

        <template v-slot:item.position_margin="{ item }">
          <span>
            {{ Number(item.position_margin).toFixed(6) }}
          </span>
        </template>

        <template v-slot:item.unrealised_pnl_last="{ item }">
          <span v-if="Number(item.unrealised_pnl_last || 0) < 0" class="error--text">
            {{ Number(item.unrealised_pnl_last || 0).toFixed(6) }}
          </span>
          <span v-else-if="Number(item.unrealised_pnl_last || 0) > 0" class="success--text">
            {{ Number(item.unrealised_pnl_last || 0).toFixed(6) }}
          </span>
          <span v-else>
            {{ Number(item.item.unrealised_pnl_last || 0).toFixed(6) }}
          </span>
        </template>

        <template v-slot:item.realised_pnl="{ item }">
          <span v-if="Number(item.realised_pnl) < 0" class="error--text">
            {{ Number(item.realised_pnl).toFixed(6) }}
          </span>
          <span v-else-if="Number(item.realised_pnl) > 0" class="success--text">
            {{ Number(item.realised_pnl).toFixed(6) }}
          </span>
          <span v-else>
            {{ Number(item.realised_pnl).toFixed(6) }}
          </span>
        </template>

        <template v-slot:item.daily_total="{ item }">
          <span v-if="Number(item.daily_total) < 0" class="error--text">
            {{ Number(item.daily_total).toFixed(6) }}
          </span>
          <span v-else-if="Number(item.daily_total) > 0" class="success--text">
            {{ Number(item.daily_total).toFixed(6) }}
          </span>
          <span v-else>
            {{ Number(item.daily_total).toFixed(6) }}
          </span>
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
