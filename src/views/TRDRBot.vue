<template>
  <div class="trdr-bot">
    <v-form ref="form" v-model="valid" justify="center">
      <v-row justify="center">
        <H1 class="my-10">Bot Set-up</H1>
      </v-row>
      <v-row>
        <H3 class="my-2 mx-10">Select the coins the bot shall trade</H3>
      </v-row>
      <v-row justify="space-around">
        <v-checkbox v-model="adausdt" class="mx-2 my-5" label="ADA/USDT"></v-checkbox>
        <v-checkbox v-model="btcusdt" class="mx-2 my-5" label="BTC/USDT"></v-checkbox>
        <v-checkbox v-model="eosusdt" class="mx-2 my-5" label="EOS/USDT"></v-checkbox>
      </v-row>
      <v-row justify="space-around">
        <v-checkbox v-model="ethusdt" class="mx-2" label="ETH/USDT"></v-checkbox>
        <v-checkbox v-model="linkusdt" class="mx-2" label="LINK/USDT"></v-checkbox>
        <v-checkbox v-model="xrpusdt" class="mx-2" label="XRP/USDT"></v-checkbox>
      </v-row>
      <v-row>
      <v-divider
          class="mx-4"
          :inset="inset"
        ></v-divider>
      </v-row>
      <v-row>
        <H3 class="my-5 mx-10">Select take profit levels and stop loss</H3>
      </v-row>
      <v-row justify="space-around">
        <v-text-field v-model="tp1"  class="mx-12" label="Take Profit 1 (%)" />
        <v-text-field v-model="tp2"  class="mx-12" label="Take Profit 2 (%)" />
        <v-text-field v-model="sl"  class="mx-12" label="Stop loss (%)" />
      </v-row>
      <v-row>
      <v-divider
          class="mx-4"
          :inset="inset"
        ></v-divider>
      </v-row>
      <v-row>
        <H3 class="my-5 mx-10">Select maximum risk</H3>
      </v-row>
      <v-row justify="space-around">
        <v-text-field v-model="risk"  class="mx-12" label="Maximum risk (%)" />
        <v-text-field v-model="leverage" class="mx-12" label="Leverage" />      
      </v-row>
      <v-row>
      <v-divider
          class="mx-4"
          :inset="inset"
        ></v-divider>
      </v-row>
      <v-row justify="space-around" class="my-5">
          <v-btn v-if="!started" @click="startBot" color="success" width="125"
            >Start Bot</v-btn
          >
          <v-btn v-if="started" @click="stopBot" color="error" width="125"
            >Stop Bot</v-btn
          >
          <v-btn @click="resetForm" color="grey darken-2">reset</v-btn>
          <v-btn @click="loadForm" color="grey darken-2">load settings</v-btn>
          <v-btn @click="saveSettings" color="primary"
            >Save</v-btn>
      </v-row>
    </v-form>
    <v-card
      class="mx-auto my-10"
      max-width="1000"
    >
      <v-card-title height="100" class="white--text grey darken-2">
        Bot log
      </v-card-title>
      <v-virtual-scroll
        class="white--text"
        :items="items"
        item-height="25"
        height="150"
      >
        <template v-slot="{ item }">
          <v-list-item>    
            <v-list-item-content>
              <v-list-item-title>{{item}}</v-list-item-title>
            </v-list-item-content>          
          </v-list-item>
        </template>
      </v-virtual-scroll>
    </v-card>
  </div>
</template>

<script>
/* eslint-disable */
// @ is an alias to /src
import store from "../store";
import botStore from "../store"

export default {
  name: "TRDRBot",
  data: () => ({
    inset: false,
    adausdt: false,
    btcusdt: false,
    eosusdt: false,
    ethusdt: false,
    linkusdt: false,
    xrpusdt: false,
    tp1: "",
    tp2: "",
    sl: "",
    risk: "",
    leverage: "",
    started: false,
    valid: true,
    logEntries: [],
  }),
  methods: {
    resetForm(){
      this.$refs.form.reset()
    },
    loadForm(){
    botStore.dispatch("loadBotSettings");
    const coins = botStore.getters.getCoinsToTrade
    this.adausdt = coins.adausdt
    this.btcusdt = coins.btcusdt
    this.eosusdt = coins.eosusdt
    this.ethusdt = coins.ethusdt
    this.linkusdt = coins.linkusdt
    this.xrpusdt = coins.xrpusdt

    const tpsl = botStore.getters.getTakeProfitStoploss
    this.tp1 = tpsl.tp1 * 100
    this.tp2 = tpsl.tp2 * 100
    this.sl = tpsl.sl * 100

    const risk = botStore.getters.getRisk
    this.risk = risk.risk * 100
    this.leverage = risk.leverage 
    },
    startBot() {
      if (store.getters.getExchange === ""){
        this.$notify({
          text: "Please select an account",
          type: 'error',
        });
        return
      }
      store.commit("addLogEntry", "bot started")
      this.started = true
      this.$trdrBot.startBot()
    },
    updateLog(){

    },
    stopBot() {
      this.started = false
      this.$trdrBot.stopBot()
      botStore.commit("addLogEntry", "bot stopped")
    },
    saveSettings() {
      botStore.commit("setCoinsToTrade", {
        adausdt: this.adausdt,
        btcusdt: this.btcusdt,
        eosusdt: this.eosusdt,
        ethusdt: this.ethusdt,
        linkusdt: this.linkusdt,
        xrpusdt: this.xrpusdt,
      })
      botStore.commit("setTakeProfitStoploss", {
        tp1: this.tp1 / 100,
        tp2: this.tp2 / 100,
        sl: this.sl / 100,
      })
      botStore.commit("setRisk", {
        risk: this.risk / 100,
        leverage: this.leverage,
      })
      botStore.dispatch("storeBotSettings")
    },
  },
  mounted() {
    this.loadForm()
  },
  computed: {
    items() {
      return botStore.getters.getLogger
    },
  },
};
</script>
