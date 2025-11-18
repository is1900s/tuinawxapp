// 订单详情页面
const app = getApp();

Page({
  data: {
    // 订单信息
    order: null,
    orderId: '',

    // 页面状态
    loading: true,
    error: false,
    refreshing: false,

    // 技师信息
    technician: null,

    // 服务信息
    service: null,

    // 地址信息
    address: null,

    // 时间线
    timeline: [],

    // 操作按钮
    actionButtons: [],

    // 地图相关
    showMap: false,
    markers: [],

    // 联系方式
    contactInfo: {
      technicianPhone: '',
      customerService: '400-123-4567'
    },

    // 评价信息
    review: null,
    showReviewModal: false,

    // 投诉相关
    showComplaintModal: false,
    complaintForm: {
      type: '',
      content: '',
      images: []
    },

    // 发票相关
    invoiceInfo: null,
    showInvoiceModal: false,
    invoiceForm: {
      type: 'personal', // personal, company
      title: '',
      taxNumber: '',
      email: ''
    },

    // 实时状态
    realTimeStatus: null,
    lastUpdateTime: 0
  },

  onLoad(options) {
    const orderId = options.id;
    if (!orderId) {
      wx.showToast({
        title: '订单信息错误',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }

    this.setData({ orderId });
    this.initPage();

    // 设置实时更新
    this.startRealTimeUpdate();
  },

  onUnload() {
    // 清除实时更新
    this.stopRealTimeUpdate();
  },

  onShow() {
    // 如果需要刷新数据
    if (this.data.needRefresh) {
      this.refreshOrderData();
      this.setData({ needRefresh: false });
    }
  },

  onPullDownRefresh() {
    this.refreshOrderData();
  },

  onShareAppMessage() {
    const order = this.data.order;
    return {
      title: `${order?.serviceName || '推拿服务'} - 预约详情`,
      path: `/pages/order/detail/index?id=${this.data.orderId}`,
      imageUrl: '/images/share-order-detail.jpg'
    };
  },

  // 初始化页面
  async initPage() {
    try {
      wx.showLoading({ title: '加载中...' });

      // 并行加载订单相关数据
      await Promise.all([
        this.loadOrderDetail(),
        this.loadTechnicianInfo(),
        this.loadServiceInfo(),
        this.loadAddressInfo(),
        this.loadOrderTimeline(),
        this.loadReviewInfo()
      ]);

      // 计算操作按钮
      this.calculateActionButtons();

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

  // 加载订单详情
  async loadOrderDetail() {
    const result = await wx.cloud.callFunction({
      name: 'order',
      data: {
        action: 'detail',
        orderId: this.data.orderId
      }
    });

    if (result.result.code === 0) {
      const order = result.result.data;
      this.setData({ order });

      // 设置页面标题
      wx.setNavigationBarTitle({
        title: '订单详情'
      });

      // 更新实时状态
      this.setData({
        realTimeStatus: order.status,
        lastUpdateTime: Date.now()
      });
    } else {
      throw new Error(result.result.message);
    }
  },

  // 加载技师信息
  async loadTechnicianInfo() {
    if (!this.data.order?.technicianId) return;

    const result = await wx.cloud.callFunction({
      name: 'technician',
      data: {
        action: 'detail',
        technicianId: this.data.order.technicianId
      }
    });

    if (result.result.code === 0) {
      const technician = result.result.data;
      this.setData({
        technician,
        'contactInfo.technicianPhone': technician.phone
      });
    }
  },

  // 加载服务信息
  async loadServiceInfo() {
    // 这里可以根据serviceId加载详细信息
    // 暂时使用订单中的服务信息
  },

  // 加载地址信息
  async loadAddressInfo() {
    if (!this.data.order?.addressId) return;

    const result = await wx.cloud.callFunction({
      name: 'user',
      data: {
        action: 'addressDetail',
        addressId: this.data.order.addressId
      }
    });

    if (result.result.code === 0) {
      this.setData({ address: result.result.data });
    }
  },

  // 加载订单时间线
  async loadOrderTimeline() {
    const result = await wx.cloud.callFunction({
      name: 'order',
      data: {
        action: 'timeline',
        orderId: this.data.orderId
      }
    });

    if (result.result.code === 0) {
      this.setData({ timeline: result.result.data });
    }
  },

  // 加载评价信息
  async loadReviewInfo() {
    const result = await wx.cloud.callFunction({
      name: 'review',
      data: {
        action: 'getByOrder',
        orderId: this.data.orderId
      }
    });

    if (result.result.code === 0 && result.result.data) {
      this.setData({ review: result.result.data });
    }
  },

  // 刷新订单数据
  async refreshOrderData() {
    try {
      this.setData({ refreshing: true });

      await Promise.all([
        this.loadOrderDetail(),
        this.loadOrderTimeline()
      ]);

      this.calculateActionButtons();

      wx.stopPullDownRefresh();

    } catch (error) {
      console.error('刷新订单失败:', error);
      wx.stopPullDownRefresh();
    } finally {
      this.setData({ refreshing: false });
    }
  },

  // 计算操作按钮
  calculateActionButtons() {
    const order = this.data.order;
    if (!order) return;

    const buttons = [];

    switch (order.status) {
      case 'pending':
        buttons.push(
          { type: 'confirm', text: '确认订单', style: 'primary' },
          { type: 'cancel', text: '取消订单', style: 'danger' }
        );
        break;
      case 'confirmed':
        buttons.push(
          { type: 'contact', text: '联系技师', style: 'default' },
          { type: 'cancel', text: '取消订单', style: 'danger' }
        );
        break;
      case 'inProgress':
        buttons.push(
          { type: 'contact', text: '联系技师', style: 'primary' },
          { type: 'complete', text: '完成服务', style: 'success' }
        );
        break;
      case 'completed':
        if (!this.data.review) {
          buttons.push(
            { type: 'review', text: '评价服务', style: 'primary' }
          );
        }
        buttons.push(
          { type: 'reorder', text: '再次预约', style: 'default' },
          { type: 'invoice', text: '申请发票', style: 'default' }
        );
        break;
      case 'cancelled':
        buttons.push(
          { type: 'reorder', text: '再次预约', style: 'primary' }
        );
        break;
    }

    // 添加通用按钮
    if (order.status !== 'pending' && order.status !== 'cancelled') {
      buttons.push(
        { type: 'complaint', text: '投诉建议', style: 'default' }
      );
    }

    this.setData({ actionButtons: buttons });
  },

  // 实时状态更新
  startRealTimeUpdate() {
    this.realTimeInterval = setInterval(() => {
      this.updateRealTimeStatus();
    }, 30000); // 30秒更新一次
  },

  stopRealTimeUpdate() {
    if (this.realTimeInterval) {
      clearInterval(this.realTimeInterval);
      this.realTimeInterval = null;
    }
  },

  async updateRealTimeStatus() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'order',
        data: {
          action: 'getStatus',
          orderId: this.data.orderId
        }
      });

      if (result.result.code === 0) {
        const currentStatus = result.result.data.status;
        if (currentStatus !== this.data.realTimeStatus) {
          this.setData({
            realTimeStatus: currentStatus,
            lastUpdateTime: Date.now()
          });

          // 状态变化时重新加载数据
          this.refreshOrderData();
        }
      }
    } catch (error) {
      console.error('状态更新失败:', error);
    }
  },

  // 按钮点击事件
  onActionTap(e) {
    const action = e.currentTarget.dataset.action;
    const order = this.data.order;

    switch (action) {
      case 'confirm':
        this.confirmOrder(order);
        break;
      case 'cancel':
        this.cancelOrder(order);
        break;
      case 'contact':
        this.contactTechnician();
        break;
      case 'complete':
        this.completeService(order);
        break;
      case 'review':
        this.showReviewModal();
        break;
      case 'reorder':
        this.reorder(order);
        break;
      case 'invoice':
        this.showInvoiceModal();
        break;
      case 'complaint':
        this.showComplaintModal();
        break;
    }
  },

  // 确认订单
  async confirmOrder(order) {
    try {
      wx.showLoading({ title: '确认中...' });

      const result = await wx.cloud.callFunction({
        name: 'order',
        data: {
          action: 'confirm',
          orderId: order.id
        }
      });

      if (result.result.code === 0) {
        wx.hideLoading();
        wx.showToast({
          title: '确认成功',
          icon: 'success'
        });
        this.refreshOrderData();
      } else {
        throw new Error(result.result.message);
      }

    } catch (error) {
      console.error('确认订单失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '确认失败',
        icon: 'none'
      });
    }
  },

  // 取消订单
  async cancelOrder(order) {
    wx.showModal({
      title: '取消订单',
      content: '确定要取消这个订单吗？',
      confirmText: '确定取消',
      confirmColor: '#ff4757',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '取消中...' });

            const result = await wx.cloud.callFunction({
              name: 'order',
              data: {
                action: 'cancel',
                orderId: order.id
              }
            });

            if (result.result.code === 0) {
              wx.hideLoading();
              wx.showToast({
                title: '取消成功',
                icon: 'success'
              });
              this.refreshOrderData();
            } else {
              throw new Error(result.result.message);
            }

          } catch (error) {
            console.error('取消订单失败:', error);
            wx.hideLoading();
            wx.showToast({
              title: '取消失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  // 联系技师
  contactTechnician() {
    const phone = this.data.contactInfo.technicianPhone;
    if (phone) {
      wx.makePhoneCall({
        phoneNumber: phone
      });
    } else {
      wx.showToast({
        title: '技师电话不可用',
        icon: 'none'
      });
    }
  },

  // 完成服务
  async completeService(order) {
    try {
      wx.showLoading({ title: '完成服务...' });

      const result = await wx.cloud.callFunction({
        name: 'order',
        data: {
          action: 'completeService',
          orderId: order.id
        }
      });

      if (result.result.code === 0) {
        wx.hideLoading();
        wx.showToast({
          title: '服务已完成',
          icon: 'success'
        });
        this.refreshOrderData();
      } else {
        throw new Error(result.result.message);
      }

    } catch (error) {
      console.error('完成服务失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '完成失败',
        icon: 'none'
      });
    }
  },

  // 再次预约
  reorder(order) {
    wx.navigateTo({
      url: `/pages/order/create/index?technicianId=${order.technicianId}&serviceId=${order.serviceId}`
    });
  },

  // 显示评价弹窗
  showReviewModal() {
    this.setData({ showReviewModal: true });
  },

  hideReviewModal() {
    this.setData({ showReviewModal: false });
  },

  // 提交评价
  async submitReview(reviewData) {
    try {
      wx.showLoading({ title: '提交评价...' });

      const result = await wx.cloud.callFunction({
        name: 'review',
        data: {
          action: 'create',
          orderId: this.data.orderId,
          reviewData
        }
      });

      if (result.result.code === 0) {
        wx.hideLoading();
        wx.showToast({
          title: '评价成功',
          icon: 'success'
        });
        this.hideReviewModal();
        this.refreshOrderData();
      } else {
        throw new Error(result.result.message);
      }

    } catch (error) {
      console.error('提交评价失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '评价失败',
        icon: 'none'
      });
    }
  },

  // 显示投诉弹窗
  showComplaintModal() {
    this.setData({ showComplaintModal: true });
  },

  hideComplaintModal() {
    this.setData({
      showComplaintModal: false,
      complaintForm: {
        type: '',
        content: '',
        images: []
      }
    });
  },

  // 提交投诉
  async submitComplaint() {
    const { complaintForm } = this.data;

    if (!complaintForm.type || !complaintForm.content.trim()) {
      wx.showToast({
        title: '请填写投诉内容',
        icon: 'none'
      });
      return;
    }

    try {
      wx.showLoading({ title: '提交投诉...' });

      const result = await wx.cloud.callFunction({
        name: 'complaint',
        data: {
          orderId: this.data.orderId,
          complaintData: complaintForm
        }
      });

      if (result.result.code === 0) {
        wx.hideLoading();
        wx.showToast({
          title: '投诉已提交',
          icon: 'success'
        });
        this.hideComplaintModal();
      } else {
        throw new Error(result.result.message);
      }

    } catch (error) {
      console.error('提交投诉失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '提交失败',
        icon: 'none'
      });
    }
  },

  // 显示发票弹窗
  showInvoiceModal() {
    this.setData({ showInvoiceModal: true });
  },

  hideInvoiceModal() {
    this.setData({
      showInvoiceModal: false,
      invoiceForm: {
        type: 'personal',
        title: '',
        taxNumber: '',
        email: ''
      }
    });
  },

  // 申请发票
  async requestInvoice() {
    const { invoiceForm } = this.data;

    if (invoiceForm.type === 'company' && (!invoiceForm.title || !invoiceForm.taxNumber)) {
      wx.showToast({
        title: '请填写发票信息',
        icon: 'none'
      });
      return;
    }

    if (!invoiceForm.email) {
      wx.showToast({
        title: '请填写接收邮箱',
        icon: 'none'
      });
      return;
    }

    try {
      wx.showLoading({ title: '申请发票...' });

      const result = await wx.cloud.callFunction({
        name: 'order',
        data: {
          action: 'requestInvoice',
          orderId: this.data.orderId,
          invoiceData: invoiceForm
        }
      });

      if (result.result.code === 0) {
        wx.hideLoading();
        wx.showToast({
          title: '发票申请成功',
          icon: 'success'
        });
        this.hideInvoiceModal();
        this.refreshOrderData();
      } else {
        throw new Error(result.result.message);
      }

    } catch (error) {
      console.error('申请发票失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '申请失败',
        icon: 'none'
      });
    }
  },

  // 地图相关
  onShowMap() {
    const order = this.data.order;
    const technician = this.data.technician;

    if (!technician?.location || !this.data.address) {
      wx.showToast({
        title: '位置信息不完整',
        icon: 'none'
      });
      return;
    }

    const markers = [
      {
        id: 1,
        latitude: this.data.address.latitude,
        longitude: this.data.address.longitude,
        title: '服务地址',
        iconPath: '/images/marker-address.png'
      },
      {
        id: 2,
        latitude: technician.location.latitude,
        longitude: technician.location.longitude,
        title: '技师位置',
        iconPath: '/images/marker-technician.png'
      }
    ];

    this.setData({
      showMap: true,
      markers
    });
  },

  onHideMap() {
    this.setData({ showMap: false });
  },

  // 投诉表单处理
  onComplaintTypeChange(e) {
    this.setData({
      'complaintForm.type': e.detail.value
    });
  },

  onComplaintContentInput(e) {
    this.setData({
      'complaintForm.content': e.detail.value
    });
  },

  onComplaintImageChoose() {
    wx.chooseImage({
      count: 4,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const images = [...this.data.complaintForm.images, ...res.tempFilePaths];
        this.setData({
          'complaintForm.images': images.slice(0, 4) // 最多4张图片
        });
      }
    });
  },

  onComplaintImageDelete(e) {
    const index = e.currentTarget.dataset.index;
    const images = [...this.data.complaintForm.images];
    images.splice(index, 1);
    this.setData({
      'complaintForm.images': images
    });
  },

  // 发票表单处理
  onInvoiceTypeChange(e) {
    this.setData({
      'invoiceForm.type': e.detail.value
    });
  },

  onInvoiceTitleInput(e) {
    this.setData({
      'invoiceForm.title': e.detail.value
    });
  },

  onInvoiceTaxNumberInput(e) {
    this.setData({
      'invoiceForm.taxNumber': e.detail.value
    });
  },

  onInvoiceEmailInput(e) {
    this.setData({
      'invoiceForm.email': e.detail.value
    });
  },

  // 工具方法
  getStatusText(status) {
    const statusMap = {
      pending: '待确认',
      confirmed: '已确认',
      inProgress: '服务中',
      completed: '已完成',
      cancelled: '已取消'
    };
    return statusMap[status] || status;
  },

  getStatusColor(status) {
    const colorMap = {
      pending: '#ff9500',
      confirmed: '#007aff',
      inProgress: '#5856d6',
      completed: '#34c759',
      cancelled: '#8e8e93'
    };
    return colorMap[status] || '#8e8e93';
  },

  formatDateTime(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hour = date.getHours().toString().padStart(2, '0');
    const minute = date.getMinutes().toString().padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}`;
  },

  formatPrice(price) {
    return `¥${price.toFixed(2)}`;
  },

  onMaskTap() {
    this.setData({
      showReviewModal: false,
      showComplaintModal: false,
      showInvoiceModal: false,
      showMap: false
    });
  }
});