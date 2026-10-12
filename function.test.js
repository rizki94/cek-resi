import test from "node:test";
import assert from "node:assert/strict";
import { hasTrackingData, normalizeSpxResponse } from "./function.js";

test("rejects an empty non-SPX tracking result", () => {
  assert.equal(
    hasTrackingData({
      expedisi: "",
      noResi: "",
      status: "",
      perjalanan: [],
    }),
    false
  );
});

test("accepts a non-SPX result with a courier, AWB, and status", () => {
  assert.equal(
    hasTrackingData({
      expedisi: "JNE Express",
      noResi: "TEST123456789",
      status: "On Process",
      perjalanan: [],
    }),
    true
  );
});

test("normalizes successful SPX tracking details and event history", () => {
  const result = normalizeSpxResponse(
    {
      retcode: 0,
      data: {
        order_info: { spx_tn: "SPX123456789" },
        sls_tracking_info: {
          records: [
            {
              tracking_code: "F600",
              tracking_name: "Out For Delivery",
              actual_time: 1791280800,
            },
            {
              tracking_code: "F510",
              tracking_name: "In Transit",
              actual_time: 1791277200,
            },
          ],
        },
      },
    },
    "SPX123456789"
  );

  assert.equal(result.valid, true);
  assert.equal(result.data.expedisi, "Shopee Express (SPX)");
  assert.equal(result.data.status, "Out For Delivery");
  assert.equal(result.data.perjalanan.length, 2);
  assert.equal(result.data.perjalanan[0].keterangan, "Out For Delivery");
});

test("reports unsuccessful SPX responses as invalid tracking", () => {
  const result = normalizeSpxResponse(
    { retcode: 2, message: "Tracking not found" },
    "SPX123456789"
  );

  assert.equal(result.valid, false);
  assert.equal(result.message, "Tracking not found");
});
