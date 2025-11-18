// 订单处理服务
const cloud = require('wx-server-sdk');
const jwt = require('jsonwebtoken');

// 初始化云开发
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

// 获取数据库引用
const db = cloud.database();
const _ = db.command;

// JWT密钥
const JWT_SECRET = process.env.JWT_SECRET || 'tuinawxapp-secret-key';

// 订单状态枚举
const ORDER_STATUS = {
  PENDING: 'pending',        // 待确认
  CONFIRMED: 'confirmed',    // 已确认
  IN_PROGRESS: 'in_progress', // 进行中
  COMPLETED: 'completed',    // 已完成
  CANCELLED: 'cancelled',    // 已取消
  REFUNDED: 'refunded'       // 已退款
};

// 支付状态枚举
const PAYMENT_STATUS = {
  UNPAID: 'unpaid',         // 未支付
  PAID: 'paid',             // 已支付
  REFUNDED: 'refunded',     // 已退款
  PARTIAL_REFUND: 'partial_refund' // 部分退款
};

// 云函数入口函数
exports.main = async (event, context) => {
  console.log('订单服务调用:', event.action, event);

  try {
    const { action } = event;

    // 路由到具体的处理函数
    switch (action) {
      case 'create':
        return await createOrder(event);
      case 'confirm':
        return await confirmOrder(event);
      case 'start':
        return await startOrder(event);
      case 'complete':
        return await completeOrder(event);
      case 'cancel':
        return await cancelOrder(event);
      case 'getList':
        return await getOrderList(event);
      case 'getDetail':
        return await getOrderDetail(event);
      case 'update':
        return await updateOrder(event);
      case 'pay':
        return await payOrder(event);
      case 'refund':
        return await refundOrder(event);
      case 'comment':
        return await commentOrder(event);
      case 'reorder':
        return await reorderOrder(event);
      default:
        return {
          code: 400,
          message: '不支持的操作',
          data: null
        };
    }
  } catch (error) {
    console.error('订单服务错误:', error);
    return {
      code: 500,
      message: '服务器内部错误',
      data: null,
      error: error.message
    };
  }
};

/**
 * 创建订单
 */
