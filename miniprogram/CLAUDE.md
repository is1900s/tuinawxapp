[根目录](../../CLAUDE.md) > **miniprogram**

# 小程序前端模块

## 变更记录 (Changelog)

### 2025-11-18 19:00:15
- 初始化前端模块文档结构
- 定义页面和组件架构

## 模块职责

负责小程序的用户界面展示、用户交互处理、以及与云函数的数据通信。包含所有前端逻辑和UI组件。

## 目录结构

```
miniprogram/
├── app.js                 # 小程序入口文件
├── app.json              # 小程序配置
├── app.wxss              # 全局样式
├── sitemap.json          # 站点地图配置
├── pages/                # 页面目录
│   ├── home/            # 首页
│   ├── technician/      # 技师相关页面
│   ├── order/           # 订单相关页面
│   └── user/            # 用户相关页面
├── components/           # 公共组件
├── utils/               # 工具函数
├── services/            # API服务
├── models/              # 数据模型
├── assets/              # 静态资源
└── styles/              # 样式文件
```

## 入口与启动

### app.js
小程序入口文件，包含：
- 应用生命周期管理
- 全局数据管理
- 微信授权逻辑
- 全局错误处理

### app.json
小程序配置文件，定义：
- 页面路由配置
- 窗口表现设置
- 底部导航栏
- 网络超时配置
- 权限设置

## 核心页面模块

### 首页 (home)
- **职责**: 服务展示、技师推荐、快速预约入口
- **关键功能**:
  - 服务项目展示
  - 附近技师推荐
  - 搜索和筛选
  - 优惠活动展示

### 技师模块 (technician)
- **职责**: 技师信息展示、选择、详情查看
- **包含页面**:
  - `list` - 技师列表页
  - `detail` - 技师详情页
  - `reviews` - 评价列表

### 订单模块 (order)
- **职责**: 预约流程、订单管理、支付处理
- **包含页面**:
  - `create` - 创建预约
  - `confirm` - 订单确认
  - `list` - 订单列表
  - `detail` - 订单详情

### 用户模块 (user)
- **职责**: 用户信息管理、设置、客服
- **包含页面**:
  - `profile` - 用户中心
  - `address` - 地址管理
  - `settings` - 设置页面
  - `feedback` - 意见反馈

## 公共组件 (components)

### 基础组件
- **Loading**: 加载状态组件
- **Empty**: 空状态展示
- **Error**: 错误状态提示
- **Confirm**: 确认对话框

### 业务组件
- **TechnicianCard**: 技师卡片
- **ServiceItem**: 服务项目项
- **OrderCard**: 订单卡片
- **AddressPicker**: 地址选择器
- **DatePicker**: 时间选择器

## 工具函数 (utils)

### 网络请求
- **request**: 封装wx.request，支持拦截器和错误处理
- **upload**: 文件上传工具
- **download**: 文件下载工具

### 数据处理
- **format**: 数据格式化工具（时间、价格等）
- **validate**: 表单验证工具
- **storage**: 本地存储封装
- **auth**: 微信授权工具

### 业务工具
- **location**: 地理位置处理
- **payment**: 支付相关工具
- **share**: 分享功能工具

## 服务层 (services)

### API服务
- **UserService**: 用户相关API
- **TechnicianService**: 技师相关API
- **OrderService**: 订单相关API
- **PaymentService**: 支付相关API

### 数据管理
- **GlobalData**: 全局数据管理
- **EventBus**: 事件总线
- **StateManager**: 页面状态管理

## 数据模型 (models)

### 用户模型
```typescript
interface User {
  id: string;
  openid: string;
  nickName: string;
  avatarUrl: string;
  phone: string;
  addresses: Address[];
}
```

### 技师模型
```typescript
interface Technician {
  id: string;
  name: string;
  avatar: string;
  specialties: string[];
  rating: number;
  experience: number;
  price: number;
  available: boolean;
}
```

### 订单模型
```typescript
interface Order {
  id: string;
  userId: string;
  technicianId: string;
  serviceType: string;
  address: Address;
  appointmentTime: Date;
  status: OrderStatus;
  totalPrice: number;
}
```

## 样式规范

### 设计系统
- **色彩规范**: 主色调、辅助色、状态色
- **字体规范**: 字号、字重、行高
- **间距规范**: 统一的间距体系
- **圆角规范**: 按钮、卡片、输入框等

### 响应式设计
- 使用rpx单位适配不同屏幕
- 关键断点适配
- 横竖屏适配处理

## 性能优化

### 代码优化
- 按需加载页面
- 组件懒加载
- 图片懒加载和压缩
- 代码分包策略

### 用户体验
- 骨架屏加载
- 下拉刷新和上拉加载
- 网络异常处理
- 本地缓存策略

## 测试与质量

### 单元测试
- 工具函数测试
- 组件渲染测试
- 数据处理测试

### 集成测试
- 页面跳转测试
- API调用测试
- 用户流程测试

### 质量检查
- ESLint代码规范检查
- TypeScript类型检查
- 代码覆盖率检查

## 开发规范

### 文件命名
- 页面文件：kebab-case (`order-detail`)
- 组件文件：kebab-case (`technician-card`)
- 工具文件：camelCase (`formatPrice.js`)

### 组件规范
- 单一职责原则
- Props类型定义
- 事件命名规范
- 样式隔离处理

## 第三方依赖

### UI组件库
- 考虑使用Vant Weapp或TDesign微信小程序版

### 工具库
- Lodash: 数据处理工具
- Day.js: 时间处理库
- Mock.js: 数据模拟

## 构建与部署

### 开发环境
- 微信开发者工具
- 热重载配置
- SourceMap配置

### 生产环境
- 代码压缩和混淆
- 资源CDN部署
- 版本管理策略

## 常见问题 (FAQ)

### 微信授权相关问题
- 授权失败处理
- 用户信息获取
- 手机号授权

### 地理位置相关问题
- 定位权限处理
- 地址解析
- 距离计算

### 支付相关问题
- 支付流程处理
- 支付结果同步
- 退款处理

## 相关文件清单

### 配置文件
- `app.json` - 小程序配置
- `project.config.json` - 项目配置
- `tsconfig.json` - TypeScript配置

### 入口文件
- `app.js` - 小程序入口
- `app.wxss` - 全局样式
- `sitemap.json` - 站点地图

### 页面文件 (待创建)
- `pages/home/home`
- `pages/technician/list`
- `pages/order/create`
- `pages/user/profile`

### 组件文件 (待创建)
- `components/technician-card`
- `components/order-card`
- `components/address-picker`