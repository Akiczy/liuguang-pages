// 留光 Pages 中转（Cloudflare Pages 高级模式）
// 作用：把 liuguang.runs-at.dev 收到的请求，通过服务绑定原样转给现有留光 Worker，
// 登录 Cookie、接口和夸克图片都不用改，原 workers.dev 地址继续保留。
// 前置配置（在 Pages 项目 Settings -> Bindings 里添加）：
//   Service binding：变量名 LIUGUANG -> 服务 liuguang-cloud -> 环境 production
// 未配置绑定时返回 503 提示，不会白屏。
// 例外（2026-10-24）：/devices/transition.js 与 /devices/transition.css 改由本仓库
// 内的同名文件直接提供——这是修复小米自带浏览器动画问题的版本（Worker 源码已
// 同步修好，下次 wrangler deploy 后两边一致；在此之前由中转层先行生效）。
const LOCAL_ASSETS = new Set(['/devices/transition.js', '/devices/transition.css']);
export default {
  async fetch(request, env) {
    if (LOCAL_ASSETS.has(new URL(request.url).pathname) && env.ASSETS) {
      return env.ASSETS.fetch(request);
    }
    if (!env.LIUGUANG) {
      return new Response('留光中转已部署，但 LIUGUANG 服务绑定还没有配置。请在 Cloudflare 的 Pages 项目设置里添加指向 liuguang-cloud 的 Service binding。', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }
    return env.LIUGUANG.fetch(request);
  }
};