async function createOrder(event) {
  const {
    technicianId,
    serviceId,
    appointmentTime,
    address,
    note,
    couponId,
    urgentFee
  } = event;

  if (!technicianId || !serviceId || !appointmentTime || !address) {
    return {
      code: 400,
      message: '缺少必要参数',
      data: null
    };
  }

  try {
    const userId = await getUserIdFromToken(event.token);

    if (!userId) {
      return {
        code: 401,
        message: '未授权',
        data: null
      };
    }

    // 验证技师信息
    const technician = await db.collection('technicians')
      .doc(technicianId)
      .get();

    if (!technician.data) {
      return {
        code: 404,
        message: '技师不存在',
        data: null
      };
    }

    // 验证服务信息
    const service = await db.collection('services')
      .doc(serviceId)
      .get();

    if (!service.data) {
      return {
        code: 404,
        message: '服务项目不存在',
        data: null
      };
    }

    // 验证预约时间（不能是过去时间）
    const appointmentDate = new Date(appointmentTime);
    const now = new Date();

    if (appointmentDate <= now) {
      return {
        code: 400,
        message: '预约时间必须是未来时间',
        data: null
      };
    }

    // 检查技师在该时间段是否已有预约
    const conflictOrder = await checkTechnicianAvailability(
      technicianId,
      appointmentTime,
      service.data.duration
    );

    if (conflictOrder) {
      return {
        code: 409,
        message: '该时间段技师已有预约',
        data: null
      };
    }

    // 计算订单价格
    const basePrice = service.data.price;
    const distanceFee = calculateDistanceFee(technician.data, address);
    const couponDiscount = await getCouponDiscount(couponId, userId, basePrice);
    const totalPrice = basePrice + (urgentFee || 0) + distanceFee - couponDiscount;

    // 创建订单
    const orderData = {
      orderNo: generateOrderNo(),
      userId: userId,
      technicianId: technicianId,
      serviceId: serviceId,
      appointmentTime: appointmentTime,
      estimatedDuration: service.data.duration,
      address: address,
      note: note || '',
      couponId: couponId || null,
      basePrice: basePrice,
      urgentFee: urgentFee || 0,
      distanceFee: distanceFee,
      couponDiscount: couponDiscount,
      totalPrice: totalPrice,
      status: ORDER_STATUS.PENDING,
      paymentStatus: PAYMENT_STATUS.UNPAID,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('orders').add({
      data: orderData
    });

    orderData._id = result._id;

    // 如果使用了优惠券，标记为已使用
    if (couponId) {
      await markCouponAsUsed(couponId, userId, result._id);
    }

    // 发送通知给技师
    await sendNotificationToTechnician(technicianId, {
      type: 'new_order',
      orderId: result._id,
      userId: userId
    });

    return {
      code: 200,
      message: '订单创建成功',
      data: orderData
    };
  } catch (error) {
    console.error('创建订单错误:', error);
    return {
      code: 500,
      message: '创建订单失败',
      data: null
    };
  }
}

/**
 * 确认订单
 */
async function confirmOrder(event) {
  const { orderId } = event;

  if (!orderId) {
    return {
      code: 400,
      message: '缺少订单ID',
      data: null
    };
  }

  try {
    const technicianId = await getTechnicianIdFromToken(event.token);

    if (!technicianId) {
      return {
        code: 401,
        message: '未授权或不是技师账号',
        data: null
      };
    }

    const orderRef = db.collection('orders').doc(orderId);
    const order = await orderRef.get();

    if (!order.data) {
      return {
        code: 404,
        message: '订单不存在',
        data: null
      };
    }

    const orderData = order.data;

    // 验证订单是否属于该技师
    if (orderData.technicianId !== technicianId) {
      return {
        code: 403,
        message: '无权操作此订单',
        data: null
      };
    }

    // 验证订单状态
    if (orderData.status !== ORDER_STATUS.PENDING) {
      return {
        code: 400,
        message: '订单状态不允许确认',
        data: null
      };
    }

    // 更新订单状态
    await orderRef.update({
      data: {
        status: ORDER_STATUS.CONFIRMED,
        confirmedAt: new Date(),
        updatedAt: new Date()
      }
    });

    // 发送通知给用户
    await sendNotificationToUser(orderData.userId, {
      type: 'order_confirmed',
      orderId: orderId,
      technicianId: technicianId
    });

    return {
      code: 200,
      message: '订单确认成功',
      data: null
    };
  } catch (error) {
    console.error('确认订单错误:', error);
    return {
      code: 500,
      message: '确认订单失败',
      data: null
    };
  }
}

/**
 * 开始服务
 */
async function startOrder(event) {
  const { orderId, actualStartTime } = event;

  if (!orderId) {
    return {
      code: 400,
      message: '缺少订单ID',
      data: null
    };
  }

  try {
    const technicianId = await getTechnicianIdFromToken(event.token);

    if (!technicianId) {
      return {
        code: 401,
        message: '未授权或不是技师账号',
        data: null
      };
    }

    const orderRef = db.collection('orders').doc(orderId);
    const order = await orderRef.get();

    if (!order.data) {
      return {
        code: 404,
        message: '订单不存在',
        data: null
      };
    }

    const orderData = order.data;

    // 验证订单是否属于该技师
    if (orderData.technicianId !== technicianId) {
      return {
        code: 403,
        message: '无权操作此订单',
        data: null
      };
    }

    // 验证订单状态
    if (orderData.status !== ORDER_STATUS.CONFIRMED) {
      return {
        code: 400,
        message: '订单状态不允许开始服务',
        data: null
      };
    }

    // 更新订单状态
    await orderRef.update({
      data: {
        status: ORDER_STATUS.IN_PROGRESS,
        actualStartTime: actualStartTime || new Date(),
        startedAt: new Date(),
        updatedAt: new Date()
      }
    });

    // 更新技师状态为忙碌
    await db.collection('technicians').doc(technicianId).update({
      data: {
        status: 'busy',
        currentOrderId: orderId,
        updatedAt: new Date()
      }
    });

    // 发送通知给用户
    await sendNotificationToUser(orderData.userId, {
      type: 'service_started',
      orderId: orderId,
      technicianId: technicianId
    });

    return {
      code: 200,
      message: '服务已开始',
      data: null
    };
  } catch (error) {
    console.error('开始服务错误:', error);
    return {
      code: 500,
      message: '开始服务失败',
      data: null
    };
  }
}

/**
 * 完成订单
 */
async function completeOrder(event) {
  const { orderId, actualEndTime, servicePhotos, technicianNote } = event;

  if (!orderId) {
    return {
      code: 400,
      message: '缺少订单ID',
      data: null
    };
  }

  try {
    const technicianId = await getTechnicianIdFromToken(event.token);

    if (!technicianId) {
      return {
        code: 401,
        message: '未授权或不是技师账号',
        data: null
      };
    }

    const orderRef = db.collection('orders').doc(orderId);
    const order = await orderRef.get();

    if (!order.data) {
      return {
        code: 404,
        message: '订单不存在',
        data: null
      };
    }

    const orderData = order.data;

    // 验证订单是否属于该技师
    if (orderData.technicianId !== technicianId) {
      return {
        code: 403,
        message: '无权操作此订单',
        data: null
      };
    }

    // 验证订单状态
    if (orderData.status !== ORDER_STATUS.IN_PROGRESS) {
      return {
        code: 400,
        message: '订单状态不允许完成',
        data: null
      };
    }

    // 更新订单状态
    await orderRef.update({
      data: {
        status: ORDER_STATUS.COMPLETED,
        actualEndTime: actualEndTime || new Date(),
        completedAt: new Date(),
        servicePhotos: servicePhotos || [],
        technicianNote: technicianNote || '',
        updatedAt: new Date()
      }
    });

    // 更新技师状态
    await db.collection('technicians').doc(technicianId).update({
      data: {
        status: 'available',
        currentOrderId: null,
        orderCount: _.inc(1),
        updatedAt: new Date()
      }
    });

    // 发送通知给用户
    await sendNotificationToUser(orderData.userId, {
      type: 'service_completed',
      orderId: orderId,
      technicianId: technicianId
    });

    return {
      code: 200,
      message: '订单完成',
      data: null
    };
  } catch (error) {
    console.error('完成订单错误:', error);
    return {
      code: 500,
      message: '完成订单失败',
      data: null
    };
  }
}

/**
 * 获取订单列表
 */
async function getOrderList(event) {
  const {
    status,
    page = 1,
    pageSize = 10,
    startTime,
    endTime
  } = event;

  try {
    const userId = await getUserIdFromToken(event.token);

    if (!userId) {
      return {
        code: 401,
        message: '未授权',
        data: null
      };
    }

    // 构建查询条件
    let query = {
      userId: userId
    };

    if (status) {
      query.status = status;
    }

    if (startTime || endTime) {
      query.createdAt = {};
      if (startTime) {
        query.createdAt.$gte = new Date(startTime);
      }
      if (endTime) {
        query.createdAt.$lte = new Date(endTime);
      }
    }

    // 查询订单
    const orders = await db.collection('orders')
      .where(query)
      .orderBy('createdAt', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get();

    // 获取总数
    const countResult = await db.collection('orders')
      .where(query)
      .count();

    // 补充技师和服务信息
    const enrichedOrders = await Promise.all(
      orders.data.map(async (order) => {
        const [technician, service] = await Promise.all([
          db.collection('technicians').doc(order.technicianId).get(),
          db.collection('services').doc(order.serviceId).get()
        ]);

        return {
          ...order,
          technician: technician.data,
          service: service.data
        };
      })
    );

    return {
      code: 200,
      message: '获取成功',
      data: {
        list: enrichedOrders,
        total: countResult.total,
        page: page,
        pageSize: pageSize
      }
    };
  } catch (error) {
    console.error('获取订单列表错误:', error);
    return {
      code: 500,
      message: '获取失败',
      data: null
    };
  }
}

/**
 * 取消订单
 */
async function cancelOrder(event) {
  const { orderId, reason } = event;

  if (!orderId) {
    return {
      code: 400,
      message: '缺少订单ID',
      data: null
    };
  }

  try {
    const userId = await getUserIdFromToken(event.token);

    if (!userId) {
      return {
        code: 401,
        message: '未授权',
        data: null
      };
    }

    const orderRef = db.collection('orders').doc(orderId);
    const order = await orderRef.get();

    if (!order.data) {
      return {
        code: 404,
        message: '订单不存在',
        data: null
      };
    }

    const orderData = order.data;

    // 验证订单是否属于该用户
    if (orderData.userId !== userId) {
      return {
        code: 403,
        message: '无权操作此订单',
        data: null
      };
    }

    // 验证订单状态
    if (![ORDER_STATUS.PENDING, ORDER_STATUS.CONFIRMED].includes(orderData.status)) {
      return {
        code: 400,
        message: '当前订单状态不允许取消',
        data: null
      };
    }

    // 更新订单状态
    await orderRef.update({
      data: {
        status: ORDER_STATUS.CANCELLED,
        cancelReason: reason || '',
        cancelledAt: new Date(),
        updatedAt: new Date()
      }
    });

    // 如果已支付，触发退款
    if (orderData.paymentStatus === PAYMENT_STATUS.PAID) {
      await processRefund(orderId, orderData.totalPrice, '用户取消订单');
    }

    // 发送通知给技师
    await sendNotificationToTechnician(orderData.technicianId, {
      type: 'order_cancelled',
      orderId: orderId,
      userId: userId
    });

    return {
      code: 200,
      message: '订单已取消',
      data: null
    };
  } catch (error) {
    console.error('取消订单错误:', error);
    return {
      code: 500,
      message: '取消订单失败',
      data: null
    };
  }
}

/**
 * 订单评价
 */
async function commentOrder(event) {
  const { orderId, rating, content, tags } = event;

  if (!orderId || !rating) {
    return {
      code: 400,
      message: '缺少订单ID或评分',
      data: null
    };
  }

  try {
    const userId = await getUserIdFromToken(event.token);

    if (!userId) {
      return {
        code: 401,
        message: '未授权',
        data: null
      };
    }

    const orderRef = db.collection('orders').doc(orderId);
    const order = await orderRef.get();

    if (!order.data) {
      return {
        code: 404,
        message: '订单不存在',
        data: null
      };
    }

    const orderData = order.data;

    // 验证订单是否属于该用户
    if (orderData.userId !== userId) {
      return {
        code: 403,
        message: '无权操作此订单',
        data: null
      };
    }

    // 验证订单状态
    if (orderData.status !== ORDER_STATUS.COMPLETED) {
      return {
        code: 400,
        message: '只有完成的订单才能评价',
        data: null
      };
    }

    // 检查是否已评价
    if (orderData.commentId) {
      return {
        code: 400,
        message: '订单已评价',
        data: null
      };
    }

    // 创建评价
    const commentData = {
      orderId: orderId,
      userId: userId,
      technicianId: orderData.technicianId,
      rating: rating,
      content: content || '',
      tags: tags || [],
      createdAt: new Date()
    };

    const commentResult = await db.collection('order_comments').add({
      data: commentData
    });

    // 更新订单
    await orderRef.update({
      data: {
        commentId: commentResult._id,
        updatedAt: new Date()
      }
    });

    // 更新技师评分
    await updateTechnicianRating(orderData.technicianId);

    return {
      code: 200,
      message: '评价成功',
      data: commentData
    };
  } catch (error) {
    console.error('订单评价错误:', error);
    return {
      code: 500,
      message: '评价失败',
      data: null
    };
  }
}

/**
 * 生成订单号
 */
function generateOrderNo() {
  const now = new Date();
  const dateStr = now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, '0') +
    now.getDate().toString().padStart(2, '0');
  const timeStr = now.getTime().toString().slice(-6);
  const randomStr = Math.random().toString().slice(-4);
  return `TU${dateStr}${timeStr}${randomStr}`;
}

/**
 * 检查技师时间可用性
 */
async function checkTechnicianAvailability(technicianId, appointmentTime, duration) {
  const startTime = new Date(appointmentTime);
  const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

  const conflictOrders = await db.collection('orders')
    .where({
      technicianId: technicianId,
      status: _.in([ORDER_STATUS.CONFIRMED, ORDER_STATUS.IN_PROGRESS]),
      appointmentTime: _.and([
        _.lt(endTime),
        _.gt(new Date(startTime.getTime() - 60 * 60 * 1000)) // 预留1小时缓冲时间
      ])
    })
    .get();

  return conflictOrders.data.length > 0;
}

/**
 * 计算距离费用
 */
function calculateDistanceFee(technician, address) {
  // 这里应该根据实际距离计算费用
  // 简化实现，返回固定值
  return 0;
}

/**
 * 获取优惠券折扣金额
 */
async function getCouponDiscount(couponId, userId, basePrice) {
  if (!couponId) return 0;

  try {
    const coupon = await db.collection('user_coupons')
      .where({
        _id: couponId,
        userId: userId,
        used: false
      })
      .get();

    if (coupon.data.length === 0) {
      return 0;
    }

    const couponData = coupon.data[0];
    const now = new Date();

    // 检查优惠券是否过期
    if (new Date(couponData.expireTime) <= now) {
      return 0;
    }

    // 检查最低消费门槛
    if (basePrice < couponData.minAmount) {
      return 0;
    }

    return Math.min(couponData.discountAmount, basePrice);
  } catch (error) {
    console.error('获取优惠券折扣失败:', error);
    return 0;
  }
}

/**
 * 标记优惠券为已使用
 */
async function markCouponAsUsed(couponId, userId, orderId) {
  try {
    await db.collection('user_coupons').doc(couponId).update({
      data: {
        used: true,
        usedAt: new Date(),
        orderId: orderId
      }
    });
  } catch (error) {
    console.error('标记优惠券失败:', error);
  }
}

/**
 * 发送通知给技师
 */
async function sendNotificationToTechnician(technicianId, data) {
  try {
    await db.collection('notifications').add({
      data: {
        recipientId: technicianId,
        recipientType: 'technician',
        type: data.type,
        content: JSON.stringify(data),
        read: false,
        createdAt: new Date()
      }
    });
  } catch (error) {
    console.error('发送技师通知失败:', error);
  }
}

/**
 * 发送通知给用户
 */
async function sendNotificationToUser(userId, data) {
  try {
    await db.collection('notifications').add({
      data: {
        recipientId: userId,
        recipientType: 'user',
        type: data.type,
        content: JSON.stringify(data),
        read: false,
        createdAt: new Date()
      }
    });
  } catch (error) {
    console.error('发送用户通知失败:', error);
  }
}

/**
 * 从token获取用户ID
 */
async function getUserIdFromToken(token) {
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded.userId;
  } catch (error) {
    console.error('Token验证失败:', error);
    return null;
  }
}

