# 后端开发规范与架构文档

## 1. 项目概述
本项目旨在构建一个智能化的数学错题管理与复习系统。前端采用 React + Tailwind，目前需构建后端服务以支持多用户数据持久化、AI 过程管理及复杂的复习算法。

## 2. 技术栈选型
*   **Runtime**: Node.js (v18+)
*   **Framework**: Express.js 或 NestJS (推荐 NestJS 以获得更好的模块化支持)
*   **Database**: MongoDB (v6.0+)
*   **ODM**: Mongoose
*   **Auth**: JWT (JSON Web Tokens)
*   **AI Integration**: Google Gemini API (服务端调用)
*   **Storage**: AWS S3 / Aliyun OSS (用于存储错题图片) 或 MongoDB GridFS

## 3. 数据库设计 (MongoDB Schema)

### 3.1 用户 (User)
```javascript
{
  _id: ObjectId,
  username: String,
  passwordHash: String,
  gradeLevel: Number, // 1-6
  createdAt: Date
}
```

### 3.2 错题记录 (Mistake)
核心业务数据，存储错题内容、AI 分析结果及复习状态。

```javascript
{
  _id: ObjectId,
  userId: ObjectId, // 关联用户
  
  // 原图信息
  originalImage: {
    url: String, // 图片存储地址
    fileId: String // 对象存储ID
  },
  
  // 题目内容 (AI 生成或人工修正)
  content: {
    html: String, // 题目文本HTML
    visualComponent: {
      type: String, // 'clock', 'numberLine', etc.
      props: Object // 组件参数
    }
  },
  
  // 解答与标签
  answer: String,
  explanation: String, // Markdown 格式
  tags: [String],
  
  // 过程管理状态
  status: {
    type: String,
    enum: ['processing', 'active', 'archived', 'deleted'],
    default: 'active'
  },
  
  // 复习算法数据 (SRS - Spaced Repetition System)
  srs: {
    nextReviewAt: Date,
    lastReviewAt: Date,
    reviewCount: Number,
    interval: Number, // 当前间隔天数
    easeFactor: Number, // 难度系数 (默认 2.5)
    masteryLevel: {
      type: String,
      enum: ['new', 'learning', 'reviewing', 'mastered']
    }
  },
  
  createdAt: Date,
  updatedAt: Date
}
```

### 3.3 复习日志 (ReviewLog)
用于记录每一次做题结果，便于生成统计报表。

```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  mistakeId: ObjectId,
  isCorrect: Boolean,
  duration: Number, // 答题耗时(秒)
  reviewedAt: Date
}
```

## 4. API 接口定义 (RESTful)

所有接口需在 Header 中携带 `Authorization: Bearer <token>`。

### 4.1 错题管理

*   **GET /api/mistakes**
    *   Query: `page`, `limit`, `tag`, `status`
    *   Desc: 获取错题列表分页数据。

*   **GET /api/mistakes/review-queue**
    *   Desc: 获取当前需要复习的题目列表 (nextReviewAt <= now)。

*   **POST /api/mistakes**
    *   Body: `{ imageBase64, customPrompt }`
    *   Desc: 上传错题。
    *   **Process**:
        1. 服务端将 Base64 转存至 OSS。
        2. 调用 Gemini API 进行 OCR 和题目分析。
        3. 构建 Mistake 对象并在 DB 中创建。
    *   Response: 创建好的完整 Mistake 对象。

*   **PUT /api/mistakes/:id**
    *   Desc: 手动修正题目内容、标签或答案。

*   **DELETE /api/mistakes/:id**
    *   Desc: 软删除错题 (status -> deleted)。

### 4.2 复习与闯关

*   **POST /api/mistakes/:id/review**
    *   Body: `{ success: Boolean }`
    *   Desc: 提交单题复习结果。
    *   **Logic**:
        1. 记录 ReviewLog。
        2. 根据 SM-2 算法或简易间隔算法更新 `srs` 字段 (nextReviewAt, interval)。

*   **POST /api/quiz/generate**
    *   Body: `{ mistakeIds: [] }`
    *   Desc: 基于选定错题生成闯关试卷 (包含干扰项)。
    *   **Logic**: 调用 AI 生成干扰项，返回临时 Quiz 对象。

## 5. 过程管理与 AI 交互流

### 5.1 错题录入流
1.  **Frontend**: 用户上传图片 -> 裁剪 -> `POST /api/mistakes`
2.  **Backend**:
    *   接收图片。
    *   **Step A**: 上传图片到 OSS，获取 URL。
    *   **Step B**: 组装 Prompt，调用 Gemini API。要求返回标准 JSON 格式 (HTML + Visual Props)。
    *   **Step C**: 数据存入 MongoDB，初始状态 `masteryLevel: 'new'`。
3.  **Frontend**: 接收响应，展示在列表中。

### 5.2 复习算法 (简化版)
后端需实现以下逻辑更新 `nextReviewAt`:
*   If `success`:
    *   `interval = previous_interval * 2` (或者使用 easeFactor)
    *   `nextReviewAt = now + interval`
*   If `fail`:
    *   `interval = 1 day`
    *   `nextReviewAt = now + 1 day`

## 6. 开发阶段 Mock 策略
在后端未就绪时，前端 `services/api.ts` 将模拟上述接口行为：
*   使用 `localStorage` 模拟 MongoDB。
*   使用 `setTimeout` 模拟网络延迟。
*   保持数据结构与上述 Schema 一致，便于后期平滑迁移。
