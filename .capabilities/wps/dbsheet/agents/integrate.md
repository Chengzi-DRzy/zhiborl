# dbsheet 集成说明

> 新能力包 `wps/dbsheet`。安装后 API 通过 `wps/core` 的 `request` 代理。

```typescript
import { ensureAuthorized, request, CapabilityComponent } from '.capabilities/wps/core'
```

业务调用前先执行：

```typescript
await ensureAuthorized()
```

## 图表组件

图表是 `wps/dbsheet` 的可选组件，不需要再安装其他能力包。先在 `comate.json` 的 `capabilities["wps/dbsheet"].instances` 配置 `fileId`、`tableId` 和字段 ID，再在页面中渲染：

```tsx
<CapabilityComponent instanceId="sales-bar" />
```

可用组件和每个组件的必填 props 以安装后 `capa detail wps/dbsheet --component <component-id>` 返回的 manifest 为准；图表需要宿主应用提供 `echarts` peer dependency。

---


# dbsheet — 多维表 API 参考

Scope: `kso.dbsheet.readwrite`

所有 API 通过 `request.get/post` 调用，路径前缀为 `/v7/coop/dbsheet`。

---

**关键规则：`prefer_id` 参数**

| prefer_id | 记录中的 key | 适用场景 |
|-----------|-------------|---------|
| `true`（推荐） | 列号 ID（如 `"B"`, `"E"`, `"G"`） | 字段名可能变化时保持稳定引用 |
| `false`（默认） | 字段名称 | 仅用于快速原型，生产代码应避免 |

---

## getSchema

获取多维表完整 Schema（所有数据表、字段、视图）。

- **API**: `GET /v7/coop/dbsheet/{file_id}/schema`

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| — | — | — | 路径参数 `file_id` |

**调用示例**:
```typescript
const schema = await request.get(`/v7/coop/dbsheet/${file_id}/schema`);
```

