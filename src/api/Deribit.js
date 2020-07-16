const Deribit = require("./");

const enterOrders = async (
  instrument,
  type,
  post_only,
  reduce_only,
  orders
) => {
  const key = "-D5YHdyP";
  const secret = "abdFm3PY38AvLGtukEk8BZfvx2zxQGOWn8v6R7cL4e4";

  const db = new Deribit({ key, secret });
  await db.connect();

  var resp = null;
  var ret_val = [];
  orders.forEach(async (order) => {
    var side = null;
    var side_sl = null;
    if (order["side"].toLowerCase() === "buy") {
      side = "private/buy";
      side_sl = "private/sell";
    } else {
      side = "private/sell";
      side_sl = "private/buy";
    }
    resp = await db.request(side, {
      instrument_name: instrument,
      amount: order["quantity"],
      type: type,
      price: order["price"],
      time_in_force:
        order["time_in_force"] === "Good Till Cancelled"
          ? "good_til_cancelled"
          : order["time_in_force"] === "Immediate or Cancel"
          ? "immediate_or_cancel"
          : "fill_or_kill",
      post_only: post_only,
      reduce_only: reduce_only,
    });
    ret_val.push(resp);
    if (parseFloat(order["stop_loss"]) > 0.0) {
      resp = await db.request(side_sl, {
        instrument_name: instrument,
        amount: order["quantity"],
        type: "stop_market",
        price: order["stop_loss"],
        stop_price: order["stop_loss"],
        trigger: "mark_price",
        time_in_force:
          order["time_in_force"] === "Good Till Cancelled"
            ? "good_til_cancelled"
            : order["time_in_force"] === "Immediate or Cancel"
            ? "immediate_or_cancel"
            : "fill_or_kill",
      });
      console.log(resp);
      ret_val.push(resp);
    }
  });
  return ret_val;
};

const cancelOrder = async (order_id) => {
  const key = "-D5YHdyP";
  const secret = "abdFm3PY38AvLGtukEk8BZfvx2zxQGOWn8v6R7cL4e4";

  const db = new Deribit({ key, secret });
  await db.connect();

  const resp = await db.request("private/cancel", {
    order_id: order_id,
  });
  return resp;
};

const cancelAllOrders = async () => {
  const key = "-D5YHdyP";
  const secret = "abdFm3PY38AvLGtukEk8BZfvx2zxQGOWn8v6R7cL4e4";

  const db = new Deribit({ key, secret });
  await db.connect();

  const resp = await db.request("private/cancel_all", {});
  return resp;
};

const getOpenOrders = async (asset) => {
  const key = "-D5YHdyP";
  const secret = "abdFm3PY38AvLGtukEk8BZfvx2zxQGOWn8v6R7cL4e4";

  const db = new Deribit({ key, secret });
  await db.connect();

  const resp = await db.request("private/get_open_orders_by_currency", {
    currency: asset,
  });
  return resp;
};

const getPositions = async (asset) => {
  const key = "-D5YHdyP";
  const secret = "abdFm3PY38AvLGtukEk8BZfvx2zxQGOWn8v6R7cL4e4";

  const db = new Deribit({ key, secret });
  await db.connect();

  const resp = await db.request("private/get_position", {
    instrument_name: asset,
  });
  return resp;
};
export {
  enterOrders,
  cancelOrder,
  cancelAllOrders,
  getOpenOrders,
  getPositions,
};
