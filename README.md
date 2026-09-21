# 罗汉到家

罗汉到家是一个上门按摩 O2O Web 原型，围绕“查看附近技师、选择服务、预约下单、跟踪履约”完成用户端业务闭环。项目采用移动端优先设计，同时兼容桌面浏览器，适合作为前端面试项目或产品 MVP 演示。

在线体验：[https://luohan-home-care-cn.surge.sh](https://luohan-home-care-cn.surge.sh)

## 核心功能

- 登录与退出登录
- 附近技师列表和距离排序
- 技师头像、评分、成交量、价格及近期可约时间
- 高德地图技师标记与本地地图降级
- 模拟技师移动和实时距离更新
- 服务项目、日期、时间、力度、地址和备注选择
- 模拟支付与订单成功页面
- 六阶段订单状态展示和手动推进
- 用户与技师位置、动态路线和预计到达时间
- 按摩偏好、积分、消费记录、历史订单和再次预约
- Toast、弹窗、选中态、加载态和页面切换动画

## 技术栈

- React 19：组件化页面和动态状态管理
- TypeScript：为技师、服务、预约和订单定义类型
- Vite：开发服务器与生产构建
- 原生 CSS：响应式布局、移动端交互和动画
- 高德地图 JS API：在中国大陆展示地图和位置标记
- LocalStorage：保存原型登录状态和订单
- Mock 数据与定时器：模拟技师移动和订单履约
- Surge：发布公开 HTTPS 演示链接

## 项目结构

```text
src/
├─ assets/                技师本地图片
├─ components/            登录、首页、详情、预约、订单等页面组件
├─ hooks/                 持久化状态 Hook
├─ lib/                   高德地图加载配置
├─ App.tsx                页面状态与业务流程入口
├─ data.ts                技师、服务和订单状态 Mock 数据
├─ types.ts               业务类型定义
└─ styles.css             主样式和响应式布局

scripts/                  按钮与状态反馈检查脚本
docs/                     技术说明和 CSDN 文章草稿
deliverables/             Word 技术文档
```

## 本地运行

```bash
npm install
npm run dev
```

浏览器打开终端显示的本地地址即可。

## 高德地图配置

复制示例环境文件：

```bash
copy .env.example .env
```

在 `.env` 中填写自己的高德 Web JS API 配置：

```env
VITE_AMAP_KEY=your_amap_web_key
VITE_AMAP_SECURITY_CODE=your_amap_security_code
```

`.env` 已加入 Git 忽略列表，不会提交到仓库。生产使用时还应在高德控制台限制允许调用的域名。

如果没有配置高德地图，项目会自动显示本地 SVG 动态地图，核心预约和订单流程仍然可以正常演示。

## 构建和检查

```bash
npm run build
```

构建命令会依次执行：

1. 按钮点击反馈检查
2. 状态交互反馈检查
3. TypeScript 类型检查
4. Vite 生产构建

本地预览生产版本：

```bash
npm run preview
```

## 原型说明

当前项目是前端原型，登录、支付、消息、定位和订单派发使用模拟数据，不产生真实交易。正式上线需要补充服务端鉴权、数据库、真实支付、实时位置推送、即时通信、日志监控和权限系统。

## 相关文档

- [技术实现说明](docs/技术实现说明.md)
- [CSDN 文章草稿](docs/CSDN文章草稿.md)
- [Word 技术文档](deliverables/罗汉到家技术选型与实现说明.docx)