**返回**: `{ code, msg, data: { sheets: DbsheetSheet[] } }`（类型详见底部 [公共类型](#公共类型)）

---

## createSheet

创建数据表。

- **API**: `POST /v7/coop/dbsheet/{file_id}/sheets/create`

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | 否 | 数据表名称 |
| `fields` | DbsheetField[] | 是 | 字段定义 |
| `views` | DbsheetView[] | 否 | 视图定义 |
| `position` | object | 否 | `{ before_sheet_id?: number, after_sheet_id?: number }` |

**调用示例**:
```typescript
const result = await request.post(`/v7/coop/dbsheet/${file_id}/sheets/create`, {
  name: "任务表",
  fields: [
    { name: "任务名", type: "MultiLineText" },
    { name: "状态", type: "SingleSelect", data: { options: [{ name: "待办" }, { name: "进行中" }, { name: "完成" }] } },
  ],
});
```

**返回**: `{ code, msg, data: { sheet: DbsheetSheet } }`

---

## updateSheet

更新数据表名称。

- **API**: `POST /v7/coop/dbsheet/{file_id}/sheets/{sheet_id}/update`

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | 否 | 新表名 |

**返回**: `{ code, msg, data: { sheet: DbsheetSheet } }`

---

## deleteSheet

删除数据表。

- **API**: `POST /v7/coop/dbsheet/{file_id}/sheets/{sheet_id}/delete`

Body 为空对象 `{}`。

**返回**: `{ code, msg, data: { sheet: DbsheetSheet } }`

---

## createFields

创建字段。

- **API**: `POST /v7/coop/dbsheet/{file_id}/sheets/{sheet_id}/fields`

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `fields` | DbsheetField[] | 是 | 字段定义列表 |
| `prefer_id` | boolean | 否 | 为 true 时返回字段 ID |

**返回**: `{ code, msg, data: { fields: DbsheetField[] } }`

---

## updateFields

更新字段。

- **API**: `POST /v7/coop/dbsheet/{file_id}/sheets/{sheet_id}/fields/update`

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `fields` | DbsheetField[] | 是 | 带 id 的字段列表 |
| `prefer_id` | boolean | 否 | 为 true 时返回字段 ID |

**返回**: `{ code, msg, data: { fields: DbsheetField[] } }`

---

## deleteFields

删除字段。

- **API**: `POST /v7/coop/dbsheet/{file_id}/sheets/{sheet_id}/fields/delete`

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `fields` | string[] | 是 | 要删除的字段 ID 列表 |

**返回**: `{ code, msg, data: { fields: [{ id, deleted }] } }`

---

## listRecords

查询记录列表（支持筛选、分页）。

- **API**: `POST /v7/coop/dbsheet/{file_id}/sheets/{sheet_id}/records`
- **注意**: 这是 **POST** 请求（body 中包含筛选条件等复杂参数）

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `prefer_id` | boolean | 否 | 建议设为 `true`，返回字段用 ID 作 key |
| `text_value` | string | 否 | `"original"` / `"text"` / `"compound"`；计算和编辑取原始值，展示可取文本 |
| `view_id` | string | 否 | 从指定视图获取记录 |
| `max_records` | number | 否 | 最多返回记录数 |
| `fields` | string[] | 否 | 指定返回的字段（ID 或名称，取决于 prefer_id） |
| `filter` | DbsheetFilter | 否 | 筛选条件 |
| `show_record_extra_info` | boolean | 否 | 返回创建者/修改者信息 |
| `show_fields_info` | boolean | 否 | 返回字段 schema |
| `page_size` | number | 否 | 分页大小，默认 100 |
| `page_token` | string | 否 | 分页 token |

**筛选条件 DbsheetFilter 结构**:
```typescript
{
  mode: "AND" | "OR",
  criteria: [
    { field: "E", operator: "Equals", values: ["进行中"] },   // field 为列号 ID
    { field: "B", operator: "NotEmpty", values: [] },
  ]
}
```

**可用操作符**: `Equals` | `NotEqu` | `Greater` | `GreaterEqu` | `Less` | `LessEqu` | `GreaterEquAndLessEqu` | `LessOrGreater` | `BeginWith` | `EndWith` | `Contains` | `NotContains` | `Intersected` | `Empty` | `NotEmpty`

**调用示例**:
```typescript
const records = await request.post(`/v7/coop/dbsheet/${file_id}/sheets/${sheet_id}/records`, {
  prefer_id: true,
  text_value: "original",
  show_fields_info: true,
  page_size: 50,
  filter: {
    mode: "AND",
    criteria: [{ field: statusFieldId, operator: "Equals", values: ["进行中"] }],
  },
});
```

**返回结构**:

```typescript
{
  code: number,
  msg: string,
  data: {
    fields_schema: FieldSchema[],  // 仅 show_fields_info: true 时返回
    records: RecordItem[],
    page_token: string             // 空字符串表示无更多数据
  }
}
```

**FieldSchema**：见底部 [公共类型 — DbsheetField](#dbsheetfield)。

**RecordItem**:

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 记录 ID |
| `fields` | **string** | ⚠️ **JSON 字符串**，key 为列号（与 `fields_schema[].id` 对应），value 为字段值。使用前必须 `JSON.parse` |
| `created_time` | string | 创建时间（需 `show_record_extra_info: true`） |
| `creator` | string | 创建者 |
| `last_modified_by` | string | 最后修改者 |
| `last_modified_time` | string | 最后修改时间 |

**⚠️ 关键注意事项**:

1. `record.fields` 是 **JSON 字符串**，不是对象。必须 `JSON.parse(record.fields)` 后使用。
2. 解析后的 key 是**列号**（`"B"`, `"E"`…），不是 `fldXXX`。必须配合 `show_fields_info: true` 获取 `fields_schema`，用 `fields_schema[i].id` 与记录值匹配。
3. `text_value: "text"` 适合直接展示选项名称；统计、布尔判断、数值计算和编辑回填应使用 `"original"`，并按 `fields_schema` 的字段类型解析。不要把展示文本当作原始值。

**推荐调用姿势**（统计与编辑场景）:
```typescript
type ListRecordsResponse = {
  code: number;
  msg: string;
  data: {
    fields_schema: Array<{ id: string; name: string; type: string }>;
    records: Array<{ id: string; fields: string }>;
    page_token: string;
  };
};

const res = await request.post<ListRecordsResponse>(`/v7/coop/dbsheet/${file_id}/sheets/${sheet_id}/records`, {
  prefer_id: true,
  text_value: "original",
  show_fields_info: true,
  page_size: 50,
});
const { fields_schema, records } = res.data;
// fields_schema[i].id 为列号（"B", "E"…），与 record.fields 的 key 对应
// fields_schema[i].name 为显示名（"候选人姓名", "状态"…）
for (const rec of records) {
  const values = JSON.parse(rec.fields) as Record<string, unknown>;
  for (const field of fields_schema) {
    console.log(field.name, values[field.id]);
  }
}
// 当 Complete 字段的原始值为 0/1 或 "0"/"1" 时，显式判断，不能用 Boolean("0")。
const isComplete = (value: unknown) => value === true || value === 1 || value === "1";
```

---

## getRecord

查询单条记录。

- **API**: `GET /v7/coop/dbsheet/{file_id}/sheets/{sheet_id}/records/{record_id}`

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `prefer_id` | boolean | 否 | 建议设为 `true` |
| `show_fields_info` | boolean | 否 | 返回字段 schema |
| `show_record_extra_info` | boolean | 否 | 返回创建者/修改者信息 |
| `text_value` | string | 否 | `"original"` / `"text"` / `"compound"` |

**调用示例**:
```typescript
const record = await request.get(
  `/v7/coop/dbsheet/${file_id}/sheets/${sheet_id}/records/${record_id}`,
  { prefer_id: true },
);
```

**返回**: `{ code, msg, data: { fields_schema: DbsheetField[], record: DbsheetRecord } }`

---

## createRecords

批量创建记录。

- **API**: `POST /v7/coop/dbsheet/{file_id}/sheets/{sheet_id}/records/create`

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `records` | Array | 是 | `[{ fields_value: string }]`，`fields_value` 为 **JSON 字符串** |
| `prefer_id` | boolean | 否 | 设为 `true` 时 key 用列号 ID |

**`fields_value` 规则**:
- 必须为 JSON 字符串（`JSON.stringify({ ... })`），**不能传对象**（会触发 protobuf 解析错误）
- key 为列号 ID（与 `fields_schema[].id` 对应，如 `"B"`, `"E"`）
- value 为字段值（可读文本）

> ⚠️ 注意读写不对称：读取返回 `record.fields`（JSON string），写入提交 `record.fields_value`（JSON string）。

**调用示例**:
```typescript
const result = await request.post(`/v7/coop/dbsheet/${file_id}/sheets/${sheet_id}/records/create`, {
  prefer_id: true,
  records: [
    { fields_value: JSON.stringify({ [nameFieldId]: "设计评审", [statusFieldId]: "待办" }) },
    { fields_value: JSON.stringify({ [nameFieldId]: "代码实现", [statusFieldId]: "进行中" }) },
  ],
});
```

**返回**: `{ code, msg, data: { records: DbsheetRecord[] } }`

---

## updateRecords

批量更新记录。

- **API**: `POST /v7/coop/dbsheet/{file_id}/sheets/{sheet_id}/records/update`

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `records` | Array | 是 | `[{ id: string, fields_value: string }]`，`fields_value` 为 **JSON 字符串** |
| `prefer_id` | boolean | 否 | 设为 `true` 时 key 用列号 ID |

**调用示例**:
```typescript
const result = await request.post(`/v7/coop/dbsheet/${file_id}/sheets/${sheet_id}/records/update`, {
  prefer_id: true,
  records: [
    { id: "c", fields_value: JSON.stringify({ [statusFieldId]: "完成" }) },
  ],
});
```

**返回**: `{ code, msg, data: { records: DbsheetRecord[] } }`

---

## deleteRecords

批量删除记录。

- **API**: `POST /v7/coop/dbsheet/{file_id}/sheets/{sheet_id}/records/batch_delete`

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `records` | string[] | 是 | 要删除的记录 ID 列表 |

**调用示例**:
```typescript
const result = await request.post(`/v7/coop/dbsheet/${file_id}/sheets/${sheet_id}/records/batch_delete`, {
  records: ["recABC123", "recDEF456"],
});
```

**返回**: `{ code, msg, data: { records: [{ id, deleted }] } }`

---

## 字段类型枚举

| 类型 | 说明 | UI 建议 |
|------|------|---------|
| `MultiLineText` | 多行文本 | textarea |
| `SingleSelect` | 单选 | select / radio |
| `MultipleSelect` | 多选 | multi-select / checkbox group |
| `Number` | 数字 | number input |
| `Currency` | 货币 | number input + 货币符号 |
| `Percentage` | 百分比 | number input + % |
| `Date` | 日期 | date picker |
| `Time` | 时间 | time picker |
| `Checkbox` | 勾选 | checkbox |
| `Complete` | 完成状态 | checkbox |
| `Rating` | 评分 | star rating |
| `Url` | 链接 | url input |
| `Email` | 邮箱 | email input |
| `Phone` | 电话 | tel input |
| `Contact` | 联系人 | user picker |
| `Attachment` | 附件 | file upload |
| `Link` | 关联记录 | record picker |
| `Lookup` | 引用值 | 只读展示 |
| `Formula` | 公式 | 只读展示 |
| `AutoNumber` | 自动编号 | 只读展示 |
| `CreatedTime` | 创建时间 | 只读展示 |
| `LastModifiedTime` | 修改时间 | 只读展示 |
| `CreatedBy` | 创建人 | 只读展示 |
| `LastModifiedBy` | 修改人 | 只读展示 |
| `ID` | 唯一标识 | 只读展示 |
| `Address` | 地址 | text input |
| `Note` | 备注 | rich text editor |

---

## Agent 工作流

```
1. 用户提供多维表（kdocs 链接或 file_id）
2. 调用 getSchema 获取表结构 → 确认 sheet_id、field_name、field_type
3. 根据字段类型选择 UI 组件
4. listRecords 传 show_fields_info: true；按用途选择 text_value：展示选项名称用 "text"，统计/编辑用 "original"
   → 从返回的 fields_schema 获取与记录 key 对齐的字段元数据
5. 记录的 fields 是 JSON 字符串，使用前必须 JSON.parse
6. UI 显示使用 field.name，数据提交使用 field.id
7. CRUD 操作全部使用 field_id 作为 fields_value 的 key
```

---

## 反模式

| 反模式 | 正确做法 |
|--------|---------|
| 用字段 `name` 作为 `fields_value` 的 key | 始终用 `field.id` + `prefer_id: true` |
| 猜测 `sheet_id` 值 | 必须从 `getSchema` 返回中获取 |
| 自动创建新多维表 | 用户必须提供已有多维表的 file_id 或链接 |
| 硬编码 field_id 而不先读 schema | 开发前必须先读 schema 确认字段结构 |
| 一次性拉取所有记录不分页 | 使用 `page_size` + `page_token` 分页 |
| 用对象传 `fields_value` 或写入时用 `fields` | 读取：`JSON.parse(record.fields)`；写入：`{ fields_value: JSON.stringify({...}) }`。**读用 `fields`，写用 `fields_value`，且都是 JSON 字符串** |
| 用 `getSchema` 的 field.id 匹配记录 key | 记录 `fields` 的 key 是列号（`"B"`, `"E"`…），必须用 `show_fields_info: true` 返回的 `fields_schema` 来匹配 |
| 将展示文本用于统计、布尔判断或编辑回填 | 按用途选择 `text_value`，并按字段类型解析；`"0"` 不能用 `Boolean(value)` 转成布尔值 |
| 解析后直接访问 `parsedFields[key]` 不做空值防护 | 某些 key 可能不存在，必须用可选链 `parsedFields?.[key]` |
| 在 `useEffect` 回调里更新其依赖的 state | `loadRecords` 结果写入 `useEffect` 依赖的 state（如 `activeSheet`）会死循环；字段元数据应存独立 state |

---

## 公共类型

### DbsheetSheet

数据表定义，被 getSchema、createSheet、updateSheet、deleteSheet 等接口共用。

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | number | 数据表 ID（后续操作用作 `sheet_id`） |
| `name` | string | 数据表名称 |
| `primary_field_id` | string | 主字段 ID |
| `fields` | [DbsheetField](#dbsheetfield)[] | 字段定义列表 |
| `views` | DbsheetView[] | 视图列表 |
| `records_count` | number | 记录总数 |

### DbsheetField

多维表字段定义，被 getSchema、createSheet、createFields、updateFields、listRecords（`fields_schema`）等多个接口共用。

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 字段标识——**列号**（如 `"B"`, `"E"`, `"G"`），作为记录 `fields` JSON 中的 key |
| `name` | string | 字段显示名称（如 `"候选人姓名"`, `"状态"`） |
| `type` | string | 字段类型，见下方「字段类型枚举」 |
| `data` | object \| null | 类型专属元数据，见下表 |

**DbsheetField.data 按类型**：

| type | data 结构 |
|------|----------|
| `MultiLineText` | `{ unique_value: boolean }` |
| `SingleSelect` | `{ allow_add_item_while_inputting: boolean, items: [{ id: string, value: string, color: number }] }` |
| `MultipleSelect` | 同 `SingleSelect` |
| `Number` / `Currency` / `Percentage` | `{ decimal_places?: number }` |
| `Phone` | `{ unique_value: boolean }` |
| `Email` | `null` |
| `Date` | `{ default_value: string, default_value_type: string, number_format: string }` |
| `Checkbox` / `Complete` | `null` |
| `Attachment` | `{ only_upload_by_camera: boolean }` |
| 只读类型（`Formula`, `AutoNumber`, `CreatedTime` 等） | 类型专属配置或 `null` |
