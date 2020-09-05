<template>
  <v-row justify="center" align="end" class="mt-1">
    <v-col sm="12">
      <v-data-table
        dense
        align="center"
        :headers="headers_full"
        :items="openPositions"
        hide-default-footer>
        <template v-slot:item.symbol="cell">
          <cell-value v-bind="cell" />
        </template>
        <template v-slot:item.size="cell">
          <cell-value
           v-bind="cell"
           to-fixed="4"
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
    <template v-slot:item.trading_stops>
      <v-dialog
          v-model="dialog"
          width="300"
      >
        <template v-slot:activator="{ on }">
          <v-btn
              center
              v-on="on"
              x-small
              color="primary"
          >
            <v-icon small>mdi-xamarin</v-icon>
          </v-btn>
        </template>

        <TradingStops v-if="dialog" @close="dialog = false"></TradingStops>
      </v-dialog>
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
import TradingStops from "@/components/TradingStops";

export default {
  store,
  name: "OpenPositions",
  components: {
    CellValue,
    TradingStops,
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
        { text: "Stops", value: "trading_stops" },
        { text: "Market close", value: "market_close" },
      ],
    };
  },
  methods: {
    te(cell){
      return cell
    },
    unrealised_pnl(price, qty, side) {
    const lastPrice = store.getters.getLastAndMarkPriceByExchangeInstrument
                          (store.getters.getExchange, store.getters.getAsset).lastPrice  
    if (side.toLowerCase() === 'buy') {
        return ((1 / price) - (1 / parseFloat(lastPrice))) * qty;
      } else {
        return ((1 / parseFloat(lastPrice) - (1 / price))) * qty;
      }
    },    
    async marketClose(item) {
      await this.$apiAbstraction.marketOrder(
        item.symbol,
        item.side === "buy" ? "sell" : "buy",
        Math.abs(item.size)
      );
    },
  },
  computed: {
    openPositions: () => store.getters.getOpenPositionsByExchange(store.getters.getExchange),
    full: () => store.getters.getExchange !== "deribit" && store.getters.getExchange !== "binance",
    showReduced: () => store.getters.getExchange !== 'bybit',
    last_price: () => store.getters.getLastAndMarkPriceByExchangeInstrument(store.getters.getExchange, store.getters.getAsset).lastPrice,
  },
  mounted() {},
};
</script>

<style scoped></style>
