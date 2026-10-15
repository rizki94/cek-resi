import test from "node:test";
import assert from "node:assert/strict";
import {
  getProviderCourierCode,
  hasTrackingData,
  normalizeSpxResponse,
} from "./function.js";

test("maps supported courier names to cekresi.com provider codes", () => {
  assert.equal(getProviderCourierCode("jne"), "JNE");
  assert.equal(getProviderCourierCode("JNE Express"), "JNE");
  assert.equal(getProviderCourierCode("anteraja"), "ANTERAJA");
  assert.equal(getProviderCourierCode("Anteraja Express"), "ANTERAJA");
  assert.equal(getProviderCourierCode("jnt"), "JET");
  assert.equal(getProviderCourierCode("J&T Express"), "JET");
});

test("rejects unknown courier names instead of using the wrong carrier", () => {
  assert.throws(
    () => getProviderCourierCode("unknown courier"),
    /Unsupported courier/
  );
});

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

test("rejects a generic status without dated tracking events", () => {
  assert.equal(
    hasTrackingData({
      expedisi: "JNE Express",
      noResi: "TEST123456789",
      status: "On Process",
      penerima: "(On Process)",
      perjalanan: [{ tanggal: "-", keterangan: "Dalam pengiriman" }],
    }),
    false
  );
});

test("accepts a generic status when dated tracking events are available", () => {
  assert.equal(
    hasTrackingData({
      expedisi: "JNE Express",
      noResi: "TEST123456789",
      status: "On Process",
      perjalanan: [
        { tanggal: "2026-10-15 16:45", keterangan: "Paket tiba di hub" },
      ],
    }),
    true
  );
});

test("accepts a specific terminal status without tracking history", () => {
  assert.equal(
    hasTrackingData({
      expedisi: "JNE Express",
      noResi: "TEST123456789",
      status: "Delivered",
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
