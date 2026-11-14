import { request as K } from "../../core/dist/request.js";
const k = [
  "#0e9c8c",
  "#ffa62c",
  "#9871ff",
  "#88b306",
  "#4187ff",
  "#f64d61",
  "#159989",
  "#f6ab41",
  "#a485f9",
  "#86af08",
  "#5993f7",
  "#f76b7b",
  "#2aaa9b",
  "#ffb85c",
  "#b39afc",
  "#9abe2f",
  "#73a5fa",
  "#f98998"
], w = "#8a939f", C = 14, Z = 14;
function O() {
  return {
    show: !0,
    top: 8,
    type: "scroll",
    icon: "rect",
    itemWidth: 9,
    itemHeight: 9,
    itemGap: 16,
    padding: [4, 8],
    pageIconSize: 14,
    textStyle: {
      color: w,
      fontSize: C,
      lineHeight: 20
    },
    pageTextStyle: {
      color: w,
      fontSize: C,
      lineHeight: 20
    }
  };
}
function L() {
  return {
    axisLine: { lineStyle: { color: w } },
    axisTick: { lineStyle: { color: w } },
    axisLabel: { color: w, fontSize: C },
    nameTextStyle: { color: w, fontSize: C }
  };
}
function N(s, t = "top", a = !1) {
  return {
    show: !0,
    position: t,
    color: k[s % k.length],
    fontSize: Z,
    formatter: (n) => {
      const e = Number(n.value);
      return Number.isFinite(e) && (!a || e !== 0) ? String(n.value) : "";
    }
  };
}
function M(s) {
  const t = k[s % k.length];
  return {
    symbol: "circle",
    symbolSize: 7,
    showSymbol: !0,
    itemStyle: { color: t, borderColor: t, borderWidth: 0 }
  };
}
const H = 5;
function P(s, t = !1, a, n = 0) {
  return s.map((e, o) => {
    const i = !a || !a.slice(n + 1).some((l) => l.values[o] !== 0);
    return {
      value: e,
      itemStyle: {
        borderRadius: e !== 0 && i ? t ? [0, H, H, 0] : [H, H, 0, 0] : 0
      }
    };
  });
}
function D() {
  return {
    show: !0,
    lineStyle: {
      color: "#e5e9ef",
      width: 1,
      type: "dashed"
    }
  };
}
function _(s) {
  return {
    trigger: s,
    backgroundColor: "rgba(36, 36, 36, 0.94)",
    borderColor: "transparent",
    borderWidth: 0,
    padding: [10, 12],
    textStyle: {
      color: "#ffffff"
    },
    axisPointer: {
      type: "none"
    },
    extraCssText: "border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.22);"
  };
}
function q(s) {
  if (!s) return {};
  if (typeof s == "string")
    try {
      const t = JSON.parse(s), a = {};
      for (const [n, e] of Object.entries(t))
        a[n] = typeof e == "object" && e !== null && "value" in e ? e : { value: e };
      return a;
    } catch {
      return {};
    }
  return s;
}
function B(s) {
  return s == null ? "" : typeof s == "object" && s !== null && "text" in s ? String(s.text ?? "") : String(s);
}
function j(s, t, a, n) {
  var i, l;
  const e = /* @__PURE__ */ new Map();
  for (const u of s) {
    const m = q(u.fields), b = B((i = m[t]) == null ? void 0 : i.value) || "(空)";
    if (a === "field" && n) {
      const x = (l = m[n]) == null ? void 0 : l.value, v = typeof x == "number" ? x : Number(B(x));
      e.set(b, (e.get(b) ?? 0) + (Number.isFinite(v) ? v : 0));
    } else
      e.set(b, (e.get(b) ?? 0) + 1);
  }
  const o = [...e.entries()];
  return {
    labels: o.map(([u]) => u),
    values: o.map(([, u]) => u)
  };
}
function W(s, t, a, n, e) {
  var u, m, b;
  const o = [], i = [], l = /* @__PURE__ */ new Map();
  for (const x of s) {
    const v = q(x.fields), h = B((u = v[t]) == null ? void 0 : u.value) || "(空)", I = a ? B((m = v[a]) == null ? void 0 : m.value) || "(空)" : n === "field" ? "统计值" : "数量";
    l.has(h) || (o.push(h), l.set(h, /* @__PURE__ */ new Map())), i.includes(I) || i.push(I);
    let V = 1;
    if (n === "field" && e) {
      const r = (b = v[e]) == null ? void 0 : b.value, c = typeof r == "number" ? r : Number(B(r));
      V = Number.isFinite(c) ? c : 0;
    }
    const F = l.get(h);
    F.set(I, (F.get(I) ?? 0) + V);
  }
  return {
    labels: o,
    series: i.map((x) => ({
      name: x,
      values: o.map((v) => {
        var h;
        return ((h = l.get(v)) == null ? void 0 : h.get(x)) ?? 0;
      })
    }))
  };
}
function X(s, t, a, n) {
  const e = s.map((o, i) => i);
  return e.sort((o, i) => {
    const l = a === "y" ? t.reduce((u, m) => u + m.values[o] - m.values[i], 0) : s[o].localeCompare(s[i], "zh-CN");
    return n === "desc" ? -l : l;
  }), {
    labels: e.map((o) => s[o]),
    series: t.map((o) => ({
      ...o,
      values: e.map((i) => o.values[i])
    }))
  };
}
function $(s, t, a, n) {
  const e = s.map((o, i) => ({ label: o, value: t[i] }));
  return e.sort((o, i) => {
    const l = a === "y" ? o.value - i.value : o.label.localeCompare(i.label, "zh-CN");
    return n === "desc" ? -l : l;
  }), {
    labels: e.map((o) => o.label),
    values: e.map((o) => o.value)
  };
}
function Q(s) {
  const t = s.props ?? {};
  return {
    config: t,
    fileId: String(t.fileId ?? "")
  };
}
async function Y(s) {
  var e;
  const { config: t, fileId: a } = s, n = await K.post(
    `/v7/coop/dbsheet/${a}/sheets/${t.tableId}/records`,
    {
      page_size: 200,
      prefer_id: !0,
      text_value: "text"
    }
  );
  return ((e = n == null ? void 0 : n.data) == null ? void 0 : e.records) ?? [];
}
async function T(s, t, a, n) {
  const e = a.config, o = await Y(a), i = e.statisticMode ?? "count", l = e.sortBy ?? "x", u = e.sortOrder ?? "asc";
  if (t === "bar-line") {
    const r = j(
      o,
      e.dimension,
      "field",
      e.primaryStatisticFieldId
    ), c = j(
      o,
      e.dimension,
      "field",
      e.secondaryStatisticFieldId
    ), d = $(
      r.labels,
      r.values,
      l,
      u
    ), p = new Map(
      c.labels.map((A, S) => [
        A,
        c.values[S]
      ])
    ), y = d.labels.map(
      (A) => p.get(A) ?? 0
    ), f = n.init(s), g = {
      color: k,
      tooltip: _("item"),
      legend: O(),
      grid: { left: 64, right: 64, top: 64, bottom: 48 },
      xAxis: {
        type: "category",
        data: d.labels,
        ...L(),
        axisLabel: { color: w, fontSize: C, rotate: d.labels.length > 8 ? 30 : 0 }
      },
      yAxis: [
        { type: "value", position: "left", ...L(), splitLine: D() },
        { type: "value", position: "right", ...L(), splitLine: { show: !1 } }
      ],
      series: [
        {
          name: "左轴统计值",
          type: "bar",
          yAxisIndex: 0,
          label: N(0),
          data: P(d.values)
        },
        {
          name: "右轴统计值",
          type: "line",
          yAxisIndex: 1,
          smooth: !1,
          ...M(1),
          label: N(1),
          data: y
        }
      ]
    };
    f.setOption(g);
    const z = () => f.resize();
    return window.addEventListener("resize", z), () => {
      window.removeEventListener("resize", z), f.dispose();
    };
  }
  if (t === "area" || t === "stacked-area" || t === "percentage-stacked-area") {
    const r = W(
      o,
      e.dimension,
      e.seriesDimension,
      i,
      e.statisticFieldId
    ), c = t === "percentage-stacked-area", d = c ? r.series.map((S) => ({
      ...S,
      values: S.values.map((R, E) => {
        const U = r.series.reduce(
          (G, J) => G + J.values[E],
          0
        );
        return U === 0 ? 0 : R / U * 100;
      })
    })) : r.series, p = X(
      r.labels,
      d,
      l,
      u
    ), y = e.emptyCell ?? "zero", f = t === "stacked-area" || t === "percentage-stacked-area", g = n.init(s), z = {
      color: k,
      tooltip: _("item"),
      legend: O(),
      grid: { left: 48, right: 24, top: 64, bottom: 48 },
      xAxis: {
        type: "category",
        data: p.labels,
        ...L(),
        axisLabel: { color: w, fontSize: C, rotate: p.labels.length > 8 ? 30 : 0 }
      },
      yAxis: {
        type: "value",
        max: c ? 100 : void 0,
        ...L(),
        axisLabel: { color: w, fontSize: C, ...c ? { formatter: "{value}%" } : {} },
        splitLine: D()
      },
      series: p.series.map((S, R) => ({
        name: S.name,
        type: "line",
        stack: f ? "total" : void 0,
        smooth: !1,
        ...M(R),
        connectNulls: y === "connect",
        areaStyle: { opacity: 0.2 },
        label: {
          ...N(R, "top", f),
          formatter: c ? (E) => Number(E.value) === 0 ? "" : `${Number(E.value).toFixed(2)}%` : N(R, "top", f).formatter
        },
        data: y === "gap" ? S.values.map((E) => E === 0 ? null : E) : S.values
      }))
    };
    g.setOption(z);
    const A = () => g.resize();
    return window.addEventListener("resize", A), () => {
      window.removeEventListener("resize", A), g.dispose();
    };
  }
  if (t === "pie" || t === "donut") {
    const r = j(
      o,
      e.dimension,
      i,
      e.statisticFieldId
    ), c = $(
      r.labels,
      r.values,
      l,
      u
    ), d = n.init(s), p = {
      color: k,
      tooltip: _("item"),
      legend: O(),
      series: [
        {
          type: "pie",
          radius: t === "donut" ? ["32%", "55%"] : "55%",
          center: ["50%", "56%"],
          avoidLabelOverlap: !0,
          label: { show: !0, formatter: "{c}", fontSize: Z },
          labelLine: { show: !0 },
          data: c.labels.map((f, g) => ({
            name: f,
            value: c.values[g]
          }))
        }
      ]
    };
    d.setOption(p);
    const y = () => d.resize();
    return window.addEventListener("resize", y), () => {
      window.removeEventListener("resize", y), d.dispose();
    };
  }
  if (t === "horizontal-bar" || t === "stacked-horizontal-bar") {
    const r = W(
      o,
      e.dimension,
      e.seriesDimension,
      i,
      e.statisticFieldId
    ), c = X(
      r.labels,
      r.series,
      l,
      u
    ), d = n.init(s), p = t === "stacked-horizontal-bar", y = {
      color: k,
      tooltip: _("item"),
      legend: O(),
      grid: { left: 96, right: 32, top: 64, bottom: 40 },
      xAxis: { type: "value", ...L(), splitLine: D() },
      yAxis: {
        type: "category",
        data: c.labels,
        ...L(),
        axisLabel: { color: w, fontSize: C, overflow: "truncate", width: 88 }
      },
      series: c.series.map((g, z) => ({
        name: g.name,
        type: "bar",
        stack: p ? "total" : void 0,
        emphasis: { focus: "series" },
        label: N(z, "right", p),
        data: P(g.values, !0, p ? c.series : void 0, z)
      }))
    };
    d.setOption(y);
    const f = () => d.resize();
    return window.addEventListener("resize", f), () => {
      window.removeEventListener("resize", f), d.dispose();
    };
  }
  if (t === "stacked-bar" || t === "stacked-line") {
    const r = W(
      o,
      e.dimension,
      e.seriesDimension,
      i,
      e.statisticFieldId
    ), c = X(
      r.labels,
      r.series,
      l,
      u
    ), d = n.init(s), p = t === "stacked-line", y = e.emptyCell ?? "zero", f = {
      color: k,
      tooltip: _("item"),
      legend: O(),
      grid: { left: 48, right: 24, top: 64, bottom: 48 },
      xAxis: {
        type: "category",
        data: c.labels,
        ...L(),
        axisLabel: { color: w, fontSize: C, rotate: c.labels.length > 8 ? 30 : 0 }
      },
      yAxis: { type: "value", ...L(), splitLine: D() },
      series: c.series.map((z, A) => ({
        name: z.name,
        type: p ? "line" : "bar",
        stack: "total",
        smooth: !1,
        ...p ? M(A) : {},
        connectNulls: p && y === "connect",
        emphasis: { focus: "series" },
        label: N(A, "top", !0),
        data: p && y === "gap" ? z.values.map((S) => S === 0 ? null : S) : p ? z.values : P(z.values, !1, c.series, A)
      }))
    };
    d.setOption(f);
    const g = () => d.resize();
    return window.addEventListener("resize", g), () => {
      window.removeEventListener("resize", g), d.dispose();
    };
  }
  let { labels: m, values: b } = j(
    o,
    e.dimension,
    i,
    e.statisticFieldId
  );
  const x = $(
    m,
    b,
    l,
    u
  );
  m = x.labels, b = x.values;
  const v = n.init(s), h = e.emptyCell ?? "zero", I = t === "line" && h === "gap" ? b.map((r) => r === 0 ? null : r) : b, V = {
    color: k,
    tooltip: _("item"),
    legend: O(),
    grid: { left: 48, right: 24, top: 64, bottom: 48 },
    xAxis: {
      type: "category",
      data: m,
      ...L(),
      axisLabel: { color: w, fontSize: C, rotate: m.length > 8 ? 30 : 0 }
    },
    yAxis: { type: "value", ...L(), splitLine: D() },
    series: [
      {
        name: i === "field" ? "统计值" : "计数",
        type: t,
        label: N(0),
        data: t === "bar" ? P(b) : I,
        smooth: !1,
        ...t === "line" ? M(0) : {},
        connectNulls: t === "line" && h === "connect"
      }
    ]
  };
  v.setOption(V);
  const F = () => v.resize();
  return window.addEventListener("resize", F), () => {
    window.removeEventListener("resize", F), v.dispose();
  };
}
function te(s) {
  return async function(a, n) {
    const e = await import("echarts");
    return T(a, s, Q(n), e);
  };
}
export {
  te as c
};
