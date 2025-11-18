// 技师列表页面
const app = getApp();

Page({
  data: {
    // 页面状态
    loading: false,
    refreshing: false,
    hasMore: true,

    // 筛选条件
    currentTab: 'all',
    filters: {
      gender: '',
      minRating: 0,
      priceRange: '',
      distanceRange: '',
      specialties: []
    },

    // 排序方式
    sortBy: 'distance', // distance, rating, price
    sortOrder: 'asc', // asc, desc

    // 搜索相关
    searchKeyword: '',
    searchHistory: [],
    showSearch: false,

    // 技师列表
    technicianList: [],
    nearbyCount: 0,

    // 位置信息
    userLocation: null,

    // 页面配置
    page: 1,
    pageSize: 10,

    // 筛选选项
    filterOptions: {
      specialties: [
        { id: 1, name: '推拿按摩', selected: false },
        { id: 2, name: '足疗按摩', selected: false },
        { id: 3, name: '精油开背', selected: false },
        { id: 4, name: '肩颈理疗', selected: false },
        { id: 5, name: '全身SPA', selected: false }
      ],
      priceRanges: [
        { label: '不限', value: '', selected: true },
        { label: '￥0-100', value: '0-100', selected: false },
        { label: '￥100-200', value: '100-200', selected: false },
        { label: '￥200-300', value: '200-300', selected: false },
        { label: '￥300+', value: '300-', selected: false }
      ],
      distances: [
        { label: '不限', value: '', selected: true },
        { label: '3km内', value: '0-3', selected: false },
        { label: '5km内', value: '0-5', selected: false },
        { label: '10km内', value: '0-10', selected: false }
      ]
    }
  },

  onLoad(options) {
    // 获取传入参数
    if (options.service) {
      this.setData({
        'filters.specialties': [options.service]
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
    // 刷新页面数据
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
      title: '附近专业技师，上门服务',
      path: '/pages/technician/list/index',
      imageUrl: '/images/share-technician.jpg'
    };
  },

  // 初始化页面
  async initPage() {
    try {
      wx.showLoading({ title: '加载中...' });

      // 获取用户位置
      await this.getUserLocation();

      // 加载搜索历史
      this.loadSearchHistory();

      // 加载技师数据
      await this.loadTechnicianList();

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

  // 获取用户位置
  getUserLocation() {
    return new Promise((resolve, reject) => {
      wx.getLocation({
        type: 'gcj02',
        success: (res) => {
          const location = {
            latitude: res.latitude,
            longitude: res.longitude
          };
          this.setData({ userLocation: location });
          resolve(location);
        },
        fail: (error) => {
          console.error('获取位置失败:', error);
          // 位置获取失败时使用默认位置
          this.setData({
            userLocation: {
              latitude: 39.9042,
              longitude: 116.4074
            }
          });
          resolve();
        }
      });
    });
  },

  // 加载技师列表
  async loadTechnicianList(refresh = false) {
    if (this.data.loading && !refresh) return;

    try {
      this.setData({
        loading: true,
        refreshing: refresh
      });

      const params = {
        page: refresh ? 1 : this.data.page,
        pageSize: this.data.pageSize,
        sortBy: this.data.sortBy,
        sortOrder: this.data.sortOrder,
        ...this.data.filters
      };

      if (this.data.searchKeyword) {
        params.keyword = this.data.searchKeyword;
      }

      if (this.data.userLocation) {
        params.latitude = this.data.userLocation.latitude;
        params.longitude = this.data.userLocation.longitude;
      }

      // 调用云函数获取技师列表
      const result = await wx.cloud.callFunction({
        name: 'technician',
        data: {
          action: 'list',
          params
        }
      });

      if (result.result.code === 0) {
        const { list, total, nearbyCount } = result.result.data;

        this.setData({
          technicianList: refresh ? list : [...this.data.technicianList, ...list],
          hasMore: list.length === this.data.pageSize,
          nearbyCount,
          page: refresh ? 2 : this.data.page + 1
        });

        if (refresh) {
          wx.stopPullDownRefresh();
        }
      } else {
        throw new Error(result.result.message);
      }

    } catch (error) {
      console.error('加载技师列表失败:', error);
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

  // 加载更多数据
  loadMoreData() {
    if (!this.data.hasMore || this.data.loading) return;
    this.loadTechnicianList();
  },

  // 刷新数据
  refreshData() {
    this.setData({ page: 1 });
    this.loadTechnicianList(true);
  },

  // 切换Tab
  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab;
    if (tab === this.data.currentTab) return;

    this.setData({
      currentTab: tab,
      page: 1,
      technicianList: []
    });

    // 更新筛选条件
    this.updateFilterByTab(tab);
    this.loadTechnicianList(true);
  },

  // 根据Tab更新筛选条件
  updateFilterByTab(tab) {
    const filters = { ...this.data.filters };

    switch (tab) {
      case 'nearby':
        filters.distanceRange = '0-5';
        break;
      case 'rating':
        filters.minRating = 4.5;
        this.setData({ sortBy: 'rating', sortOrder: 'desc' });
        break;
      case 'price':
        this.setData({ sortBy: 'price', sortOrder: 'asc' });
        break;
      default:
        // 重置筛选条件
        filters.distanceRange = '';
        filters.minRating = 0;
        this.setData({ sortBy: 'distance', sortOrder: 'asc' });
    }

    this.setData({ filters });
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
      technicianList: []
    });
    this.loadTechnicianList(true);
  },

  onSearchFocus() {
    this.setData({ showSearch: true });
  },

  onSearchBlur() {
    // 延迟隐藏搜索框，避免点击历史记录时隐藏
    setTimeout(() => {
      this.setData({ showSearch: false });
    }, 200);
  },

  onClearSearch() {
    this.setData({
      searchKeyword: '',
      page: 1,
      technicianList: []
    });
    this.loadTechnicianList(true);
  },

  // 搜索历史管理
  loadSearchHistory() {
    const history = wx.getStorageSync('technician_search_history') || [];
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
    wx.setStorageSync('technician_search_history', history);
  },

  onHistoryTap(e) {
    const keyword = e.currentTarget.dataset.keyword;
    this.setData({
      searchKeyword: keyword,
      page: 1,
      technicianList: []
    });
    this.loadTechnicianList(true);
  },

  onClearHistory() {
    wx.showModal({
      title: '提示',
      content: '确定清空搜索历史吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({ searchHistory: [] });
          wx.removeStorageSync('technician_search_history');
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

  onSortChange(e) {
    const sortBy = e.currentTarget.dataset.sort;
    if (sortBy === this.data.sortBy) {
      // 切换排序方向
      this.setData({
        sortOrder: this.data.sortOrder === 'asc' ? 'desc' : 'asc'
      });
    } else {
      this.setData({
        sortBy,
        sortOrder: 'asc'
      });
    }

    this.refreshData();
  },

  onGenderChange(e) {
    this.setData({
      'filters.gender': e.detail.value,
      page: 1,
      technicianList: []
    });
    this.loadTechnicianList(true);
  },

  onRatingChange(e) {
    this.setData({
      'filters.minRating': e.detail.value,
      page: 1,
      technicianList: []
    });
    this.loadTechnicianList(true);
  },

  onPriceRangeChange(e) {
    const priceRange = e.currentTarget.dataset.range;
    this.setData({
      'filters.priceRange': priceRange,
      page: 1,
      technicianList: []
    });
    this.loadTechnicianList(true);
  },

  onDistanceRangeChange(e) {
    const distanceRange = e.currentTarget.dataset.range;
    this.setData({
      'filters.distanceRange': distanceRange,
      page: 1,
      technicianList: []
    });
    this.loadTechnicianList(true);
  },

  onSpecialtyToggle(e) {
    const specialtyId = e.currentTarget.dataset.id;
    const specialties = [...this.data.filters.specialties];
    const index = specialties.indexOf(specialtyId);

    if (index > -1) {
      specialties.splice(index, 1);
    } else {
      specialties.push(specialtyId);
    }

    this.setData({
      'filters.specialties': specialties,
      page: 1,
      technicianList: []
    });
    this.loadTechnicianList(true);
  },

  // 重置筛选条件
  onResetFilters() {
    this.setData({
      filters: {
        gender: '',
        minRating: 0,
        priceRange: '',
        distanceRange: '',
        specialties: []
      },
      sortBy: 'distance',
      sortOrder: 'asc',
      page: 1,
      technicianList: []
    });
    this.loadTechnicianList(true);
  },

  // 技师相关操作
  onTechnicianTap(e) {
    const technician = e.currentTarget.dataset.technician;
    wx.navigateTo({
      url: `/pages/technician/detail/index?id=${technician.id}`
    });
  },

  onPhoneCall(e) {
    const phone = e.currentTarget.dataset.phone;
    wx.makePhoneCall({
      phoneNumber: phone
    });
  },

  onShareTechnician(e) {
    const technician = e.currentTarget.dataset.technician;
    // 实现分享技师功能
    console.log('分享技师:', technician);
  },

  onCollectTechnician(e) {
    const technician = e.currentTarget.dataset.technician;
    // 实现收藏技师功能
    console.log('收藏技师:', technician);
  }
});