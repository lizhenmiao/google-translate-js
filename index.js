class Logger {
  constructor() {
    this.listeners = []
  }

  on(callback) {
    if (typeof callback === 'function') {
      this.listeners.push(callback)
    }
  }

  // 通用的日志处理方法
  _emit(level, ...args) {
    // 通知所有监听器，传递日志级别和参数
    this.listeners.forEach(listener => {
      try {
        listener(level, ...args)
      } catch (e) {
        console.error('Logger listener error:', e)
      }
    })
  }

  error(...args) {
    this._emit('error', ...args)
  }

  warn(...args) {
    this._emit('warn', ...args)
  }

  info(...args) {
    this._emit('info', ...args)
  }
}

export const logger = new Logger()

function getValue(data, path, defaultValue = null) {
  if (!path) return data === undefined ? defaultValue : data

  // 统一把路径转成数组形式的 key 列表
  // 支持 a.b[0].c[1] 这种混合写法
  const keys = []

  // 正则匹配点分割和方括号里的键名
  const regex = /[^.\[\]]+|\[(\d+|".*?"|'.*?')\]/g

  let match

  while ((match = regex.exec(path)) !== null) {
    let key = match[0]

    if (key.startsWith('[')) {
      // 去掉方括号和引号
      key = key.slice(1, -1)

      if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
        key = key.slice(1, -1)
      }
    }

    // 数字字符串转数字
    if (/^\d+$/.test(key)) key = Number(key)

    keys.push(key)
  }

  let result = data

  for (const key of keys) {
    if (result == null || !(key in result)) {
      return defaultValue
    }

    result = result[key]
  }

  return result === undefined ? defaultValue : result
}

// Google 翻译核心模块
const GOOGLE_TRANSLATE_BASE_URLS = [
  'translate.googleapis.com',
  'translate.google.com',
  'clients5.google.com',
  'translate.google.so',
  'translate-pa.googleapis.com'
]

const GOOGLE_TRANSLATE_ENDPOINTS = ['single', 't']
const GOOGLE_TRANSLATE_CLIENTS = ['gtx', 'dict-chrome-ex']

// 预生成所有可能的配置并缓存
const ALL_CONFIGS_CACHE = (() => {
  const configs = []

  // 添加 translate-pa.googleapis.com
  configs.push({
    baseUrl: 'translate-pa.googleapis.com',
    isTranslatePa: true
  })

  // 添加其他普通配置
  const otherUrls = GOOGLE_TRANSLATE_BASE_URLS.filter(
    url => url !== 'translate-pa.googleapis.com'
  )

  for (const baseUrl of otherUrls) {
    for (const endpoint of GOOGLE_TRANSLATE_ENDPOINTS) {
      for (const client of GOOGLE_TRANSLATE_CLIENTS) {
        configs.push({
          baseUrl,
          endpoint,
          client,
          isTranslatePa: false
        })
      }
    }
  }

  return configs
})()

/**
 * 验证配置是否有效
 * @param {Object} config - 待验证的配置
 * @returns {boolean} 是否有效
 */
function isValidConfig(config) {
  if (!config || typeof config !== 'object') {
    return false
  }

  // 检查 baseUrl 是否在有效列表中
  if (!config.baseUrl || !GOOGLE_TRANSLATE_BASE_URLS.includes(config.baseUrl)) {
    return false
  }

  // 如果是 translate-pa.googleapis.com，不需要检查其他字段
  if (config.baseUrl === 'translate-pa.googleapis.com') {
    return true
  }

  // 检查 endpoint 是否在有效列表中
  if (!config.endpoint || !GOOGLE_TRANSLATE_ENDPOINTS.includes(config.endpoint)) {
    return false
  }

  return true
}

/**
 * 生成翻译接口配置数组（优化版）
 * @param {Object} [preferredConfig] - 优先使用的配置
 * @param {string} [preferredConfig.baseUrl] - 优先的域名
 * @param {string} [preferredConfig.endpoint] - 优先的端点
 * @param {boolean} [randomizeAll=false] - 是否完全随机化所有配置
 * @param {boolean} [verbose=false] - 是否启用详细日志
 * @returns {TranslateConfig[]} 配置数组，按优先级排序
 */
