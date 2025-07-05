# Google Translate API

一个支持多端点、智能重试的 Google 翻译 JavaScript 库。

## 特性

- 🔄 **智能重试机制** - 自动尝试多个 Google 翻译服务端点
- 🎯 **多端点支持** - 支持多个 Google 翻译域名和接口
- 🔧 **灵活配置** - 支持自定义优先配置和随机化
- 📝 **详细日志** - 内置日志系统，便于调试
- 🌍 **语言自动检测** - 支持自动检测源语言

## 快速开始

```javascript
import { translate } from './index.js'

// 基础翻译
const result = await translate('Hello world', {
  from: 'en',
  to: 'zh'
})

console.log(result.text) // 你好世界
```

## API 文档

### translate(text, options)

主要的翻译函数，支持智能重试机制。

#### 参数

| 参数 | 类型 | 必需 | 默认值 | 描述 |
|------|------|------|--------|------|
| text | string | ✅ | - | 待翻译的文本 |
| options | Object | ❌ | {} | 翻译选项 |

#### options 对象

| 属性 | 类型 | 必需 | 默认值 | 描述 |
|------|------|------|--------|------|
| from | string | ❌ | "auto" | 源语言代码，"auto" 表示自动检测 |
| to | string | ✅ | - | 目标语言代码 |
| verbose | boolean | ❌ | false | 是否启用详细日志输出 |
| preferredConfig | Object | ❌ | null | 优先使用的配置 |
| randomizeAll | boolean | ❌ | false | 是否完全随机化所有配置 |

#### preferredConfig 对象

| 属性 | 类型 | 描述 |
|------|------|------|
| baseUrl | string | 优先的域名 |
| endpoint | string | 优先的端点 |

#### 返回值

返回 `Promise<TranslateResult>`

```typescript
interface TranslateResult {
  text: string       // 翻译后的文本
  sourceLang: string // 识别的源语言代码
  targetLang: string // 目标语言代码
}
```

## 使用示例

### 基础翻译

```javascript
import { translate } from './index.js'

// 自动检测源语言
const result = await translate('Hello world', {
  to: 'zh'
})

console.log(result)
// {
//   text: '你好世界',
//   sourceLang: 'en',
//   targetLang: 'zh'
// }
```

### 指定源语言

```javascript
const result = await translate('Bonjour le monde', {
  from: 'fr',
  to: 'en'
})

console.log(result.text) // Hello world
```

### 启用详细日志

```javascript
import { translate, logger } from './index.js'

// 添加日志监听器
logger.on((level, ...args) => {
  console.log(`[翻译日志] [${level.toUpperCase()}]: `, ...args);
});

const result = await translate('Hello', {
  to: 'zh',
  verbose: true
})
```

### 使用优先配置

```javascript
const result = await translate('Hello world', {
  to: 'zh',
  preferredConfig: {
    baseUrl: 'translate.google.com',
    endpoint: 'single'
  }
})
```

### 随机化配置顺序

```javascript
const result = await translate('Hello world', {
  to: 'zh',
  randomizeAll: true,
  verbose: true
})
```

### 错误处理

```javascript
try {
  const result = await translate('Hello world', {
    to: 'zh'
  })
  console.log(result.text)
} catch (error) {
  console.error('翻译失败:', error.message)
}
```

## Logger 类

内置的日志系统，支持多种日志级别。

### 方法

```javascript
import { logger } from './index.js'

// 添加日志监听器
logger.on((level, ...args) => {
  console.log(`[翻译日志] [${level.toUpperCase()}]: `, ...args);
});

// 记录不同级别的日志
logger.info('这是一条信息')
logger.debug('这是调试信息')
logger.error('这是错误信息')
```

## 工具函数

### getValue(data, path, defaultValue)

从对象中安全地获取嵌套值。

```javascript
import { getValue } from './index.js'

const data = {
  user: {
    name: 'John',
    preferences: {
      language: 'en'
    }
  }
}

const name = getValue(data, 'user.name', 'Unknown')
const language = getValue(data, 'user.preferences.language', 'en')
const missing = getValue(data, 'user.age', 0)
```

## 部署指南

### 部署到 [Deno Deploy](https://dash.deno.com/)

1. 打开网站注册账号并登录
2. 新建一个 Playground
3. 复制并粘贴 **deno-example.js** - [点击查看文件](./deno-example.js)
4. **Save & Deploy**
5. 如果需要设置 `ACCESS_TOKEN`, 打开刚才创建的项目, 找到 `Settings`, 进行添加 `Environment Variables`, `key` 填写 `ACCESS_TOKEN`, `value` 就是你要设置的 `token` 的值, 例如 `123456`.

### 部署到 Alpine Linux 3.20 系统

#### 1. 下载部署文件

**alpine-3.20-example.js** - [点击查看文件](./alpine-3.20-example.js)

**alpine-3.20-start.sh** - [点击查看文件](./alpine-3.20-start.sh)

#### 2. 部署步骤

```
# 1. 上传文件到 Alpine Linux 服务器
alpine-3.20-example.js
alpine-3.20-start.sh

# 2. 可以进行更改 alpine-3.20-start.sh 文件中的 ACCESS_TOKEN 和 PORT 的值

# 3. 修改好之后保存并给文件赋权
chmod +x alpine-3.20-start.sh

# 4. 启动服务
./alpine-3.20-start.sh

# 5. 停止服务
# 查找 Deno 进程
ps aux | grep deno

# 停止服务 (使用进程ID)
kill 12345

# 强制停止服务
kill -9 12345
```

## 支持的语言

查看完整的语言代码列表：[Google Cloud Translation 支持的语言](https://cloud.google.com/translate/docs/languages)

常用语言代码：
- `en` - 英语
- `zh` - 中文（简体）
- `zh-TW` - 中文（繁体）
- `ja` - 日语
- `ko` - 韩语
- `fr` - 法语
- `de` - 德语
- `es` - 西班牙语
- `ru` - 俄语
- `auto` - 自动检测

## 注意事项

1. 该库使用 Google 翻译的公共接口，请遵守相关使用条款
2. 频繁请求可能会被限制，建议适当控制请求频率
3. 网络环境可能影响不同端点的可用性，库会自动重试其他端点
4. 启用 `verbose` 选项可以帮助调试连接问题
