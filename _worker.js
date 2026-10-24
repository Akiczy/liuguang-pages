// 留光 Pages 中转（Cloudflare Pages 高级模式）
// 作用：把 liuguang.runs-at.dev 收到的请求，通过服务绑定原样转给现有留光 Worker，
// 登录 Cookie、接口和夸克图片都不用改，原 workers.dev 地址继续保留。
// 前置配置（在 Pages 项目 Settings -> Bindings 里添加）：
//   Service binding：变量名 LIUGUANG -> 服务 liuguang-cloud -> 环境 production
// 未配置绑定时返回 503 提示，不会白屏。
export default {
  async fetch(request, env) {
    if (!env.LIUGUANG) {
      return new Response('留光中转已部署，但 LIUGUANG 服务绑定还没有配置。请在 Cloudflare 的 Pages 项目设置里添加指向 liuguang-cloud 的 Service binding。', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }
    return env.LIUGUANG.fetch(request);
  }
};
