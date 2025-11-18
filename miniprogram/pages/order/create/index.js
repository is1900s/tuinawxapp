// 创建预约订单页面
const app = getApp();

Page({
  data: {
    // 页面状态
    currentStep: 1, // 1: 选择技师, 2: 选择服务, 3: 选择时间地址, 4: 确认订单
    loading: false,
    error: false,

    // 选中的技师
    selectedTechnician: null,

    // 选中的服务
    selectedService: null,

    // 时间地址
    selectedDate: '',
    selectedTime: '',
    selectedAddress: null,

    // 优惠券
    availableCoupons: [],
    selectedCoupon: null,

    // 价格信息
    servicePrice: 0,
    distanceFee: 0,
    totalPrice: 0,
    discountAmount: 0,
    finalPrice: 0,

    // 表单数据
    orderForm: {
      technicianId: '',
      serviceId: '',
      appointmentDate: '',
      appointmentTime: '',
      addressId: '',
      couponId: '',
      note: '',
      paymentMethod: 'wechat' // wechat, alipay
    },

    // 可用数据
    availableDates: [],
    availableTimes: [],
    addressList: [],

    // UI状态
    showDatepicker: false,
    showTimepicker: false,
    showAddressPicker: false,
    showCouponPicker: false,
    showPaymentPicker: false,

    // 来源信息
    source: '', // home, technician, service
    sourceData: null
  },

  onLoad(options) {
    // 处理页面跳转来源
    this.handlePageSource(options);

    // 初始化页面
    this.initPage();
  },

  onShow() {
    // 从地址选择页面返回时更新地址
    const selectedAddress = wx.getStorageSync('selected_address');
    if (selectedAddress) {
      this.setData({ selectedAddress });
      this.setData({
        'orderForm.addressId': selectedAddress.id
      });
      wx.removeStorageSync('selected_address');
      this.calculatePrice();
    }
  },

  onShareAppMessage() {
    return {
      title: '专业上门推拿服务预约',
      path: '/pages/order/create/index',
      imageUrl: '/images/share-order.jpg'
    };
  },

  // 处理页面来源
  handlePageSource(options) {
    let source = 'home';
    let sourceData = null;

    if (options.technicianId) {
      source = 'technician';
      sourceData = { technicianId: options.technicianId };
    } else if (options.serviceId) {
      source = 'service';
      sourceData = { serviceId: options.serviceId };
    }

    this.setData({ source, sourceData });
  },

  // 初始化页面
  async initPage() {
    try {
      wx.showLoading({ title: '加载中...' });

      // 根据来源初始化数据
      await this.initDataBySource();

      // 加载通用数据
      await Promise.all([
        this.loadAvailableDates(),
        this.loadAvailableTimes(),
        this.loadAddressList()
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
    }
  },

  // 根据来源初始化数据
  async initDataBySource() {
    const { source, sourceData } = this.data;

    switch (source) {
      case 'technician':
        await this.loadTechnicianInfo(sourceData.technicianId);
        this.setData({ currentStep: 2 }); // 跳到选择服务步骤
        break;
      case 'service':
        await this.loadServiceInfo(sourceData.serviceId);
        this.setData({ currentStep: 1 }); // 从选择技师开始
        break;
      default:
        // 默认从选择技师开始
        this.setData({ currentStep: 1 });
    }
  },

  // 加载技师信息
  async loadTechnicianInfo(technicianId) {
    const result = await wx.cloud.callFunction({
      name: 'technician',
      data: {
        action: 'detail',
        technicianId
      }
    });

    if (result.result.code === 0) {
      const technician = result.result.data;
      this.setData({
        selectedTechnician: technician,
        'orderForm.technicianId': technicianId
      });

      // 加载技师的服务项目
      await this.loadTechnicianServices(technicianId);
    } else {
      throw new Error(result.result.message);
    }
  },

  // 加载服务信息
  async loadServiceInfo(serviceId) {
    // 这里可以加载具体的服务信息
    console.log('加载服务信息:', serviceId);
  },

  // 加载技师服务项目
  async loadTechnicianServices(technicianId) {
    const result = await wx.cloud.callFunction({
      name: 'technician',
      data: {
        action: 'services',
        technicianId
      }
    });

    if (result.result.code === 0) {
      const services = result.result.data;
      // 可以在这里处理服务数据
    }
  },

  // 加载可用日期
  async loadAvailableDates() {
    const today = new Date();
    const dates = [];

    // 生成未来7天的日期
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      dates.push({
        date: this.formatDate(date),
        label: this.formatDateLabel(date),
        weekday: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()],
        isToday: i === 0,
        isTomorrow: i === 1,
        available: true // 这里应该从后端获取实际可用状态
      });
    }

    this.setData({ availableDates: dates });
  },

  // 加载可用时间
  async loadAvailableTimes() {
    const times = [];

    // 生成时间选项（8:00 - 22:00，每30分钟）
    for (let hour = 8; hour <= 22; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        let label = '';

        if (hour < 12) {
          label = `上午 ${time}`;
        } else if (hour < 18) {
          label = `下午 ${time}`;
        } else {
          label = `晚上 ${time}`;
        }

        times.push({
          time,
          label,
          available: true // 这里应该从后端获取实际可用状态
        });
      }
    }

    this.setData({ availableTimes: times });
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
      }
    }
  },

  // 技师选择相关
  onTechnicianSelect() {
    wx.navigateTo({
      url: '/pages/technician/list/index?mode=select'
    });
  },

  // 服务选择相关
  onServiceSelect() {
    if (!this.data.selectedTechnician) {
      wx.showToast({
        title: '请先选择技师',
        icon: 'none'
      });
      return;
    }

    // 显示服务选择弹窗
    this.setData({ showServicePicker: true });
  },

  onServiceTap(e) {
    const service = e.currentTarget.dataset.service;
    this.selectService(service);
  },

  selectService(service) {
    this.setData({
      selectedService: service,
      'orderForm.serviceId': service.id,
      servicePrice: service.price
    });

    this.calculatePrice();
    this.loadAvailableCoupons();
  },

  // 日期选择相关
  onDateSelect() {
    this.setData({ showDatepicker: true });
  },

  onDateTap(e) {
    const date = e.currentTarget.dataset.date;
    this.selectDate(date);
  },

  selectDate(dateInfo) {
    this.setData({
      selectedDate: dateInfo.date,
      'orderForm.appointmentDate': dateInfo.date,
      showDatepicker: false
    });
  },

  // 时间选择相关
  onTimeSelect() {
    this.setData({ showTimepicker: true });
  },

  onTimeTap(e) {
    const time = e.currentTarget.dataset.time;
    this.selectTime(time);
  },

  selectTime(timeInfo) {
    this.setData({
      selectedTime: timeInfo.time,
      'orderForm.appointmentTime': timeInfo.time,
      showTimepicker: false
    });
  },

  // 地址选择相关
  onAddressSelect() {
    wx.navigateTo({
      url: '/pages/user/address/index?mode=select'
    });
  },

  onAddressTap(e) {
    const address = e.currentTarget.dataset.address;
    this.selectAddress(address);
  },

  selectAddress(address) {
    this.setData({
      selectedAddress: address,
      'orderForm.addressId': address.id
    });
    this.calculatePrice();
  },

  // 新增地址
  onAddAddress() {
    wx.navigateTo({
      url: '/pages/user/address/index?mode=add'
    });
  },

  // 优惠券选择相关
  onCouponSelect() {
    if (this.data.availableCoupons.length === 0) {
      wx.showToast({
        title: '暂无可用优惠券',
        icon: 'none'
      });
      return;
    }

    this.setData({ showCouponPicker: true });
  },

  onCouponTap(e) {
    const coupon = e.currentTarget.dataset.coupon;
    this.selectCoupon(coupon);
  },

  selectCoupon(coupon) {
    this.setData({
      selectedCoupon: coupon,
      'orderForm.couponId': coupon ? coupon.id : '',
      showCouponPicker: false
    });
    this.calculatePrice();
  },

  // 加载可用优惠券
  async loadAvailableCoupons() {
    if (!this.data.selectedService) return;

    try {
      const result = await wx.cloud.callFunction({
        name: 'coupon',
        data: {
          action: 'available',
          technicianId: this.data.selectedTechnician?.id,
          servicePrice: this.data.servicePrice
        }
      });

      if (result.result.code === 0) {
        this.setData({ availableCoupons: result.result.data });
      }
    } catch (error) {
      console.error('加载优惠券失败:', error);
    }
  },

  // 支付方式选择
  onPaymentSelect() {
    this.setData({ showPaymentPicker: true });
  },

  onPaymentTap(e) {
    const method = e.currentTarget.dataset.method;
    this.setData({
      'orderForm.paymentMethod': method,
      showPaymentPicker: false
    });
  },

  // 备注输入
  onNoteInput(e) {
    this.setData({
      'orderForm.note': e.detail.value
    });
  },

  // 步骤控制
  onNextStep() {
    if (!this.validateCurrentStep()) {
      return;
    }

    const nextStep = this.data.currentStep + 1;
    if (nextStep <= 4) {
      this.setData({ currentStep: nextStep });
    }
  },

  onPrevStep() {
    const prevStep = this.data.currentStep - 1;
    if (prevStep >= 1) {
      this.setData({ currentStep: prevStep });
    }
  },

  onStepTap(e) {
    const step = parseInt(e.currentTarget.dataset.step);
    if (step < this.data.currentStep) {
      this.setData({ currentStep: step });
    }
  },

  // 验证当前步骤
  validateCurrentStep() {
    switch (this.data.currentStep) {
      case 1:
        if (!this.data.selectedTechnician) {
          wx.showToast({
            title: '请选择技师',
            icon: 'none'
          });
          return false;
        }
        break;
      case 2:
        if (!this.data.selectedService) {
          wx.showToast({
            title: '请选择服务项目',
            icon: 'none'
          });
          return false;
        }
        break;
      case 3:
        if (!this.data.selectedDate || !this.data.selectedTime) {
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
        break;
    }
    return true;
  },

  // 计算价格
  calculatePrice() {
    let totalPrice = this.data.servicePrice;
    let distanceFee = 0;
    let discountAmount = 0;

    // 计算距离费用
    if (this.data.selectedTechnician && this.data.selectedAddress) {
      // 这里应该计算实际距离和费用
      distanceFee = this.calculateDistanceFee();
      totalPrice += distanceFee;
    }

    // 计算优惠券折扣
    if (this.data.selectedCoupon) {
      const coupon = this.data.selectedCoupon;
      if (coupon.type === 'discount') {
        discountAmount = Math.min(totalPrice * (coupon.discount / 100), coupon.maxDiscount || 999999);
      } else if (coupon.type === 'reduction') {
        discountAmount = Math.min(coupon.amount, totalPrice);
      }
    }

    const finalPrice = Math.max(totalPrice - discountAmount, 0);

    this.setData({
      totalPrice,
      distanceFee,
      discountAmount,
      finalPrice
    });
  },

  // 计算距离费用
  calculateDistanceFee() {
    // 这里应该根据实际业务规则计算
    return 0; // 暂时不计算距离费用
  },

  // 提交订单
  async onSubmitOrder() {
    if (!this.validateOrderForm()) {
      return;
    }

    try {
      wx.showLoading({ title: '创建订单...' });

      const orderData = {
        technicianId: this.data.selectedTechnician.id,
        serviceId: this.data.selectedService.id,
        appointmentDate: this.data.selectedDate,
        appointmentTime: this.data.selectedTime,
        addressId: this.data.selectedAddress.id,
        couponId: this.data.selectedCoupon?.id || '',
        note: this.data.orderForm.note,
        paymentMethod: this.data.orderForm.paymentMethod,
        originalPrice: this.data.servicePrice,
        distanceFee: this.data.distanceFee,
        discountAmount: this.data.discountAmount,
        finalPrice: this.data.finalPrice
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

        // 如果需要支付，跳转到支付页面
        if (order.needPayment) {
          this.processPayment(order);
        } else {
          // 无需支付，直接跳转到订单详情
          this.navigateToOrderDetail(order.id);
        }

      } else {
        throw new Error(result.result.message);
      }

    } catch (error) {
      console.error('创建订单失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: error.message || '创建订单失败',
        icon: 'none'
      });
    }
  },

  // 验证订单表单
  validateOrderForm() {
    if (!this.data.selectedTechnician) {
      wx.showToast({
        title: '请选择技师',
        icon: 'none'
      });
      return false;
    }

    if (!this.data.selectedService) {
      wx.showToast({
        title: '请选择服务项目',
        icon: 'none'
      });
      return false;
    }

    if (!this.data.selectedDate || !this.data.selectedTime) {
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

  // 处理支付
  processPayment(order) {
    // 这里应该处理支付逻辑
    console.log('处理支付:', order);

    // 暂时直接跳转到订单详情
    this.navigateToOrderDetail(order.id);
  },

  // 跳转到订单详情
  navigateToOrderDetail(orderId) {
    wx.showToast({
      title: '预约成功',
      icon: 'success'
    });

    setTimeout(() => {
      wx.redirectTo({
        url: `/pages/order/detail/index?id=${orderId}`
      });
    }, 1500);
  },

  // UI交互方法
  onMaskTap() {
    this.setData({
      showDatepicker: false,
      showTimepicker: false,
      showServicePicker: false,
      showCouponPicker: false,
      showPaymentPicker: false
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

  formatPrice(price) {
    return `¥${price.toFixed(2)}`;
  },

  getStepTitle(step) {
    const titles = {
      1: '选择技师',
      2: '选择服务',
      3: '选择时间地址',
      4: '确认订单'
    };
    return titles[step] || '';
  },

  getStepStatus(step) {
    if (step < this.data.currentStep) {
      return 'completed';
    } else if (step === this.data.currentStep) {
      return 'active';
    } else {
      return 'pending';
    }
  }
});