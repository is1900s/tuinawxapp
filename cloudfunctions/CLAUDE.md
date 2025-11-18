[根目录](../../CLAUDE.md) > **cloudfunctions**

# 云函数后端模块

## 变更记录 (Changelog)

### 2025-11-18 19:00:15
- 初始化云函数模块文档结构
- 定义后端API架构

## 模块职责

负责小程序的后端业务逻辑处理，包括用户管理、技师管理、订单处理、支付集成等核心功能。基于微信云开发平台构建。

## 目录结构

```
cloudfunctions/
├── user/                 # 用户管理云函数
├── technician/          # 技师管理云函数
├── order/              # 订单管理云函数
├── payment/            # 支付处理云函数
├── notification/       # 消息推送云函数
├── admin/              # 管理后台云函数
├── common/             # 公共工具函数
└── database/           # 数据库操作封装
```

## 核心云函数模块

### 用户管理 (user)
- **职责**: 用户注册、登录、信息管理、权限控制
- **主要功能**:
  - 微信授权登录
  - 用户信息CRUD
  - 地址管理
  - 用户等级和积分管理

### 技师管理 (technician)
- **职责**: 技师注册、认证、信息管理、服务管理
- **主要功能**:
  - 技师注册和审核
  - 资质认证管理
  - 服务项目和价格管理
  - 排班和可用时间管理
  - 评价和评分管理

### 订单管理 (order)
- **职责**: 预约创建、状态管理、订单查询、统计分析
- **主要功能**:
  - 预约订单创建
  - 订单状态流转
  - 订单查询和筛选
  - 订单统计和报表
  - 争议处理

### 支付处理 (payment)
- **职责**: 支付接口集成、退款处理、财务管理
- **主要功能**:
  - 微信支付集成
  - 支付回调处理
  - 退款申请和处理
  - 财务对账和报表

### 消息推送 (notification)
- **职责**: 消息通知、推送服务、提醒功能
- **主要功能**:
  - 模板消息推送
  - 订单状态提醒
  - 营销消息推送
  - 消息历史管理

### 管理后台 (admin)
- **职责**: 系统管理、数据统计、配置管理
- **主要功能**:
  - 用户和技师管理
  - 订单审核和处理
  - 系统配置管理
  - 数据统计和报表

## 数据库设计

### 集合结构

#### users 集合
```javascript
{
  _id: ObjectId,
  openid: String,
  unionid: String,
  nickName: String,
  avatarUrl: String,
  phone: String,
  gender: Number,        // 0-未知 1-男 2-女
  addresses: [{
    name: String,        // 收货人姓名
    phone: String,       // 收货人电话
    province: String,    // 省份
    city: String,        // 城市
    district: String,    // 区县
    address: String,     // 详细地址
    isDefault: Boolean,  // 是否默认地址
    location: {          // 地理位置
      latitude: Number,
      longitude: Number
    }
  }],
  level: String,         // 用户等级
  points: Number,        // 积分
  createTime: Date,
  updateTime: Date,
  status: String         // active, inactive, banned
}
```

#### technicians 集合
```javascript
{
  _id: ObjectId,
  userId: ObjectId,      // 关联用户ID
  name: String,
  avatar: String,
  phone: String,
  idCard: String,        // 身份证号
  certificates: [{       // 资质证书
    type: String,        // 证书类型
    url: String,         // 证书图片URL
    expireDate: Date,    // 过期时间
    status: String       // pending, approved, rejected
  }],
  specialties: [String], // 专业技能
  experience: Number,    // 从业年限(年)
  introduction: String,  // 个人介绍
  services: [{           // 提供的服务
    type: String,        // 服务类型
    name: String,        // 服务名称
    duration: Number,    // 服务时长(分钟)
    price: Number,       // 价格
    description: String  // 服务描述
  }],
  rating: Number,        // 平均评分
  orderCount: Number,    // 完成订单数
  availableTimes: [{     // 可用时间
    date: Date,
    timeSlots: [String]  // 时间段 ["09:00-12:00"]
  }],
  location: {            // 常驻位置
    latitude: Number,
    longitude: Number,
    address: String
  },
  serviceRadius: Number, // 服务范围(公里)
  status: String,        // pending, approved, rejected, active, inactive
  createTime: Date,
  updateTime: Date
}
```

#### orders 集合
```javascript
{
  _id: ObjectId,
  orderNo: String,       // 订单号
  userId: ObjectId,      // 用户ID
  technicianId: ObjectId,// 技师ID
  service: {
    type: String,        // 服务类型
    name: String,        // 服务名称
    duration: Number,    // 服务时长
    price: Number        // 服务价格
  },
  appointment: {
    date: Date,          // 预约日期
    timeSlot: String,    // 时间段
    address: {           // 服务地址
      name: String,
      phone: String,
      province: String,
      city: String,
      district: String,
      address: String,
      location: {
        latitude: Number,
        longitude: Number
      }
    }
  },
  totalAmount: Number,   // 总金额
  discountAmount: Number,// 优惠金额
  actualAmount: Number,  // 实付金额
  payment: {
    method: String,      // 支付方式
    transactionId: String,// 微信支付交易号
    payTime: Date        // 支付时间
  },
  status: String,        // pending, confirmed, in_service, completed, cancelled, refunded
  timeline: [{           // 订单时间轴
    status: String,
    time: Date,
    remark: String,
    operator: String     // 操作者
  }],
  review: {              // 评价
    rating: Number,      // 评分 1-5
    content: String,     // 评价内容
    images: [String],    // 评价图片
    createTime: Date
  },
  createTime: Date,
  updateTime: Date
}
```

