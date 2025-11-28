# 后端开发规范与架构文档 (DeepSeek 集成版)

## 1. 项目概述
本项目旨在构建一个智能化的数学错题管理与复习系统。前端采用 React + Tailwind。
**架构升级目标**：实现前后端分离，后端负责数据持久化、图片存储、以及基于 **DeepSeek (R1/V3)** 的 AI 核心业务逻辑封装。

## 2. 技术栈选型
*   **Runtime**: Node.js (v18+) 或 Python (FastAPI - 推荐用于 AI 密集型处理)
*   **Framework**: NestJS (Node) 或 FastAPI (Python)
*   **Database**: MongoDB (v6.0+)
*   **ODM**: Mongoose
*   **Auth**: JWT (JSON Web Tokens)
*   **AI Engine**: 
    *   **DeepSeek-R1**: 用于复杂的错题归因、解题步骤推理、变式题生成（利用其强大的 Chain-of-Thought 能力）。
    *   **DeepSeek-V3**: 用于一般的自然语言交互和标签分类。
    *   **Vision/OCR 服务**: 由于 R1 主要为文本推理，建议后端集成专门的 OCR 服务（或 DeepSeek-VL）将图片转化为数学文本/LaTeX。
*   **Storage**: AWS S3 / Aliyun OSS (用于存储错题图片)

## 3. 数据库设计 (MongoDB Schema)

### 3.1 用户 (User)
*(保持不变)*
```javascript
{
  _id: ObjectId,
  username: String,
  passwordHash: String,
  gradeLevel: Number, 
  createdAt: Date
}
```

### 3.2 错题记录 (Mistake)
新增 `aiAnalysis` 字段用于存储推理过程。

```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  
  // 原图信息
  originalImage: {
    url: String, 
    fileId: String
  },
  
  // 题目内容
  content: {
    html: String, 
    visualComponent: [VisualComponentData] // 支持数组
  },
  
  // 解答与标签
  answer: String,
  explanation: String,
  tags: [String],

  // DeepSeek 特有字段
  aiAnalysis: {
    model: String, // e.g., "deepseek-r1"
    thinkingProcess: String, // 存储 <think> 标签内的思考过程
    rawResponse: String // 原始响应备份
  },
  
  // 过程管理状态
  status: { type: String, enum: ['active', 'deleted'], default: 'active' },
  
  // SRS 复习数据
  srs: {
    nextReviewAt: Date,
    reviewCount: Number,
    masteryLevel: { type: String, enum: ['new', 'learning', 'reviewing', 'mastered'] }
  },
  
  createdAt: Date,
  updatedAt: Date
}
```

## 4. AI 服务端处理流程 (DeepSeek Pipeline)

前端不再直接调用 AI，而是将图片/文本发送给后端。

### 4.1 错题分析接口 (`POST /api/ai/analyze`)

**输入**: `Multipart/Form-Data` (包含图片文件)
**输出**: 标准 Mistake JSON 结构

**后端处理逻辑**:
1.  **Upload**: 将图片上传至 OSS，获得 `img_url`。
2.  **OCR/Vision Step**:
    *   调用 Vision 模型（或 OCR API）提取图片中的文本和 LaTeX 公式。
    *   *Prompt 示例*: "提取图中的数学题目，输出纯文本，公式用 LaTeX 包裹。"
3.  **Reasoning Step (DeepSeek-R1)**:
    *   构造 Prompt: 将 OCR 得到的文本 + System Prompt (包含 HTML/JSON 格式要求) 发送给 DeepSeek-R1。
    *   *System Prompt*: "你是一个小学数学专家。请分析以下题目错误原因... 请严格按 JSON 格式输出..."
4.  **Parsing & Cleaning**:
    *   **提取思考**: 从返回内容中正则提取 `<think>(.*?)</think>` 内容，存入 `thinkingProcess`。
    *   **提取 JSON**: 过滤掉 `<think>` 部分和 Markdown 代码块 (```json)，利用 `JSON.parse` 尝试解析。如果不合法，触发重试机制或使用 `jsonrepair` 工具。
5.  **Response**: 返回清洗后的 JSON + `thinkingProcess` 给前端预览。

### 4.2 变式生成接口 (`POST /api/ai/generate-variation`)

**输入**: `{ originalMistakeId, difficulty: 'same' | 'harder' }`
**输出**: 变式题 JSON

**后端处理逻辑**:
1.  查询数据库获取原题内容 (HTML/Answer/Tags)。
2.  调用 **DeepSeek-R1**。
    *   *Prompt*: "参考原题逻辑，生成一道考察相同知识点的新题。要求数字不同但逻辑一致..."
3.  清洗 JSON 并返回。

## 5. API 接口定义 (RESTful)

### 基础业务
*   `GET /api/mistakes`: 获取列表
*   `GET /api/mistakes/review-queue`: 获取复习队列
*   `POST /api/mistakes`: 保存错题 (在 /analyze 预览确认后调用)
*   `DELETE /api/mistakes/:id`: 删除
*   `POST /api/mistakes/:id/review`: 提交复习结果

### AI 专用
*   `POST /api/ai/analyze`: 上传图片 -> OCR -> DeepSeek -> 返回分析结果 (无状态，不存库，仅预览)
*   `POST /api/ai/generate-variation`: 基于错题上下文生成新题

## 6. DeepSeek 集成注意事项

1.  **Base URL Compatibility**: DeepSeek 支持 OpenAI SDK 格式。
    ```javascript
    const OpenAI = require('openai');
    const client = new OpenAI({
      baseURL: 'https://api.deepseek.com',
      apiKey: process.env.DEEPSEEK_API_KEY
    });
    ```
2.  **Temperature 设置**:
    *   对于数学解题 (Reasoning)，建议 Temperature 设置为 `0.5` - `0.7` 以平衡创造性和准确性。
    *   对于 JSON 格式化输出，建议 Temperature 设置为 `0.0` - `0.3` 以保证格式稳定。
3.  **Context Window**: 利用 DeepSeek 的长上下文能力（V3 支持 64K/128K），可以在 Prompt 中由后端注入更多用户的历史错题作为 Few-Shot examples，实现个性化分析。
