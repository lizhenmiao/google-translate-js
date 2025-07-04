// Google 翻译核心模块
const GOOGLE_TRANSLATE_BASE_URLS = [
  "translate.googleapis.com",
  "translate.google.com", 
  "clients5.google.com",
  "translate.google.so",
  "translate-pa.googleapis.com",
];

const GOOGLE_TRANSLATE_ENDPOINTS = ["single", "t"];
const GOOGLE_TRANSLATE_CLIENTS = ["gtx", "dict-chrome-ex"];

/**
 * 尝试使用指定配置进行翻译
 * @param {TranslateConfig} config - 翻译接口配置
 * @param {string} sourceLang - 源语言代码
 * @param {string} targetLang - 目标语言代码
 * @param {string} text - 待翻译文本
 * @returns {Promise<TranslateResult>} 翻译结果
 */
async function tryTranslateWithConfig(config, sourceLang, targetLang, text) {
  const headers = new Headers();
  headers.append(
    "User-Agent",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.104 Safari/537.36"
  );
  headers.append("Accept", "*/*");
  headers.append("Connection", "keep-alive");
  headers.append("Host", config.baseUrl);

  let response;

  if (config.isTranslatePa) {
    headers.append("X-Goog-API-Key", "AIzaSyATBXajvzQLTDHEQbcpq0Ihe0vWDHmO520");
    headers.append("Content-Type", "application/json+protobuf");
    
    const requestBody = `[[["${text}"], "${sourceLang}", "${targetLang}"], "wt_lib"]`;
    
    response = await fetch(`https://${config.baseUrl}/v1/translateHtml`, {
      method: "POST",
      headers,
      body: requestBody,
    });
  } else {
    const params = new URLSearchParams();
    params.append("client", config.client);
    params.append("dt", "t");
    params.append("sl", sourceLang);
    params.append("tl", targetLang);
    params.append("q", text);

    headers.append("Content-Type", "application/json");
    
    const url = `https://${config.baseUrl}/translate_a/${config.endpoint}?${params.toString()}`;
    
    response = await fetch(url, {
      method: "POST",
      headers,
      redirect: "follow",
    });
  }

  if (response.status !== 200) {
    throw new Error(`请求失败，状态码：${response.status}，域名：${config.baseUrl}`);
  }

  const data = await response.json();

  if (data && data.length && Array.isArray(data)) {
    if (config.isTranslatePa) {
      return {
        text: data[0][0],
        sourceLang: data[1][0] || sourceLang,
        targetLang,
      };
    }

    if (config.endpoint === "single") {
      return {
        text: data[0][0].map((item) => (item && item[0]) || "").join(""),
        sourceLang: data[2] || sourceLang,
        targetLang,
      };
    }

    if (config.endpoint === "t") {
      return {
        text: data[0][0],
        sourceLang: data[0][1],
        targetLang,
      };
    }
  }

  throw new Error("无返回数据");
}

/**
 * 生成所有可能的翻译接口配置组合
 * @returns {TranslateConfig[]} 配置数组，按优先级排序
 */
function generateTranslateConfigs() {
  const configs = [];

  // 优先级最高的配置
  configs.push({
    baseUrl: "translate-pa.googleapis.com",
    isTranslatePa: true,
  });

  // 其他配置
  const otherUrls = GOOGLE_TRANSLATE_BASE_URLS.filter(
    (url) => url !== "translate-pa.googleapis.com"
  );

  for (const baseUrl of otherUrls) {
    for (const endpoint of GOOGLE_TRANSLATE_ENDPOINTS) {
      for (const client of GOOGLE_TRANSLATE_CLIENTS) {
        configs.push({
          baseUrl,
          endpoint,
          client,
          isTranslatePa: false,
        });
      }
    }
  }

  // 随机打乱顺序（除了第一个优先级最高的配置）
  const firstConfig = configs[0];
  const otherConfigs = configs.slice(1);

  for (let i = otherConfigs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [otherConfigs[i], otherConfigs[j]] = [otherConfigs[j], otherConfigs[i]];
  }

  return [firstConfig, ...otherConfigs];
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
  const { from = "auto", to, verbose = false } = options;

  if (!text) {
    throw new Error("缺少必需参数: text");
  }

  if (!to) {
    throw new Error("缺少必需参数: to");
  }

  const configs = generateTranslateConfigs();
  const errors = [];

  if (verbose) {
    console.log(`开始翻译: ${from} -> ${to}, 文本长度: ${text.length}`);
  }

  for (let i = 0; i < configs.length; i++) {
    const config = configs[i];

    try {
      if (verbose) {
        console.log(
          `尝试配置 ${i + 1}/${configs.length}: ${config.baseUrl}${
            config.endpoint ? `/${config.endpoint}` : ""
          }`
        );
      }

      const result = await tryTranslateWithConfig(config, from, to, text);

      if (verbose) {
        console.log(
          `翻译成功! 使用配置: ${config.baseUrl}${
            config.endpoint ? `/${config.endpoint}` : ""
          }`
        );
      }

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(`配置${i + 1}(${config.baseUrl}): ${errorMsg}`);

      if (verbose) {
        console.log(`配置 ${i + 1} 失败: ${errorMsg}`);
      }

      if (i < configs.length - 1) {
        continue;
      }
    }
  }

  const finalError = `所有翻译接口都失败了。尝试了 ${configs.length} 个配置:\n${errors.join("\n")}`;
  throw new Error(finalError);
}

export default { translate }