function generateTranslateConfigs(preferredConfig = null, randomizeAll = false, verbose = false) {
  const configs = []
  let useRandomOrder = randomizeAll

  // 如果指定了优先配置，先验证
  if (preferredConfig && !randomizeAll) {
    if (!isValidConfig(preferredConfig)) {
      if (verbose) {
        logger.error(`无效的优先配置: ${JSON.stringify(preferredConfig)}`)

        logger.info('将使用随机配置顺序')
      }
      // 验证失败，使用随机顺序
      useRandomOrder = true
    } else {
      // 验证通过，添加优先配置
      if (preferredConfig.baseUrl === 'translate-pa.googleapis.com') {
        configs.push({
          baseUrl: 'translate-pa.googleapis.com',
          isTranslatePa: true
        })
      } else {
        configs.push({
          baseUrl: preferredConfig.baseUrl,
          endpoint: preferredConfig.endpoint,
          client: GOOGLE_TRANSLATE_CLIENTS[0], // 使用第一个客户端
          isTranslatePa: false
        })
      }

      if (verbose) {
        logger.info(`使用优先配置: ${preferredConfig.baseUrl}${preferredConfig.endpoint ? `/${preferredConfig.endpoint}` : ''}`)
      }
    }
  }

  // 如果没有随机化，且没有有效的优先配置，则使用默认的最高优先级
  if (!useRandomOrder && configs.length === 0) {
    configs.push({
      baseUrl: 'translate-pa.googleapis.com',
      isTranslatePa: true
    })
  }

  // 从缓存中获取其他配置
  const otherConfigs = ALL_CONFIGS_CACHE.filter(config => {
    // 过滤掉已经添加的配置
    return !configs.some(existingConfig =>
      existingConfig.baseUrl === config.baseUrl &&
      existingConfig.endpoint === config.endpoint &&
      existingConfig.client === config.client &&
      existingConfig.isTranslatePa === config.isTranslatePa
    )
  })

  // 如果使用随机顺序，或者需要打乱其他配置
  if (useRandomOrder || otherConfigs.length > 1) {
    for (let i = otherConfigs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [otherConfigs[i], otherConfigs[j]] = [otherConfigs[j], otherConfigs[i]]
    }
  }

  return [...configs, ...otherConfigs]
}

/**
 * 尝试使用指定配置进行翻译
 * @param {TranslateConfig} config - 翻译接口配置
 * @param {string} sourceLang - 源语言代码
 * @param {string} targetLang - 目标语言代码
 * @param {string} text - 待翻译文本
 * @param {boolean} verbose - 是否启用详细日志
 * @returns {Promise<TranslateResult>} 翻译结果
 */
async function tryTranslateWithConfig(config, sourceLang, targetLang, text, verbose) {
  const headers = new Headers()
  headers.append(
    'User-Agent',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.104 Safari/537.36'
  )
  headers.append('Accept', '*/*')
  headers.append('Connection', 'keep-alive')
  headers.append('Host', config.baseUrl)

  let response
  let requestUrl
  let data = null

  if (config.isTranslatePa) {
    headers.append('X-Goog-API-Key', 'AIzaSyATBXajvzQLTDHEQbcpq0Ihe0vWDHmO520')
    headers.append('Content-Type', 'application/json+protobuf')

    const requestBody = `[[["${text}"], "${sourceLang}", "${targetLang}"], "wt_lib"]`

    requestUrl = `https://${config.baseUrl}/v1/translateHtml`
    response = await fetch(requestUrl, {
      method: 'POST',
      headers,
      body: requestBody
    })
  } else {
    const params = new URLSearchParams()
    params.append('client', config.client)
    params.append('dt', 't')
    params.append('sl', sourceLang)
    params.append('tl', targetLang)
    params.append('q', text)

    headers.append('Content-Type', 'application/json')

    requestUrl = `https://${config.baseUrl}/translate_a/${config.endpoint}`
    const url = `${requestUrl}?${params.toString()}`

    response = await fetch(url, {
      method: 'POST',
      headers,
      redirect: 'follow'
    })
  }

  if (response.status !== 200) {
    if (verbose) {
      logger.error('请求失败，状态码：', response.status, '域名：', config.baseUrl)
    }

    throw new Error(`请求失败，状态码：${response.status}，域名：${config.baseUrl}`)
  }

  try {
    data = await response.json()

    if (data && data.length && Array.isArray(data)) {
      if (config.isTranslatePa) {
        return {
          text: getValue(data, '[0][0]', ''),
          sourceLang: getValue(data, '[1][0]', '') || sourceLang,
          targetLang
        }
      }

      if (config.endpoint === 'single') {
        return {
          text: (getValue(data, '[0]', null) || []).map(item => getValue(item, '[0]', '') || '').join(''),
          sourceLang: getValue(data, '[2]', null) || sourceLang,
          targetLang
        }
      }

      if (config.endpoint === 't') {
        return {
          text: getValue(data, '[0][0]', ''),
          sourceLang: getValue(data, '[0][1]', '') || sourceLang,
          targetLang
        }
      }
    }

    if (verbose) {
      logger.error('无返回数据')
    }

    throw new Error('无返回数据')
  } catch (error) {
    if (verbose) {
      logger.error('处理响应数据时出错:', error)
      logger.error('响应数据:', JSON.stringify(data))
    }

    throw error
  }
}

