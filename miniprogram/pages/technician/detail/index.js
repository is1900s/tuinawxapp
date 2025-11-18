// 技师详情页面
const app = getApp();

Page({
  data: {
    // 技师信息
    technician: null,
    technicianId: '',

    // 页面状态
    loading: true,
    error: false,

    // 服务项目
    services: [],
    selectedService: null,

    // 评价信息
    reviews: [],
    reviewStats: {
      total: 0,
      averageRating: 0,
      ratingDistribution: []
    },

    // 时间选择
    availableTimes: [],
    selectedDate: '',
    selectedTime: '',

    // 地址信息
    selectedAddress: null,
    addressList: [],

    // 价格计算
    servicePrice: 0,
    duration: 0,
    totalPrice: 0,
    discountPrice: 0,

    // UI状态
    showTimePicker: false,
    showAddressPicker: false,
    showServicePicker: false,
    showCouponPicker: false,

    // 优惠券
    availableCoupons: [],
    selectedCoupon: null,

    // 预约表单
    orderForm: {
      serviceId: '',
      appointmentDate: '',
      appointmentTime: '',
      addressId: '',
      couponId: '',
      note: ''
    },

    // 滚动位置
    scrollTop: 0,
    imageCurrent: 0,

    // 收藏状态
    isCollected: false,
    collectLoading: false
  },

  onLoad(options) {
    const technicianId = options.id;
    if (!technicianId) {
      wx.showToast({
        title: '技师信息错误',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }

    this.setData({ technicianId });
    this.initPage();
  },

  onShow() {
    // 如果有选中的地址，更新地址信息
    const selectedAddress = wx.getStorageSync('selected_address');
    if (selectedAddress) {
      this.setData({ selectedAddress });
      wx.removeStorageSync('selected_address');
      this.calculatePrice();
    }
  },

  onShareAppMessage() {
    const technician = this.data.technician;
    return {
      title: `${technician?.name || '专业技师'} - 专业推拿服务`,
      path: `/pages/technician/detail/index?id=${this.data.technicianId}`,
      imageUrl: technician?.avatar || '/images/share-technician.jpg'
    };
  },

  onPageScroll(e) {
    this.setData({ scrollTop: e.scrollTop });
  },

  // 初始化页面
  async initPage() {
    try {
      wx.showLoading({ title: '加载中...' });

      // 并行加载所有数据
      await Promise.all([
        this.loadTechnicianDetail(),
        this.loadTechnicianServices(),
        this.loadTechnicianReviews(),
        this.loadAvailableTimes(),
        this.loadAddressList(),
        this.loadAvailableCoupons(),
        this.checkCollectStatus()
      ]);

    } catch (error) {
      console.error('页面初始化失败:', error);
      this.setData({ error: true });
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
      this.setData({ loading: false });
    }
  },

  // 加载技师详情
  async loadTechnicianDetail() {
    const result = await wx.cloud.callFunction({
      name: 'technician',
      data: {
        action: 'detail',
        technicianId: this.data.technicianId
      }
    });

    if (result.result.code === 0) {
      const technician = result.result.data;
      this.setData({ technician });

      // 设置页面标题
      wx.setNavigationBarTitle({
        title: technician.name
      });
    } else {
      throw new Error(result.result.message);
    }
  },

  // 加载技师服务项目
  async loadTechnicianServices() {
    const result = await wx.cloud.callFunction({
      name: 'technician',
      data: {
        action: 'services',
        technicianId: this.data.technicianId
      }
    });

    if (result.result.code === 0) {
      const services = result.result.data;
      this.setData({ services });

      // 默认选择第一个服务
      if (services.length > 0) {
        this.selectService(services[0]);
      }
    }
  },

  // 加载技师评价
  async loadTechnicianReviews(page = 1) {
    const result = await wx.cloud.callFunction({
      name: 'technician',
      data: {
        action: 'reviews',
        technicianId: this.data.technicianId,
        page,
        pageSize: 10
      }
    });

    if (result.result.code === 0) {
      const { reviews, stats } = result.result.data;

      this.setData({
        reviews: page === 1 ? reviews : [...this.data.reviews, ...reviews],
        reviewStats: stats
      });
    }
  },

  // 加载可用时间
  async loadAvailableTimes() {
    const today = new Date();
    const dates = [];
    const times = [];

    // 生成未来7天的日期
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      dates.push({
        date: this.formatDate(date),
        label: this.formatDateLabel(date),
        weekday: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()],
        isToday: i === 0,
        isTomorrow: i === 1
      });
    }

    // 生成时间选项
    for (let hour = 8; hour <= 22; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const label = `${hour < 12 ? '上午' : hour < 18 ? '下午' : '晚上'} ${time}`;

        times.push({
          time,
          label,
          available: true // 这里应该从后端获取实际可用状态
        });
      }
    }

    this.setData({
      availableDates: dates,
      availableTimes: times
    });

    // 默认选择今天
    if (dates.length > 0) {
      this.selectDate(dates[0]);
    }
  },

  // 加载地址列表
  async loadAddressList() {
    const result = await wx.cloud.callFunction({
      name: 'user',
      data: {
        action: 'addresses'
      }
    });

    if (result.result.code === 0) {
      const addresses = result.result.data || [];
      this.setData({ addressList: addresses });

      // 默认选择第一个地址
      if (addresses.length > 0) {
        const defaultAddress = addresses.find(addr => addr.isDefault) || addresses[0];
        this.setData({ selectedAddress: defaultAddress });
        this.setData({
          'orderForm.addressId': defaultAddress.id
        });
        this.calculatePrice();
      }
    }
  },

  // 加载可用优惠券
  async loadAvailableCoupons() {
    const result = await wx.cloud.callFunction({
      name: 'coupon',
      data: {
        action: 'available',
        technicianId: this.data.technicianId,
        servicePrice: this.data.servicePrice
      }
    });

    if (result.result.code === 0) {
      this.setData({ availableCoupons: result.result.data });
    }
  },

  // 检查收藏状态
  async checkCollectStatus() {
    const result = await wx.cloud.callFunction({
      name: 'user',
      data: {
        action: 'checkCollect',
        technicianId: this.data.technicianId
      }
    });

    if (result.result.code === 0) {
      this.setData({ isCollected: result.result.data.isCollected });
    }
  },

  // 选择服务
  selectService(service) {
    this.setData({
      selectedService: service,
      'orderForm.serviceId': service.id,
      servicePrice: service.price,
      duration: service.duration
    });

    this.calculatePrice();
    this.loadAvailableCoupons();
  },

  onServiceSelect(e) {
    const service = e.currentTarget.dataset.service;
    this.selectService(service);
  },

  // 选择日期
  selectDate(dateInfo) {
    this.setData({
      selectedDate: dateInfo.date,
      'orderForm.appointmentDate': dateInfo.date
    });
  },

  onDateSelect(e) {
    const date = e.currentTarget.dataset.date;
    this.selectDate(date);
  },

  // 选择时间
  selectTime(timeInfo) {
    this.setData({
      selectedTime: timeInfo.time,
      'orderForm.appointmentTime': timeInfo.time
    });
  },

  onTimeSelect(e) {
    const time = e.currentTarget.dataset.time;
    this.selectTime(time);
  },

  // 选择地址
  selectAddress(address) {
    this.setData({
      selectedAddress: address,
      'orderForm.addressId': address.id
    });
    this.calculatePrice();
  },

  onAddressSelect(e) {
    const address = e.currentTarget.dataset.address;
    this.selectAddress(address);
  },

  // 选择优惠券
  selectCoupon(coupon) {
    this.setData({
      selectedCoupon: coupon,
      'orderForm.couponId': coupon ? coupon.id : ''
    });
    this.calculatePrice();
  },

  onCouponSelect(e) {
    const coupon = e.currentTarget.dataset.coupon;
    this.selectCoupon(coupon);
  },

  // 计算价格
  calculatePrice() {
    let totalPrice = this.data.servicePrice;
    let discountPrice = 0;

    // 计算距离费用（如果有）
    if (this.data.selectedAddress && this.data.technician) {
      // 这里应该计算实际距离和费用
      // const distance = this.calculateDistance(this.data.selectedAddress, this.data.technician.location);
      // const distanceFee = this.calculateDistanceFee(distance);
      // totalPrice += distanceFee;
    }

    // 应用优惠券折扣
    if (this.data.selectedCoupon) {
      const coupon = this.data.selectedCoupon;
      if (coupon.type === 'discount') {
        discountPrice = Math.min(totalPrice * (coupon.discount / 100), coupon.maxDiscount || 999999);
      } else if (coupon.type === 'reduction') {
        discountPrice = Math.min(coupon.amount, totalPrice);
      }
    }

    this.setData({
      totalPrice,
      discountPrice
    });
  },

  // 收藏/取消收藏
  async toggleCollect() {
    if (this.data.collectLoading) return;

    try {
      this.setData({ collectLoading: true });

      const result = await wx.cloud.callFunction({
        name: 'user',
        data: {
          action: this.data.isCollected ? 'uncollect' : 'collect',
          technicianId: this.data.technicianId
        }
      });

      if (result.result.code === 0) {
        const newCollectStatus = !this.data.isCollected;
        this.setData({ isCollected: newCollectStatus });

        wx.showToast({
          title: newCollectStatus ? '收藏成功' : '取消收藏',
          icon: 'success'
        });
      } else {
        throw new Error(result.result.message);
      }

    } catch (error) {
      console.error('收藏操作失败:', error);
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      });
    } finally {
      this.setData({ collectLoading: false });
    }
  },

  onCollectTap() {
    this.toggleCollect();
  },

  // 拨打电话
  onPhoneCall() {
    if (!this.data.technician?.phone) return;

    wx.makePhoneCall({
      phoneNumber: this.data.technician.phone
    });
  },

  // 客服咨询
  onCustomerService() {
    wx.navigateTo({
      url: '/pages/help/index'
    });
  },

  // 立即预约
  onBookNow() {
    // 验证预约信息
    if (!this.validateOrderForm()) {
      return;
    }

    // 确认预约
    wx.showModal({
      title: '确认预约',
      content: this.getOrderConfirmContent(),
      confirmText: '确认预约',
      success: async (res) => {
        if (res.confirm) {
          await this.createOrder();
        }
      }
    });
  },

  // 验证预约表单
  validateOrderForm() {
    if (!this.data.selectedService) {
      wx.showToast({
        title: '请选择服务项目',
        icon: 'none'
      });
      return false;
    }

    if (!this.data.selectedDate) {
      wx.showToast({
        title: '请选择预约日期',
        icon: 'none'
      });
      return false;
    }

    if (!this.data.selectedTime) {
      wx.showToast({
        title: '请选择预约时间',
        icon: 'none'
      });
      return false;
    }

    if (!this.data.selectedAddress) {
      wx.showToast({
        title: '请选择服务地址',
        icon: 'none'
      });
      return false;
    }

    return true;
  },

  // 获取订单确认内容
  getOrderConfirmContent() {
    const service = this.data.selectedService;
    const technician = this.data.technician;
    const address = this.data.selectedAddress;

    let content = `技师：${technician?.name}\n`;
    content += `服务：${service?.name}\n`;
    content += `时长：${service?.duration}分钟\n`;
    content += `时间：${this.data.selectedDate} ${this.data.selectedTime}\n`;
    content += `地址：${address?.fullAddress}\n`;
    content += `费用：¥${this.data.totalPrice - this.data.discountPrice}`;

    if (this.data.discountPrice > 0) {
      content += ` (优惠¥${this.data.discountPrice})`;
    }

    return content;
  },

  // 创建订单
  async createOrder() {
    try {
      wx.showLoading({ title: '创建订单...' });

      const orderData = {
        technicianId: this.data.technicianId,
        serviceId: this.data.selectedService.id,
        appointmentDate: this.data.selectedDate,
        appointmentTime: this.data.selectedTime,
        addressId: this.data.selectedAddress.id,
        couponId: this.data.selectedCoupon?.id || '',
        note: this.data.orderForm.note,
        originalPrice: this.data.servicePrice,
        discountAmount: this.data.discountPrice,
        finalPrice: this.data.totalPrice - this.data.discountPrice
      };

      const result = await wx.cloud.callFunction({
        name: 'order',
        data: {
          action: 'create',
          orderData
        }
      });

      if (result.result.code === 0) {
        const order = result.result.data;

        wx.hideLoading();
        wx.showToast({
          title: '预约成功',
          icon: 'success'
        });

        // 跳转到订单详情页面
        setTimeout(() => {
          wx.redirectTo({
            url: `/pages/order/detail/index?id=${order.id}`
          });
        }, 1500);

      } else {
        throw new Error(result.result.message);
      }

    } catch (error) {
      console.error('创建订单失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: error.message || '预约失败',
        icon: 'none'
      });
    }
  },

  // 备注输入
  onNoteInput(e) {
    this.setData({
      'orderForm.note': e.detail.value
    });
  },

  // 图片预览
  onImagePreview(e) {
    const current = e.currentTarget.dataset.current;
    const urls = e.currentTarget.dataset.urls || [current];

    wx.previewImage({
      current,
      urls
    });
  },

  // 图片切换
  onImageChange(e) {
    this.setData({
      imageCurrent: e.detail.current
    });
  },

  // 加载更多评价
  onMoreReviews() {
    const nextPage = Math.floor(this.data.reviews.length / 10) + 1;
    this.loadTechnicianReviews(nextPage);
  },

  // UI交互方法
  onShowTimePicker() {
    this.setData({ showTimePicker: true });
  },

  onHideTimePicker() {
    this.setData({ showTimePicker: false });
  },

  onShowAddressPicker() {
    this.setData({ showAddressPicker: true });
  },

  onHideAddressPicker() {
    this.setData({ showAddressPicker: false });
  },

  onShowCouponPicker() {
    this.setData({ showCouponPicker: true });
  },

  onHideCouponPicker() {
    this.setData({ showCouponPicker: false });
  },

  onMaskTap() {
    this.setData({
      showTimePicker: false,
      showAddressPicker: false,
      showCouponPicker: false
    });
  },

  // 工具方法
  formatDate(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  formatDateLabel(date) {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}月${day}日`;
  },

  formatTime(time) {
    const [hour, minute] = time.split(':');
    return `${parseInt(hour)}:${minute}`;
  },

  // 计算距离（示例）
  calculateDistance(point1, point2) {
    // 这里应该使用真实的距离计算算法
    return Math.random() * 10; // 模拟距离
  },

  // 计算距离费用（示例）
  calculateDistanceFee(distance) {
    // 这里应该根据实际业务规则计算
    return distance > 5 ? 10 : 0; // 超过5公里收取10元交通费
  }
});