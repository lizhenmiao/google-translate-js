class Logger {
  constructor() {
    this.listeners = []
  }

  on(callback) {
    this.listeners.push(callback)
  }

  log(...args) {
    // 将所有参数合并为一个消息
    const message = args.map(arg =>
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ')

    this.listeners.forEach(callback => callback(message, 'info'))
  }

  debug(...args) {
    const message = args.map(arg =>
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ')
    this.listeners.forEach(callback => callback(message, 'debug'))
  }

  error(...args) {
    const message = args.map(arg =>
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ')
    this.listeners.forEach(callback => callback(message, 'error'))
  }
}

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

export const logger = new Logger()

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

/**
 * 尝试使用指定配置进行翻译
 * @param {TranslateConfig} config - 翻译接口配置
 * @param {string} sourceLang - 源语言代码
 * @param {string} targetLang - 目标语言代码
 * @param {string} text - 待翻译文本
 * @returns {Promise<TranslateResult>} 翻译结果
 */
async function tryTranslateWithConfig(config, sourceLang, targetLang, text) {
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
    logger.error('请求失败，状态码：', response.status, '域名：', config.baseUrl)

    throw new Error(`请求失败，状态码：${response.status}，域名：${config.baseUrl}`)
  }

  const data = await response.json()

  logger.log('调用 google 接口获取的 data 数据: ', JSON.stringify(data), 'url', requestUrl)

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

  logger.error('无返回数据')
  throw new Error('无返回数据')
}

/**
 * 生成所有可能的翻译接口配置组合
 * @returns {TranslateConfig[]} 配置数组，按优先级排序
 */
function generateTranslateConfigs() {
  const configs = []

  // 优先级最高的配置
  configs.push({
    baseUrl: 'translate-pa.googleapis.com',
    isTranslatePa: true
  })

  // 其他配置
  const otherUrls = GOOGLE_TRANSLATE_BASE_URLS.filter(
    (url) => url !== 'translate-pa.googleapis.com'
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

  // 随机打乱顺序（除了第一个优先级最高的配置）
  const firstConfig = configs[0]
  const otherConfigs = configs.slice(1)

  for (let i = otherConfigs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [otherConfigs[i], otherConfigs[j]] = [otherConfigs[j], otherConfigs[i]]
  }

  return [firstConfig, ...otherConfigs]
}

/**
 * 调用 Google 翻译接口进行翻译（支持智能重试）
 * @param {string} text - 待翻译文本
 * @param {Object} options - 翻译选项
 * @param {string} [options.from="auto"] - 源语言代码
 * @param {string} options.to - 目标语言代码（必需）
 * @param {boolean} [options.verbose=false] - 是否启用详细日志
 * @returns {Promise<TranslateResult>} 翻译结果
 * @throws {Error} 当所有接口都失败时抛出错误
 */
export async function translate(text, options = {}) {
  const { from = 'auto', to, verbose = false } = options

  if (!text) {
    logger.error('缺少必需参数: text')
    throw new Error('缺少必需参数: text')
  }

  if (!to) {
    logger.error('缺少必需参数: to')
    throw new Error('缺少必需参数: to')
  }

  const configs = generateTranslateConfigs()
  const errors = []

  if (verbose) {
    console.log(`开始翻译: ${from} -> ${to}, 文本长度: ${text.length}`)
  }

  for (let i = 0; i < configs.length; i++) {
    const config = configs[i]

    try {
      if (verbose) {
        logger.log(
          `尝试配置 ${i + 1}/${configs.length}: ${config.baseUrl}${
            config.endpoint ? `/${config.endpoint}` : ''
          }`
        )
      }

      const result = await tryTranslateWithConfig(config, from, to, text)

      if (verbose) {
        logger.log(
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
        logger.log(`配置 ${i + 1} 失败: ${errorMsg}`)
      }

      if (i < configs.length - 1) {
        continue
      }
    }
  }

  const finalError = `所有翻译接口都失败了。尝试了 ${configs.length} 个配置:\n${errors.join('\n')}`
  logger.error(finalError)
  throw new Error(finalError)
}

export default { translate }