/**
 * 调用 Google 翻译接口进行翻译（支持智能重试）
 * @param {string} text - 待翻译文本
 * @param {Object} options - 翻译选项
 * @param {string} [options.from="auto"] - 源语言代码
 * @param {string} options.to - 目标语言代码（必需）
 * @param {boolean} [options.verbose=false] - 是否启用详细日志
 * @param {Object} [options.preferredConfig] - 优先使用的配置
 * @param {string} [options.preferredConfig.baseUrl] - 优先的域名
 * @param {string} [options.preferredConfig.endpoint] - 优先的端点
 * @param {boolean} [options.randomizeAll=false] - 是否完全随机化所有配置（无固定优先级）
 * @returns {Promise<TranslateResult>} 翻译结果
 * @throws {Error} 当所有接口都失败时抛出错误
 */
export async function translate(text, options = {}) {
  const {
    from = 'auto',
    to,
    verbose = false,
    preferredConfig = null,
    randomizeAll = false
  } = options

  if (!text) {
    if (verbose) {
      logger.error('缺少必需参数: text')
    }
    throw new Error('缺少必需参数: text')
  }

  if (!to) {
    if (verbose) {
      logger.error('缺少必需参数: to')
    }
    throw new Error('缺少必需参数: to')
  }

  const configs = generateTranslateConfigs(preferredConfig, randomizeAll, verbose)
  const errors = []

  if (verbose) {
    logger.info(`开始翻译: ${from} -> ${to}, 文本长度: ${text.length}`)
    logger.info(`生成了 ${configs.length} 个配置`)
    if (randomizeAll) {
      logger.info('使用完全随机化配置顺序')
    }
  }

  for (let i = 0; i < configs.length; i++) {
    const config = configs[i]

    try {
      if (verbose) {
        logger.info(
          `尝试配置 ${i + 1}/${configs.length}: ${config.baseUrl}${
            config.endpoint ? `/${config.endpoint}` : ''
          }`
        )
      }

      const result = await tryTranslateWithConfig(config, from, to, text, verbose)

      if (verbose) {
        logger.info(
          `翻译成功! 使用配置: ${config.baseUrl}${
            config.endpoint ? `/${config.endpoint}` : ''
          }`
        )
      }

      return result
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      errors.push(`配置${i + 1}(${config.baseUrl}): ${errorMsg}`)

      if (verbose) {
        logger.info(`配置 ${i + 1} 失败: ${errorMsg}`)
      }

      if (i < configs.length - 1) {
        continue
      }
    }
  }

  const finalError = `所有翻译接口都失败了。尝试了 ${configs.length} 个配置:\n${errors.join('\n')}`

  if (verbose) {
    logger.error(finalError)
  }

  throw new Error(finalError)
}

/**
 * 创建 CORS 中间件
 * @returns {Function} CORS 中间件函数
 */
export function createCorsMiddleware() {
  return async (c, next) => {
    c.header('Access-Control-Allow-Origin', '*')
    c.header('Access-Control-Allow-Methods', 'GET, POST')
    c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    // 不处理 OPTIONS 请求，直接继续
    if (c.req.method !== 'GET' && c.req.method !== 'POST') {
      // 你也可以选择直接返回 405
      return c.text('Method Not Allowed', 405)
    }
    await next()
  }
}

