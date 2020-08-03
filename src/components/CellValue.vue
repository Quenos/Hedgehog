<template>
  <span :class="cellClass"
         v-text="typeof value === 'number' ? value.toFixed(toFixed || 2) : value" />
</template>
<script>
  export default {
    name: 'CellValue',
    props: ['value', 'item', 'header', 'toFixed', 'hasError', 'hasSuccess' ],
    computed: {
      cellClass() {
        return {
          'error--text': typeof this.hasError === 'function'
            ? this.hasError(this.value)
            : false,
          'success--text': typeof this.hasSuccess === 'function'
            ? this.hasSuccess(this.value)
            : false
        }
      }
    }
  }
</script>