## API接口设计

### 用户相关接口

#### POST /user/login
用户登录
```javascript
// 请求参数
{
  code: String,          // 微信登录code
  userInfo: {            // 用户信息(可选)
    nickName: String,
    avatarUrl: String,
    gender: Number
  }
}

// 响应数据
{
  code: 0,              // 0-成功 其他-失败
  message: String,
  data: {
    token: String,      // 用户token
    userInfo: User      // 用户信息
  }
}
```

#### GET /user/profile
获取用户信息
```javascript
// 响应数据
{
  code: 0,
  data: User
}
```

### 技师相关接口

#### GET /technician/list
获取技师列表
```javascript
// 请求参数
{
  page: Number,         // 页码
  pageSize: Number,     // 每页数量
  specialty: String,    // 专业技能筛选
  lat: Number,          // 纬度
  lng: Number,          // 经度
  radius: Number        // 搜索半径
}

// 响应数据
{
  code: 0,
  data: {
    list: [Technician], // 技师列表
    total: Number,      // 总数
    page: Number,       // 当前页
    pageSize: Number    // 每页数量
  }
}
```

### 订单相关接口

#### POST /order/create
创建预约订单
```javascript
// 请求参数
{
  technicianId: String,
  serviceType: String,
  appointmentDate: String,
  timeSlot: String,
  address: Address,
  remark: String
}

// 响应数据
{
  code: 0,
  data: {
    orderNo: String,    // 订单号
    orderId: String,    // 订单ID
    totalAmount: Number // 总金额
  }
}
```

## 公共工具函数

### 数据库操作封装 (database)
- **db.js**: 数据库连接和基础操作
- **collection.js**: 集合操作封装
- **transaction.js**: 事务处理
- **index.js**: 索引管理

### 通用工具 (common)
- **auth.js**: 权限验证中间件
- **response.js**: 统一响应格式
- **validator.js**: 数据验证工具
- **logger.js**: 日志记录工具
- **utils.js**: 通用工具函数

### 第三方服务集成
- **wechat.js**: 微信API封装
- **payment.js**: 微信支付封装
- **sms.js**: 短信服务封装
- **map.js**: 地图服务封装

## 错误处理

### 错误码定义
```javascript
const ERROR_CODES = {
  SUCCESS: 0,
  PARAM_ERROR: 1001,
  AUTH_FAILED: 1002,
  USER_NOT_FOUND: 2001,
  TECHNICIAN_NOT_FOUND: 3001,
  ORDER_NOT_FOUND: 4001,
  PAYMENT_FAILED: 5001,
  SYSTEM_ERROR: 9999
};
```

### 异常处理机制
- 全局异常捕获
- 错误日志记录
- 用户友好错误提示
- 开发环境详细错误信息

## 性能优化

### 数据库优化
- 合理设计索引
- 分页查询优化
- 数据缓存策略
- 连接池管理

### 云函数优化
- 冷启动优化
- 内存使用优化
- 并发控制
- 超时处理

## 安全防护

### 数据安全
- 敏感数据加密存储
- SQL注入防护
- XSS攻击防护
- CSRF防护

### 接口安全
- 身份认证
- 权限控制
- 请求频率限制
- 参数验证

## 监控与日志

### 系统监控
- 云函数执行监控
- 数据库性能监控
- 错误率监控
- 响应时间监控

### 日志管理
- 访问日志
- 错误日志
- 业务日志
- 审计日志

## 测试策略

### 单元测试
- 业务逻辑测试
- 数据操作测试
- 工具函数测试

### 集成测试
- API接口测试
- 数据库集成测试
- 第三方服务集成测试

### 压力测试
- 并发请求测试
- 数据库压力测试
- 云函数性能测试

## 部署与运维

### 部署策略
- 环境隔离（开发/测试/生产）
- 版本管理
- 回滚机制
- 灰度发布

### 运维监控
- 健康检查
- 性能监控
- 日志分析
- 告警机制

## 开发规范

### 代码规范
- ESLint配置
- 命名规范
- 注释规范
- 版本控制规范

### API设计规范
- RESTful风格
- 统一响应格式
- 错误处理规范
- 文档规范

## 常见问题 (FAQ)

### 云函数相关问题
- 冷启动优化
- 内存限制处理
- 超时问题解决
- 并发控制

### 数据库相关问题
- 连接数限制
- 查询优化
- 索引设计
- 事务处理

### 支付相关问题
- 支付回调处理
- 退款流程
- 对账处理
- 安全验证

## 相关文件清单

### 云函数文件 (待创建)
- `user/login/index.js`
- `user/profile/index.js`
- `technician/list/index.js`
- `order/create/index.js`
- `payment/notify/index.js`

### 公共文件 (待创建)
- `common/auth.js`
- `common/response.js`
- `database/db.js`
- `database/index.js`