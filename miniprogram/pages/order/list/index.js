// 订单列表页面
const app = getApp();

Page({
  data: {
    // 页面状态
    loading: false,
    refreshing: false,
    hasMore: true,

    // 当前选中的Tab
    currentTab: 'all',

    // 筛选条件
    filterStatus: '',
    filterDate: '',
    searchKeyword: '',

    // 订单列表
    orderList: [],
    orderStats: {
      all: 0,
      pending: 0,
      confirmed: 0,
      inProgress: 0,
      completed: 0,
      cancelled: 0
    },

    // 分页信息
    page: 1,
    pageSize: 10,

    // 搜索相关
    showSearch: false,
    searchHistory: [],

    // 筛选相关
    showFilter: false,
    filterOptions: {
      statusOptions: [
        { value: '', label: '全部状态', selected: true },
        { value: 'pending', label: '待确认', selected: false },
        { value: 'confirmed', label: '已确认', selected: false },
        { value: 'inProgress', label: '服务中', selected: false },
        { value: 'completed', label: '已完成', selected: false },
        { value: 'cancelled', label: '已取消', selected: false }
      ],
      dateOptions: [
        { value: '', label: '全部时间', selected: true },
        { value: 'today', label: '今天', selected: false },
        { value: 'week', label: '本周', selected: false },
        { value: 'month', label: '本月', selected: false },
        { value: 'threeMonths', label: '三个月内', selected: false }
      ]
    },

    // 快捷操作
    quickActions: [
      { id: 'reorder', title: '再次预约', icon: '🔄' },
      { id: 'contact', title: '联系技师', icon: '📞' },
      { id: 'complaint', title: '投诉建议', icon: '💬' },
      { id: 'invoice', title: '申请发票', icon: '🧾' }
    ],

    // 下拉菜单
    showActionMenu: false,
    actionOrder: null
  },

  onLoad(options) {
    // 处理传入参数
    if (options.status) {
      this.setData({
        currentTab: options.status,
        filterStatus: options.status
      });
    }

    if (options.keyword) {
      this.setData({
        searchKeyword: options.keyword,
        showSearch: true
      });
    }

    // 初始化页面
    this.initPage();
  },

  onShow() {
    // 刷新订单列表
    if (this.data.needRefresh) {
      this.refreshData();
      this.setData({ needRefresh: false });
    }
  },

  onPullDownRefresh() {
    this.refreshData();
  },

  onReachBottom() {
    this.loadMoreData();
  },

  onShareAppMessage() {
    return {
      title: '我的预约订单',
      path: '/pages/order/list/index',
      imageUrl: '/images/share-order-list.jpg'
    };
  },

  // 初始化页面
  async initPage() {
    try {
      wx.showLoading({ title: '加载中...' });

      // 加载搜索历史
      this.loadSearchHistory();

      // 并行加载订单数据和统计信息
      await Promise.all([
        this.loadOrderList(),
        this.loadOrderStats()
      ]);

    } catch (error) {
      console.error('页面初始化失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 加载订单列表
  async loadOrderList(refresh = false) {
    if (this.data.loading && !refresh) return;

    try {
      this.setData({
        loading: true,
        refreshing: refresh
      });

      const params = {
        page: refresh ? 1 : this.data.page,
        pageSize: this.data.pageSize
      };

      // 添加筛选条件
      if (this.data.currentTab !== 'all') {
        params.status = this.data.currentTab;
      }

      if (this.data.filterStatus) {
        params.status = this.data.filterStatus;
      }

      if (this.data.filterDate) {
        params.dateRange = this.data.filterDate;
      }

      if (this.data.searchKeyword) {
        params.keyword = this.data.searchKeyword;
      }

      const result = await wx.cloud.callFunction({
        name: 'order',
        data: {
          action: 'list',
          params
        }
      });

      if (result.result.code === 0) {
        const { list, total } = result.result.data;

        this.setData({
          orderList: refresh ? list : [...this.data.orderList, ...list],
          hasMore: list.length === this.data.pageSize,
          page: refresh ? 2 : this.data.page + 1
        });

        if (refresh) {
          wx.stopPullDownRefresh();
        }
      } else {
        throw new Error(result.result.message);
      }

    } catch (error) {
      console.error('加载订单列表失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      this.setData({
        loading: false,
        refreshing: false
      });
    }
  },

  // 加载订单统计
  async loadOrderStats() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'order',
        data: {
          action: 'stats'
        }
      });

      if (result.result.code === 0) {
        this.setData({
          orderStats: result.result.data
        });
      }
    } catch (error) {
      console.error('加载订单统计失败:', error);
    }
  },

  // 加载更多数据
  loadMoreData() {
    if (!this.data.hasMore || this.data.loading) return;
    this.loadOrderList();
  },

  // 刷新数据
  refreshData() {
    this.setData({ page: 1 });
    this.loadOrderList(true);
    this.loadOrderStats();
  },

  // Tab切换
  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab;
    if (tab === this.data.currentTab) return;

    this.setData({
      currentTab: tab,
      page: 1,
      orderList: []
    });

    this.loadOrderList(true);
  },

  // 搜索相关方法
  onSearchInput(e) {
    this.setData({
      searchKeyword: e.detail.value
    });
  },

  onSearchConfirm() {
    const keyword = this.data.searchKeyword.trim();
    if (!keyword) return;

    // 添加到搜索历史
    this.addSearchHistory(keyword);

    // 执行搜索
    this.setData({
      page: 1,
      orderList: []
    });
    this.loadOrderList(true);
  },

  onSearchFocus() {
    this.setData({ showSearch: true });
  },

  onSearchBlur() {
    setTimeout(() => {
      this.setData({ showSearch: false });
    }, 200);
  },

  onClearSearch() {
    this.setData({
      searchKeyword: '',
      page: 1,
      orderList: []
    });
    this.loadOrderList(true);
  },

  // 搜索历史管理
  loadSearchHistory() {
    const history = wx.getStorageSync('order_search_history') || [];
    this.setData({ searchHistory: history });
  },

  addSearchHistory(keyword) {
    let history = [...this.data.searchHistory];

    // 移除重复项
    history = history.filter(item => item !== keyword);

    // 添加到开头
    history.unshift(keyword);

    // 限制数量
    if (history.length > 10) {
      history = history.slice(0, 10);
    }

    this.setData({ searchHistory: history });
    wx.setStorageSync('order_search_history', history);
  },

  onHistoryTap(e) {
    const keyword = e.currentTarget.dataset.keyword;
    this.setData({
      searchKeyword: keyword,
      page: 1,
      orderList: []
    });
    this.loadOrderList(true);
  },

  onClearHistory() {
    wx.showModal({
      title: '提示',
      content: '确定清空搜索历史吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({ searchHistory: [] });
          wx.removeStorageSync('order_search_history');
        }
      }
    });
  },

  // 筛选相关方法
  onFilterShow() {
    this.setData({ showFilter: true });
  },

  onFilterHide() {
    this.setData({ showFilter: false });
  },

  onStatusFilterChange(e) {
    const status = e.currentTarget.dataset.value;
    this.setData({
      filterStatus: status,
      page: 1,
      orderList: []
    });

    // 更新筛选选项状态
    const statusOptions = this.data.filterOptions.statusOptions.map(option => ({
      ...option,
      selected: option.value === status
    }));
    this.setData({
      'filterOptions.statusOptions': statusOptions
    });

    this.loadOrderList(true);
  },

  onDateFilterChange(e) {
    const dateRange = e.currentTarget.dataset.value;
    this.setData({
      filterDate: dateRange,
      page: 1,
      orderList: []
    });

    // 更新筛选选项状态
    const dateOptions = this.data.filterOptions.dateOptions.map(option => ({
      ...option,
      selected: option.value === dateRange
    }));
    this.setData({
      'filterOptions.dateOptions': dateOptions
    });

    this.loadOrderList(true);
  },

  // 重置筛选条件
  onResetFilters() {
    this.setData({
      filterStatus: '',
      filterDate: '',
      page: 1,
      orderList: []
    });

    // 重置筛选选项状态
    const statusOptions = this.data.filterOptions.statusOptions.map((option, index) => ({
      ...option,
      selected: index === 0
    }));
    const dateOptions = this.data.filterOptions.dateOptions.map((option, index) => ({
      ...option,
      selected: index === 0
    }));

    this.setData({
      'filterOptions.statusOptions': statusOptions,
      'filterOptions.dateOptions': dateOptions
    });

    this.loadOrderList(true);
  },

  // 订单相关操作
  onOrderTap(e) {
    const order = e.currentTarget.dataset.order;
    wx.navigateTo({
      url: `/pages/order/detail/index?id=${order.id}`
    });
  },

  onOrderLongPress(e) {
    const order = e.currentTarget.dataset.order;
    this.showActionMenu(order);
  },

  // 显示操作菜单
  showActionMenu(order) {
    this.setData({
      showActionMenu: true,
      actionOrder: order
    });
  },

  hideActionMenu() {
    this.setData({
      showActionMenu: false,
      actionOrder: null
    });
  },

  // 快捷操作
  onQuickAction(e) {
    const action = e.currentTarget.dataset.action;
    const order = this.data.actionOrder;

    if (!order) return;

    this.hideActionMenu();

    switch (action) {
      case 'reorder':
        this.reorder(order);
        break;
      case 'contact':
        this.contactTechnician(order);
        break;
      case 'complaint':
        this.complaint(order);
        break;
      case 'invoice':
        this.requestInvoice(order);
        break;
    }
  },

  // 再次预约
  reorder(order) {
    wx.navigateTo({
      url: `/pages/order/create/index?technicianId=${order.technicianId}&serviceId=${order.serviceId}`
    });
  },

  // 联系技师
  contactTechnician(order) {
    if (order.technicianPhone) {
      wx.makePhoneCall({
        phoneNumber: order.technicianPhone
      });
    } else {
      wx.showToast({
        title: '技师电话不可用',
        icon: 'none'
      });
    }
  },

  // 投诉建议
  complaint(order) {
    wx.navigateTo({
      url: `/pages/help/index?type=complaint&orderId=${order.id}`
    });
  },

  // 申请发票
  async requestInvoice(order) {
    try {
      wx.showLoading({ title: '提交申请...' });

      const result = await wx.cloud.callFunction({
        name: 'order',
        data: {
          action: 'requestInvoice',
          orderId: order.id
        }
      });

      if (result.result.code === 0) {
        wx.hideLoading();
        wx.showToast({
          title: '申请已提交',
          icon: 'success'
        });
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

  // 订单状态操作
  onConfirmOrder(e) {
    const order = e.currentTarget.dataset.order;
    this.confirmOrder(order);
  },

  onCancelOrder(e) {
    const order = e.currentTarget.dataset.order;
    this.cancelOrder(order);
  },

  onStartService(e) {
    const order = e.currentTarget.dataset.order;
    this.startService(order);
  },

  onCompleteService(e) {
    const order = e.currentTarget.dataset.order;
    this.completeService(order);
  },

  onPayOrder(e) {
    const order = e.currentTarget.dataset.order;
    this.payOrder(order);
  },

  onReviewOrder(e) {
    const order = e.currentTarget.dataset.order;
    this.reviewOrder(order);
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
        this.refreshData();
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
              this.refreshData();
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

  // 开始服务
  async startService(order) {
    // 验证位置权限
    const authSetting = await this.getAuthSetting();
    if (!authSetting['scope.userLocation']) {
      wx.showModal({
        title: '位置权限',
        content: '开始服务需要获取您的位置信息，请授权位置权限',
        success: (res) => {
          if (res.confirm) {
            wx.openSetting();
          }
        }
      });
      return;
    }

    try {
      wx.showLoading({ title: '开始服务...' });

      // 获取当前位置
      const location = await this.getCurrentLocation();

      const result = await wx.cloud.callFunction({
        name: 'order',
        data: {
          action: 'startService',
          orderId: order.id,
          location
        }
      });

      if (result.result.code === 0) {
        wx.hideLoading();
        wx.showToast({
          title: '服务已开始',
          icon: 'success'
        });
        this.refreshData();
      } else {
        throw new Error(result.result.message);
      }

    } catch (error) {
      console.error('开始服务失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '开始失败',
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
        this.refreshData();
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

  // 支付订单
  async payOrder(order) {
    try {
      wx.showLoading({ title: '发起支付...' });

      const result = await wx.cloud.callFunction({
        name: 'order',
        data: {
          action: 'createPayment',
          orderId: order.id
        }
      });

      if (result.result.code === 0) {
        const payment = result.result.data;

        wx.hideLoading();

        // 调用微信支付
        wx.requestPayment({
          ...payment,
          success: () => {
            wx.showToast({
              title: '支付成功',
              icon: 'success'
            });
            this.refreshData();
          },
          fail: (error) => {
            console.error('支付失败:', error);
            wx.showToast({
              title: '支付已取消',
              icon: 'none'
            });
          }
        });

      } else {
        throw new Error(result.result.message);
      }

    } catch (error) {
      console.error('发起支付失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '支付失败',
        icon: 'none'
      });
    }
  },

  // 评价订单
  reviewOrder(order) {
    wx.navigateTo({
      url: `/pages/review/create/index?orderId=${order.id}`
    });
  },

  // 获取授权设置
  getAuthSetting() {
    return new Promise((resolve) => {
      wx.getSetting({
        success: (res) => resolve(res.authSetting),
        fail: () => resolve({})
      });
    });
  },

  // 获取当前位置
  getCurrentLocation() {
    return new Promise((resolve, reject) => {
      wx.getLocation({
        type: 'gcj02',
        success: (res) => {
          resolve({
            latitude: res.latitude,
            longitude: res.longitude
          });
        },
        fail: reject
      });
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

  formatTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) { // 1分钟内
      return '刚刚';
    } else if (diff < 3600000) { // 1小时内
      return `${Math.floor(diff / 60000)}分钟前`;
    } else if (diff < 86400000) { // 24小时内
      return `${Math.floor(diff / 3600000)}小时前`;
    } else {
      return this.formatDate(date);
    }
  },

  formatDate(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hour = date.getHours().toString().padStart(2, '0');
    const minute = date.getMinutes().toString().padStart(2, '0');
    return `${month}-${day} ${hour}:${minute}`;
  }
});