/**
 * 从token获取技师ID
 */
async function getTechnicianIdFromToken(token) {
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded.technicianId;
  } catch (error) {
    console.error('Token验证失败:', error);
    return null;
  }
}

/**
 * 处理退款
 */
async function processRefund(orderId, amount, reason) {
  try {
    await db.collection('refunds').add({
      data: {
        orderId: orderId,
        amount: amount,
        reason: reason,
        status: 'processing',
        createdAt: new Date()
      }
    });

    // 这里应该调用支付平台的退款接口
    // 简化实现，直接标记为退款成功
    await db.collection('orders').doc(orderId).update({
      data: {
        paymentStatus: PAYMENT_STATUS.REFUNDED,
        refundedAt: new Date(),
        updatedAt: new Date()
      }
    });
  } catch (error) {
    console.error('处理退款失败:', error);
  }
}

/**
 * 更新技师评分
 */
async function updateTechnicianRating(technicianId) {
  try {
    const comments = await db.collection('order_comments')
      .where({
        technicianId: technicianId
      })
      .get();

    if (comments.data.length === 0) return;

    const totalRating = comments.data.reduce((sum, comment) => sum + comment.rating, 0);
    const averageRating = totalRating / comments.data.length;

    await db.collection('technicians').doc(technicianId).update({
      data: {
        rating: averageRating,
        commentCount: comments.data.length,
        updatedAt: new Date()
      }
    });
  } catch (error) {
    console.error('更新技师评分失败:', error);
  }
}