/**
 * 解析翻译请求参数并校验 ACCESS_TOKEN
 * @param c Hono Context
 * @param ACCESS_TOKEN 可选，验证用的 token
 * @returns { text, source_lang, target_lang }
 * @throws 参数错误或 token 验证失败时抛出异常
 */
export async function parseTranslateParams(c, ACCESS_TOKEN, verbose = false) {
  const requestParams = c.req.method === 'GET' ? c.req.query() : (c.req.method === 'POST' ? await c.req.json() : {})
  const text = requestParams.text
  const source_lang = requestParams.source_lang || 'auto'
  const target_lang = requestParams.target_lang
  const token = c.req.query().token

  if (!['GET', 'POST'].includes(c.req.method)) {
    if (verbose) {
      logger.error('仅支持 GET 和 POST 请求')
    }

    throw new Error('仅支持 GET 和 POST 请求')
  }

  if (!text) {
    if (verbose) {
      logger.error('缺少参数 text')
    }

    throw new Error('缺少参数 text')
  }

  if (!target_lang) {
    if (verbose) {
      logger.error('缺少参数 target_lang')
    }

    throw new Error('缺少参数 target_lang')
  }

  // 验证 ACCESS_TOKEN
  if (ACCESS_TOKEN) {
    // 从 Authorization 头解析 Bearer token
    const authHeader = c.req.header('Authorization') || ''
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null

    if (token !== ACCESS_TOKEN && bearerToken !== ACCESS_TOKEN) {
      if (verbose) {
        logger.error('ACCESS_TOKEN 验证失败')
      }

      throw new Error('ACCESS_TOKEN 验证失败')
    }
  }

  return { text, source_lang, target_lang }
}

/**
 * 获取 API 文档
 * @param {string} description - 描述
 * @param {string} version - 版本
 * @returns {Object} API 文档
 */
export function getApiDoc(description = 'Google 翻译服务', version = '1.0.0') {
  return (c) => {
    return c.json({
      name: 'Google 翻译 API',
      version,
      description,
      endpoints: {
        '/translate': {
          methods: ['GET', 'POST'],
          description: '翻译文本',
          parameters: {
            text: '要翻译的文本（必需）',
            source_lang: '源语言代码（可选，默认为 auto）',
            target_lang: '目标语言代码（必需）'
          },
          examples: {
            get: '/translate?text=Hello&source_lang=en&target_lang=zh&token=your_access_token',
            post: {
              url: '/translate',
              body: { text: 'Hello', source_lang: 'en', target_lang: 'zh' },
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer your_access_token'
              }
            }
          }
        },
        '/health': {
          methods: ['GET'],
          description: '健康检查'
        }
      }
    })
  }
}

/**
 * 健康检查处理函数
 * @param serviceName 服务名称，默认为 "Service is running..."
 * @returns {Object} 健康检查结果
 */
export function healthCheckHandler(serviceName = 'Service is running...') {
  return (c) => {
    return c.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: serviceName
    })
  }
}

/**
 * 处理翻译请求
 * @param {Object} c - Hono Context
 * @param {string} ACCESS_TOKEN - 访问令牌
 * @returns {Promise<Object>} 翻译结果
 */
export async function handleTranslateRequest(c, ACCESS_TOKEN, options = { verbose: false }) {
  try {
    const { verbose = false } = options || {}

    const { text, source_lang, target_lang } = await parseTranslateParams(c, ACCESS_TOKEN, verbose)

    const googleResult = await translate(text, {
      from: source_lang,
      to: target_lang,
      ...options
    })

    return c.json({
      code: 200,
      alternatives: [],
      data: googleResult.text,
      source_lang: googleResult.sourceLang,
      target_lang: googleResult.targetLang,
      id: Date.now(),
      method: 'Free'
    })
  } catch (error) {
    return c.json({
      code: 500,
      message: error.message || '翻译失败'
    })
  }
}

export default {
  logger,
  translate,
  createCorsMiddleware,
  parseTranslateParams,
  getApiDoc,
  healthCheckHandler,
  handleTranslateRequest
}
