import { Hono } from "https://deno.land/x/hono@v4.3.11/mod.ts";
import { translate, logger, createCorsMiddleware, healthCheckHandler, parseTranslateParams, getApiDoc } from "https://fastly.jsdelivr.net/gh/lizhenmiao/google-translate-js@main/index.js";

const app = new Hono();
const ACCESS_TOKEN = Deno.env.get("ACCESS_TOKEN") || "";

// 日志监听
logger.on((message, level) => {
  console.log(`[翻译日志] ${level}: ${message}`);
});

// CORS 中间件
app.use("*", createCorsMiddleware());

// 健康检查
app.get("/health", healthCheckHandler("Google Translate API"));

// 翻译接口
app.route("/translate")
  .get(async (c) => {
    const { text, source_lang, target_lang } = await parseTranslateParams(c, ACCESS_TOKEN);

    const googleResult = await translate(text, {
      from: source_lang,
      to: target_lang,
      verbose: true
    });

    return c.json({
      code: 200,
      alternatives: [],
      data: googleResult.text,
      source_lang: googleResult.sourceLang,
      target_lang: googleResult.targetLang,
      id: Date.now(),
      method: "Free"
    });
  })
  .post(async (c) => {
    const { text, source_lang, target_lang } = await parseTranslateParams(c, ACCESS_TOKEN);

    const googleResult = await translate(text, {
      from: source_lang,
      to: target_lang,
      verbose: true
    });

    return c.json({
      code: 200,
      alternatives: [],
      data: googleResult.text,
      source_lang: googleResult.sourceLang,
      target_lang: googleResult.targetLang,
      id: Date.now(),
      method: "Free"
    });
  });

// API 文档
app.get("/", (c) => {
  return c.json(getApiDoc({
    description: "基于 Cloudflare Worker + Hono 的 Google 翻译服务",
    version: "1.0.0",
  }));
});

// 404 处理
app.all("*", (c) => c.json({
  success: false,
  error: "接口不存在",
  message: "请访问 / 查看可用的 API 接口",
}, 404));

export default app;
