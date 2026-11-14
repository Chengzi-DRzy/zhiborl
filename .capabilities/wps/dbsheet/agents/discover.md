---
summary: 读取和管理 WPS 365 多维表记录、数据表、字段、视图与表单，并按数据表字段渲染图表组件
when: 查询或读写多维表记录与结构；或在多维表数据上展示柱状图、折线图、饼图等
not_when: 普通云文档文件操作请使用 drive
requires: wps/core
scopes: kso.dbsheet.readwrite
components: bar-chart, line-chart, stacked-bar-chart, stacked-line-chart, horizontal-bar-chart, stacked-horizontal-bar-chart, pie-chart, donut-chart, area-chart, stacked-area-chart, percentage-stacked-area-chart, bar-line-chart
---

# WPS多维表格

读取和管理 WPS 365 多维表记录、数据表、字段、视图与表单，并提供图表组件。

主要 API：getSchema, createSheet, updateSheet, deleteSheet, createFields, updateFields, deleteFields, listRecords

安装后执行 `capa detail wps/dbsheet` 获取完整集成说明。
